"""Full-screen rule for student attempts (case studies and job simulations).

The attempt page asks the student to stay in full screen. The page reports
"enter" when the student goes into full screen and "exit" when they leave it.
Each attempt row keeps two columns: fullscreen_exits (how many times the
student has left) and fullscreen_active (whether they are in full screen now).

An exit counts when the attempt was in full screen at the time. An "enter"
while the attempt was still marked as in full screen also counts as an exit:
the student reloaded, closed or left the page without leaving full screen
first, so reloading can't be used to leave without it counting.

On the MAX_FULLSCREEN_EXITS-th exit the attempt ends.
"""

from typing import Literal, Tuple

from pydantic import BaseModel

MAX_FULLSCREEN_EXITS = 3


class FullscreenEvent(BaseModel):
    event: Literal["enter", "exit"]


def next_fullscreen_state(exits: int, active: bool, event: str) -> Tuple[int, bool, bool]:
    """Returns (exits, active, counted) after the event."""
    counted = bool(active)
    return (exits or 0) + (1 if counted else 0), event == "enter", counted


def fullscreen_status(exits: int, counted: bool, ended: bool) -> dict:
    return {"exits": exits, "max_exits": MAX_FULLSCREEN_EXITS, "counted": counted, "ended": ended}
