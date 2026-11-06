"""Marking one spreadsheet task (handover section 9.4).

A number matches when it is within 0.5% of the expected value (never tighter
than 0.005). Text matches ignoring case and surrounding spaces. The format must
match exactly; a right value in the wrong format is incorrect with a message
saying so. The response only ever says correct/incorrect plus a message: the
expected value is never part of it.
"""

from dataclasses import dataclass
from typing import Any, Optional

from .formula import FORMAT_LABELS, FORMATS, Blank, CellResult

RELATIVE_TOLERANCE = 0.005
ABSOLUTE_TOLERANCE = 0.005


@dataclass
class Verdict:
    is_correct: bool
    message: str
    # Why it was marked this way (stored in the check log, never shown).
    reason: str


def values_match(student: Any, expected: Any) -> bool:
    if isinstance(expected, bool) or isinstance(student, bool):
        return isinstance(expected, bool) and isinstance(student, bool) and student == expected
    if isinstance(expected, (int, float)):
        if not isinstance(student, (int, float)):
            return False
        tolerance = max(ABSOLUTE_TOLERANCE, abs(float(expected)) * RELATIVE_TOLERANCE)
        return abs(float(student) - float(expected)) <= tolerance
    if expected is Blank:
        return student is Blank
    if student is Blank:
        return False
    return str(student).strip().lower() == str(expected).strip().lower()


def mark_spreadsheet_answer(
    result: CellResult,
    chosen_format: str,
    expected_value: Any,
    expected_format: Optional[str],
    must_use_formula: bool = False,
) -> Verdict:
    chosen_format = (chosen_format or "general").lower()
    if chosen_format not in FORMATS:
        chosen_format = "general"

    if result.raw.strip() == "":
        return Verdict(False, "Enter a value or a formula in the answer cell first.", "empty")
    if must_use_formula and not result.is_formula:
        return Verdict(
            False,
            "This task needs a formula. Start your answer with = (for example =SUM(...)).",
            "formula_required",
        )
    if not result.ok:
        return Verdict(
            False,
            f"Your formula returns {result.error}. {result.message}".strip(),
            f"error:{result.error}",
        )
    if not values_match(result.value, expected_value):
        return Verdict(
            False,
            "That's not the expected result yet. Check the cells, ranges and conditions you used.",
            "wrong_value",
        )
    expected_format = (expected_format or "general").lower()
    if chosen_format != expected_format:
        return Verdict(
            False,
            "The value is right, but the cell should be formatted as "
            f"{FORMAT_LABELS.get(expected_format, expected_format)}.",
            "wrong_format",
        )
    return Verdict(True, "Correct. Well done!", "correct")
