"""Full-screen exit counting for student attempts.

Run from backend/:  python -m pytest tests/test_fullscreen.py
(or plain:          python tests/test_fullscreen.py)
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from shared.fullscreen import MAX_FULLSCREEN_EXITS, next_fullscreen_state  # noqa: E402


def run(events, exits=0, active=False):
    for event in events:
        exits, active, _ = next_fullscreen_state(exits, active, event)
    return exits, active


def test_first_enter_is_free():
    assert run(["enter"]) == (0, True)


def test_each_exit_from_full_screen_counts_once():
    assert run(["enter", "exit", "enter", "exit"]) == (2, False)


def test_repeated_exit_does_not_double_count():
    assert run(["enter", "exit", "exit"]) == (1, False)


def test_reload_while_in_full_screen_counts_as_an_exit():
    # The page went away without an exit report; the next enter counts it.
    assert run(["enter", "enter"]) == (1, True)


def test_third_exit_reaches_the_limit():
    exits, _ = run(["enter", "exit", "enter", "exit", "enter", "exit"])
    assert exits == MAX_FULLSCREEN_EXITS == 3


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            fn()
    print("ok")
