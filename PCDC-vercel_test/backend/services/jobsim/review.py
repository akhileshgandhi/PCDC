"""Faculty review of spreadsheet answers (handover 9.3, DD2).

Compares each student's saved answer and format with the correct ones and says
correct, incorrect or not answered. The comparison uses the same engine and
marking rules as Check Answer, on the answer the student left in the cell, so
it also covers answers they never checked.

Expected values and formulas appear only in the faculty views: those endpoints
are faculty or admin only, and faculty see only students in their own sections.
student_results is the student's own view and leaves them out.

Faculty can change a mark once the attempt is submitted (handover F5). Every
change is kept in jobsim_score_overrides: old mark, new mark, who, when, why.
"""

import csv
import io
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from services.admin.scope import admin_scope, is_admin_role, user_in_scope_sql

from .formula import FORMAT_LABELS, CellResult, Sheet, evaluate_input, format_value
from .marking import mark_spreadsheet_answer, values_match
from .publishing import ensure_admin_can_manage
from .service import (
    _attempt_for_student,
    _attempt_sheet,
    _load,
    attempt_dataset,
    finalize_expired_attempts,
    sheet_from_dataset,
)

REASON_TEXT = {
    "correct": "Value and format both match.",
    "wrong_format": "The value is right, but the format is wrong.",
    "wrong_value": "The value doesn't match the correct answer.",
    "formula_required": "A value was typed, but this task needs a formula.",
}

IST = timedelta(hours=5, minutes=30)


def _simulation_for_review(db: Session, current_user: Dict[str, Any], simulation_id: int) -> Any:
    if is_admin_role(current_user):
        return ensure_admin_can_manage(db, current_user, simulation_id)
    row = db.execute(
        text("SELECT * FROM jobsim_simulations WHERE id = :sid AND created_by = :uid"),
        {"sid": simulation_id, "uid": current_user["id"]},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Simulation not found")
    return row


def _visible_attempts_sql(current_user: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
    """Which attempts this reviewer may see. Needs aliases a (attempt) and u (student)."""
    if is_admin_role(current_user):
        scope = admin_scope(current_user)
        if scope is None:
            return "TRUE", {}
        return user_in_scope_sql("u"), {"scope_ids": scope}
    return (
        """(
            EXISTS (SELECT 1 FROM jobsim_assignments asg
                    WHERE asg.id = a.assignment_id AND asg.assigned_by = :me)
            OR EXISTS (SELECT 1 FROM students st
                       JOIN student_sections ss ON ss.student_id = st.id AND ss.status IN ('active', 'promoted')
                       JOIN faculty_sections fs ON fs.section_id = ss.section_id
                       WHERE st.user_id = a.student_id AND fs.faculty_id = :me)
        )""",
        {"me": current_user["id"]},
    )


def _spreadsheet_tasks(db: Session, simulation_id: int) -> List[Any]:
    return db.execute(
        text("""
            SELECT t.id, t.position, t.stage, t.prompt_template, t.config, t.max_score,
                   f.formula, f.expected_format
            FROM jobsim_tasks t
            JOIN jobsim_answer_formulas f ON f.task_id = t.id
            WHERE t.simulation_id = :sid AND t.type = 'spreadsheet'
            ORDER BY t.position
        """),
        {"sid": simulation_id},
    ).fetchall()


def _keys(db: Session, attempt_ids: List[int]) -> Dict[Tuple[int, int], Any]:
    rows = db.execute(
        text("""
            SELECT attempt_id, task_id, expected_value, expected_format
            FROM jobsim_attempt_keys WHERE attempt_id = ANY(:ids)
        """),
        {"ids": attempt_ids},
    ).fetchall()
    return {(r.attempt_id, r.task_id): r for r in rows}


def _task_results(db: Session, attempt_ids: List[int]) -> Dict[Tuple[int, int], Any]:
    rows = db.execute(
        text("""
            SELECT id, attempt_id, task_id, score, check_count, hint_used, marked_by
            FROM jobsim_task_results WHERE attempt_id = ANY(:ids)
        """),
        {"ids": attempt_ids},
    ).fetchall()
    return {(r.attempt_id, r.task_id): r for r in rows}


def _compare(
    task: Any,
    key: Optional[Any],
    cell: Dict[str, Any],
    sheet: Sheet,
    cache: Dict[str, CellResult],
) -> Dict[str, Any]:
    """One answer against the correct one. Students on the same data often type
    the same formula, so results are cached per input for that dataset."""
    raw = str(cell.get("input") or "")
    fmt = (cell.get("format") or "general").lower()
    expected = _load(key.expected_value, {}).get("v") if key else None
    expected_format = (key.expected_format if key else task.expected_format) or "general"
    must_use_formula = bool(_load(task.config, {}).get("must_use_formula"))

    comparison: Dict[str, Any] = {
        "student_input": raw,
        "student_format": fmt,
        "expected_format": expected_format,
        "expected_display": format_value(expected, expected_format) if expected is not None else "—",
    }
    if not raw.strip():
        return {
            **comparison,
            "student_display": "",
            "status": "not_answered",
            "value_correct": False,
            "format_correct": False,
            "reason": "No answer was entered.",
        }
    result = cache.get(raw)
    if result is None:
        result = cache[raw] = evaluate_input(raw, sheet)
    verdict = mark_spreadsheet_answer(result, fmt, expected, expected_format, must_use_formula)
    reason = REASON_TEXT.get(verdict.reason)
    if reason is None:  # error:#DIV/0! and the like
        reason = f"The formula returns {result.error}. {result.message}".strip()
    return {
        **comparison,
        "student_display": result.display(fmt),
        "status": "correct" if verdict.is_correct else "incorrect",
        "value_correct": result.ok and values_match(result.value, expected),
        "format_correct": fmt == expected_format,
        "reason": reason,
    }


def student_results(db: Session, current_user: Dict[str, Any], attempt_id: int) -> Dict[str, Any]:
    """The student's own results once submitted. Fields are listed one by one so
    the correct value, formula and format can never be included by accident."""
    finalize_expired_attempts(db, current_user["id"])
    attempt = _attempt_for_student(db, attempt_id, current_user["id"])
    if attempt.status == "in_progress":
        raise HTTPException(status_code=409, detail="Finish the simulation to see your results.")
    simulation = db.execute(
        text("SELECT id, title FROM jobsim_simulations WHERE id = :sid"), {"sid": attempt.simulation_id}
    ).fetchone()
    tasks = _spreadsheet_tasks(db, attempt.simulation_id)
    keys = _keys(db, [attempt.id])
    results = _task_results(db, [attempt.id])
    other_parts = db.execute(
        text("SELECT DISTINCT type FROM jobsim_tasks WHERE simulation_id = :sid AND type <> 'spreadsheet'"),
        {"sid": attempt.simulation_id},
    ).fetchall()
    sheet = _attempt_sheet(db, attempt)
    cells = _load(attempt.cells, {})
    cache: Dict[str, CellResult] = {}
    items = []
    for task in tasks:
        compared = _compare(task, keys.get((attempt.id, task.id)), cells.get(str(task.id)) or {}, sheet, cache)
        result = results.get((attempt.id, task.id))
        items.append(
            {
                "position": task.position,
                "stage": task.stage,
                "prompt": task.prompt_template,
                "student_input": compared["student_input"],
                "student_display": compared["student_display"],
                "format_label": FORMAT_LABELS.get(compared["student_format"], compared["student_format"]),
                "status": compared["status"],
                "reason": compared["reason"],
                "marks": float(result.score or 0) if result else 0.0,
                "max_marks": float(task.max_score),
                "marks_changed": bool(result) and result.marked_by == "faculty",
            }
        )
    marks = sum(item["marks"] for item in items)
    max_marks = sum(item["max_marks"] for item in items)
    return {
        "attempt_id": attempt.id,
        "simulation": {"id": simulation.id, "title": simulation.title},
        "finished_at": str(attempt.finished_at) if attempt.finished_at else None,
        "marks": marks,
        "max_marks": max_marks,
        "percent": round(100 * marks / max_marks, 1) if max_marks else 0,
        "correct": sum(1 for item in items if item["status"] == "correct"),
        "incorrect": sum(1 for item in items if item["status"] == "incorrect"),
        "not_answered": sum(1 for item in items if item["status"] == "not_answered"),
        "unscored_parts": sorted("Memo" if p.type == "memo" else "Slides" for p in other_parts),
        "tasks": items,
    }


def _student_status(attempt: Any) -> str:
    return "in_progress" if attempt.status == "in_progress" else "submitted"


def simulation_results(db: Session, current_user: Dict[str, Any], simulation_id: int) -> Dict[str, Any]:
    """Every visible attempt with how many answers are correct and its marks per
    task. The page groups these by section and by task."""
    simulation = _simulation_for_review(db, current_user, simulation_id)
    finalize_expired_attempts(db)
    visible_sql, params = _visible_attempts_sql(current_user)
    attempts = db.execute(
        text(f"""
            SELECT a.id, a.status, a.cells, a.seed, a.seeded_dataset, a.started_at, a.finished_at, a.total_score,
                   u.name AS student_name, u.college_id, cs.id AS section_id, cs.name AS section_name,
                   -- Many sections share a name like A, so show which one it is.
                   NULLIF(CONCAT_WS(' · ', co.name, se.name, b.name, 'Section ' || cs.name), '') AS section_label,
                   (SELECT COALESCE(SUM(r.score), 0) FROM jobsim_task_results r WHERE r.attempt_id = a.id) AS marks
            FROM jobsim_attempts a
            JOIN users u ON u.id = a.student_id
            LEFT JOIN students stu ON stu.user_id = a.student_id
            LEFT JOIN class_sections cs ON cs.id = stu.current_section_id
            LEFT JOIN courses co ON co.id = cs.course_id
            LEFT JOIN semesters se ON se.id = cs.semester_id
            LEFT JOIN batches b ON b.id = cs.batch_id
            WHERE a.simulation_id = :sid AND {visible_sql}
            ORDER BY u.name, a.id
        """),
        {**params, "sid": simulation_id},
    ).fetchall()
    tasks = _spreadsheet_tasks(db, simulation_id)
    attempt_ids = [a.id for a in attempts]
    keys = _keys(db, attempt_ids) if attempts else {}
    results = _task_results(db, attempt_ids) if attempts else {}
    # Attempts on the stored dataset share one sheet; seeded ones each have their own.
    sheets: Dict[Any, Tuple[Sheet, Dict[str, CellResult]]] = {}
    items = []
    for attempt in attempts:
        sheet_key = attempt.seed if attempt.seeded_dataset else None
        if sheet_key not in sheets:
            sheets[sheet_key] = (sheet_from_dataset(attempt_dataset(simulation, attempt)), {})
        sheet, cache = sheets[sheet_key]
        cells = _load(attempt.cells, {})
        counts = {"correct": 0, "incorrect": 0, "not_answered": 0}
        task_results = []
        for task in tasks:
            cell = cells.get(str(task.id)) or {}
            status = _compare(task, keys.get((attempt.id, task.id)), cell, sheet, cache)["status"]
            counts[status] += 1
            result = results.get((attempt.id, task.id))
            task_results.append(
                {
                    "task_id": task.id,
                    "status": status,
                    "marks": float(result.score or 0) if result else 0.0,
                    "marks_changed": bool(result) and result.marked_by == "faculty",
                }
            )
        items.append(
            {
                "attempt_id": attempt.id,
                "student_name": attempt.student_name,
                "college_id": attempt.college_id,
                "section_id": attempt.section_id,
                "section_name": attempt.section_name,
                "section_label": attempt.section_label,
                "status": _student_status(attempt),
                "started_at": str(attempt.started_at),
                "finished_at": str(attempt.finished_at) if attempt.finished_at else None,
                "marks": float(attempt.marks),
                **counts,
                "task_results": task_results,
            }
        )
    return {
        "simulation": {"id": simulation.id, "title": simulation.title},
        "task_count": len(tasks),
        "max_marks": sum(float(t.max_score) for t in tasks),
        "tasks": [
            {
                "task_id": t.id,
                "position": t.position,
                "stage": t.stage,
                "prompt": t.prompt_template,
                "max_marks": float(t.max_score),
            }
            for t in tasks
        ],
        "items": items,
    }


def _csv_text(value: Any) -> str:
    """Excel runs a cell that starts with one of these as a formula."""
    cell = str(value or "")
    return f"'{cell}" if cell[:1] in ("=", "+", "-", "@", "\t", "\r") else cell


def _csv_time(value: Optional[str]) -> str:
    return (datetime.fromisoformat(value) + IST).strftime("%Y-%m-%d %H:%M") if value else ""


def results_csv(db: Session, current_user: Dict[str, Any], simulation_id: int) -> str:
    """One row per student, grouped by section. Starts with a byte order mark so
    Excel reads names in any language correctly."""
    data = simulation_results(db, current_user, simulation_id)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(
        ["Student", "College ID", "Section", "Status", "Started (IST)", "Finished (IST)",
         "Correct", "Incorrect", "Not answered", "Marks", "Out of", "Percent", "Marks changed by faculty"]
        + [f"Task {t['position']} marks (out of {t['max_marks']:g})" for t in data["tasks"]]
    )
    max_marks = data["max_marks"]
    for item in sorted(data["items"], key=lambda i: (i["section_label"] or "", i["student_name"] or "")):
        writer.writerow(
            [
                _csv_text(item["student_name"]),
                _csv_text(item["college_id"]),
                _csv_text(item["section_label"]),
                "Submitted" if item["status"] == "submitted" else "In progress",
                _csv_time(item["started_at"]),
                _csv_time(item["finished_at"]),
                item["correct"],
                item["incorrect"],
                item["not_answered"],
                f"{item['marks']:g}",
                f"{max_marks:g}",
                round(100 * item["marks"] / max_marks, 1) if max_marks else 0,
                "Yes" if any(r["marks_changed"] for r in item["task_results"]) else "No",
            ]
            + [f"{r['marks']:g}" for r in item["task_results"]]
        )
    return "\ufeff" + output.getvalue()


def attempt_review(db: Session, current_user: Dict[str, Any], attempt_id: int) -> Dict[str, Any]:
    """One attempt in full: each answer next to the correct one, with the seed."""
    finalize_expired_attempts(db)
    visible_sql, params = _visible_attempts_sql(current_user)
    attempt = db.execute(
        text(f"""
            SELECT a.*, u.name AS student_name, u.college_id
            FROM jobsim_attempts a
            JOIN users u ON u.id = a.student_id
            WHERE a.id = :aid AND {visible_sql}
        """),
        {**params, "aid": attempt_id},
    ).fetchone()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    simulation = _simulation_for_review(db, current_user, attempt.simulation_id)

    tasks = _spreadsheet_tasks(db, attempt.simulation_id)
    keys = _keys(db, [attempt.id])
    results = _task_results(db, [attempt.id])
    changes: Dict[int, List[Dict[str, Any]]] = {}
    for change in db.execute(
        text("""
            SELECT r.task_id, o.original_score, o.new_score, o.changed_at, o.note, u.name AS changed_by
            FROM jobsim_score_overrides o
            JOIN jobsim_task_results r ON r.id = o.task_result_id
            LEFT JOIN users u ON u.id = o.changed_by
            WHERE r.attempt_id = :aid
            ORDER BY o.id
        """),
        {"aid": attempt.id},
    ).fetchall():
        changes.setdefault(change.task_id, []).append(
            {
                "original_marks": float(change.original_score or 0),
                "new_marks": float(change.new_score),
                "changed_by": change.changed_by,
                "changed_at": change.changed_at.isoformat() + "Z",
                "note": change.note,
            }
        )
    last_checks = {
        r.task_id: r
        for r in db.execute(
            text("""
                SELECT DISTINCT ON (task_id) task_id, raw_input, format_seen
                FROM jobsim_check_log WHERE attempt_id = :aid
                ORDER BY task_id, id DESC
            """),
            {"aid": attempt.id},
        ).fetchall()
    }
    sheet = _attempt_sheet(db, attempt)
    cells = _load(attempt.cells, {})
    cache: Dict[str, CellResult] = {}
    items = []
    for task in tasks:
        comparison = _compare(task, keys.get((attempt.id, task.id)), cells.get(str(task.id)) or {}, sheet, cache)
        result = results.get((attempt.id, task.id))
        last = last_checks.get(task.id)
        items.append(
            {
                "task_id": task.id,
                "task_result_id": result.id if result else None,
                "position": task.position,
                "stage": task.stage,
                "prompt": task.prompt_template,
                "must_use_formula": bool(_load(task.config, {}).get("must_use_formula")),
                "expected_formula": task.formula,
                **comparison,
                "student_format_label": FORMAT_LABELS.get(comparison["student_format"], comparison["student_format"]),
                "expected_format_label": FORMAT_LABELS.get(comparison["expected_format"], comparison["expected_format"]),
                "marks": float(result.score) if result and result.score is not None else 0.0,
                "max_marks": float(task.max_score),
                "check_count": int(result.check_count) if result else 0,
                "hint_used": bool(result.hint_used) if result else False,
                "changed_after_check": bool(last)
                and (last.raw_input != comparison["student_input"] or last.format_seen != comparison["student_format"]),
                "marks_changes": changes.get(task.id, []),
            }
        )
    return {
        "attempt_id": attempt.id,
        "simulation": {"id": simulation.id, "title": simulation.title},
        "student_name": attempt.student_name,
        "college_id": attempt.college_id,
        "status": _student_status(attempt),
        "started_at": str(attempt.started_at),
        "finished_at": str(attempt.finished_at) if attempt.finished_at else None,
        # A string: the seed is larger than a JavaScript number can hold exactly.
        "seed": str(attempt.seed),
        "marks": sum(item["marks"] for item in items),
        "max_marks": sum(item["max_marks"] for item in items),
        "correct": sum(1 for item in items if item["status"] == "correct"),
        "incorrect": sum(1 for item in items if item["status"] == "incorrect"),
        "not_answered": sum(1 for item in items if item["status"] == "not_answered"),
        "tasks": items,
    }


def change_score(
    db: Session, current_user: Dict[str, Any], task_result_id: int, score: float, note: Optional[str]
) -> Dict[str, Any]:
    """Faculty set a task's marks. The attempt total follows. Nothing marks a
    submitted attempt again, so the change stays."""
    finalize_expired_attempts(db)
    visible_sql, params = _visible_attempts_sql(current_user)
    row = db.execute(
        text(f"""
            SELECT r.id, r.score, t.max_score, t.position, a.id AS attempt_id, a.simulation_id, a.status
            FROM jobsim_task_results r
            JOIN jobsim_tasks t ON t.id = r.task_id
            JOIN jobsim_attempts a ON a.id = r.attempt_id
            JOIN users u ON u.id = a.student_id
            WHERE r.id = :rid AND {visible_sql}
            FOR UPDATE OF r, a
        """),
        {**params, "rid": task_result_id},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Task result not found")
    simulation = _simulation_for_review(db, current_user, row.simulation_id)
    if row.status == "in_progress":
        raise HTTPException(status_code=409, detail="Marks can be changed after the student finishes.")
    max_marks = float(row.max_score)
    if not 0 <= score <= max_marks:  # also refuses NaN
        raise HTTPException(status_code=400, detail=f"Marks must be between 0 and {max_marks:g}.")
    new_score = round(score, 2)
    old_score = float(row.score or 0)
    if new_score == old_score:
        raise HTTPException(status_code=400, detail=f"This task already has {old_score:g} marks.")

    db.execute(
        text("""
            INSERT INTO jobsim_score_overrides (task_result_id, original_score, new_score, changed_by, changed_at, note)
            VALUES (:rid, :old, :new, :uid, NOW() AT TIME ZONE 'UTC', :note)
        """),
        {
            "rid": row.id,
            "old": old_score,
            "new": new_score,
            "uid": current_user["id"],
            "note": (note or "").strip()[:500] or None,
        },
    )
    db.execute(
        text("UPDATE jobsim_task_results SET score = :new, marked_by = 'faculty', updated_at = NOW() WHERE id = :rid"),
        {"new": new_score, "rid": row.id},
    )
    db.execute(
        text("""
            UPDATE jobsim_attempts a
            SET total_score = (
                    SELECT COALESCE(SUM(r.score), 0) FROM jobsim_task_results r WHERE r.attempt_id = a.id
                ),
                updated_at = NOW()
            WHERE a.id = :aid
        """),
        {"aid": row.attempt_id},
    )
    db.execute(
        text("""
            INSERT INTO system_events (actor_user_id, event_type, message)
            VALUES (:uid, 'jobsim_score_changed', :message)
        """),
        {
            "uid": current_user["id"],
            "message": f'Changed marks on "{simulation.title}", task {row.position}: {old_score:g} to {new_score:g}',
        },
    )
    db.commit()
    return attempt_review(db, current_user, row.attempt_id)
