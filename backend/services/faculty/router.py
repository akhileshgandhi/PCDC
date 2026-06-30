from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from services.auth.service import get_current_user
from shared.database import get_db

faculty_router = APIRouter(prefix="/faculty", tags=["faculty"])


def require_faculty(current_user: Dict[str, Any]) -> None:
    if current_user["role"] not in ["faculty", "admin"]:
        raise HTTPException(status_code=403, detail="Faculty access required")


@faculty_router.get("/dashboard/summary")
def dashboard_summary(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, int]:
    require_faculty(current_user)
    faculty_id = current_user["id"]

    active_students = db.execute(
        text("""
            SELECT COUNT(DISTINCT csa.student_id)
            FROM case_study_attempts csa
            JOIN case_studies cs ON cs.id = csa.case_study_id
            WHERE cs.created_by = :faculty_id
        """),
        {"faculty_id": faculty_id},
    ).scalar() or 0

    simulations_running = db.execute(
        text("""
            SELECT COUNT(*)
            FROM case_study_attempts csa
            JOIN case_studies cs ON cs.id = csa.case_study_id
            WHERE cs.created_by = :faculty_id
              AND csa.status IN ('analysis_submitted', 'ai_discussion', 'solution_submitted')
        """),
        {"faculty_id": faculty_id},
    ).scalar() or 0

    pending_reviews = db.execute(
        text("""
            SELECT COUNT(*)
            FROM case_study_attempts csa
            JOIN case_studies cs ON cs.id = csa.case_study_id
            WHERE cs.created_by = :faculty_id
              AND csa.status IN ('solution_submitted', 'defense_complete')
        """),
        {"faculty_id": faculty_id},
    ).scalar() or 0

    capability_alerts = db.execute(
        text("""
            SELECT COUNT(DISTINCT s.user_id)
            FROM students s
            JOIN student_capabilities sc ON sc.student_id = s.id
            JOIN case_study_attempts csa ON csa.student_id = s.user_id
            JOIN case_studies cs ON cs.id = csa.case_study_id
            WHERE cs.created_by = :faculty_id
              AND sc.current_score < 60
        """),
        {"faculty_id": faculty_id},
    ).scalar() or 0

    return {
        "active_students": int(active_students),
        "simulations_running": int(simulations_running),
        "pending_reviews": int(pending_reviews),
        "capability_alerts": int(capability_alerts),
    }


@faculty_router.get("/cases")
def faculty_cases(
    domain: Optional[str] = None,
    difficulty: Optional[int] = None,
    status: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    require_faculty(current_user)

    where_clauses = ["cs.created_by = :faculty_id"]
    params: Dict[str, Any] = {"faculty_id": current_user["id"]}

    if domain:
        where_clauses.append("cs.domain = :domain")
        params["domain"] = domain
    if difficulty:
        where_clauses.append("cs.difficulty = :difficulty")
        params["difficulty"] = difficulty
    if status:
        where_clauses.append("cs.status = :status")
        params["status"] = status

    rows = db.execute(
        text(f"""
            SELECT
                cs.id,
                cs.title,
                cs.description,
                cs.domain,
                cs.difficulty,
                cs.estimated_minutes,
                cs.status,
                cs.created_at,
                cs.updated_at,
                COUNT(csa.id) AS attempts_count
            FROM case_studies cs
            LEFT JOIN case_study_attempts csa ON csa.case_study_id = cs.id
            WHERE {" AND ".join(where_clauses)}
            GROUP BY cs.id
            ORDER BY cs.updated_at DESC, cs.created_at DESC
        """),
        params,
    ).fetchall()

    return [
        {
            "id": row.id,
            "title": row.title,
            "description": row.description,
            "domain": row.domain,
            "difficulty": row.difficulty,
            "estimated_minutes": row.estimated_minutes,
            "status": row.status,
            "attempts_count": row.attempts_count,
            "created_at": str(row.created_at),
            "updated_at": str(row.updated_at),
        }
        for row in rows
    ]
