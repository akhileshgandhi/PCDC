"""Seeded dataset generator for job simulations (handover section 8.5, step 3).

The AI only describes the columns; this code makes the rows. The same spec and
seed always give the same data, so a dataset can be rebuilt instead of stored
per attempt.

Column spec (one entry per column):
  {"name": "Region",   "type": "category", "values": ["North", "South"], "weights": [60, 40]}
  {"name": "Revenue",  "type": "number",   "min": 2000, "max": 40000, "mean": 18000, "decimals": 0}
  {"name": "OrderDate","type": "date",     "from": "2025-04-01", "to": "2026-03-31"}
  {"name": "OrderID",  "type": "id",       "prefix": "ORD", "start": 1001}
  {"name": "Margin",   "type": "derived",  "expression": "(Revenue - Cost) / Revenue", "decimals": 4}
  {"name": "Returned", "type": "boolean",  "probability": 0.08}
"""

import random
import re
from datetime import date, timedelta
from typing import Any, Dict, List, Tuple

from .formula import Evaluator, FormulaError, Sheet, parse

MAX_ROWS = 2000
MAX_COLUMNS = 30
COLUMN_TYPES = ("category", "number", "date", "id", "derived", "boolean")
_NAME_RE = re.compile(r"^[A-Za-z][A-Za-z0-9_]{0,40}$")


class _RowEvaluator(Evaluator):
    """Evaluates a derived-column expression where names are this row's values."""

    def __init__(self, values: Dict[str, Any]):
        super().__init__(Sheet([], []))
        self.values = {k.lower(): v for k, v in values.items()}

    def eval(self, node: Any) -> Any:
        if node[0] == "name":
            key = node[1].lower()
            if key not in self.values:
                raise FormulaError("#NAME?")
            return self.values[key]
        return super().eval(node)


def validate_spec(spec: Any) -> Tuple[List[Dict[str, Any]], List[str]]:
    errors: List[str] = []
    if not isinstance(spec, list) or not spec:
        return [], ["The dataset needs at least one column."]
    if len(spec) > MAX_COLUMNS:
        errors.append(f"The dataset can have at most {MAX_COLUMNS} columns.")
    clean: List[Dict[str, Any]] = []
    seen = set()
    for index, col in enumerate(spec, start=1):
        if not isinstance(col, dict):
            errors.append(f"Column {index} is not valid.")
            continue
        name = str(col.get("name") or "").strip().replace(" ", "")
        kind = str(col.get("type") or "").lower()
        label = f"Column {index} ({name or 'unnamed'})"
        if not _NAME_RE.match(name):
            errors.append(f"{label}: use a short name with letters, digits or _ (no spaces).")
        if name.lower() in seen:
            errors.append(f"{label}: duplicate column name.")
        seen.add(name.lower())
        if kind not in COLUMN_TYPES:
            errors.append(f"{label}: type must be one of {', '.join(COLUMN_TYPES)}.")
            continue
        item = {**col, "name": name, "type": kind}
        if kind == "category":
            values = [str(v) for v in col.get("values") or [] if str(v).strip()]
            if len(values) < 2:
                errors.append(f"{label}: give at least two category values.")
            weights = col.get("weights")
            if weights is not None and (
                not isinstance(weights, list) or len(weights) != len(values)
                or any(not isinstance(w, (int, float)) or w < 0 for w in weights) or sum(weights) <= 0
            ):
                errors.append(f"{label}: weights must be one non-negative number per value.")
                weights = None
            item.update(values=values, weights=weights)
        elif kind == "number":
            try:
                lo, hi = float(col.get("min", 0)), float(col.get("max", 100))
            except (TypeError, ValueError):
                errors.append(f"{label}: min and max must be numbers.")
                continue
            if hi <= lo:
                errors.append(f"{label}: max must be greater than min.")
            item.update(min=lo, max=hi, decimals=max(0, min(4, int(col.get("decimals") or 0))))
            if col.get("mean") is not None:
                try:
                    item["mean"] = float(col["mean"])
                except (TypeError, ValueError):
                    item.pop("mean", None)
        elif kind == "date":
            try:
                start = date.fromisoformat(str(col.get("from")))
                end = date.fromisoformat(str(col.get("to")))
                if end < start:
                    raise ValueError
                item.update({"from": start.isoformat(), "to": end.isoformat()})
            except (TypeError, ValueError):
                errors.append(f"{label}: give from/to dates as YYYY-MM-DD, with to after from.")
        elif kind == "id":
            item.update(prefix=str(col.get("prefix") or ""), start=int(col.get("start") or 1))
        elif kind == "boolean":
            try:
                item["probability"] = min(1.0, max(0.0, float(col.get("probability", 0.5))))
            except (TypeError, ValueError):
                item["probability"] = 0.5
        elif kind == "derived":
            expression = str(col.get("expression") or "").strip()
            try:
                parse(expression)
            except SyntaxError:
                errors.append(f"{label}: the expression can't be read.")
            item.update(expression=expression, decimals=max(0, min(6, int(col.get("decimals") or 2))))
        clean.append(item)
    return clean, errors


def _number(rng: random.Random, col: Dict[str, Any]) -> float:
    lo, hi = col["min"], col["max"]
    mean = col.get("mean")
    if mean is not None and lo < mean < hi:
        # Triangular around the mean keeps values inside min..max with a sensible centre.
        value = rng.triangular(lo, hi, mean)
    else:
        value = rng.uniform(lo, hi)
    decimals = col.get("decimals", 0)
    return round(value, decimals) if decimals else float(round(value))


def generate_rows(spec: List[Dict[str, Any]], rows: int, seed: int) -> Dict[str, Any]:
    """Build the dataset. Raises ValueError if a derived column can't be computed."""
    rows = max(1, min(MAX_ROWS, int(rows)))
    rng = random.Random(seed)
    names = [c["name"] for c in spec]
    data: List[List[Any]] = []
    for i in range(rows):
        values: Dict[str, Any] = {}
        for col in spec:
            kind = col["type"]
            if kind == "category":
                value: Any = rng.choices(col["values"], weights=col.get("weights"))[0]
            elif kind == "number":
                value = _number(rng, col)
            elif kind == "date":
                start = date.fromisoformat(col["from"])
                span = (date.fromisoformat(col["to"]) - start).days
                value = (start + timedelta(days=rng.randint(0, span))).isoformat()
            elif kind == "id":
                value = f"{col['prefix']}{col['start'] + i}"
            elif kind == "boolean":
                value = rng.random() < col["probability"]
            else:
                continue  # derived columns are filled after the row's other values
            values[col["name"]] = value
        for col in spec:
            if col["type"] != "derived":
                continue
            try:
                result = _RowEvaluator(values).eval(parse(col["expression"]))
            except (FormulaError, SyntaxError) as exc:
                code = getattr(exc, "code", "syntax error")
                raise ValueError(f"Column {col['name']}: the expression gives {code}.")
            values[col["name"]] = round(float(result), col["decimals"]) if isinstance(result, float) else result
        data.append([values.get(name) for name in names])
    return {"columns": names, "rows": data}
