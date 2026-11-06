"""Job simulation data layer: save and load simulations, attempts, answers and
results. Raw SQL with sqlalchemy.text(), like the rest of the backend.

Rules this module keeps (handover sections 4 and 9.11):
- answer formulas and expected values are only read by faculty/admin loaders
  and by marking; student payloads never contain them;
- the server owns the clock: writes after deadline_at or after finishing are
  refused;
- the student always comes from the login token.
"""

import json
import logging
import secrets
import time
from collections import OrderedDict, defaultdict, deque
from datetime import datetime
from threading import Lock
from typing import Any, Deque, Dict, List, Optional, Tuple

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from .dataset import generate_rows
from .formula import FORMATS, SUPPORTED_FUNCTIONS, Sheet, evaluate_input, functions_used
from .marking import mark_spreadsheet_answer

MAX_DATASET_ROWS = 2000
MAX_DATASET_COLUMNS = 30
MAX_SPREADSHEET_TASKS = 50
TASK_TYPES = ("spreadsheet", "memo", "presentation")
# Only these config keys are ever shown to a student.
STUDENT_CONFIG_KEYS = ("cell_label", "must_use_formula", "required_sections", "min_words", "min_slides")

logger = logging.getLogger(__name__)

ADMIN_ROLES = ("admin", "superadmin")

# Approval re-runs every answer formula on data from these seeds (handover 9.5).
VERIFY_SEEDS = (101, 202, 303)
# A new attempt tries this many seeds before falling back to the stored dataset.
SEED_TRIES = 5
_DATASET_CACHE_SIZE = 32


def _json(value: Any) -> str:
    return json.dumps(value)


def _load(value: Any, default: Any) -> Any:
    if value is None:
        return default
    if isinstance(value, (dict, list)):
        return value
    try:
        return json.loads(value)
    except (TypeError, ValueError):
        return default


def sheet_from_dataset(dataset: Dict[str, Any]) -> Sheet:
    return Sheet(dataset.get("columns") or [], dataset.get("rows") or [])


# ---------------------------------------------------------------------------
# Faculty / admin: save and load a simulation
# ---------------------------------------------------------------------------


def validate_simulation(payload: Dict[str, Any]) -> Tuple[Dict[str, Any], List[Dict[str, Any]], List[str]]:
    """Check a simulation before saving. Returns (dataset, tasks, errors);
    every spreadsheet task's answer formula is run against the dataset here,
    so a saved formula is known to give a value."""
    errors: List[str] = []
    dataset = payload.get("dataset") or {}
    columns = [str(c).strip() for c in dataset.get("columns") or []]
    rows = dataset.get("rows") or []
    if not columns:
        errors.append("The dataset needs at least one column.")
    if len(columns) > MAX_DATASET_COLUMNS:
        errors.append(f"The dataset can have at most {MAX_DATASET_COLUMNS} columns.")
    if len(rows) > MAX_DATASET_ROWS:
        errors.append(f"The dataset can have at most {MAX_DATASET_ROWS} rows.")
    clean_rows: List[List[Any]] = []
    for index, row in enumerate(rows, start=2):
        if not isinstance(row, list) or len(row) > len(columns):
            errors.append(f"Dataset row {index} doesn't match the columns.")
            continue
        clean_rows.append([cell if isinstance(cell, (int, float, bool, str)) or cell is None else str(cell) for cell in row])
    dataset = {"columns": columns, "rows": clean_rows}
    sheet = sheet_from_dataset(dataset)

    tasks: List[Dict[str, Any]] = []
    raw_tasks = payload.get("tasks") or []
    if not raw_tasks:
        errors.append("Add at least one task.")
    spreadsheet_count = 0
    seen_formulas: Dict[str, int] = {}
    for position, raw in enumerate(raw_tasks, start=1):
        task_type = (raw.get("type") or "").lower()
        prompt = (raw.get("prompt") or "").strip()
        label = f"Task {position}"
        if task_type not in TASK_TYPES:
            errors.append(f"{label}: type must be spreadsheet, memo or presentation.")
            continue
        if not prompt:
            errors.append(f"{label}: the question is empty.")
        task = {
            "position": position,
            "type": task_type,
            "stage": (raw.get("stage") or "").strip() or None,
            "prompt": prompt,
            "hint": (raw.get("hint") or "").strip() or None,
            "config": raw.get("config") if isinstance(raw.get("config"), dict) else {},
            "rubric": raw.get("rubric"),
            "max_score": float(raw.get("max_score") or 1),
            "answer_formula": None,
            "expected_format": None,
        }
        if task_type == "spreadsheet":
            spreadsheet_count += 1
            formula = (raw.get("answer_formula") or "").strip()
            fmt = (raw.get("expected_format") or "general").lower()
            if not formula.startswith("="):
                errors.append(f"{label}: the answer formula must start with =.")
            elif fmt not in FORMATS:
                errors.append(f"{label}: format must be general, number, currency or percent.")
            else:
                try:
                    unknown = [f for f in functions_used(formula) if f not in SUPPORTED_FUNCTIONS]
                except SyntaxError as exc:
                    unknown = []
                    errors.append(f"{label}: the answer formula can't be read ({exc}).")
                if unknown:
                    errors.append(f"{label}: unsupported function(s) {', '.join(sorted(set(unknown)))}.")
                result = evaluate_input(formula, sheet)
                if not result.ok:
                    errors.append(f"{label}: the answer formula returns {result.error}. {result.message}")
                elif result.value is None:
                    errors.append(f"{label}: the answer formula returns a blank value.")
                key = formula.replace(" ", "").upper()
                if key in seen_formulas:
                    errors.append(f"{label}: same answer formula as task {seen_formulas[key]}.")
                seen_formulas[key] = position
            task["answer_formula"] = formula
            task["expected_format"] = fmt
        tasks.append(task)
    if spreadsheet_count > MAX_SPREADSHEET_TASKS:
        errors.append(f"A simulation can have at most {MAX_SPREADSHEET_TASKS} spreadsheet tasks.")
    if not (payload.get("title") or "").strip():
        errors.append("Title is required.")
    return dataset, tasks, errors


def _write_tasks(db: Session, simulation_id: int, tasks: List[Dict[str, Any]]) -> None:
    db.execute(text("DELETE FROM jobsim_tasks WHERE simulation_id = :sid"), {"sid": simulation_id})
    for task in tasks:
        task_id = db.execute(
            text("""
                INSERT INTO jobsim_tasks (
                    simulation_id, position, type, stage, prompt_template, hint,
                    config, rubric, max_score
                )
                VALUES (:sid, :position, :type, :stage, :prompt, :hint,
                        CAST(:config AS JSONB), CAST(:rubric AS JSONB), :max_score)
                RETURNING id
            """),
            {
                "sid": simulation_id,
                "position": task["position"],
                "type": task["type"],
                "stage": task["stage"],
                "prompt": task["prompt"],
                "hint": task["hint"],
                "config": _json(task["config"]),
                "rubric": _json(task["rubric"]) if task["rubric"] is not None else None,
                "max_score": task["max_score"],
            },
        ).scalar_one()
        if task["type"] == "spreadsheet":
            db.execute(
                text("""
                    INSERT INTO jobsim_answer_formulas (task_id, formula, expected_format, verified_at)
                    VALUES (:task_id, :formula, :fmt, NOW())
                """),
                {"task_id": task_id, "formula": task["answer_formula"], "fmt": task["expected_format"]},
            )


def _simulation_params(payload: Dict[str, Any], dataset: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "title": payload["title"].strip(),
        "description": (payload.get("description") or "").strip() or None,
        "role": (payload.get("role") or "").strip() or None,
        "level": (payload.get("level") or "").strip() or None,
        "duration": int(payload.get("duration_minutes") or 60),
        "course_id": payload.get("course_id"),
        "subject": (payload.get("subject") or "").strip() or None,
        "semester": payload.get("semester"),
        "dataset": _json(dataset),
    }


def create_simulation(db: Session, current_user: Dict[str, Any], payload: Dict[str, Any]) -> int:
    dataset, tasks, errors = validate_simulation(payload)
    if errors:
        raise HTTPException(status_code=400, detail={"message": "The simulation has problems.", "errors": errors})
    params = _simulation_params(payload, dataset)
    simulation_id = db.execute(
        text("""
            INSERT INTO jobsim_simulations (
                title, description, role, level, duration_minutes, course_id, subject,
                semester, dataset, status, created_by
            )
            VALUES (:title, :description, :role, :level, :duration, :course_id, :subject,
                    :semester, CAST(:dataset AS JSONB), 'draft', :user_id)
            RETURNING id
        """),
        {**params, "user_id": current_user["id"]},
    ).scalar_one()
    _write_tasks(db, simulation_id, tasks)
    db.commit()
    return simulation_id


def _owned_simulation(db: Session, current_user: Dict[str, Any], simulation_id: int) -> Any:
    row = db.execute(
        text("SELECT * FROM jobsim_simulations WHERE id = :sid"), {"sid": simulation_id}
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Simulation not found")
    if current_user["role"] not in ADMIN_ROLES and row.created_by != current_user["id"]:
        raise HTTPException(status_code=404, detail="Simulation not found")
    return row


def update_simulation(
    db: Session, current_user: Dict[str, Any], simulation_id: int, payload: Dict[str, Any]
) -> None:
    row = _owned_simulation(db, current_user, simulation_id)
    if row.status != "draft":
        raise HTTPException(status_code=409, detail="Only a draft simulation can be edited.")
    dataset, tasks, errors = validate_simulation(payload)
    if errors:
        raise HTTPException(status_code=400, detail={"message": "The simulation has problems.", "errors": errors})
    params = _simulation_params(payload, dataset)
    db.execute(
        text("""
            UPDATE jobsim_simulations
            SET title = :title, description = :description, role = :role, level = :level,
                duration_minutes = :duration, course_id = :course_id, subject = :subject,
                semester = :semester, dataset = CAST(:dataset AS JSONB), updated_at = NOW()
            WHERE id = :sid
        """),
        {**params, "sid": simulation_id},
    )
    if payload.get("dataset_uploaded"):
        # Uploaded data replaces generated data, so it can no longer be regenerated.
        db.execute(text("UPDATE jobsim_simulations SET dataset_spec = NULL WHERE id = :sid"), {"sid": simulation_id})
    _write_tasks(db, simulation_id, tasks)
    db.commit()


def load_simulation_for_author(db: Session, current_user: Dict[str, Any], simulation_id: int) -> Dict[str, Any]:
    """Full simulation for faculty/admin, including answer formulas."""
    row = _owned_simulation(db, current_user, simulation_id)
    tasks = db.execute(
        text("""
            SELECT t.id, t.position, t.type, t.stage, t.prompt_template, t.hint, t.config,
                   t.rubric, t.max_score, f.formula, f.expected_format, f.verified_at
            FROM jobsim_tasks t
            LEFT JOIN jobsim_answer_formulas f ON f.task_id = t.id
            WHERE t.simulation_id = :sid
            ORDER BY t.position
        """),
        {"sid": simulation_id},
    ).fetchall()
    return {
        "id": row.id,
        "title": row.title,
        "description": row.description,
        "role": row.role,
        "level": row.level,
        "duration_minutes": row.duration_minutes,
        "course_id": row.course_id,
        "subject": row.subject,
        "semester": row.semester,
        "status": row.status,
        "weights": _load(row.weights, {}),
        "dataset": _load(row.dataset, {"columns": [], "rows": []}),
        "can_regenerate_dataset": bool(_load(row.dataset_spec, None)),
        "skills": [
            {"id": c.id, "name": c.name}
            for c in db.execute(
                text("""
                    SELECT c.id, c.name FROM jobsim_capability_tags t
                    JOIN capabilities c ON c.id = t.capability_id
                    WHERE t.simulation_id = :sid ORDER BY c.name
                """),
                {"sid": simulation_id},
            ).fetchall()
        ],
        "created_by": row.created_by,
        "created_at": str(row.created_at),
        "updated_at": str(row.updated_at),
        "tasks": [
            {
                "id": t.id,
                "position": t.position,
                "type": t.type,
                "stage": t.stage,
                "prompt": t.prompt_template,
                "hint": t.hint,
                "config": _load(t.config, {}),
                "rubric": _load(t.rubric, None),
                "max_score": float(t.max_score),
                "answer_formula": t.formula,
                "expected_format": t.expected_format,
                "verified_at": str(t.verified_at) if t.verified_at else None,
            }
            for t in tasks
        ],
    }


def list_simulations_for_author(db: Session, current_user: Dict[str, Any]) -> List[Dict[str, Any]]:
    params: Dict[str, Any] = {}
    where = ""
    if current_user["role"] not in ADMIN_ROLES:
        where = "WHERE s.created_by = :uid"
        params["uid"] = current_user["id"]
    rows = db.execute(
        text(f"""
            SELECT s.id, s.title, s.role, s.level, s.subject, s.status, s.duration_minutes, s.updated_at,
                   (SELECT COUNT(*) FROM jobsim_tasks t WHERE t.simulation_id = s.id) AS task_count,
                   (SELECT COUNT(*) FROM jobsim_attempts a WHERE a.simulation_id = s.id) AS attempt_count,
                   jsonb_array_length(COALESCE(s.dataset -> 'rows', CAST('[]' AS JSONB))) AS row_count
            FROM jobsim_simulations s
            {where}
            ORDER BY s.updated_at DESC
        """),
        params,
    ).fetchall()
    return [
        {
            "id": r.id,
            "title": r.title,
            "role": r.role,
            "level": r.level,
            "subject": r.subject,
            "status": r.status,
            "duration_minutes": r.duration_minutes,
            "task_count": int(r.task_count),
            "attempt_count": int(r.attempt_count),
            "row_count": int(r.row_count or 0),
            "updated_at": str(r.updated_at),
        }
        for r in rows
    ]


# ---------------------------------------------------------------------------
# Student: attempts
# ---------------------------------------------------------------------------


def _student_pk(db: Session, user_id: int) -> int:
    row = db.execute(text("SELECT id FROM students WHERE user_id = :uid"), {"uid": user_id}).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return row.id


def _assignment_for(db: Session, simulation_id: int, student_pk: int) -> Optional[int]:
    row = db.execute(
        text("""
            SELECT a.id
            FROM jobsim_assignments a
            WHERE a.simulation_id = :sid AND a.status = 'active'
              AND (
                a.student_id = :student_pk
                OR a.section_id IN (
                    SELECT ss.section_id FROM student_sections ss
                    WHERE ss.student_id = :student_pk AND ss.status IN ('active', 'promoted')
                )
              )
            ORDER BY a.id
            LIMIT 1
        """),
        {"sid": simulation_id, "student_pk": student_pk},
    ).fetchone()
    return row.id if row else None


def _attempt_for_student(db: Session, attempt_id: int, user_id: int) -> Any:
    row = db.execute(
        text("SELECT * FROM jobsim_attempts WHERE id = :aid AND student_id = :uid"),
        {"aid": attempt_id, "uid": user_id},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Attempt not found")
    return row


def _ensure_writable(attempt: Any) -> None:
    if attempt.finished_at is not None or attempt.status != "in_progress":
        raise HTTPException(status_code=409, detail="This attempt has already been submitted.")
    if datetime.utcnow() >= attempt.deadline_at.replace(tzinfo=None):
        raise HTTPException(status_code=409, detail="Time is up for this simulation.")


# Rebuilt datasets, so each Check doesn't regenerate up to 2,000 rows. The same
# spec and seed always give the same data, so this is safe to lose at any time.
_dataset_cache: "OrderedDict[Tuple[int, int], Dict[str, Any]]" = OrderedDict()
_dataset_cache_lock = Lock()


def _seeded_dataset(simulation_id: int, spec_doc: Dict[str, Any], seed: int) -> Dict[str, Any]:
    key = (simulation_id, seed)
    with _dataset_cache_lock:
        if key in _dataset_cache:
            _dataset_cache.move_to_end(key)
            return _dataset_cache[key]
    dataset = generate_rows(spec_doc["columns"], int(spec_doc["rows"]), seed)
    with _dataset_cache_lock:
        _dataset_cache[key] = dataset
        while len(_dataset_cache) > _DATASET_CACHE_SIZE:
            _dataset_cache.popitem(last=False)
    return dataset


def attempt_dataset(simulation: Any, attempt: Any) -> Dict[str, Any]:
    """This student's data: rebuilt from the attempt seed, or the simulation's
    stored dataset for uploaded data and attempts started before seeding."""
    if attempt.seeded_dataset:
        return _seeded_dataset(simulation.id, _load(simulation.dataset_spec, {}), int(attempt.seed))
    return _load(simulation.dataset, {"columns": [], "rows": []})


def _answer_formulas(db: Session, simulation_id: int) -> List[Any]:
    return db.execute(
        text("""
            SELECT t.id AS task_id, t.position, f.formula, f.expected_format
            FROM jobsim_tasks t JOIN jobsim_answer_formulas f ON f.task_id = t.id
            WHERE t.simulation_id = :sid
            ORDER BY t.position
        """),
        {"sid": simulation_id},
    ).fetchall()


def _formula_failures(formulas: List[Any], dataset: Dict[str, Any]) -> List[Tuple[Any, str]]:
    """Answer formulas that don't give a usable value on this data."""
    sheet = sheet_from_dataset(dataset)
    failures = []
    for f in formulas:
        result = evaluate_input(f.formula, sheet)
        if not result.ok:
            failures.append((f, str(result.error)))
        elif result.value is None:
            failures.append((f, "a blank value"))
    return failures


def _choose_dataset(simulation: Any, formulas: List[Any]) -> Tuple[int, bool, Dict[str, Any]]:
    """A seed for a new attempt, whether its data comes from that seed, and the
    data. A seed is only used if every task has an answer on its data, so no
    student gets a task that can't be answered."""
    spec_doc = _load(simulation.dataset_spec, None)
    if spec_doc:
        for _ in range(SEED_TRIES):
            seed = secrets.randbelow(2**62)
            try:
                dataset = _seeded_dataset(simulation.id, spec_doc, seed)
            except ValueError:
                continue
            if not _formula_failures(formulas, dataset):
                return seed, True, dataset
    return secrets.randbelow(2**62), False, _load(simulation.dataset, {"columns": [], "rows": []})


def _compute_keys(db: Session, attempt_id: int, formulas: List[Any], dataset: Dict[str, Any]) -> None:
    """Expected answers for this attempt, on this student's own data."""
    sheet = sheet_from_dataset(dataset)
    for f in formulas:
        result = evaluate_input(f.formula, sheet)
        expected = result.value if result.ok else None
        db.execute(
            text("""
                INSERT INTO jobsim_attempt_keys (attempt_id, task_id, expected_value, expected_format)
                VALUES (:aid, :tid, CAST(:value AS JSONB), :fmt)
                ON CONFLICT (attempt_id, task_id) DO NOTHING
            """),
            {"aid": attempt_id, "tid": f.task_id, "value": _json({"v": expected}), "fmt": f.expected_format},
        )


def start_or_resume_attempt(db: Session, current_user: Dict[str, Any], simulation_id: int) -> Dict[str, Any]:
    user_id = current_user["id"]
    finalize_expired_attempts(db, user_id)
    existing = db.execute(
        text("SELECT id FROM jobsim_attempts WHERE simulation_id = :sid AND student_id = :uid"),
        {"sid": simulation_id, "uid": user_id},
    ).fetchone()
    if existing:
        return load_attempt_for_student(db, current_user, existing.id)

    simulation = db.execute(
        text("SELECT id, status, duration_minutes, dataset, dataset_spec FROM jobsim_simulations WHERE id = :sid"),
        {"sid": simulation_id},
    ).fetchone()
    student_pk = _student_pk(db, user_id)
    assignment_id = _assignment_for(db, simulation_id, student_pk) if simulation else None
    if not simulation or simulation.status != "published" or assignment_id is None:
        raise HTTPException(status_code=403, detail="This simulation isn't assigned to you.")

    formulas = _answer_formulas(db, simulation_id)
    seed, seeded, dataset = _choose_dataset(simulation, formulas)
    attempt_id = db.execute(
        text("""
            INSERT INTO jobsim_attempts (simulation_id, student_id, assignment_id, seed, seeded_dataset, deadline_at)
            VALUES (:sid, :uid, :assignment_id, :seed, :seeded,
                    (NOW() AT TIME ZONE 'UTC') + make_interval(mins => :minutes))
            ON CONFLICT (simulation_id, student_id) DO NOTHING
            RETURNING id
        """),
        {
            "sid": simulation_id,
            "uid": user_id,
            "assignment_id": assignment_id,
            "seed": seed,
            "seeded": seeded,
            "minutes": int(simulation.duration_minutes),
        },
    ).scalar_one_or_none()
    if attempt_id is None:  # started in another tab at the same moment
        db.rollback()
        return start_or_resume_attempt(db, current_user, simulation_id)
    # started_at uses the same clock as deadline_at.
    db.execute(
        text("UPDATE jobsim_attempts SET started_at = NOW() AT TIME ZONE 'UTC' WHERE id = :aid"),
        {"aid": attempt_id},
    )
    _compute_keys(db, attempt_id, formulas, dataset)
    db.commit()
    return load_attempt_for_student(db, current_user, attempt_id)


def load_attempt_for_student(db: Session, current_user: Dict[str, Any], attempt_id: int) -> Dict[str, Any]:
    """Everything the workspace needs to start or resume. Never contains an
    answer formula, expected value, expected format or rubric."""
    finalize_expired_attempts(db, current_user["id"])
    attempt = _attempt_for_student(db, attempt_id, current_user["id"])
    simulation = db.execute(
        text("""
            SELECT id, title, description, role, level, duration_minutes, dataset, dataset_spec
            FROM jobsim_simulations WHERE id = :sid
        """),
        {"sid": attempt.simulation_id},
    ).fetchone()
    tasks = db.execute(
        text("""
            SELECT t.id, t.position, t.type, t.stage, t.prompt_template, t.config, t.max_score,
                   (t.hint IS NOT NULL) AS has_hint,
                   r.status AS result_status, r.check_count, r.hint_used
            FROM jobsim_tasks t
            LEFT JOIN jobsim_task_results r ON r.task_id = t.id AND r.attempt_id = :aid
            WHERE t.simulation_id = :sid
            ORDER BY t.position
        """),
        {"sid": attempt.simulation_id, "aid": attempt.id},
    ).fetchall()
    now = datetime.utcnow()
    deadline = attempt.deadline_at.replace(tzinfo=None)
    return {
        "attempt_id": attempt.id,
        "status": attempt.status,
        "total_score": float(attempt.total_score) if attempt.total_score is not None else None,
        "started_at": attempt.started_at.isoformat() + "Z",
        "deadline_at": deadline.isoformat() + "Z",
        "remaining_seconds": max(0, int((deadline - now).total_seconds())),
        "simulation": {
            "id": simulation.id,
            "title": simulation.title,
            "description": simulation.description,
            "role": simulation.role,
            "level": simulation.level,
            "duration_minutes": simulation.duration_minutes,
        },
        "dataset": attempt_dataset(simulation, attempt),
        "tasks": [
            {
                "id": t.id,
                "position": t.position,
                "type": t.type,
                "stage": t.stage,
                "prompt": t.prompt_template,
                "config": {k: v for k, v in _load(t.config, {}).items() if k in STUDENT_CONFIG_KEYS},
                "max_score": float(t.max_score),
                "has_hint": bool(t.has_hint),
                "result": t.result_status or "pending",
                "check_count": int(t.check_count or 0),
                "hint_used": bool(t.hint_used),
            }
            for t in tasks
        ],
        "saved": {
            "cells": _load(attempt.cells, {}),
            "memo": _load(attempt.memo, None),
            "slides": _load(attempt.slides, None),
            "last_task_id": attempt.last_task_id,
        },
    }


def save_attempt_state(
    db: Session, current_user: Dict[str, Any], attempt_id: int, state: Dict[str, Any]
) -> Dict[str, Any]:
    """Autosave. `cells` is merged per task ({task_id: {input, format}}), so the
    browser only needs to send what changed."""
    attempt = _attempt_for_student(db, attempt_id, current_user["id"])
    _ensure_writable(attempt)
    cells = _load(attempt.cells, {})
    for task_id, cell in (state.get("cells") or {}).items():
        if not isinstance(cell, dict):
            continue
        fmt = (cell.get("format") or "general").lower()
        cells[str(task_id)] = {
            "input": str(cell.get("input") or "")[:1000],
            "format": fmt if fmt in FORMATS else "general",
        }
    sets = ["cells = CAST(:cells AS JSONB)", "updated_at = NOW()"]
    params: Dict[str, Any] = {"aid": attempt.id, "cells": _json(cells)}
    if "memo" in state:
        sets.append("memo = CAST(:memo AS JSONB)")
        params["memo"] = _json(state["memo"])
    if "slides" in state:
        sets.append("slides = CAST(:slides AS JSONB)")
        params["slides"] = _json(state["slides"])
    if state.get("last_task_id") is not None:
        sets.append("last_task_id = :last_task_id")
        params["last_task_id"] = int(state["last_task_id"])
    db.execute(text(f"UPDATE jobsim_attempts SET {', '.join(sets)} WHERE id = :aid"), params)
    db.commit()
    return {"saved": True, "saved_at": datetime.utcnow().isoformat() + "Z"}


# ---------------------------------------------------------------------------
# Student: evaluate and check a spreadsheet answer
# ---------------------------------------------------------------------------

# Light per-attempt limit on evaluate/check so the endpoints can't be hammered.
_RATE_WINDOW_SECONDS = 60
_RATE_MAX_CALLS = 60
_recent_calls: Dict[int, Deque[float]] = defaultdict(deque)


def _rate_limit(attempt_id: int) -> None:
    now = time.monotonic()
    calls = _recent_calls[attempt_id]
    while calls and now - calls[0] > _RATE_WINDOW_SECONDS:
        calls.popleft()
    if len(calls) >= _RATE_MAX_CALLS:
        raise HTTPException(status_code=429, detail="Too many checks in a minute. Wait a moment and try again.")
    calls.append(now)


def _attempt_sheet(db: Session, attempt: Any) -> Sheet:
    row = db.execute(
        text("SELECT id, dataset, dataset_spec FROM jobsim_simulations WHERE id = :sid"),
        {"sid": attempt.simulation_id},
    ).fetchone()
    return sheet_from_dataset(attempt_dataset(row, attempt))


def _clean_format(fmt: Optional[str]) -> str:
    fmt = (fmt or "general").lower()
    if fmt not in FORMATS:
        raise HTTPException(status_code=400, detail="Format must be general, number, currency or percent.")
    return fmt


def evaluate_for_student(
    db: Session, current_user: Dict[str, Any], attempt_id: int, raw_input: str, fmt: str
) -> Dict[str, Any]:
    """The computed value of the student's own input, for display in the cell."""
    attempt = _attempt_for_student(db, attempt_id, current_user["id"])
    _ensure_writable(attempt)
    _rate_limit(attempt.id)
    fmt = _clean_format(fmt)
    result = evaluate_input(raw_input, _attempt_sheet(db, attempt))
    return {
        "display": result.display(fmt),
        "value_type": result.value_type,
        "error": result.error,
        "message": result.message if result.error else "",
        "is_formula": result.is_formula,
        "format": fmt,
    }


def check_task(
    db: Session,
    current_user: Dict[str, Any],
    attempt_id: int,
    task_id: int,
    raw_input: str,
    fmt: str,
) -> Dict[str, Any]:
    attempt = _attempt_for_student(db, attempt_id, current_user["id"])
    _ensure_writable(attempt)
    _rate_limit(attempt.id)
    fmt = _clean_format(fmt)
    task = db.execute(
        text("""
            SELECT t.id, t.config, t.max_score, k.expected_value, k.expected_format
            FROM jobsim_tasks t
            JOIN jobsim_attempt_keys k ON k.task_id = t.id AND k.attempt_id = :aid
            WHERE t.id = :tid AND t.simulation_id = :sid AND t.type = 'spreadsheet'
        """),
        {"aid": attempt.id, "tid": task_id, "sid": attempt.simulation_id},
    ).fetchone()
    if not task:
        raise HTTPException(status_code=404, detail="Spreadsheet task not found")

    raw_input = (raw_input or "")[:1000]
    result = evaluate_input(raw_input, _attempt_sheet(db, attempt))
    config = _load(task.config, {})
    expected = _load(task.expected_value, {}).get("v")
    verdict = mark_spreadsheet_answer(
        result, fmt, expected, task.expected_format, bool(config.get("must_use_formula"))
    )

    db.execute(
        text("""
            INSERT INTO jobsim_check_log (
                attempt_id, task_id, raw_input, value_seen, format_seen, is_correct, reason
            )
            VALUES (:aid, :tid, :raw, :seen, :fmt, :ok, :reason)
        """),
        {
            "aid": attempt.id,
            "tid": task.id,
            "raw": raw_input,
            "seen": result.display(fmt),
            "fmt": fmt,
            "ok": verdict.is_correct,
            "reason": verdict.reason,
        },
    )
    db.execute(
        text("""
            INSERT INTO jobsim_task_results (attempt_id, task_id, status, score, check_count, marked_by)
            VALUES (:aid, :tid, :status, :score, 1, 'auto')
            ON CONFLICT (attempt_id, task_id) DO UPDATE
            SET status = EXCLUDED.status, score = EXCLUDED.score,
                check_count = jobsim_task_results.check_count + 1,
                marked_by = 'auto', updated_at = NOW()
        """),
        {
            "aid": attempt.id,
            "tid": task.id,
            "status": "correct" if verdict.is_correct else "incorrect",
            "score": float(task.max_score) if verdict.is_correct else 0,
        },
    )
    # The checked input is also the saved answer for that cell.
    db.execute(
        text("""
            UPDATE jobsim_attempts
            SET cells = jsonb_set(cells, ARRAY[CAST(:tid_text AS TEXT)], CAST(:cell AS JSONB), true),
                updated_at = NOW()
            WHERE id = :aid
        """),
        {"aid": attempt.id, "tid_text": str(task.id), "cell": _json({"input": raw_input, "format": fmt})},
    )
    db.commit()
    return {
        "status": "correct" if verdict.is_correct else "incorrect",
        "message": verdict.message,
        "display": result.display(fmt),
    }


# ---------------------------------------------------------------------------
# Student: My Simulations list, detail page and hints
# ---------------------------------------------------------------------------

_ASSIGNED_SQL = """
    SELECT DISTINCT ON (s.id)
           s.id, s.title, s.description, s.role, s.level, s.subject, s.duration_minutes,
           a.due_date
    FROM jobsim_simulations s
    JOIN jobsim_assignments a ON a.simulation_id = s.id
    WHERE (
        a.student_id = :student_pk
        OR a.section_id IN (
            SELECT ss.section_id FROM student_sections ss
            WHERE ss.student_id = :student_pk AND ss.status IN ('active', 'promoted')
        )
      )
      AND (
        (a.status = 'active' AND s.status = 'published')
        -- Withdrawn simulations and closed assignments stay visible to
        -- students who already started, so they can finish or see the result.
        OR EXISTS (
            SELECT 1 FROM jobsim_attempts x JOIN students st ON st.user_id = x.student_id
            WHERE x.simulation_id = s.id AND st.id = :student_pk
        )
      )
    ORDER BY s.id, (a.status = 'active') DESC, a.due_date ASC NULLS LAST
"""


def _progress_for(db: Session, simulation_ids: List[int], user_id: int) -> Dict[int, Dict[str, Any]]:
    """Per simulation: task counts and this student's attempt status and progress."""
    if not simulation_ids:
        return {}
    rows = db.execute(
        text("""
            SELECT s.id,
                   COUNT(t.id) AS tasks,
                   COUNT(t.id) FILTER (WHERE t.type = 'spreadsheet') AS spreadsheet_tasks,
                   COUNT(t.id) FILTER (WHERE t.type = 'memo') AS memo_tasks,
                   COUNT(t.id) FILTER (WHERE t.type = 'presentation') AS presentation_tasks,
                   att.id AS attempt_id, att.status AS attempt_status, att.deadline_at,
                   att.finished_at,
                   (SELECT COUNT(*) FROM jobsim_task_results r
                    WHERE r.attempt_id = att.id AND r.status IN ('correct', 'scored')) AS done_tasks
            FROM jobsim_simulations s
            LEFT JOIN jobsim_tasks t ON t.simulation_id = s.id
            LEFT JOIN jobsim_attempts att ON att.simulation_id = s.id AND att.student_id = :uid
            WHERE s.id = ANY(:ids)
            GROUP BY s.id, att.id
        """),
        {"ids": simulation_ids, "uid": user_id},
    ).fetchall()
    now = datetime.utcnow()
    out: Dict[int, Dict[str, Any]] = {}
    for r in rows:
        if r.attempt_id is None:
            status = "not_started"
        elif r.attempt_status != "in_progress" or r.finished_at is not None:
            status = "completed"
        elif r.deadline_at.replace(tzinfo=None) <= now:
            status = "time_up"
        else:
            status = "in_progress"
        total = int(r.tasks or 0)
        done = int(r.done_tasks or 0)
        out[r.id] = {
            "task_count": total,
            "spreadsheet_tasks": int(r.spreadsheet_tasks or 0),
            "memo_tasks": int(r.memo_tasks or 0),
            "presentation_tasks": int(r.presentation_tasks or 0),
            "status": status,
            "attempt_id": r.attempt_id,
            "progress_pct": round(100 * done / total) if total else 0,
        }
    return out


def list_assigned_simulations(db: Session, current_user: Dict[str, Any]) -> List[Dict[str, Any]]:
    finalize_expired_attempts(db, current_user["id"])
    student_pk = _student_pk(db, current_user["id"])
    rows = db.execute(text(_ASSIGNED_SQL), {"student_pk": student_pk}).fetchall()
    progress = _progress_for(db, [r.id for r in rows], current_user["id"])
    items = [
        {
            "id": r.id,
            "title": r.title,
            "description": r.description,
            "role": r.role or "General",
            "level": r.level,
            "subject": r.subject,
            "duration_minutes": r.duration_minutes,
            "due_date": r.due_date.isoformat() if r.due_date else None,
            **progress.get(r.id, {}),
        }
        for r in rows
    ]
    items.sort(key=lambda i: (i["role"].lower(), i["due_date"] or "9999", i["title"].lower()))
    return items


def simulation_detail_for_student(
    db: Session, current_user: Dict[str, Any], simulation_id: int
) -> Dict[str, Any]:
    """Detail page: what the simulation covers. 403 unless it's assigned to the
    student (or they already have an attempt on it)."""
    finalize_expired_attempts(db, current_user["id"])
    student_pk = _student_pk(db, current_user["id"])
    assigned = db.execute(
        text(f"SELECT * FROM ({_ASSIGNED_SQL}) x WHERE x.id = :sid"),
        {"student_pk": student_pk, "sid": simulation_id},
    ).fetchone()
    has_attempt = db.execute(
        text("SELECT 1 FROM jobsim_attempts WHERE simulation_id = :sid AND student_id = :uid"),
        {"sid": simulation_id, "uid": current_user["id"]},
    ).fetchone()
    if not assigned and not has_attempt:
        raise HTTPException(status_code=403, detail="This simulation isn't assigned to you.")
    sim = db.execute(
        text("""
            SELECT id, title, description, role, level, subject, duration_minutes, dataset
            FROM jobsim_simulations WHERE id = :sid
        """),
        {"sid": simulation_id},
    ).fetchone()
    stages = db.execute(
        text("""
            SELECT COALESCE(stage, 'Tasks') AS stage, MIN(position) AS first,
                   COUNT(*) AS tasks, ARRAY_AGG(DISTINCT type) AS types
            FROM jobsim_tasks WHERE simulation_id = :sid
            GROUP BY COALESCE(stage, 'Tasks')
            ORDER BY MIN(position)
        """),
        {"sid": simulation_id},
    ).fetchall()
    skills = db.execute(
        text("""
            SELECT c.name FROM jobsim_capability_tags jt
            JOIN capabilities c ON c.id = jt.capability_id
            WHERE jt.simulation_id = :sid ORDER BY c.name
        """),
        {"sid": simulation_id},
    ).fetchall()
    dataset = _load(sim.dataset, {"columns": [], "rows": []})
    return {
        "id": sim.id,
        "title": sim.title,
        "description": sim.description,
        "role": sim.role or "General",
        "level": sim.level,
        "subject": sim.subject,
        "duration_minutes": sim.duration_minutes,
        "due_date": assigned.due_date.isoformat() if assigned and assigned.due_date else None,
        "stages": [
            {"name": s.stage, "tasks": int(s.tasks), "types": sorted(s.types or [])} for s in stages
        ],
        "skills": [s.name for s in skills],
        "dataset_summary": {
            "columns": dataset.get("columns") or [],
            "rows": len(dataset.get("rows") or []),
        },
        **_progress_for(db, [sim.id], current_user["id"]).get(sim.id, {}),
    }


def hint_for_task(db: Session, current_user: Dict[str, Any], attempt_id: int, task_id: int) -> Dict[str, Any]:
    """Return a task's hint and record that it was used."""
    attempt = _attempt_for_student(db, attempt_id, current_user["id"])
    _ensure_writable(attempt)
    task = db.execute(
        text("SELECT id, hint FROM jobsim_tasks WHERE id = :tid AND simulation_id = :sid"),
        {"tid": task_id, "sid": attempt.simulation_id},
    ).fetchone()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if not task.hint:
        return {"hint": None}
    db.execute(
        text("""
            INSERT INTO jobsim_task_results (attempt_id, task_id, hint_used)
            VALUES (:aid, :tid, TRUE)
            ON CONFLICT (attempt_id, task_id) DO UPDATE SET hint_used = TRUE, updated_at = NOW()
        """),
        {"aid": attempt.id, "tid": task.id},
    )
    db.commit()
    return {"hint": task.hint}


# ---------------------------------------------------------------------------
# Faculty: approve, test a formula while editing, skill tags
# ---------------------------------------------------------------------------


def _seed_check_errors(db: Session, simulation: Any) -> List[str]:
    """Each student gets different data, so every answer has to work on data
    other than the preview. Uploaded data is the same for everyone: no check."""
    spec_doc = _load(simulation.dataset_spec, None)
    if not spec_doc:
        return []
    formulas = _answer_formulas(db, simulation.id)
    errors: List[str] = []
    for seed in VERIFY_SEEDS:
        try:
            dataset = generate_rows(spec_doc["columns"], int(spec_doc["rows"]), seed)
        except ValueError as exc:
            return [f"The data can't be generated for every student: {exc}"]
        for task, problem in _formula_failures(formulas, dataset):
            message = f"Task {task.position}: the answer formula gives {problem} on another student's data."
            if message not in errors:
                errors.append(message)
    return errors


def approve_simulation(db: Session, current_user: Dict[str, Any], simulation_id: int) -> None:
    """Re-verify every answer on the stored data, then mark the draft approved
    (it then waits for an admin to publish it)."""
    row = _owned_simulation(db, current_user, simulation_id)
    if row.status != "draft":
        raise HTTPException(status_code=409, detail="Only a draft simulation can be approved.")
    current = load_simulation_for_author(db, current_user, simulation_id)
    _, tasks, errors = validate_simulation(current)
    if not any(t["type"] == "spreadsheet" for t in tasks):
        errors.append("Add at least one spreadsheet task.")
    errors.extend(_seed_check_errors(db, row))
    if errors:
        raise HTTPException(status_code=400, detail={"message": "Fix these before approving.", "errors": errors})
    db.execute(
        text("""
            UPDATE jobsim_simulations
            SET status = 'approved', approved_by = :uid, updated_at = NOW()
            WHERE id = :sid
        """),
        {"uid": current_user["id"], "sid": simulation_id},
    )
    db.execute(
        text("""
            UPDATE jobsim_answer_formulas SET verified_at = NOW()
            WHERE task_id IN (SELECT id FROM jobsim_tasks WHERE simulation_id = :sid)
        """),
        {"sid": simulation_id},
    )
    db.commit()


def evaluate_for_author(dataset: Dict[str, Any], raw_input: str, fmt: str) -> Dict[str, Any]:
    """Faculty "Test formula": the value of a formula on the (unsaved) dataset."""
    fmt = _clean_format(fmt)
    result = evaluate_input(raw_input, sheet_from_dataset(dataset))
    return {
        "display": result.display(fmt),
        "value_type": result.value_type,
        "error": result.error,
        "message": result.message if result.error else "",
        "is_formula": result.is_formula,
        "format": fmt,
    }


def set_capability_tags(db: Session, simulation_id: int, capability_ids: List[int]) -> None:
    db.execute(text("DELETE FROM jobsim_capability_tags WHERE simulation_id = :sid"), {"sid": simulation_id})
    for capability_id in capability_ids:
        db.execute(
            text("""
                INSERT INTO jobsim_capability_tags (simulation_id, capability_id)
                SELECT :sid, id FROM capabilities WHERE id = :cid
                ON CONFLICT DO NOTHING
            """),
            {"sid": simulation_id, "cid": int(capability_id)},
        )
    db.commit()


# ---------------------------------------------------------------------------
# Timer: submit attempts whose time ran out (handover 9.7, "lazy finalise")
# ---------------------------------------------------------------------------


def _mark_final_answers(db: Session, attempt: Any) -> None:
    """Mark what is in every answer cell at submission. This sets the marks, so
    a right answer that was never checked counts, and one changed after a
    check is judged as it was left. check_count stays as the student's own."""
    tasks = db.execute(
        text("""
            SELECT t.id, t.config, t.max_score, k.expected_value, k.expected_format
            FROM jobsim_tasks t
            JOIN jobsim_attempt_keys k ON k.task_id = t.id AND k.attempt_id = :aid
            WHERE t.simulation_id = :sid AND t.type = 'spreadsheet'
        """),
        {"aid": attempt.id, "sid": attempt.simulation_id},
    ).fetchall()
    if not tasks:
        return
    sheet = _attempt_sheet(db, attempt)
    cells = _load(attempt.cells, {})
    for task in tasks:
        cell = cells.get(str(task.id)) or {}
        raw = str(cell.get("input") or "")
        status, score = "pending", 0.0
        if raw.strip():
            verdict = mark_spreadsheet_answer(
                evaluate_input(raw, sheet),
                _clean_format(cell.get("format")),
                _load(task.expected_value, {}).get("v"),
                task.expected_format,
                bool(_load(task.config, {}).get("must_use_formula")),
            )
            status = "correct" if verdict.is_correct else "incorrect"
            score = float(task.max_score) if verdict.is_correct else 0.0
        db.execute(
            text("""
                INSERT INTO jobsim_task_results (attempt_id, task_id, status, score, marked_by)
                VALUES (:aid, :tid, :status, :score, 'auto')
                ON CONFLICT (attempt_id, task_id) DO UPDATE
                SET status = EXCLUDED.status, score = EXCLUDED.score,
                    marked_by = 'auto', updated_at = NOW()
            """),
            {"aid": attempt.id, "tid": task.id, "status": status, "score": score},
        )


def _submit_attempt(db: Session, attempt: Any, finished_at: Optional[datetime]) -> None:
    _mark_final_answers(db, attempt)
    db.execute(
        text("""
            UPDATE jobsim_attempts a
            SET status = 'submitted',
                finished_at = COALESCE(CAST(:finished AS TIMESTAMP), NOW() AT TIME ZONE 'UTC'),
                total_score = (
                    SELECT COALESCE(SUM(r.score), 0) FROM jobsim_task_results r WHERE r.attempt_id = a.id
                ),
                updated_at = NOW()
            WHERE a.id = :aid
        """),
        {"aid": attempt.id, "finished": finished_at},
    )


def finish_attempt(db: Session, current_user: Dict[str, Any], attempt_id: int) -> Dict[str, Any]:
    """The student finishes early. Safe to call twice; time-up finishes on its own."""
    finalize_expired_attempts(db, current_user["id"])
    attempt = db.execute(
        text("SELECT * FROM jobsim_attempts WHERE id = :aid AND student_id = :uid FOR UPDATE"),
        {"aid": attempt_id, "uid": current_user["id"]},
    ).fetchone()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.status == "in_progress":
        _submit_attempt(db, attempt, None)
    db.commit()
    return {"attempt_id": attempt_id, "status": "submitted"}


def sweep_expired_attempts(db: Session) -> int:
    """Submit every expired attempt, one transaction each, so one that fails
    can't hold back the others. Attempts locked by another sweeper or by a
    read are skipped. Used by the background sweeper (worker.py)."""
    expired = db.execute(
        text("""
            SELECT id FROM jobsim_attempts
            WHERE status = 'in_progress' AND deadline_at <= (NOW() AT TIME ZONE 'UTC')
            ORDER BY deadline_at
        """)
    ).fetchall()
    db.rollback()
    submitted = 0
    for row in expired:
        try:
            attempt = db.execute(
                text("""
                    SELECT * FROM jobsim_attempts
                    WHERE id = :aid AND status = 'in_progress'
                    FOR UPDATE SKIP LOCKED
                """),
                {"aid": row.id},
            ).fetchone()
            if attempt:
                _submit_attempt(db, attempt, attempt.deadline_at)
                submitted += 1
            db.commit()
        except Exception:  # noqa: BLE001 - logged; retried on the next sweep
            db.rollback()
            logger.exception("Couldn't submit expired attempt %s", row.id)
    return submitted


def finalize_expired_attempts(db: Session, student_user_id: Optional[int] = None) -> int:
    """Submit and mark every in-progress attempt past its deadline. The sweeper
    normally gets there first; this runs before every read so nobody sees an
    expired attempt as open between sweeps, or on hosts with no sweeper."""
    params: Dict[str, Any] = {}
    only_student = ""
    if student_user_id is not None:
        only_student = "AND student_id = :uid"
        params["uid"] = student_user_id
    expired = db.execute(
        text(f"""
            SELECT * FROM jobsim_attempts
            WHERE status = 'in_progress'
              AND deadline_at <= (NOW() AT TIME ZONE 'UTC')
              {only_student}
            FOR UPDATE SKIP LOCKED
        """),
        params,
    ).fetchall()
    for attempt in expired:
        _submit_attempt(db, attempt, attempt.deadline_at)
    if expired:
        db.commit()
    return len(expired)
