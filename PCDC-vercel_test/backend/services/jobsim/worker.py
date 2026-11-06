"""Background sweeper for job simulations (handover 9.1, 9.7).

Submits and marks every attempt whose time has run out, whether or not anyone
has the page open. It starts with the backend (see main.py) and also runs on
its own:  python -m services.jobsim.worker

Running it in several processes at once is safe, such as uvicorn --workers 2:
each attempt is locked while it is submitted, and a locked attempt is skipped.

On Vercel the backend only runs during a request, so a background thread can't
stay alive and the sweeper isn't started. The check before every read still
applies there.

JOBSIM_SWEEP_SECONDS sets how often it runs. JOBSIM_SWEEPER=off turns it off.
"""

import logging
import os
import threading
import time
from typing import Optional

from shared.database import SessionLocal

from .service import sweep_expired_attempts

logger = logging.getLogger(__name__)

DEFAULT_SWEEP_SECONDS = 30


def sweep_interval() -> float:
    try:
        return max(1.0, float(os.getenv("JOBSIM_SWEEP_SECONDS", DEFAULT_SWEEP_SECONDS)))
    except ValueError:
        return float(DEFAULT_SWEEP_SECONDS)


def sweeper_enabled() -> bool:
    return not os.getenv("VERCEL") and os.getenv("JOBSIM_SWEEPER", "on").lower() != "off"


def sweep_once() -> int:
    db = SessionLocal()
    try:
        return sweep_expired_attempts(db)
    finally:
        db.close()


def run_sweeper(stop: threading.Event) -> None:
    """Sweep straight away, so attempts that expired while the server was down
    are submitted at startup, then on every interval until stopped."""
    interval = sweep_interval()
    while not stop.is_set():
        try:
            submitted = sweep_once()
            if submitted:
                logger.info("Job simulation sweeper submitted %s expired attempt(s)", submitted)
        except Exception:  # noqa: BLE001 - a database blip must not end the sweeper
            logger.exception("Job simulation sweep failed; trying again next interval")
        stop.wait(interval)


def start_sweeper() -> Optional[threading.Event]:
    """Start the sweeper thread. Returns the event that stops it, or None if off."""
    if not sweeper_enabled():
        return None
    stop = threading.Event()
    threading.Thread(target=run_sweeper, args=(stop,), name="jobsim-sweeper", daemon=True).start()
    return stop


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    stop_event = threading.Event()
    try:
        run_sweeper(stop_event)
    except KeyboardInterrupt:
        stop_event.set()
