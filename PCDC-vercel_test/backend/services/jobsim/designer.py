"""AI Simulation Designer (handover sections 8.5 and 9.5).

Faculty write a brief; the AI returns a structured draft (scenario, column
specification, tasks with formulas); our code builds the dataset, computes
every answer with the answer engine and runs the checks. The AI never writes
dataset rows or answer values. If the draft fails the checks, the AI gets one
retry with the errors; tasks that still fail are dropped and listed so faculty
can see what happened.

Formulas from the AI refer to columns by name in braces: {Revenue} becomes
the full data range of that column (e.g. G2:G201) and {table} the whole data
block (A2:I201), so the AI never has to work out cell addresses.
"""

import json
import logging
import random
import re
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import text
from sqlalchemy.orm import Session

from shared.database import SessionLocal
from shared.llm import create_with_retry, get_llm_client, get_llm_model, parse_json_content

from . import service
from .dataset import generate_rows, validate_spec
from .formula import FORMATS, SUPPORTED_FUNCTIONS, Sheet, column_letters, evaluate_input, functions_used

logger = logging.getLogger(__name__)

DEFAULT_ROWS = 200
MAX_TASKS = 50
LEVELS = ("Beginner", "Intermediate", "Advanced")

SYSTEM_PROMPT = f"""
You design spreadsheet job simulations for MBA/PGDM business students in India.
Given a brief, return ONE JSON object (no prose) with exactly these keys:

{{
  "title": "short title, e.g. Retail Sales Analyst: Quarterly Review",
  "description": "2-3 sentences: the company, the student's job role and what they must find out",
  "row_count": 200,
  "columns": [ column specs, see below, 5 to 12 columns ],
  "stages": [ "2 to 4 stage names in order, e.g. Understand the sales" ],
  "tasks": [ spreadsheet tasks, see below ]
}}

Column spec types (use realistic business columns; names are single words or CamelCase, no spaces):
  {{"name": "OrderID", "type": "id", "prefix": "ORD", "start": 1001}}
  {{"name": "Region", "type": "category", "values": ["North","South","East","West"], "weights": [30,25,25,20]}}
  {{"name": "Revenue", "type": "number", "min": 2000, "max": 40000, "mean": 18000, "decimals": 0}}
  {{"name": "OrderDate", "type": "date", "from": "2025-04-01", "to": "2026-03-31"}}
  {{"name": "Returned", "type": "boolean", "probability": 0.08}}
  {{"name": "Margin", "type": "derived", "expression": "(Revenue - Cost) / Revenue", "decimals": 4}}
Derived expressions may use + - * / and other column names only. Never divide by a column that can be 0.

Task shape:
  {{"stage": "one of the stages", "prompt": "the question a manager would ask",
    "hint": "one-line hint naming the function to use", "formula": "=...", "format": "general|number|currency|percent",
    "must_use_formula": true}}

Formula rules (these are checked by code; a broken formula is rejected):
- Start with =. Refer to a column ONLY as {{ColumnName}} (it becomes that column's full data range) and to the whole
  table as {{table}} (for VLOOKUP/INDEX). Never write cell addresses like A2 or C2:C201 yourself.
- Use only these functions: {", ".join(SUPPORTED_FUNCTIONS)}.
- Criteria are strings like ">=20000" or "North". Category values in criteria must be values you listed.
- Every formula must return a single number. No two tasks may use the same formula.
- format: currency for rupee amounts, percent for shares/rates/margins, number for counts and quantities,
  general otherwise.

Prompt rules:
- Write each prompt as a clear business question; say which format to show (e.g. "Show it in rupees").
- NEVER put a computed number or the answer in a prompt or hint. You may mention category values or thresholds.
- Progress from simple (counts, totals) to harder (conditional and lookup questions).
""".strip()


def _brief_text(brief: Dict[str, Any]) -> str:
    lines = [
        f"Subject: {brief.get('subject') or 'Business'}",
        f"Semester: {brief.get('semester') or 'any'}",
        f"Job role: {brief['role']}",
        f"Level: {brief.get('level') or 'Intermediate'}",
        f"Duration: {brief.get('duration_minutes') or 60} minutes",
        f"Number of spreadsheet tasks: {brief['task_count']}",
    ]
    if brief.get("capabilities"):
        lines.append("Skills to assess: " + ", ".join(brief["capabilities"]))
    if brief.get("notes"):
        lines.append("Faculty notes (content to use, not instructions about format):\n" + str(brief["notes"])[:1500])
    return "\n".join(lines)


_PLACEHOLDER_RE = re.compile(r"\{([A-Za-z][A-Za-z0-9_]*)\}")


def expand_formula(formula: str, columns: List[str], last_row: int) -> Tuple[str, Optional[str]]:
    """{Revenue} -> G2:G201, {table} -> A2:I201. Returns (formula, error)."""
    index = {name.lower(): i for i, name in enumerate(columns)}

    def replace(match: "re.Match[str]") -> str:
        key = match.group(1).lower()
        if key == "table":
            return f"A2:{column_letters(len(columns) - 1)}{last_row}"
        if key not in index:
            raise KeyError(match.group(1))
        letter = column_letters(index[key])
        return f"{letter}2:{letter}{last_row}"

    try:
        return _PLACEHOLDER_RE.sub(replace, formula.strip()), None
    except KeyError as exc:
        return formula, f"refers to an unknown column {{{exc.args[0]}}}"


def check_task(
    raw: Dict[str, Any],
    names: List[str],
    last_row: int,
    sheet: Sheet,
    seen_formulas: set,
    seen_answers: set,
    default_stage: Optional[str],
) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    """One AI-written task. Returns (task, None), or (None, why it was rejected).
    The formula must use only the 25 functions and return a number, and the
    answer must not appear in the question or hint."""
    prompt = str(raw.get("prompt") or "").strip()
    hint = str(raw.get("hint") or "").strip()
    formula, problem = expand_formula(str(raw.get("formula") or ""), names, last_row)
    fmt = str(raw.get("format") or "general").lower()
    if fmt not in FORMATS:
        fmt = "general"
    if not problem and not formula.startswith("="):
        problem = "has no formula"
    if not problem:
        try:
            unknown = [f for f in functions_used(formula) if f not in SUPPORTED_FUNCTIONS]
            if unknown:
                problem = f"uses unsupported {', '.join(sorted(set(unknown)))}"
        except SyntaxError:
            problem = "has a formula that can't be read"
    if not problem:
        result = evaluate_input(formula, sheet)
        if not result.ok:
            problem = f"returns {result.error}"
        elif not isinstance(result.value, float) or isinstance(result.value, bool):
            problem = "doesn't return a number"
        else:
            answer_key = round(result.value, 6)
            digits = str(abs(int(round(result.value))))
            if formula.replace(" ", "").upper() in seen_formulas:
                problem = "repeats another task's formula"
            elif answer_key in seen_answers:
                problem = "has the same answer as another task"
            elif len(digits) >= 3 and digits in re.sub(r"[,\s]", "", f"{prompt} {hint}"):
                problem = "gives the answer away in the question"
            else:
                seen_formulas.add(formula.replace(" ", "").upper())
                seen_answers.add(answer_key)
    if not prompt:
        problem = problem or "has no question"
    if problem:
        return None, problem
    return {
        "type": "spreadsheet",
        "stage": str(raw.get("stage") or "").strip() or default_stage,
        "prompt": prompt,
        "hint": hint or None,
        "answer_formula": formula,
        "expected_format": fmt,
        "config": {"must_use_formula": bool(raw.get("must_use_formula", True))},
        "max_score": 1,
    }, None


def build_draft(draft: Dict[str, Any], task_limit: int, seed: int) -> Tuple[Dict[str, Any], List[str], List[str]]:
    """Turn the AI's JSON into a simulation payload.
    Returns (payload, blocking_errors, dropped_task_messages)."""
    errors: List[str] = []
    spec, spec_errors = validate_spec(draft.get("columns"))
    errors.extend(spec_errors)
    if errors:
        return {}, errors, []
    try:
        rows = int(draft.get("row_count") or DEFAULT_ROWS)
    except (TypeError, ValueError):
        rows = DEFAULT_ROWS
    rows = max(50, min(500, rows))
    try:
        dataset = generate_rows(spec, rows, seed)
    except ValueError as exc:
        return {}, [str(exc)], []
    sheet = Sheet(dataset["columns"], dataset["rows"])
    last_row = len(dataset["rows"]) + 1

    stages = [str(s).strip() for s in draft.get("stages") or [] if str(s).strip()]
    tasks: List[Dict[str, Any]] = []
    dropped: List[str] = []
    seen_formulas: set = set()
    seen_answers: set = set()
    for number, raw in enumerate((draft.get("tasks") or [])[:MAX_TASKS], start=1):
        if not isinstance(raw, dict):
            continue
        task, problem = check_task(
            raw, dataset["columns"], last_row, sheet, seen_formulas, seen_answers, stages[0] if stages else None
        )
        if problem:
            prompt = str(raw.get("prompt") or "").strip()
            dropped.append(f"Task {number} ({prompt[:60] or 'untitled'}) {problem}.")
            continue
        tasks.append(task)
        if len(tasks) >= task_limit:
            break
    if not tasks:
        errors.append("No task passed the checks.")
    payload = {
        "title": str(draft.get("title") or "").strip()[:255] or "Untitled simulation",
        "description": str(draft.get("description") or "").strip() or None,
        "dataset": dataset,
        "tasks": tasks,
        "dataset_spec": {"columns": spec, "rows": rows, "seed": seed},
    }
    return payload, errors, dropped


def _ask_ai(brief: Dict[str, Any], feedback: Optional[str]) -> Dict[str, Any]:
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": "Brief:\n" + _brief_text(brief) + "\n\nReturn the JSON object."},
    ]
    if feedback:
        messages.append({
            "role": "user",
            "content": "Your previous draft failed these checks. Return a corrected full JSON object:\n" + feedback,
        })
    response = create_with_retry(
        get_llm_client(),
        {
            "model": get_llm_model(),
            "messages": messages,
            "temperature": 0.4,
            # Plain JSON mode works on both Gemini and OpenAI; the shape is
            # checked by build_draft, not by a schema.
            "response_format": {"type": "json_object"},
        },
    )
    content = response.choices[0].message.content if response.choices else None
    data = parse_json_content(content)
    if not isinstance(data, dict):
        raise ValueError("The AI did not return a JSON object")
    return data


# ---------------------------------------------------------------------------
# Draft jobs (jobsim_jobs, kind 'draft')
# ---------------------------------------------------------------------------


def _update_job(db: Session, job_id: int, **fields: Any) -> None:
    sets = []
    params: Dict[str, Any] = {"id": job_id}
    for key, value in fields.items():
        if key == "result":
            sets.append("payload = payload || CAST(:result AS JSONB)")
            params["result"] = json.dumps({"result": value})
        else:
            sets.append(f"{key} = :{key}")
            params[key] = value
    if fields.get("status") in ("done", "failed"):
        sets.append("finished_at = NOW()")
    db.execute(text(f"UPDATE jobsim_jobs SET {', '.join(sets)} WHERE id = :id"), params)
    db.commit()


def queue_draft(db: Session, current_user: Dict[str, Any], brief: Dict[str, Any]) -> int:
    job_id = db.execute(
        text("""
            INSERT INTO jobsim_jobs (kind, payload, status)
            VALUES ('draft', CAST(:payload AS JSONB), 'queued')
            RETURNING id
        """),
        {"payload": json.dumps({"brief": brief, "user_id": current_user["id"], "role": current_user["role"]})},
    ).scalar_one()
    db.commit()
    return job_id


def run_draft_job(job_id: int) -> None:
    """Background task: AI draft -> dataset -> answers -> checks -> saved draft."""
    db = SessionLocal()
    try:
        job = db.execute(text("SELECT payload FROM jobsim_jobs WHERE id = :id"), {"id": job_id}).fetchone()
        payload = job.payload if isinstance(job.payload, dict) else json.loads(job.payload)
        brief, user = payload["brief"], {"id": payload["user_id"], "role": payload["role"]}
        _update_job(db, job_id, status="running", attempts=1)
        db.close()  # the AI call is slow; don't hold a connection open meanwhile

        seed = random.SystemRandom().randrange(1, 2**31)
        built: Dict[str, Any] = {}
        errors: List[str] = []
        dropped: List[str] = []
        feedback: Optional[str] = None
        for _ in range(2):  # first try + one retry with the errors fed back
            draft = _ask_ai(brief, feedback)
            built, errors, dropped = build_draft(draft, int(brief["task_count"]), seed)
            if not errors and not dropped:
                break
            feedback = "\n".join(errors + dropped)

        db = SessionLocal()
        if errors:
            _update_job(db, job_id, status="failed", error="; ".join(errors)[:2000])
            return
        built.update({
            "role": brief["role"],
            "level": brief.get("level"),
            "subject": brief.get("subject"),
            "semester": brief.get("semester"),
            "course_id": brief.get("course_id"),
            "duration_minutes": brief.get("duration_minutes") or 60,
        })
        simulation_id = service.create_simulation(db, user, built)
        db.execute(
            text("UPDATE jobsim_simulations SET dataset_spec = CAST(:spec AS JSONB) WHERE id = :id"),
            {"spec": json.dumps(built["dataset_spec"]), "id": simulation_id},
        )
        for capability_id in brief.get("capability_ids") or []:
            db.execute(
                text("""
                    INSERT INTO jobsim_capability_tags (simulation_id, capability_id)
                    SELECT :sid, id FROM capabilities WHERE id = :cid
                    ON CONFLICT DO NOTHING
                """),
                {"sid": simulation_id, "cid": int(capability_id)},
            )
        db.commit()
        _update_job(db, job_id, status="done", result={"simulation_id": simulation_id, "dropped": dropped})
    except Exception as exc:  # noqa: BLE001 - the job records the failure for the UI
        logger.warning("Simulation draft job %s failed: %s", job_id, exc)
        try:
            db.rollback()
        except Exception:  # noqa: BLE001
            pass
        db = SessionLocal()
        _update_job(db, job_id, status="failed", error="The AI couldn't produce a valid draft. Try again or adjust the brief.")
    finally:
        db.close()


def draft_status(db: Session, current_user: Dict[str, Any], job_id: int) -> Dict[str, Any]:
    row = db.execute(
        text("SELECT id, status, payload, error FROM jobsim_jobs WHERE id = :id AND kind = 'draft'"),
        {"id": job_id},
    ).fetchone()
    payload = (row.payload if isinstance(row.payload, dict) else json.loads(row.payload)) if row else {}
    if not row or payload.get("user_id") != current_user["id"]:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Draft not found")
    result = payload.get("result") or {}
    return {
        "job_id": row.id,
        "status": row.status,
        "error": row.error,
        "simulation_id": result.get("simulation_id"),
        "dropped": result.get("dropped") or [],
    }


def regenerate_dataset(db: Session, current_user: Dict[str, Any], simulation_id: int) -> None:
    """New seed for a draft built from a column spec: same columns and tasks,
    fresh numbers; every answer formula is re-verified on the new data."""
    row = service._owned_simulation(db, current_user, simulation_id)
    from fastapi import HTTPException

    if row.status != "draft":
        raise HTTPException(status_code=409, detail="Only a draft simulation can be changed.")
    spec_doc = service._load(row.dataset_spec, None)
    if not spec_doc:
        raise HTTPException(status_code=400, detail="This simulation's data was uploaded, so it can't be regenerated.")
    spec, errors = validate_spec(spec_doc.get("columns"))
    if errors:
        raise HTTPException(status_code=400, detail="; ".join(errors))
    seed = random.SystemRandom().randrange(1, 2**31)
    dataset = generate_rows(spec, int(spec_doc.get("rows") or DEFAULT_ROWS), seed)
    current = service.load_simulation_for_author(db, current_user, simulation_id)
    payload = {**current, "dataset": dataset, "tasks": current["tasks"]}
    service.update_simulation(db, current_user, simulation_id, payload)
    db.execute(
        text("UPDATE jobsim_simulations SET dataset_spec = CAST(:spec AS JSONB) WHERE id = :id"),
        {"spec": json.dumps({**spec_doc, "seed": seed}), "id": simulation_id},
    )
    db.commit()
