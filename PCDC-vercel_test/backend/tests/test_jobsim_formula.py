"""Answer-engine and marking checks for job simulations.

Run from backend/:  python -m pytest tests/test_jobsim_formula.py
(or plain:          python tests/test_jobsim_formula.py)
Expected values are what Excel returns for the same formulas on this data.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.jobsim.formula import Sheet, evaluate_input, format_value, functions_used  # noqa: E402
from services.jobsim.marking import mark_spreadsheet_answer  # noqa: E402

COLUMNS = ["OrderID", "Region", "Revenue", "Cost", "Returned"]
ROWS = [
    ["ORD1001", "North", 24350, 17120, False],
    ["ORD1002", "South", 9880, 7410, True],
    ["ORD1003", "North", 31200, 22950, False],
    ["ORD1004", "West", 15460, 11300, False],
    ["ORD1005", "East", 0, 0, False],
    ["ORD1006", "South", -1200, 300, True],
    ["ORD1007", "north", 5000, None, False],
]
SHEET = Sheet(COLUMNS, ROWS)


def value(formula):
    result = evaluate_input(formula, SHEET)
    return result.error if result.error else result.value


def approx(a, b, tol=1e-9):
    return isinstance(a, float) and abs(a - b) <= tol


CASES = [
    # arithmetic and references
    ("=1+2*3", 7.0),
    ("=(1+2)*3", 9.0),
    ("=2^3", 8.0),
    ("=-C2", -24350.0),
    ("=50%", 0.5),
    ('="a"&"b"', "ab"),
    ("=C2+D2", 41470.0),
    ("=Data!C2", 24350.0),
    ("='Data'!$C$2", 24350.0),
    ("=B1", "Region"),
    ("=D8+1", 1.0),  # blank cell counts as 0
    ("=1/0", "#DIV/0!"),
    ("=B2+1", "#VALUE!"),
    ('="5"+1', 6.0),
    ("=Z2", "#REF!"),
    ("=Other!C2", "#REF!"),
    ("=FOO(1)", "#NAME?"),
    ("=Revenue", "#NAME?"),
    ("=SUM(1,", "#NAME?"),  # syntax error
    # aggregates
    ("=SUM(C2:C8)", 84690.0),
    ("=SUM(C:C)", 84690.0),  # header text is skipped
    ("=SUM(C2:C5000)", 84690.0),  # clipped to the data
    ("=AVERAGE(C2:C8)", 84690.0 / 7),
    ("=AVERAGE(D2:D8)", (17120 + 7410 + 22950 + 11300 + 0 + 300) / 6),  # blank ignored
    ("=MIN(C2:C8)", -1200.0),
    ("=MAX(C2:C8)", 31200.0),
    ("=MIN(B2:B8)", 0.0),  # no numbers -> 0
    ("=COUNT(C2:C8)", 7.0),
    ("=COUNT(D2:D8)", 6.0),
    ("=COUNTA(D2:D8)", 6.0),
    ("=COUNTA(B2:B8)", 7.0),
    ("=MEDIAN(C2:C8)", 9880.0),
    ("=MEDIAN(1,2,3,4)", 2.5),
    ("=ABS(-3)", 3.0),
    ("=AVERAGE(B2:B8)", "#DIV/0!"),
    ("=STDEV(5)", "#DIV/0!"),
    # conditional aggregates (criteria are case-insensitive, support operators/wildcards)
    ('=COUNTIF(B2:B8,"North")', 3.0),
    ('=COUNTIF(C2:C8,">=10000")', 3.0),
    ('=COUNTIF(C2:C8,"<>0")', 6.0),
    ('=COUNTIF(B2:B8,"*th")', 5.0),
    ('=COUNTIF(B2:B8,"?est")', 1.0),
    ('=COUNTIF(E2:E8,TRUE)', 2.0),
    ('=SUMIF(B2:B8,"North",C2:C8)', 60550.0),
    ('=SUMIF(C2:C8,">0")', 85890.0),
    ('=SUMIFS(C2:C8,B2:B8,"North",C2:C8,">10000")', 55550.0),
    ('=COUNTIFS(B2:B8,"South",E2:E8,TRUE)', 2.0),
    ('=AVERAGEIF(B2:B8,"South",C2:C8)', (9880 - 1200) / 2),
    ('=AVERAGEIFS(C2:C8,B2:B8,"North",C2:C8,">6000")', (24350 + 31200) / 2),
    ('=AVERAGEIF(B2:B8,"Nowhere",C2:C8)', "#DIV/0!"),
    ('=SUMIFS(C2:C8,B2:B5,"North")', "#VALUE!"),  # mismatched sizes
    # logic
    ('=IF(C2>20000,"High","Low")', "High"),
    ('=IF(C3>20000,"High")', False),
    ("=IF(1/0>1,1,2)", "#DIV/0!"),
    ('=IFERROR(1/0,"n/a")', "n/a"),
    ("=IFERROR(5,0)", 5.0),
    ("=AND(C2>0,D2>0)", True),
    ("=OR(C6>0,C7>0)", False),
    ("=AND(E2:E3)", False),
    # rounding (half away from zero, like Excel)
    ("=ROUND(2.675,2)", 2.68),
    ("=ROUND(-2.5,0)", -3.0),
    ("=ROUND(1234.5,-2)", 1200.0),
    ("=ROUNDUP(3.141,2)", 3.15),
    ("=ROUNDUP(-3.141,2)", -3.15),
    ("=ROUNDDOWN(3.149,2)", 3.14),
    ("=ROUNDDOWN(-3.149,2)", -3.14),
    # lookups
    ('=VLOOKUP("ORD1003",A2:E8,3,FALSE)', 31200.0),
    ('=VLOOKUP("ord1003",A2:E8,2,FALSE)', "North"),
    ('=VLOOKUP("ORD9999",A2:E8,3,FALSE)', "#N/A"),
    ('=VLOOKUP("ORD1003",A2:E8,9,FALSE)', "#REF!"),
    ('=VLOOKUP("ORD1003",A2:E8,0,FALSE)', "#VALUE!"),
    ('=VLOOKUP("ORD1004",A2:E8,3)', 15460.0),  # approximate on sorted keys
    ("=INDEX(C2:C8,3)", 31200.0),
    ("=INDEX(A2:E8,2,2)", "South"),
    ("=INDEX(A2:E8,20,1)", "#REF!"),
    ('=MATCH("ORD1005",A2:A8,0)', 5.0),
    ('=MATCH("West",B2:B8,0)', 4.0),
    ('=MATCH("Nope",B2:B8,0)', "#N/A"),
    ('=INDEX(C2:C8,MATCH("ORD1004",A2:A8,0))', 15460.0),
    ("=STDEV(C2:C4)", None),  # checked separately below
    # typed values
    ("124500", 124500.0),
    ("1,24,500", 124500.0),
    ("₹ 2,000.50", 2000.5),
    ("12.5%", 0.125),
    ("hello", "hello"),
    ("TRUE", True),
]


def test_engine_values():
    failures = []
    for formula, expected in CASES:
        if expected is None:
            continue
        got = value(formula)
        ok = approx(got, expected) if isinstance(expected, float) else got == expected
        if not ok:
            failures.append(f"{formula}: expected {expected!r}, got {got!r}")
    stdev = value("=STDEV(C2:C4)")
    if not approx(stdev, 10884.5900244, 1e-6):
        failures.append(f"=STDEV(C2:C4): expected 10884.59, got {stdev!r}")
    assert not failures, "\n".join(failures)


def test_formats():
    cases = [
        (12458300.0, "currency", "₹ 1,24,58,300.00"),
        (-1234.5, "currency", "-₹ 1,234.50"),
        (999.999, "currency", "₹ 1,000.00"),
        (1234567.891, "number", "12,34,567.89"),
        (0.1234, "percent", "12.34%"),
        (0.38, "percent", "38.00%"),
        (12099.0, "general", "12099"),
        (1 / 3, "general", "0.3333333333"),
        (0.0, "general", "0"),
        ("North", "currency", "North"),
        (True, "number", "TRUE"),
    ]
    failures = [
        f"{v!r} as {fmt}: expected {want!r}, got {format_value(v, fmt)!r}"
        for v, fmt, want in cases
        if format_value(v, fmt) != want
    ]
    assert not failures, "\n".join(failures)


def test_marking():
    expected, fmt = 60550.0, "currency"

    def mark(raw, chosen, must_use_formula=False):
        return mark_spreadsheet_answer(
            evaluate_input(raw, SHEET), chosen, expected, fmt, must_use_formula
        )

    right = mark('=SUMIF(B2:B8,"North",C2:C8)', "currency")
    assert right.is_correct, right.message
    wrong_format = mark('=SUMIF(B2:B8,"North",C2:C8)', "number")
    assert not wrong_format.is_correct and "formatted as Currency" in wrong_format.message
    wrong_value = mark('=SUMIF(B2:B8,"South",C2:C8)', "currency")
    assert not wrong_value.is_correct
    assert "60550" not in wrong_value.message and "60,550" not in wrong_value.message
    error = mark("=1/0", "currency")
    assert not error.is_correct and "#DIV/0!" in error.message
    assert not mark("", "currency").is_correct
    assert mark("60550", "currency").is_correct  # typed value allowed by default
    typed = mark("60550", "currency", must_use_formula=True)
    assert not typed.is_correct and "formula" in typed.message
    assert mark("60800", "currency").is_correct  # within 0.5%
    assert not mark("61000", "currency").is_correct  # outside 0.5%
    for verdict in (right, wrong_format, wrong_value, error, typed):
        assert "60550" not in verdict.message and "60,550" not in verdict.message


# Blanks, text, zero and negatives, as Excel returns them (handover section 14.1).
REFERENCE_COLUMNS = ["ID", "Region", "Rev", "Cost", "Flag", "Note"]
REFERENCE_ROWS = [
    ["A1", "North", 100, 40, True, "x"],
    ["A2", "South", 200, 80, False, None],
    ["A3", "North", 0, 0, True, ""],
    ["A4", "West", -50, 10, False, "text"],
    ["A5", "East", None, 5, True, "n/a"],
    ["A6", "north", 2.5, None, False, "3"],
]
REFERENCE_SHEET = Sheet(REFERENCE_COLUMNS, REFERENCE_ROWS)
REFERENCE_CASES = [
    # one cell works like a one-cell range
    ("=SUM(B2)", 0.0), ("=SUM(C6)", 0.0), ("=SUM(E2)", 0.0), ("=AVERAGE(B2)", "#DIV/0!"), ("=MAX(B2)", 0.0),
    ("=MIN(C2,C3)", 100.0), ("=COUNT(B2)", 0.0), ("=COUNT(C2)", 1.0), ("=COUNTA(C6)", 0.0), ("=COUNTA(B2)", 1.0),
    ("=MEDIAN(B2)", "#NUM!"), ("=STDEV(B2,C2)", "#DIV/0!"), ("=AND(F2)", "#VALUE!"), ("=AND(E2,E4)", True),
    ('=COUNTIF(B2,"North")', 1.0), ('=SUMIF(B2,"North",C2)', 100.0), ('=COUNTIF(B2:B7,B2)', 3.0),
    # direct text is still an error
    ('=SUM("abc",1)', "#VALUE!"), ('=SUM("5",1)', 6.0), ("=SUM(TRUE,1)", 2.0),
    # text numbers match = and <> but not < or >
    ('=COUNTIF(F2:F7,"3")', 1.0), ("=COUNTIF(F2:F7,3)", 1.0), ('=COUNTIF(F2:F7,">=3")', 0.0), ('=COUNTIF(F2:F7,"<>3")', 5.0),
    # how a range can be written
    ("= SUM( C2 : C7 )", 252.5), ("=SUM(Data!C2:Data!C7)", 252.5), ("=SUM(Data!C2 : C7)", 252.5), ("=SUM(C : C)", 252.5),
    ("=sum($c$2:$c$7)", 252.5), ("=SUM(Other!C2:C7)", "#REF!"), ("=SUM(Data!C2:Other!C7)", "#REF!"),
    # every function on blanks, zero, negatives
    ("=AVERAGE(C2:C7)", 50.5), ("=AVERAGE(F2:F7)", "#DIV/0!"), ("=MIN(F2:F7)", 0.0), ("=COUNT(E2:E7)", 0.0),
    ("=COUNTA(F2:F7)", 4.0), ('=COUNTIF(C2:C7,0)', 1.0), ('=COUNTIFS(B2:B7,"North",C2:C7,">0")', 2.0),
    ('=COUNTIFS(B2:B3,"North",C2:C7,">0")', "#VALUE!"), ('=SUMIF(B2:B7,"None",C2:C7)', 0.0),
    ('=SUMIFS(C2:C7,B2:B7,"North",D2:D7,">=0")', 100.0), ('=AVERAGEIFS(C2:C7,B2:B7,"Zed")', "#DIV/0!"),
    ('=IF(C4,"t","f")', "f"), ('=IF(C6=0,"blank","no")', "blank"), ('=IF("a",1,2)', "#VALUE!"), ("=IF(TRUE,1,1/0)", 1.0),
    ('=IFERROR(VLOOKUP("Z",A2:B7,2,FALSE),0)', 0.0), ('=AND("a")', "#VALUE!"), ("=AND(1/0,TRUE)", "#DIV/0!"), ("=OR(FALSE,0)", False),
    ("=ROUND(1.005,2)", 1.01), ("=ROUND(C6,0)", 0.0), ('=ROUND("a",1)', "#VALUE!"), ("=ROUNDUP(-2.1,0)", -3.0),
    ("=ROUNDDOWN(1239,-2)", 1200.0), ("=ABS(C5)", 50.0), ("=ABS(C6)", 0.0), ('=ABS("a")', "#VALUE!"), ('=ABS("-2")', 2.0),
    ("=MEDIAN(C2:C7)", 2.5), ("=MEDIAN(F2:F7)", "#NUM!"), ("=STDEV(F2:F7)", "#DIV/0!"),
    ('=VLOOKUP("A3",A2:D7,3,FALSE)', 0.0), ('=VLOOKUP("a2",A2:D7,4,FALSE)', 80.0), ('=VLOOKUP("Z",A2:D7,2,FALSE)', "#N/A"),
    ('=VLOOKUP("A2",A2:D7,9,FALSE)', "#REF!"), ('=VLOOKUP("A2",A2:D7,0,FALSE)', "#VALUE!"),
    ("=INDEX(C2:C7,99)", "#REF!"), ("=INDEX(A2:D7,2,3)", 200.0), ('=INDEX(C2:C7,"a")', "#VALUE!"),
    ('=MATCH("a3",A2:A7,0)', 3.0), ('=MATCH("Z",A2:A7,0)', "#N/A"), ('=INDEX(C2:C7,MATCH("A2",A2:A7,0))', 200.0),
    # the six errors students can see
    ("=FOO(1)", "#NAME?"), ("=C2+B2", "#VALUE!"), ("=K2", "#REF!"), ("=1/0", "#DIV/0!"), ("=SUM(C2:C3", "#NAME?"),
]


def test_excel_reference():
    for formula, expected in REFERENCE_CASES:
        result = evaluate_input(formula, REFERENCE_SHEET)
        got = result.error if result.error else result.value
        if isinstance(expected, float) and isinstance(got, float):
            assert abs(got - expected) < 1e-9, (formula, got, expected)
        else:
            assert got == expected and type(got) is type(expected), (formula, got, expected)


def test_functions_used():
    assert functions_used('=IFERROR(SUMIF(B2:B8,"North",C2:C8)/COUNT(C2:C8),0)') == [
        "IFERROR", "SUMIF", "COUNT",
    ]


if __name__ == "__main__":
    for test in (test_engine_values, test_excel_reference, test_formats, test_marking, test_functions_used):
        test()
        print(f"ok  {test.__name__}")
    print(f"{len(CASES) + len(REFERENCE_CASES)} formula cases checked")
