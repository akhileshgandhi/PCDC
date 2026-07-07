from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from services.auth.service import get_current_user
from shared.cache import cache_get, cache_set
from shared.database import get_db

student_router = APIRouter(prefix="/student", tags=["student"])


def require_student(current_user: Dict[str, Any]) -> None:
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Student access required")


@student_router.get("/profile")
def student_profile(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_student(current_user)
    row = db.execute(
        text("""
            SELECT s.id AS student_id, s.current_level,
                   c.name AS course_name, b.name AS batch_name,
                   cs.name AS section_name, se.semester_number, se.name AS semester_name,
                   m.name AS mentor_name, ct.name AS career_track_name
            FROM students s
            LEFT JOIN courses c ON c.id = s.course_id
            LEFT JOIN batches b ON b.id = s.batch_id
            LEFT JOIN class_sections cs ON cs.id = s.current_section_id
            LEFT JOIN semesters se ON se.id = cs.semester_id
            LEFT JOIN users m ON m.id = s.mentor_id
            LEFT JOIN career_tracks ct ON ct.id = s.career_track_id
            WHERE s.user_id = :user_id
        """),
        {"user_id": current_user["id"]},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return {
        "student_id": row.student_id,
        "current_level": row.current_level,
        "course_name": row.course_name,
        "batch_name": row.batch_name,
        "section_name": row.section_name,
        "semester_number": row.semester_number,
        "semester_name": row.semester_name,
        "mentor_name": row.mentor_name,
        "career_track_name": row.career_track_name,
    }


@student_router.get("/dashboard/summary")
def student_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_student(current_user)
    user_id = current_user["id"]
    cache_key = f"student_dashboard_summary:{user_id}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    student_row = db.execute(
        text("SELECT id, current_level FROM students WHERE user_id = :user_id"),
        {"user_id": user_id},
    ).fetchone()
    if not student_row:
        raise HTTPException(status_code=404, detail="Student profile not found")
    student_id = student_row.id

    capability_rows = db.execute(
        text("""
            SELECT c.name, sc.current_score
            FROM student_capabilities sc
            JOIN capabilities c ON c.id = sc.capability_id
            WHERE sc.student_id = :student_id
            ORDER BY c.name
        """),
        {"student_id": student_id},
    ).fetchall()

    overall_score = db.execute(
        text("""
            SELECT AVG(current_score)
            FROM student_capabilities
            WHERE student_id = :student_id
        """),
        {"student_id": student_id},
    ).scalar()

    pending_simulations = db.execute(
        text("""
            SELECT COUNT(*)
            FROM assigned_cases
            WHERE student_id = :student_id AND status = 'pending'
        """),
        {"student_id": student_id},
    ).scalar() or 0

    completed_simulations = db.execute(
        text("""
            SELECT COUNT(*)
            FROM case_study_attempts
            WHERE student_id = :user_id AND status = 'evaluated'
        """),
        {"user_id": user_id},
    ).scalar() or 0

    active_case_row = db.execute(
        text("""
            SELECT cs.id AS case_id, cs.title, cs.domain, cs.difficulty,
                   cs.case_code, cs.subject, cs.difficulty_label, ac.due_date
            FROM assigned_cases ac
            JOIN case_studies cs ON cs.id = ac.case_study_id
            WHERE ac.student_id = :student_id AND ac.status = 'active'
            ORDER BY ac.assigned_at DESC
            LIMIT 1
        """),
        {"student_id": student_id},
    ).fetchone()

    upcoming_session_row = db.execute(
        text("""
            SELECT se.id, se.session_type, se.scheduled_at, u.name AS mentor_name
            FROM session_students ss
            JOIN sessions se ON se.id = ss.session_id
            JOIN users u ON u.id = se.mentor_id
            WHERE ss.student_id = :student_id
              AND se.completed_at IS NULL
              AND se.scheduled_at > NOW()
            ORDER BY se.scheduled_at ASC
            LIMIT 1
        """),
        {"student_id": student_id},
    ).fetchone()

    result = {
        "overall_capability_score": round(float(overall_score), 1) if overall_score is not None else 0,
        "capability_scores": [
            {"capability": row.name, "score": int(row.current_score)}
            for row in capability_rows
        ],
        "pending_simulations": int(pending_simulations),
        "completed_simulations": int(completed_simulations),
        "current_level": student_row.current_level,
        "active_case": {
            "case_id": active_case_row.case_id,
            "title": active_case_row.title,
            "domain": active_case_row.domain,
            "difficulty": active_case_row.difficulty,
            "case_code": active_case_row.case_code,
            "subject": active_case_row.subject,
            "difficulty_label": active_case_row.difficulty_label,
            "due_date": str(active_case_row.due_date) if active_case_row.due_date else None,
        } if active_case_row else None,
        "upcoming_session": {
            "id": upcoming_session_row.id,
            "session_type": upcoming_session_row.session_type,
            "scheduled_at": str(upcoming_session_row.scheduled_at),
            "mentor_name": upcoming_session_row.mentor_name,
        } if upcoming_session_row else None,
    }
    return cache_set(cache_key, result)


SIMULATION_GROUPS = [
    ("think", "Think"),
    ("lead", "Lead"),
    ("execute", "Execute"),
    ("grow", "Grow"),
]


@student_router.get("/active-engagements")
def student_active_engagements(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_student(current_user)
    student_row = db.execute(
        text("SELECT id FROM students WHERE user_id = :user_id"),
        {"user_id": current_user["id"]},
    ).fetchone()
    if not student_row:
        raise HTTPException(status_code=404, detail="Student profile not found")
    student_id = student_row.id

    active_case_row = db.execute(
        text("""
            SELECT cs.id AS case_id, cs.title, cs.domain, cs.difficulty,
                   cs.case_code, cs.subject, cs.difficulty_label, ac.due_date
            FROM assigned_cases ac
            JOIN case_studies cs ON cs.id = ac.case_study_id
            WHERE ac.student_id = :student_id AND ac.status = 'active'
            ORDER BY ac.assigned_at DESC
            LIMIT 1
        """),
        {"student_id": student_id},
    ).fetchone()

    simulation_rows = db.execute(
        text("""
            SELECT c.capability_group, c.name, COALESCE(sc.current_score, 0) AS score
            FROM capabilities c
            LEFT JOIN student_capabilities sc
                ON sc.capability_id = c.id AND sc.student_id = :student_id
            WHERE c.engagement_type = 'simulation'
            ORDER BY c.capability_group, c.name
        """),
        {"student_id": student_id},
    ).fetchall()

    capabilities_by_group: Dict[str, Any] = {key: [] for key, _ in SIMULATION_GROUPS}
    for row in simulation_rows:
        if row.capability_group in capabilities_by_group:
            capabilities_by_group[row.capability_group].append(
                {"name": row.name, "score": int(row.score)}
            )

    return {
        "active_case_study": {
            "case_id": active_case_row.case_id,
            "title": active_case_row.title,
            "domain": active_case_row.domain,
            "difficulty": active_case_row.difficulty,
            "case_code": active_case_row.case_code,
            "subject": active_case_row.subject,
            "difficulty_label": active_case_row.difficulty_label,
            "due_date": str(active_case_row.due_date) if active_case_row.due_date else None,
        } if active_case_row else None,
        "simulations": {
            "groups": [
                {"name": label, "capabilities": capabilities_by_group[key]}
                for key, label in SIMULATION_GROUPS
            ]
        },
        "concept_study": {
            "status": "coming_soon",
            "groups": [label for _, label in SIMULATION_GROUPS],
        },
    }
