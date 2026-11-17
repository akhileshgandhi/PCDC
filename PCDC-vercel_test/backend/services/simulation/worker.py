"""Background sweeper for case study attempts.

Expires every attempt whose timed phase (writing or rapid fire) has run out,
whether or not anyone has the page open. It starts with the backend (see
main.py) and also runs on its own: python -m services.simulation.worker

Running it in several processes at once is safe, such as uvicorn --workers 2:
each attempt is locked while it is expired, and a locked attempt is skipped.

On Vercel the backend only runs during a request, so a background thread
can't stay alive and the sweeper isn't started. finalize_expired_case_attempts
(called before every relevant read) still applies there.

CASE_SWEEP_SECONDS sets how often it runs. CASE_SWEEPER=off turns it off.
"""

import logging
import os
import threading
from typing import Optional

from shared.database import SessionLocal

from .service import sweep_expired_case_attempts

logger = logging.getLogger(__name__)

DEFAULT_SWEEP_SECONDS = 30


def sweep_interval() -> float:
    try:
        return max(1.0, float(os.getenv("CASE_SWEEP_SECONDS", DEFAULT_SWEEP_SECONDS)))
    except ValueError:
        return float(DEFAULT_SWEEP_SECONDS)


def sweeper_enabled() -> bool:
    return not os.getenv("VERCEL") and os.getenv("CASE_SWEEPER", "on").lower() != "off"


def sweep_once() -> int:
    db = SessionLocal()
    try:
        return sweep_expired_case_attempts(db)
    finally:
        db.close()


def run_sweeper(stop: threading.Event) -> None:
    """Sweep straight away, so attempts that expired while the server was down
    are closed out at startup, then on every interval until stopped."""
    interval = sweep_interval()
    while not stop.is_set():
        try:
            expired = sweep_once()
            if expired:
                logger.info("Case attempt sweeper expired %s attempt(s)", expired)
        except Exception:  # noqa: BLE001 - a database blip must not end the sweeper
            logger.exception("Case attempt sweep failed; trying again next interval")
        stop.wait(interval)


def start_sweeper() -> Optional[threading.Event]:
    """Start the sweeper thread. Returns the event that stops it, or None if off."""
    if not sweeper_enabled():
        return None
    stop = threading.Event()
    threading.Thread(target=run_sweeper, args=(stop,), name="case-attempt-sweeper", daemon=True).start()
    return stop


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    stop_event = threading.Event()
    try:
        run_sweeper(stop_event)
    except KeyboardInterrupt:
        stop_event.set()
