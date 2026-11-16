"""Faculty publishing and assignment of job simulations (handover A1/A2, F3).

Lifecycle: draft -> approved -> published -> withdrawn, all driven by the
simulation's own author. Admin has no CRUD, approve, publish, withdraw or
assign access over simulations — only read-only visibility into the
non-draft ones in their institute scope. Only published simulations can be
assigned, to whole sections or to specific students, the same way case
studies are assigned.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from services.admin.scope import admin_scope, is_admin_role, user_in_scope_sql
from shared.email import jobsim_assigned_email, send_email


def _notify_jobsim_assigned(
    db: Session, student_user_id: int, student_email: Optional[str], student_name: Optional[str],
    sim_title: str, simulation_id: int, due_date: Optional[str], base_url: str,
) -> None:
    """Email the student that a simulation was assigned, and log the outcome."""
    sim_url = f"{base_url}/student/simulations/{simulation_id}"
    subject, text_body, html_body = jobsim_assigned_email(student_name or "", sim_title, due_date, sim_url)
    email_sent = send_email(student_email, subject, text_body, html_body) if student_email else False
    db.execute(
        text("""
            INSERT INTO notification_log (recipient_user_id, event_type, channel, status, subject, body)
            VALUES (:uid, 'jobsim_assigned', 'email', :status, :subject, :body)
        """),
        {
            "uid": student_user_id,
            "status": "sent" if email_sent else "failed",
            "subject": subject,
            "body": text_body,
        },
    )


# ---------------------------------------------------------------------------
# Admin: read-only visibility (no edit, approve, publish, withdraw, or assign)
# ---------------------------------------------------------------------------


def _require_admin(current_user: Dict[str, Any]) -> None:
    if not is_admin_role(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")


def _admin_scope_sql(current_user: Dict[str, Any]) -> tuple:
    """Scoped admins see simulations made by people in their institutes (and
    their own); the Central Admin sees every simulation."""
    scope = admin_scope(current_user)
    if scope is None:
        return "TRUE", {}
    return (
        f"(s.created_by = :me OR EXISTS (SELECT 1 FROM users u WHERE u.id = s.created_by AND {user_in_scope_sql('u')}))",
        {"scope_ids": scope, "me": current_user["id"]},
    )


def list_for_admin_view(db: Session, current_user: Dict[str, Any], status: Optional[str]) -> Dict[str, Any]:
    """Read-only: every non-draft simulation in this admin's scope. Faculty
    still own the entire lifecycle (approve, publish, withdraw, assign) — this
    is visibility only, drafts stay private to their author until approved."""
    _require_admin(current_user)
    scope_sql, params = _admin_scope_sql(current_user)
    rows = db.execute(
        text(f"""
            SELECT s.id, s.title, s.role, s.level, s.subject, s.semester, s.status,
                   s.duration_minutes, s.updated_at,
                   cu.name AS created_by_name, pu.name AS published_by_name,
                   (SELECT COUNT(*) FROM jobsim_tasks t WHERE t.simulation_id = s.id) AS task_count,
                   (SELECT COUNT(*) FROM jobsim_attempts a WHERE a.simulation_id = s.id) AS attempt_count,
                   (SELECT COUNT(*) FROM jobsim_assignments a
                    WHERE a.simulation_id = s.id AND a.status = 'active') AS assignment_count,
                   jsonb_array_length(COALESCE(s.dataset -> 'rows', CAST('[]' AS JSONB))) AS row_count
            FROM jobsim_simulations s
            LEFT JOIN users cu ON cu.id = s.created_by
            LEFT JOIN users pu ON pu.id = s.published_by
            WHERE s.status <> 'draft' AND {scope_sql}
            ORDER BY s.updated_at DESC
        """),
        params,
    ).fetchall()
    items = [
        {
            "id": r.id,
            "title": r.title,
            "role": r.role,
            "level": r.level,
            "subject": r.subject,
            "semester": r.semester,
            "status": r.status,
            "duration_minutes": r.duration_minutes,
            "created_by_name": r.created_by_name,
            "published_by_name": r.published_by_name,
            "task_count": int(r.task_count),
            "attempt_count": int(r.attempt_count),
            "assignment_count": int(r.assignment_count),
            "row_count": int(r.row_count or 0),
            "updated_at": str(r.updated_at),
        }
        for r in rows
    ]
    counts = {key: 0 for key in ("approved", "published", "withdrawn")}
    for item in items:
        counts[item["status"]] = counts.get(item["status"], 0) + 1
    if status:
        items = [i for i in items if i["status"] == status]
    return {"items": items, "total": len(items), "counts": counts}


def get_for_admin_view(db: Session, current_user: Dict[str, Any], simulation_id: int) -> Any:
    """Read-only: one non-draft simulation row in this admin's scope."""
    _require_admin(current_user)
    scope_sql, params = _admin_scope_sql(current_user)
    row = db.execute(
        text(f"SELECT s.* FROM jobsim_simulations s WHERE s.id = :sid AND s.status <> 'draft' AND {scope_sql}"),
        {**params, "sid": simulation_id},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Simulation not found")
    return row


# ---------------------------------------------------------------------------
# Author-only publishing
# ---------------------------------------------------------------------------


def _owned_simulation(db: Session, current_user: Dict[str, Any], simulation_id: int) -> Any:
    row = db.execute(
        text("SELECT * FROM jobsim_simulations WHERE id = :sid AND created_by = :uid"),
        {"sid": simulation_id, "uid": current_user["id"]},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Simulation not found")
    return row


def publish(db: Session, current_user: Dict[str, Any], simulation_id: int) -> None:
    row = _owned_simulation(db, current_user, simulation_id)
    if row.status not in ("approved", "withdrawn"):
        raise HTTPException(status_code=409, detail="Only an approved or withdrawn simulation can be published.")
    db.execute(
        text("""
            UPDATE jobsim_simulations
            SET status = 'published', published_by = :uid, updated_at = NOW()
            WHERE id = :sid
        """),
        {"uid": current_user["id"], "sid": simulation_id},
    )
    db.commit()


def withdraw(db: Session, current_user: Dict[str, Any], simulation_id: int) -> None:
    """Stops new starts. Students who already started can still finish."""
    row = _owned_simulation(db, current_user, simulation_id)
    if row.status != "published":
        raise HTTPException(status_code=409, detail="Only a published simulation can be withdrawn.")
    db.execute(
        text("UPDATE jobsim_simulations SET status = 'withdrawn', updated_at = NOW() WHERE id = :sid"),
        {"sid": simulation_id},
    )
    db.commit()


# ---------------------------------------------------------------------------
# Faculty: assign a published simulation
# ---------------------------------------------------------------------------


def _assignable_simulation(db: Session, current_user: Dict[str, Any], simulation_id: int) -> Any:
    """Faculty can only assign their own published simulations."""
    row = _owned_simulation(db, current_user, simulation_id)
    if row.status != "published":
        raise HTTPException(status_code=409, detail="Only a published simulation can be assigned.")
    return row


def _parse_due(due_date: Optional[str]) -> Optional[datetime]:
    if not due_date:
        return None
    try:
        due = datetime.fromisoformat(due_date[:10]).replace(hour=23, minute=59, second=59)
    except ValueError:
        raise HTTPException(status_code=400, detail="Due date must be YYYY-MM-DD.")
    if due.date() < datetime.utcnow().date():
        raise HTTPException(status_code=400, detail="Due date can't be in the past.")
    return due


def _students_with_access(db: Session, simulation_id: int) -> set:
    """students.id of everyone the simulation is already actively assigned to."""
    rows = db.execute(
        text("""
            SELECT a.student_id AS sid FROM jobsim_assignments a
            WHERE a.simulation_id = :sim AND a.status = 'active' AND a.student_id IS NOT NULL
            UNION
            SELECT ss.student_id FROM jobsim_assignments a
            JOIN student_sections ss ON ss.section_id = a.section_id AND ss.status = 'active'
            WHERE a.simulation_id = :sim AND a.status = 'active'
        """),
        {"sim": simulation_id},
    ).fetchall()
    return {r.sid for r in rows}


def assign_to_sections(
    db: Session, current_user: Dict[str, Any], simulation_id: int, section_ids: List[int], due_date: Optional[str],
    base_url: str,
) -> Dict[str, Any]:
    sim = _assignable_simulation(db, current_user, simulation_id)
    if not section_ids:
        raise HTTPException(status_code=400, detail="Select at least one section.")
    due = _parse_due(due_date)
    already = _students_with_access(db, simulation_id)
    results = []
    for section_id in dict.fromkeys(section_ids):
        section = db.execute(
            text("SELECT id, name FROM class_sections WHERE id = :id"), {"id": section_id}
        ).fetchone()
        if not section:
            raise HTTPException(status_code=404, detail=f"Section {section_id} not found")
        teaches = db.execute(
            text("SELECT 1 FROM faculty_sections WHERE faculty_id = :uid AND section_id = :id"),
            {"uid": current_user["id"], "id": section_id},
        ).fetchone()
        if not teaches:
            raise HTTPException(status_code=403, detail=f'You don\'t teach section "{section.name}".')

        existing = db.execute(
            text("SELECT id FROM jobsim_assignments WHERE simulation_id = :sim AND section_id = :sec"),
            {"sim": simulation_id, "sec": section_id},
        ).fetchone()
        if existing:
            db.execute(
                text("UPDATE jobsim_assignments SET due_date = :due, status = 'active' WHERE id = :id"),
                {"due": due, "id": existing.id},
            )
        else:
            db.execute(
                text("""
                    INSERT INTO jobsim_assignments (simulation_id, section_id, due_date, assigned_by)
                    VALUES (:sim, :sec, :due, :uid)
                """),
                {"sim": simulation_id, "sec": section_id, "due": due, "uid": current_user["id"]},
            )
        students = db.execute(
            text("""
                SELECT s.id, s.user_id, u.name, u.email FROM student_sections ss
                JOIN students s ON s.id = ss.student_id
                JOIN users u ON u.id = s.user_id
                WHERE ss.section_id = :sec AND ss.status = 'active'
            """),
            {"sec": section_id},
        ).fetchall()
        new_students = [s for s in students if s.id not in already]
        for student in new_students:
            already.add(student.id)
            _notify_jobsim_assigned(
                db, student.user_id, student.email, student.name,
                sim.title, simulation_id, due.strftime("%B %d, %Y") if due else None, base_url,
            )
        results.append(
            {"section_id": section_id, "section_name": section.name,
             "matched_students": len(students), "newly_assigned": len(new_students)}
        )
    db.commit()
    return {"simulation_id": simulation_id, "assignments": results}


def assign_to_students(
    db: Session, current_user: Dict[str, Any], simulation_id: int, student_ids: List[int], due_date: Optional[str],
    base_url: str,
) -> Dict[str, Any]:
    """student_ids are students.id, from the faculty's own roster."""
    sim = _assignable_simulation(db, current_user, simulation_id)
    if not student_ids:
        raise HTTPException(status_code=400, detail="Select at least one student.")
    due = _parse_due(due_date)
    valid = db.execute(
        text("""
            SELECT DISTINCT s.id, s.user_id, u.name, u.email FROM students s
            JOIN users u ON u.id = s.user_id
            JOIN student_sections ss ON ss.student_id = s.id AND ss.status = 'active'
            JOIN faculty_sections fs ON fs.section_id = ss.section_id
            WHERE fs.faculty_id = :uid AND s.id = ANY(:ids)
        """),
        {"uid": current_user["id"], "ids": student_ids},
    ).fetchall()

    already = _students_with_access(db, simulation_id)
    newly, skipped = 0, 0
    for student in valid:
        existing = db.execute(
            text("SELECT id FROM jobsim_assignments WHERE simulation_id = :sim AND student_id = :st"),
            {"sim": simulation_id, "st": student.id},
        ).fetchone()
        if existing:
            db.execute(
                text("UPDATE jobsim_assignments SET due_date = :due, status = 'active' WHERE id = :id"),
                {"due": due, "id": existing.id},
            )
        else:
            db.execute(
                text("""
                    INSERT INTO jobsim_assignments (simulation_id, student_id, due_date, assigned_by)
                    VALUES (:sim, :st, :due, :uid)
                """),
                {"sim": simulation_id, "st": student.id, "due": due, "uid": current_user["id"]},
            )
        if student.id in already:
            skipped += 1
            continue
        already.add(student.id)
        _notify_jobsim_assigned(
            db, student.user_id, student.email, student.name,
            sim.title, simulation_id, due.strftime("%B %d, %Y") if due else None, base_url,
        )
        newly += 1
    db.commit()
    return {
        "simulation_id": simulation_id,
        "requested": len(student_ids),
        "matched": len(valid),
        "newly_assigned": newly,
        "skipped": skipped,
    }


def list_assignments(db: Session, current_user: Dict[str, Any], simulation_id: int) -> Dict[str, Any]:
    """Who the simulation is assigned to, with started/completed counts per row."""
    _owned_simulation(db, current_user, simulation_id)
    rows = db.execute(
        text("""
            SELECT a.id, a.section_id, a.student_id, a.due_date, a.status, a.created_at,
                   cs.name AS section_name, su.name AS student_name, au.name AS assigned_by_name,
                   targets.total, targets.started, targets.completed
            FROM jobsim_assignments a
            LEFT JOIN class_sections cs ON cs.id = a.section_id
            LEFT JOIN students st ON st.id = a.student_id
            LEFT JOIN users su ON su.id = st.user_id
            LEFT JOIN users au ON au.id = a.assigned_by
            LEFT JOIN LATERAL (
                SELECT COUNT(*) AS total,
                       COUNT(att.id) AS started,
                       COUNT(att.id) FILTER (WHERE att.status <> 'in_progress' OR att.finished_at IS NOT NULL) AS completed
                FROM students tgt
                LEFT JOIN jobsim_attempts att ON att.student_id = tgt.user_id AND att.simulation_id = a.simulation_id
                WHERE tgt.id = a.student_id
                   OR tgt.id IN (SELECT ss.student_id FROM student_sections ss
                                 WHERE ss.section_id = a.section_id AND ss.status = 'active')
            ) targets ON TRUE
            WHERE a.simulation_id = :sid
            ORDER BY a.status, a.created_at DESC
        """),
        {"sid": simulation_id},
    ).fetchall()
    return {
        "items": [
            {
                "id": r.id,
                "kind": "section" if r.section_id else "student",
                "name": r.section_name if r.section_id else r.student_name,
                "due_date": r.due_date.isoformat() if r.due_date else None,
                "status": r.status,
                "assigned_by_name": r.assigned_by_name,
                "created_at": str(r.created_at),
                "students": int(r.total or 0),
                "started": int(r.started or 0),
                "completed": int(r.completed or 0),
            }
            for r in rows
        ]
    }


def close_assignment(db: Session, current_user: Dict[str, Any], assignment_id: int) -> Dict[str, Any]:
    """Students who haven't started lose access; anyone who started can finish."""
    row = db.execute(
        text("""
            SELECT a.id, a.simulation_id, s.created_by FROM jobsim_assignments a
            JOIN jobsim_simulations s ON s.id = a.simulation_id
            WHERE a.id = :id
        """),
        {"id": assignment_id},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if row.created_by != current_user["id"]:
        raise HTTPException(status_code=404, detail="Assignment not found")
    db.execute(text("UPDATE jobsim_assignments SET status = 'closed' WHERE id = :id"), {"id": assignment_id})
    db.commit()
    return {"id": assignment_id, "status": "closed"}
