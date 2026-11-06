"""Answer engine: the one spreadsheet-formula evaluator for job simulations.

Everything that needs a formula's value goes through here: showing a student
the result of what they typed, building the per-attempt answer keys, and
marking. There is deliberately no browser copy, so the value a student sees
and the value that is marked can never disagree.

Scope (handover section 8.1):
- operators + - * / ^ & and brackets, comparisons = <> < > <= >=, a trailing %;
- numbers, "text", TRUE/FALSE;
- references into the read-only dataset sheet ("Data"): A2, $C$10, B2:B2001,
  whole columns C:C, with an optional Data! / 'Data'! prefix;
- 25 functions: SUM AVERAGE MIN MAX COUNT COUNTA COUNTIF COUNTIFS SUMIF SUMIFS
  AVERAGEIF AVERAGEIFS IF IFERROR AND OR ROUND ROUNDUP ROUNDDOWN ABS MEDIAN
  STDEV VLOOKUP INDEX MATCH;
- Excel errors #NAME? #VALUE! #REF! #DIV/0! #N/A #NUM!.

The dataset sheet has its header in row 1 and data from row 2; column A is the
first dataset column.
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass
from decimal import ROUND_DOWN, ROUND_HALF_UP, ROUND_UP, Decimal
from typing import Any, Callable, Dict, List, Optional, Sequence, Tuple, Union

SHEET_NAME = "Data"
MAX_FORMULA_LENGTH = 1000


# ---------------------------------------------------------------------------
# Values
# ---------------------------------------------------------------------------


class FormulaError(Exception):
    """An Excel error value (#DIV/0! and friends). Raised while evaluating and
    caught at the top so it becomes the cell's result."""

    def __init__(self, code: str, message: str = ""):
        super().__init__(code)
        self.code = code
        self.message = message


NAME = "#NAME?"
VALUE = "#VALUE!"
REF = "#REF!"
DIV0 = "#DIV/0!"
NA = "#N/A"
NUM = "#NUM!"

ERROR_MESSAGES = {
    NAME: "The formula uses a name or function the sheet doesn't recognise.",
    VALUE: "The formula uses the wrong type of value somewhere (for example text in a calculation).",
    REF: "The formula refers to a cell or column outside the data.",
    DIV0: "The formula divides by zero, or averages an empty set.",
    NA: "A lookup didn't find the value it was looking for.",
    NUM: "The result is not a valid number.",
}

Blank = None  # an empty cell


@dataclass
class Range:
    """A rectangular block of dataset values (rows of columns)."""

    rows: List[List[Any]]

    @property
    def height(self) -> int:
        return len(self.rows)

    @property
    def width(self) -> int:
        return len(self.rows[0]) if self.rows else 0

    def flat(self) -> List[Any]:
        return [value for row in self.rows for value in row]


Value = Union[float, str, bool, None, Range]


# ---------------------------------------------------------------------------
# Dataset access
# ---------------------------------------------------------------------------


def column_index(letters: str) -> int:
    """'A' -> 0, 'Z' -> 25, 'AA' -> 26."""
    index = 0
    for ch in letters.upper():
        index = index * 26 + (ord(ch) - 64)
    return index - 1


def column_letters(index: int) -> str:
    letters = ""
    index += 1
    while index:
        index, rem = divmod(index - 1, 26)
        letters = chr(65 + rem) + letters
    return letters


class Sheet:
    """The read-only dataset as a grid: row 1 is the header, data from row 2."""

    def __init__(self, columns: Sequence[str], rows: Sequence[Sequence[Any]]):
        self.columns = list(columns)
        self.rows = [list(r) for r in rows]

    @property
    def last_row(self) -> int:
        return len(self.rows) + 1

    def cell(self, row: int, col: int) -> Any:
        if col < 0 or col >= len(self.columns) or row < 1 or row > self.last_row:
            raise FormulaError(REF)
        if row == 1:
            return self.columns[col]
        values = self.rows[row - 2]
        return _cell_value(values[col] if col < len(values) else None)

    def block(self, r1: int, c1: int, r2: int, c2: int) -> Range:
        r1, r2 = min(r1, r2), max(r1, r2)
        c1, c2 = min(c1, c2), max(c1, c2)
        if c1 < 0 or c2 >= len(self.columns) or r1 < 1 or r1 > self.last_row:
            raise FormulaError(REF)
        r2 = min(r2, self.last_row)  # B2:B5000 on a 2,000-row sheet stops at the data
        return Range([[self.cell(r, c) for c in range(c1, c2 + 1)] for r in range(r1, r2 + 1)])


def _cell_value(raw: Any) -> Any:
    if raw is None or raw == "":
        return Blank
    if isinstance(raw, bool):
        return raw
    if isinstance(raw, (int, float)):
        return float(raw)
    return str(raw)


# ---------------------------------------------------------------------------
# Tokenizer
# ---------------------------------------------------------------------------

_TOKEN_RE = re.compile(
    r"""
    (?P<ws>\s+)
  | (?P<string>"(?:[^"]|"")*")
  | (?P<range>(?:(?:'[^']+'|[A-Za-z_][A-Za-z0-9_]*)!)?\$?[A-Za-z]{1,3}\$?[0-9]+\s*:\s*(?:(?:'[^']+'|[A-Za-z_][A-Za-z0-9_]*)!)?\$?[A-Za-z]{1,3}\$?[0-9]+)
  | (?P<colrange>(?:(?:'[^']+'|[A-Za-z_][A-Za-z0-9_]*)!)?\$?[A-Za-z]{1,3}\s*:\s*(?:(?:'[^']+'|[A-Za-z_][A-Za-z0-9_]*)!)?\$?[A-Za-z]{1,3}(?![A-Za-z0-9_(]))
  | (?P<cell>(?:(?:'[^']+'|[A-Za-z_][A-Za-z0-9_]*)!)?\$?[A-Za-z]{1,3}\$?[0-9]+(?![A-Za-z0-9_(]))
  | (?P<number>(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)
  | (?P<name>[A-Za-z_][A-Za-z0-9_.]*)
  | (?P<op><>|<=|>=|[-+*/^&=<>%(),:;])
    """,
    re.VERBOSE,
)


@dataclass
class Token:
    kind: str
    text: str


def tokenize(source: str) -> List[Token]:
    tokens: List[Token] = []
    pos = 0
    while pos < len(source):
        match = _TOKEN_RE.match(source, pos)
        if not match:
            raise SyntaxError(f"Unexpected character '{source[pos]}'")
        pos = match.end()
        kind = match.lastgroup or ""
        if kind == "ws":
            continue
        text = match.group(kind)
        if kind == "op" and text == ";":
            text = ","  # some locales separate arguments with ;
        tokens.append(Token(kind, text))
    return tokens


# ---------------------------------------------------------------------------
# Parser -> small AST of tuples
# ---------------------------------------------------------------------------

_COMPARISON = {"=", "<>", "<", ">", "<=", ">="}


class _Parser:
    def __init__(self, tokens: List[Token]):
        self.tokens = tokens
        self.pos = 0

    def peek(self) -> Optional[Token]:
        return self.tokens[self.pos] if self.pos < len(self.tokens) else None

    def take(self) -> Token:
        token = self.peek()
        if token is None:
            raise SyntaxError("The formula ends too early")
        self.pos += 1
        return token

    def expect(self, text: str) -> None:
        token = self.take()
        if token.text != text:
            raise SyntaxError(f"Expected '{text}'")

    def at_op(self, *ops: str) -> bool:
        token = self.peek()
        return token is not None and token.kind == "op" and token.text in ops

    def parse(self) -> Any:
        node = self.comparison()
        if self.peek() is not None:
            raise SyntaxError(f"Unexpected '{self.peek().text}'")
        return node

    def comparison(self) -> Any:
        node = self.concat()
        while self.at_op(*_COMPARISON):
            op = self.take().text
            node = ("binop", op, node, self.concat())
        return node

    def concat(self) -> Any:
        node = self.additive()
        while self.at_op("&"):
            self.take()
            node = ("binop", "&", node, self.additive())
        return node

    def additive(self) -> Any:
        node = self.term()
        while self.at_op("+", "-"):
            op = self.take().text
            node = ("binop", op, node, self.term())
        return node

    def term(self) -> Any:
        node = self.power()
        while self.at_op("*", "/"):
            op = self.take().text
            node = ("binop", op, node, self.power())
        return node

    def power(self) -> Any:
        node = self.unary()
        while self.at_op("^"):
            self.take()
            node = ("binop", "^", node, self.unary())
        return node

    def unary(self) -> Any:
        if self.at_op("-", "+"):
            op = self.take().text
            operand = self.unary()
            return ("neg", operand) if op == "-" else ("pos", operand)
        return self.postfix()

    def postfix(self) -> Any:
        node = self.primary()
        while self.at_op("%"):
            self.take()
            node = ("percent", node)
        return node

    def primary(self) -> Any:
        token = self.take()
        if token.kind == "number":
            return ("num", float(token.text))
        if token.kind == "string":
            return ("str", token.text[1:-1].replace('""', '"'))
        if token.kind in ("cell", "range", "colrange"):
            return (token.kind, token.text)
        if token.kind == "name":
            upper = token.text.upper()
            if self.at_op("("):
                self.take()
                args: List[Any] = []
                if not self.at_op(")"):
                    while True:
                        if self.at_op(",", ")"):
                            args.append(("missing",))
                        else:
                            args.append(self.comparison())
                        if self.at_op(","):
                            self.take()
                            continue
                        break
                self.expect(")")
                return ("call", upper, args)
            if upper in ("TRUE", "FALSE"):
                return ("bool", upper == "TRUE")
            return ("name", token.text)
        if token.kind == "op" and token.text == "(":
            node = self.comparison()
            self.expect(")")
            return node
        raise SyntaxError(f"Unexpected '{token.text}'")


def parse(formula_body: str) -> Any:
    return _Parser(tokenize(formula_body)).parse()


# ---------------------------------------------------------------------------
# Evaluation helpers
# ---------------------------------------------------------------------------

_REF_RE = re.compile(r"^(?:(?P<sheet>'[^']+'|[A-Za-z_][A-Za-z0-9_]*)!)?(?P<body>.+)$")
_CELL_RE = re.compile(r"^\$?(?P<col>[A-Za-z]{1,3})\$?(?P<row>[0-9]+)$")


def _split_sheet(text: str) -> str:
    match = _REF_RE.match(text)
    sheet = (match.group("sheet") or SHEET_NAME).strip("'")
    if sheet.lower() != SHEET_NAME.lower():
        raise FormulaError(REF)
    return match.group("body")


def _range_ends(text: str) -> Tuple[str, str]:
    """The two ends of a range; Data!B2:B9, B2 : B9 and Data!B2:Data!B9 are all valid."""
    first, second = _split_sheet(text).split(":", 1)
    return first.strip(), _split_sheet(second.strip())


def _parse_cell(text: str) -> Tuple[int, int]:
    match = _CELL_RE.match(text)
    if not match:
        raise FormulaError(REF)
    return int(match.group("row")), column_index(match.group("col"))


def to_number(value: Any) -> float:
    """Excel coercion for arithmetic: blank -> 0, TRUE -> 1, numeric text -> number."""
    if isinstance(value, Range):
        if value.height == 1 and value.width == 1:
            return to_number(value.rows[0][0])
        raise FormulaError(VALUE)
    if value is Blank:
        return 0.0
    if isinstance(value, bool):
        return 1.0 if value else 0.0
    if isinstance(value, (int, float)):
        return float(value)
    parsed = parse_number_text(str(value))
    if parsed is None:
        raise FormulaError(VALUE)
    return parsed


def to_text(value: Any) -> str:
    if isinstance(value, Range):
        return to_text(_scalar(value))
    if value is Blank:
        return ""
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    if isinstance(value, float):
        return general_number(value)
    return str(value)


def to_bool(value: Any) -> bool:
    if isinstance(value, Range):
        return to_bool(_scalar(value))
    if value is Blank:
        return False
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    upper = str(value).strip().upper()
    if upper in ("TRUE", "FALSE"):
        return upper == "TRUE"
    raise FormulaError(VALUE)


def _scalar(value: Any) -> Any:
    if isinstance(value, Range):
        if value.height == 1 and value.width == 1:
            return value.rows[0][0]
        raise FormulaError(VALUE)
    return value


def _check_number(number: float) -> float:
    if math.isnan(number) or math.isinf(number):
        raise FormulaError(NUM)
    return number


def _compare(left: Any, right: Any) -> int:
    """Excel ordering: numbers < text < booleans; text compares case-insensitively."""
    left, right = _scalar(left), _scalar(right)

    def rank(v: Any) -> int:
        if isinstance(v, bool):
            return 2
        if isinstance(v, str):
            return 1
        return 0

    if left is Blank:
        left = "" if isinstance(right, str) else (False if isinstance(right, bool) else 0.0)
    if right is Blank:
        right = "" if isinstance(left, str) else (False if isinstance(left, bool) else 0.0)
    rl, rr = rank(left), rank(right)
    if rl != rr:
        return -1 if rl < rr else 1
    if rl == 1:
        a, b = left.lower(), right.lower()
    else:
        a, b = left, right
    return (a > b) - (a < b)


# ---------------------------------------------------------------------------
# Criteria (COUNTIF / SUMIF / ...)
# ---------------------------------------------------------------------------

_CRITERIA_OP_RE = re.compile(r"^(<>|<=|>=|=|<|>)?(.*)$", re.DOTALL)


def _wildcard_regex(pattern: str) -> "re.Pattern[str]":
    out = ""
    i = 0
    while i < len(pattern):
        ch = pattern[i]
        if ch == "~" and i + 1 < len(pattern) and pattern[i + 1] in "*?~":
            out += re.escape(pattern[i + 1])
            i += 2
            continue
        out += ".*" if ch == "*" else "." if ch == "?" else re.escape(ch)
        i += 1
    return re.compile(f"^{out}$", re.IGNORECASE | re.DOTALL)


def make_criteria(criteria: Any) -> Callable[[Any], bool]:
    criteria = _scalar(criteria)
    if isinstance(criteria, bool):
        return lambda v: isinstance(v, bool) and v == criteria
    if isinstance(criteria, float) or criteria is Blank:
        target = 0.0 if criteria is Blank else criteria
        return lambda v: (isinstance(v, float) and not isinstance(v, bool) and v == target) or (
            isinstance(v, str) and parse_number_text(v) == target
        )
    text = str(criteria)
    match = _CRITERIA_OP_RE.match(text)
    op = match.group(1) or "="
    operand = match.group(2)
    number = parse_number_text(operand)

    if number is not None:
        def numeric(v: Any) -> bool:
            # "3" as text matches = and <> like the number 3, but never < or >.
            if isinstance(v, str) and op in ("=", "<>") and parse_number_text(v) == number:
                return op == "="
            if isinstance(v, bool) or not isinstance(v, float):
                return op == "<>"
            return {
                "=": v == number, "<>": v != number, "<": v < number,
                ">": v > number, "<=": v <= number, ">=": v >= number,
            }[op]
        return numeric

    if operand == "":
        if op == "=":
            return lambda v: v is Blank or v == ""
        if op == "<>":
            return lambda v: not (v is Blank or v == "")
    upper = operand.upper()
    if upper in ("TRUE", "FALSE") and op in ("=", "<>"):
        flag = upper == "TRUE"
        return lambda v: (isinstance(v, bool) and v == flag) == (op == "=")
    if op in ("=", "<>"):
        regex = _wildcard_regex(operand)
        if op == "=":
            return lambda v: isinstance(v, str) and bool(regex.match(v))
        return lambda v: not (isinstance(v, str) and bool(regex.match(v)))

    def text_compare(v: Any) -> bool:
        if not isinstance(v, str):
            return False
        a, b = v.lower(), operand.lower()
        return {"<": a < b, ">": a > b, "<=": a <= b, ">=": a >= b}[op]
    return text_compare


# ---------------------------------------------------------------------------
# Evaluator
# ---------------------------------------------------------------------------


_RANGE_ARG_FUNCTIONS = {
    "SUM", "AVERAGE", "MIN", "MAX", "COUNT", "COUNTA", "MEDIAN", "STDEV", "AND", "OR",
    "COUNTIF", "COUNTIFS", "SUMIF", "SUMIFS", "AVERAGEIF", "AVERAGEIFS",
}


class Evaluator:
    def __init__(self, sheet: Sheet):
        self.sheet = sheet

    def eval(self, node: Any) -> Any:
        kind = node[0]
        if kind == "num":
            return node[1]
        if kind == "str":
            return node[1]
        if kind == "bool":
            return node[1]
        if kind == "missing":
            return Blank
        if kind == "name":
            raise FormulaError(NAME)
        if kind == "cell":
            row, col = _parse_cell(_split_sheet(node[1]))
            return self.sheet.cell(row, col)
        if kind == "range":
            first, second = _range_ends(node[1])
            r1, c1 = _parse_cell(first)
            r2, c2 = _parse_cell(second)
            return self.sheet.block(r1, c1, r2, c2)
        if kind == "colrange":
            first, second = _range_ends(node[1])
            c1 = column_index(first.replace("$", ""))
            c2 = column_index(second.replace("$", ""))
            # Whole column: the header row is text, so SUM/AVERAGE skip it like Excel.
            return self.sheet.block(1, c1, self.sheet.last_row, c2)
        if kind == "neg":
            return _check_number(-to_number(self.eval(node[1])))
        if kind == "pos":
            return to_number(self.eval(node[1]))
        if kind == "percent":
            return to_number(self.eval(node[1])) / 100.0
        if kind == "binop":
            return self.binop(node[1], node[2], node[3])
        if kind == "call":
            return self.call(node[1], node[2])
        raise FormulaError(VALUE)

    def binop(self, op: str, left_node: Any, right_node: Any) -> Any:
        left = self.eval(left_node)
        right = self.eval(right_node)
        if op == "&":
            return to_text(left) + to_text(right)
        if op in _COMPARISON:
            result = _compare(left, right)
            return {
                "=": result == 0, "<>": result != 0, "<": result < 0,
                ">": result > 0, "<=": result <= 0, ">=": result >= 0,
            }[op]
        a, b = to_number(left), to_number(right)
        if op == "+":
            return _check_number(a + b)
        if op == "-":
            return _check_number(a - b)
        if op == "*":
            return _check_number(a * b)
        if op == "/":
            if b == 0:
                raise FormulaError(DIV0)
            return _check_number(a / b)
        if op == "^":
            try:
                result = a ** b
            except (OverflowError, ZeroDivisionError):
                raise FormulaError(NUM)
            if isinstance(result, complex):
                raise FormulaError(NUM)
            return _check_number(float(result))
        raise FormulaError(VALUE)

    # -- function plumbing -------------------------------------------------

    def call(self, name: str, args: List[Any]) -> Any:
        if name == "IF":
            return self.fn_if(args)
        if name == "IFERROR":
            return self.fn_iferror(args)
        handler = FUNCTIONS.get(name)
        if handler is None:
            raise FormulaError(NAME)
        low, high = ARITY[name]
        if len(args) < low or (high is not None and len(args) > high):
            raise FormulaError(VALUE, f"{name} has the wrong number of arguments.")
        if name in _RANGE_ARG_FUNCTIONS:
            # A single cell counts as a one-cell range, so =SUM(B2) on a text
            # cell is 0 like Excel, not #VALUE!.
            return handler(self, [Range([[self.eval(a)]]) if a[0] == "cell" else self.eval(a) for a in args])
        return handler(self, [self.eval(a) for a in args])

    def fn_if(self, args: List[Any]) -> Any:
        if not 2 <= len(args) <= 3:
            raise FormulaError(VALUE, "IF has the wrong number of arguments.")
        if to_bool(self.eval(args[0])):
            return self.eval(args[1])
        return self.eval(args[2]) if len(args) == 3 else False

    def fn_iferror(self, args: List[Any]) -> Any:
        if len(args) != 2:
            raise FormulaError(VALUE, "IFERROR needs two arguments.")
        try:
            return self.eval(args[0])
        except FormulaError:
            return self.eval(args[1])


def _numbers(args: Sequence[Any]) -> List[float]:
    """Numbers for SUM/AVERAGE/MIN/...: from ranges only real numbers count;
    direct arguments are coerced (TRUE -> 1, "5" -> 5, "abc" -> #VALUE!)."""
    out: List[float] = []
    for arg in args:
        if isinstance(arg, Range):
            out.extend(v for v in arg.flat() if isinstance(v, float) and not isinstance(v, bool))
        elif arg is Blank:
            continue
        else:
            out.append(to_number(arg))
    return out


def _f_sum(_: Evaluator, args: List[Any]) -> float:
    return _check_number(math.fsum(_numbers(args)))


def _f_average(_: Evaluator, args: List[Any]) -> float:
    nums = _numbers(args)
    if not nums:
        raise FormulaError(DIV0)
    return math.fsum(nums) / len(nums)


def _f_min(_: Evaluator, args: List[Any]) -> float:
    nums = _numbers(args)
    return min(nums) if nums else 0.0


def _f_max(_: Evaluator, args: List[Any]) -> float:
    nums = _numbers(args)
    return max(nums) if nums else 0.0


def _f_count(_: Evaluator, args: List[Any]) -> float:
    total = 0
    for arg in args:
        if isinstance(arg, Range):
            total += sum(1 for v in arg.flat() if isinstance(v, float) and not isinstance(v, bool))
        elif isinstance(arg, (float, bool)) or (isinstance(arg, str) and parse_number_text(arg) is not None):
            total += 1
    return float(total)


def _f_counta(_: Evaluator, args: List[Any]) -> float:
    total = 0
    for arg in args:
        if isinstance(arg, Range):
            total += sum(1 for v in arg.flat() if v is not Blank)
        elif arg is not Blank:
            total += 1
    return float(total)


def _as_range(value: Any) -> Range:
    if isinstance(value, Range):
        return value
    raise FormulaError(VALUE, "This argument needs a range such as B2:B100.")


def _paired_ranges(pairs: List[Tuple[Any, Any]], size_like: Optional[Range] = None) -> List[bool]:
    """For *IFS: True for each position where every (range, criteria) matches."""
    ranges = [(_as_range(r), make_criteria(c)) for r, c in pairs]
    shape = (size_like or ranges[0][0])
    for rng, _ in ranges:
        if rng.height != shape.height or rng.width != shape.width:
            raise FormulaError(VALUE, "All ranges must be the same size.")
    flats = [(rng.flat(), test) for rng, test in ranges]
    length = shape.height * shape.width
    return [all(test(flat[i]) for flat, test in flats) for i in range(length)]


def _f_countif(_: Evaluator, args: List[Any]) -> float:
    return float(sum(_paired_ranges([(args[0], args[1])])))


def _f_countifs(_: Evaluator, args: List[Any]) -> float:
    if len(args) % 2:
        raise FormulaError(VALUE, "COUNTIFS needs range/criteria pairs.")
    return float(sum(_paired_ranges(list(zip(args[0::2], args[1::2])))))


def _sum_matching(values: Range, mask: List[bool]) -> List[float]:
    flat = values.flat()
    return [
        flat[i] for i, ok in enumerate(mask)
        if ok and isinstance(flat[i], float) and not isinstance(flat[i], bool)
    ]


def _f_sumif(_: Evaluator, args: List[Any]) -> float:
    criteria_range = _as_range(args[0])
    values = _as_range(args[2]) if len(args) == 3 and args[2] is not Blank else criteria_range
    mask = _paired_ranges([(criteria_range, args[1])], size_like=values)
    return math.fsum(_sum_matching(values, mask))


def _f_sumifs(_: Evaluator, args: List[Any]) -> float:
    if len(args) % 2 == 0:
        raise FormulaError(VALUE, "SUMIFS needs a sum range then range/criteria pairs.")
    values = _as_range(args[0])
    mask = _paired_ranges(list(zip(args[1::2], args[2::2])), size_like=values)
    return math.fsum(_sum_matching(values, mask))


def _f_averageif(_: Evaluator, args: List[Any]) -> float:
    criteria_range = _as_range(args[0])
    values = _as_range(args[2]) if len(args) == 3 and args[2] is not Blank else criteria_range
    nums = _sum_matching(values, _paired_ranges([(criteria_range, args[1])], size_like=values))
    if not nums:
        raise FormulaError(DIV0)
    return math.fsum(nums) / len(nums)


def _f_averageifs(_: Evaluator, args: List[Any]) -> float:
    if len(args) % 2 == 0:
        raise FormulaError(VALUE, "AVERAGEIFS needs an average range then range/criteria pairs.")
    values = _as_range(args[0])
    nums = _sum_matching(values, _paired_ranges(list(zip(args[1::2], args[2::2])), size_like=values))
    if not nums:
        raise FormulaError(DIV0)
    return math.fsum(nums) / len(nums)


def _logical_values(args: List[Any]) -> List[bool]:
    out: List[bool] = []
    for arg in args:
        if isinstance(arg, Range):
            out.extend(bool(v) for v in arg.flat() if isinstance(v, (bool, float)))
        elif arg is Blank:
            continue
        else:
            out.append(to_bool(arg))
    if not out:
        raise FormulaError(VALUE)
    return out


def _f_and(_: Evaluator, args: List[Any]) -> bool:
    return all(_logical_values(args))


def _f_or(_: Evaluator, args: List[Any]) -> bool:
    return any(_logical_values(args))


def _round(value: Any, digits: Any, mode: str) -> float:
    number = to_number(value)
    places = int(math.trunc(to_number(digits)))
    quant = Decimal(1).scaleb(-places)
    dec = Decimal(repr(number))
    if mode == "half":
        rounding = ROUND_HALF_UP  # Excel rounds half away from zero
    elif mode == "up":
        rounding = ROUND_UP  # away from zero
    else:
        rounding = ROUND_DOWN  # toward zero
    try:
        return float(dec.quantize(quant, rounding=rounding))
    except Exception:  # noqa: BLE001 - absurd digit counts
        raise FormulaError(NUM)


def _f_round(_: Evaluator, args: List[Any]) -> float:
    return _round(args[0], args[1], "half")


def _f_roundup(_: Evaluator, args: List[Any]) -> float:
    return _round(args[0], args[1], "up")


def _f_rounddown(_: Evaluator, args: List[Any]) -> float:
    return _round(args[0], args[1], "down")


def _f_abs(_: Evaluator, args: List[Any]) -> float:
    return abs(to_number(args[0]))


def _f_median(_: Evaluator, args: List[Any]) -> float:
    nums = sorted(_numbers(args))
    if not nums:
        raise FormulaError(NUM)
    mid = len(nums) // 2
    return nums[mid] if len(nums) % 2 else (nums[mid - 1] + nums[mid]) / 2


def _f_stdev(_: Evaluator, args: List[Any]) -> float:
    nums = _numbers(args)
    if len(nums) < 2:
        raise FormulaError(DIV0)
    mean = math.fsum(nums) / len(nums)
    return math.sqrt(math.fsum((x - mean) ** 2 for x in nums) / (len(nums) - 1))


def _approx_match(values: List[Any], target: Any, descending: bool = False) -> int:
    """Excel's approximate lookup on sorted data: last position <= target
    (or, for descending, last position >= target). -1 when none."""
    found = -1
    for i, v in enumerate(values):
        if v is Blank:
            continue
        cmp = _compare(v, target)
        if (cmp <= 0) if not descending else (cmp >= 0):
            found = i
        else:
            break
    return found


def _exact_match(values: List[Any], target: Any) -> int:
    target = _scalar(target)
    if isinstance(target, str):
        regex = _wildcard_regex(target)
        for i, v in enumerate(values):
            if isinstance(v, str) and regex.match(v):
                return i
        return -1
    for i, v in enumerate(values):
        if v is not Blank and _compare(v, target) == 0 and type(v) is type(target):
            return i
    return -1


def _f_vlookup(_: Evaluator, args: List[Any]) -> Any:
    target = _scalar(args[0])
    table = _as_range(args[1])
    col = int(math.trunc(to_number(args[2])))
    exact = len(args) == 4 and args[3] is not Blank and not to_bool(args[3])
    if col < 1:
        raise FormulaError(VALUE)
    if col > table.width:
        raise FormulaError(REF)
    keys = [row[0] for row in table.rows]
    index = _exact_match(keys, target) if exact else _approx_match(keys, target)
    if index < 0:
        raise FormulaError(NA)
    return table.rows[index][col - 1]


def _f_index(_: Evaluator, args: List[Any]) -> Any:
    table = _as_range(args[0])
    row = int(math.trunc(to_number(args[1])))
    col = int(math.trunc(to_number(args[2]))) if len(args) == 3 and args[2] is not Blank else 0
    if row < 0 or col < 0:
        raise FormulaError(VALUE)
    if table.height == 1 and len(args) == 2:
        row, col = 1, row  # INDEX(A1:E1, 3) reads along a single row
    if col == 0 and table.width == 1:
        col = 1
    if row > table.height or col > table.width:
        raise FormulaError(REF)
    if row == 0 or col == 0:
        raise FormulaError(VALUE, "INDEX needs a row and a column number.")
    return table.rows[row - 1][col - 1]


def _f_match(_: Evaluator, args: List[Any]) -> float:
    target = _scalar(args[0])
    table = _as_range(args[1])
    if table.height != 1 and table.width != 1:
        raise FormulaError(NA)
    values = table.flat()
    match_type = int(math.trunc(to_number(args[2]))) if len(args) == 3 and args[2] is not Blank else 1
    if match_type == 0:
        index = _exact_match(values, target)
    elif match_type > 0:
        index = _approx_match(values, target)
    else:
        index = _approx_match(values, target, descending=True)
    if index < 0:
        raise FormulaError(NA)
    return float(index + 1)


FUNCTIONS: Dict[str, Callable[[Evaluator, List[Any]], Any]] = {
    "SUM": _f_sum,
    "AVERAGE": _f_average,
    "MIN": _f_min,
    "MAX": _f_max,
    "COUNT": _f_count,
    "COUNTA": _f_counta,
    "COUNTIF": _f_countif,
    "COUNTIFS": _f_countifs,
    "SUMIF": _f_sumif,
    "SUMIFS": _f_sumifs,
    "AVERAGEIF": _f_averageif,
    "AVERAGEIFS": _f_averageifs,
    "AND": _f_and,
    "OR": _f_or,
    "ROUND": _f_round,
    "ROUNDUP": _f_roundup,
    "ROUNDDOWN": _f_rounddown,
    "ABS": _f_abs,
    "MEDIAN": _f_median,
    "STDEV": _f_stdev,
    "VLOOKUP": _f_vlookup,
    "INDEX": _f_index,
    "MATCH": _f_match,
}

ARITY: Dict[str, Tuple[int, Optional[int]]] = {
    "SUM": (1, None), "AVERAGE": (1, None), "MIN": (1, None), "MAX": (1, None),
    "COUNT": (1, None), "COUNTA": (1, None), "COUNTIF": (2, 2), "COUNTIFS": (2, None),
    "SUMIF": (2, 3), "SUMIFS": (3, None), "AVERAGEIF": (2, 3), "AVERAGEIFS": (3, None),
    "AND": (1, None), "OR": (1, None), "ROUND": (2, 2), "ROUNDUP": (2, 2),
    "ROUNDDOWN": (2, 2), "ABS": (1, 1), "MEDIAN": (1, None), "STDEV": (1, None),
    "VLOOKUP": (3, 4), "INDEX": (2, 3), "MATCH": (2, 3),
}

SUPPORTED_FUNCTIONS = sorted(list(FUNCTIONS) + ["IF", "IFERROR"])


# ---------------------------------------------------------------------------
# Number text and display formats
# ---------------------------------------------------------------------------

FORMATS = ("general", "number", "currency", "percent")
FORMAT_LABELS = {
    "general": "General",
    "number": "Number",
    "currency": "Currency (₹)",
    "percent": "Percent",
}

_NUMBER_TEXT_RE = re.compile(r"^\s*([+-]?)\s*(?:₹|rs\.?|inr)?\s*([0-9][0-9,]*\.?[0-9]*|\.[0-9]+)(?:[eE]([+-]?\d+))?\s*(%?)\s*$", re.IGNORECASE)


def parse_number_text(text: str) -> Optional[float]:
    """'1,24,500' -> 124500, '₹ 2,000.50' -> 2000.5, '12.5%' -> 0.125, else None."""
    match = _NUMBER_TEXT_RE.match(text)
    if not match:
        return None
    digits = match.group(2).replace(",", "")
    try:
        number = float(digits)
    except ValueError:
        return None
    if match.group(3):
        number *= 10 ** int(match.group(3))
    if match.group(1) == "-":
        number = -number
    if match.group(4):
        number /= 100.0
    return number


def indian_grouping(integer_digits: str) -> str:
    """'12458300' -> '1,24,58,300' (last three, then pairs)."""
    if len(integer_digits) <= 3:
        return integer_digits
    head, tail = integer_digits[:-3], integer_digits[-3:]
    pairs = []
    while len(head) > 2:
        pairs.insert(0, head[-2:])
        head = head[:-2]
    if head:
        pairs.insert(0, head)
    return ",".join(pairs + [tail])


def _fixed(number: float, decimals: int) -> Tuple[str, str]:
    """Half-up rounding to `decimals`, returned as (integer part, fraction)."""
    dec = Decimal(repr(abs(number))).quantize(Decimal(1).scaleb(-decimals), rounding=ROUND_HALF_UP)
    text = f"{dec:f}"
    integer, _, fraction = text.partition(".")
    return integer, fraction


def general_number(number: float) -> str:
    if number == 0:
        return "0"
    if abs(number) >= 1e11 or abs(number) < 1e-9:
        return f"{number:.5E}"
    text = f"{number:.10g}" if abs(number) < 1e10 else f"{number:.0f}"
    if "e" in text:
        text = f"{number:.10f}".rstrip("0").rstrip(".")
    return text


def format_value(value: Any, fmt: str) -> str:
    """How a result shows in the answer cell for the chosen format."""
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    if value is Blank:
        return ""
    if not isinstance(value, float):
        return str(value)
    sign = "-" if value < 0 else ""
    if fmt == "number":
        integer, fraction = _fixed(value, 2)
        return f"{sign}{indian_grouping(integer)}.{fraction}"
    if fmt == "currency":
        integer, fraction = _fixed(value, 2)
        return f"{sign}₹ {indian_grouping(integer)}.{fraction}"
    if fmt == "percent":
        integer, fraction = _fixed(value * 100, 2)
        return f"{sign}{integer}.{fraction}%"
    return general_number(value)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


@dataclass
class CellResult:
    """What one answer cell evaluates to."""

    raw: str
    is_formula: bool
    value: Any = None  # float | str | bool | None
    error: Optional[str] = None  # Excel error code
    message: str = ""

    @property
    def ok(self) -> bool:
        return self.error is None

    def display(self, fmt: str) -> str:
        return self.error if self.error else format_value(self.value, fmt)

    @property
    def value_type(self) -> str:
        if self.error:
            return "error"
        if self.value is Blank:
            return "blank"
        if isinstance(self.value, bool):
            return "boolean"
        if isinstance(self.value, float):
            return "number"
        return "text"


def evaluate_input(raw: str, sheet: Sheet) -> CellResult:
    """Evaluate what a student typed into an answer cell: a formula (=...) or a
    plain value (number, ₹/% number, TRUE/FALSE or text)."""
    raw = (raw or "").strip()
    if not raw.startswith("="):
        if raw == "":
            return CellResult(raw, False, Blank)
        if raw.upper() in ("TRUE", "FALSE"):
            return CellResult(raw, False, raw.upper() == "TRUE")
        number = parse_number_text(raw)
        return CellResult(raw, False, number if number is not None else raw)

    body = raw[1:]
    if not body.strip():
        return CellResult(raw, True, error=VALUE, message="The formula is empty.")
    if len(raw) > MAX_FORMULA_LENGTH:
        return CellResult(raw, True, error=VALUE, message="The formula is too long.")
    try:
        tree = parse(body)
    except SyntaxError as exc:
        return CellResult(raw, True, error=NAME, message=f"There's a problem with this formula: {exc}.")
    try:
        result = Evaluator(sheet).eval(tree)
        result = _scalar(result) if isinstance(result, Range) else result
    except FormulaError as exc:
        return CellResult(raw, True, error=exc.code, message=exc.message or ERROR_MESSAGES.get(exc.code, ""))
    except RecursionError:
        return CellResult(raw, True, error=VALUE, message="The formula is nested too deeply.")
    if isinstance(result, float):
        try:
            _check_number(result)
        except FormulaError as exc:
            return CellResult(raw, True, error=exc.code, message=ERROR_MESSAGES[exc.code])
        if result == 0:
            result = 0.0  # no "-0"
    return CellResult(raw, True, result)


def functions_used(formula: str) -> List[str]:
    """Function names a formula calls (for checking answer formulas)."""
    names: List[str] = []

    def walk(node: Any) -> None:
        if not isinstance(node, tuple):
            return
        if node[0] == "call":
            names.append(node[1])
            for arg in node[2]:
                walk(arg)
        else:
            for part in node[1:]:
                walk(part)

    body = formula.strip()
    walk(parse(body[1:] if body.startswith("=") else body))
    return names
