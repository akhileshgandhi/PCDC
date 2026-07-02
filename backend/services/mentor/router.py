from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from services.auth.service import get_current_user
from shared.database import get_db

mentor_router = APIRouter(prefix="/mentor", tags=["mentor"])

VALID_INTERVENTION_TYPES = {
    "one_on_one",
    "group_session",
    "case_assigned",
    "nudge",
    "note",
    "escalated_to_faculty",
    "escalated_to_admin",
}
VALID_COMMENT_STAGES = {
    "initial_analysis",
    "ai_conversation",
    "solution",
    "defense",
    "reflection",
    "overall",
}


class InterventionRequest(BaseModel):
    student_id: int
    intervention_type: str = "note"
    action_taken: str
    notes: Optional[str] = None
    follow_up_date: Optional[str] = None


class SessionRequest(BaseModel):
    session_type: str
    student_ids: List[int]
    scheduled_at: str
    agenda: str


class CompleteSessionRequest(BaseModel):
    notes: str


class AttemptCommentRequest(BaseModel):
    stage: str
    comment_text: str
    flagged_for_session: bool = False


def require_mentor(current_user: Dict[str, Any]) -> None:
    if current_user["role"] != "mentor":
        raise HTTPException(status_code=403, detail="Mentor access required")


def ensure_assigned_student(db: Session, mentor_id: int, student_id: int) -> Any:
    row = db.execute(
        text(
            """
            SELECT s.id, s.user_id, u.name, u.email, s.current_level
            FROM students s
            JOIN users u ON u.id = s.user_id
            WHERE s.id = :student_id AND s.mentor_id = :mentor_id
            """
        ),
        {"student_id": student_id, "mentor_id": mentor_id},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Assigned student not found")
    return row


def assigned_student_where() -> str:
    return "s.mentor_id = :mentor_id"


def status_case_sql() -> str:
    return """
        CASE
            WHEN MAX(csa.start_time) IS NULL OR MAX(csa.start_time) < NOW() - INTERVAL '10 days'
                THEN 'inactive'
            WHEN COALESCE(AVG(sc.current_score), 50) < 60
                THEN 'at_risk'
            WHEN s.current_level <= 2
                 AND MAX(csa.start_time) < NOW() - INTERVAL '21 days'
                THEN 'stagnant'
            WHEN COALESCE(AVG(sc.current_score), 50) >= 85
                THEN 'top_performer'
            ELSE 'on_track'
        END
    """


def student_row_to_response(row: Any) -> Dict[str, Any]:
    return {
        "student_id": row.student_id,
        "user_id": row.user_id,
        "name": row.name,
        "email": row.email,
        "program": row.program,
        "career_track": row.career_track,
        "current_level": row.current_level,
        "average_score": int(row.average_score or 50),
        "weakest_capability": row.weakest_capability,
        "last_activity_at": str(row.last_activity_at) if row.last_activity_at else None,
        "status": row.status,
    }


@mentor_router.get("/health")
async def health_check():
    return {"status": "Mentor service is healthy"}


@mentor_router.get("/students")
def list_students(
    status: Optional[str] = None,
    track: Optional[str] = None,
    level: Optional[int] = None,
    weakness: Optional[str] = None,
    search: Optional[str] = None,
    sort: str = Query(default="score_desc"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_mentor(current_user)
    where_clauses = [assigned_student_where()]
    params: Dict[str, Any] = {"mentor_id": current_user["id"]}

    if track:
        where_clauses.append("ct.name = :track")
        params["track"] = track
    if level:
        where_clauses.append("s.current_level = :level")
        params["level"] = level
    if search:
        where_clauses.append("(u.name ILIKE :search OR u.email ILIKE :search)")
        params["search"] = f"%{search.strip()}%"

    order_sql = {
        "score_asc": "average_score ASC, u.name ASC",
        "score_desc": "average_score DESC, u.name ASC",
        "last_activity": "last_activity_at DESC NULLS LAST, u.name ASC",
        "level": "s.current_level DESC, u.name ASC",
    }.get(sort, "average_score DESC, u.name ASC")

    rows = db.execute(
        text(
            f"""
            WITH student_scores AS (
                SELECT
                    s.id AS student_id,
                    AVG(sc.current_score) AS average_score,
                    (
                        SELECT c.name
                        FROM student_capabilities sc2
                        JOIN capabilities c ON c.id = sc2.capability_id
                        WHERE sc2.student_id = s.id
                        ORDER BY sc2.current_score ASC, c.name ASC
                        LIMIT 1
                    ) AS weakest_capability
                FROM students s
                LEFT JOIN student_capabilities sc ON sc.student_id = s.id
                GROUP BY s.id
            ),
            roster AS (
                SELECT
                    s.id AS student_id,
                    s.user_id,
                    u.name,
                    u.email,
                    u.program,
                    s.current_level,
                    ct.name AS career_track,
                    COALESCE(ss.average_score, 50) AS average_score,
                    ss.weakest_capability,
                    MAX(csa.start_time) AS last_activity_at,
                    {status_case_sql()} AS status
                FROM students s
                JOIN users u ON u.id = s.user_id
                LEFT JOIN career_tracks ct ON ct.id = s.career_track_id
                LEFT JOIN student_scores ss ON ss.student_id = s.id
                LEFT JOIN case_study_attempts csa ON csa.student_id = s.user_id
                LEFT JOIN student_capabilities sc ON sc.student_id = s.id
                WHERE {" AND ".join(where_clauses)}
                GROUP BY
                    s.id, s.user_id, u.name, u.email, u.program, s.current_level,
                    ct.name, ss.average_score, ss.weakest_capability
            )
            SELECT *
            FROM roster
            WHERE (:status IS NULL OR status = :status)
              AND (:weakness IS NULL OR weakest_capability = :weakness)
            ORDER BY {order_sql}
            """
        ),
        {**params, "status": status, "weakness": weakness},
    ).fetchall()

    return {"items": [student_row_to_response(row) for row in rows], "total": len(rows)}


@mentor_router.get("/students/{student_id}")
def get_student_detail(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_mentor(current_user)
    student = ensure_assigned_student(db, current_user["id"], student_id)
    capability_rows = db.execute(
        text(
            """
            SELECT c.name, COALESCE(sc.current_score, 50) AS current_score, sc.last_updated
            FROM capabilities c
            LEFT JOIN student_capabilities sc
                ON sc.capability_id = c.id AND sc.student_id = :student_id
            ORDER BY c.name
            """
        ),
        {"student_id": student_id},
    ).fetchall()
    attempt_rows = db.execute(
        text(
            """
            SELECT csa.id, cs.title, cs.difficulty, csa.status, csa.start_time,
                   csa.time_taken_minutes, ce.total_score, ce.ai_utilization_score
            FROM case_study_attempts csa
            JOIN case_studies cs ON cs.id = csa.case_study_id
            LEFT JOIN cs_evaluations ce ON ce.attempt_id = csa.id
            WHERE csa.student_id = :student_user_id
            ORDER BY csa.start_time DESC
            LIMIT 5
            """
        ),
        {"student_user_id": student.user_id},
    ).fetchall()
    intervention_rows = db.execute(
        text(
            """
            SELECT id, intervention_type, action_taken, notes, follow_up_date, created_at
            FROM interventions
            WHERE student_id = :student_id AND mentor_id = :mentor_id
            ORDER BY created_at DESC
            LIMIT 10
            """
        ),
        {"student_id": student_id, "mentor_id": current_user["id"]},
    ).fetchall()
    average_score = sum(row.current_score for row in capability_rows) / max(
        len(capability_rows), 1
    )
    weak = sorted(capability_rows, key=lambda row: row.current_score)[:2]

    return {
        "student": {
            "student_id": student.id,
            "user_id": student.user_id,
            "name": student.name,
            "email": student.email,
            "current_level": student.current_level,
            "average_score": round(average_score),
        },
        "capabilities": [
            {
                "name": row.name,
                "current_score": int(row.current_score),
                "last_updated": str(row.last_updated) if row.last_updated else None,
            }
            for row in capability_rows
        ],
        "ai_suggestions": {
            "weak_areas": [row.name for row in weak],
            "recommendations": [
                f"Review {row.name} through a targeted case discussion" for row in weak
            ],
        },
        "recent_attempts": [
            {
                "id": row.id,
                "title": row.title,
                "difficulty": row.difficulty,
                "status": row.status,
                "started_at": str(row.start_time) if row.start_time else None,
                "time_taken_minutes": row.time_taken_minutes,
                "total_score": row.total_score,
                "ai_utilization_score": row.ai_utilization_score,
            }
            for row in attempt_rows
        ],
        "interventions": [
            {
                "id": row.id,
                "intervention_type": row.intervention_type,
                "action_taken": row.action_taken,
                "notes": row.notes,
                "follow_up_date": str(row.follow_up_date) if row.follow_up_date else None,
                "created_at": str(row.created_at),
            }
            for row in intervention_rows
        ],
    }


@mentor_router.get("/dashboard/summary")
def dashboard_summary(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_mentor(current_user)
    roster = list_students(db=db, current_user=current_user)["items"]
    weakness_rows = db.execute(
        text(
            """
            SELECT c.name, COUNT(*) AS student_count
            FROM students s
            JOIN student_capabilities sc ON sc.student_id = s.id
            JOIN capabilities c ON c.id = sc.capability_id
            WHERE s.mentor_id = :mentor_id AND sc.current_score < 60
            GROUP BY c.name
            ORDER BY student_count DESC, c.name
            LIMIT 5
            """
        ),
        {"mentor_id": current_user["id"]},
    ).fetchall()
    sessions_this_week = db.execute(
        text(
            """
            SELECT COUNT(*)
            FROM sessions
            WHERE mentor_id = :mentor_id
              AND scheduled_at >= date_trunc('week', NOW())
              AND scheduled_at < date_trunc('week', NOW()) + INTERVAL '7 days'
            """
        ),
        {"mentor_id": current_user["id"]},
    ).scalar() or 0
    return {
        "assigned_students": len(roster),
        "at_risk_students": len(
            [item for item in roster if item["status"] in ["at_risk", "inactive"]]
        ),
        "top_performers": len([item for item in roster if item["status"] == "top_performer"]),
        "sessions_this_week": int(sessions_this_week),
        "weakness_signals": [
            {"capability": row.name, "student_count": int(row.student_count)}
            for row in weakness_rows
        ],
    }


@mentor_router.get("/dashboard/alerts")
def dashboard_alerts(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    require_mentor(current_user)
    return list_alerts(status="active", limit=5, db=db, current_user=current_user)["items"]


@mentor_router.get("/dashboard/sessions/upcoming")
def dashboard_upcoming_sessions(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    require_mentor(current_user)
    return list_sessions(status="upcoming", limit=5, db=db, current_user=current_user)["items"]


@mentor_router.get("/alerts")
def list_alerts(
    status: str = "active",
    alert_type: Optional[str] = None,
    student_id: Optional[int] = None,
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_mentor(current_user)
    where_clauses = ["a.mentor_id = :mentor_id", "a.status = :status"]
    params: Dict[str, Any] = {
        "mentor_id": current_user["id"],
        "status": status,
        "limit": limit,
    }
    if alert_type:
        where_clauses.append("a.alert_type = :alert_type")
        params["alert_type"] = alert_type
    if student_id:
        where_clauses.append("a.student_id = :student_id")
        params["student_id"] = student_id
    rows = db.execute(
        text(
            f"""
            SELECT a.id, a.alert_type, a.severity, a.message, a.metadata,
                   a.status, a.dismissed_at, a.created_at, s.id AS student_id,
                   u.name AS student_name
            FROM alerts a
            JOIN students s ON s.id = a.student_id
            JOIN users u ON u.id = s.user_id
            WHERE {" AND ".join(where_clauses)}
            ORDER BY
                CASE WHEN a.severity = 'critical' THEN 0 ELSE 1 END,
                a.created_at DESC
            LIMIT :limit
            """
        ),
        params,
    ).fetchall()
    items = [
        {
            "id": row.id,
            "alert_type": row.alert_type,
            "severity": row.severity,
            "message": row.message,
            "metadata": row.metadata,
            "status": row.status,
            "dismissed_at": str(row.dismissed_at) if row.dismissed_at else None,
            "created_at": str(row.created_at),
            "student_id": row.student_id,
            "student_name": row.student_name,
        }
        for row in rows
    ]
    return {"items": items, "total": len(items)}


@mentor_router.patch("/alerts/{alert_id}/dismiss")
def dismiss_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, str]:
    require_mentor(current_user)
    result = db.execute(
        text(
            """
            UPDATE alerts
            SET status = 'dismissed', dismissed_at = NOW()
            WHERE id = :alert_id AND mentor_id = :mentor_id
            RETURNING id
            """
        ),
        {"alert_id": alert_id, "mentor_id": current_user["id"]},
    ).fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="Alert not found")
    db.commit()
    return {"status": "dismissed"}


@mentor_router.get("/sessions")
def list_sessions(
    status: str = "upcoming",
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_mentor(current_user)
    status_sql = "se.completed_at IS NULL" if status == "upcoming" else "se.completed_at IS NOT NULL"
    rows = db.execute(
        text(
            f"""
            SELECT se.id, se.session_type, se.agenda, se.scheduled_at,
                   se.completed_at, se.notes,
                   COALESCE(string_agg(u.name, ', ' ORDER BY u.name), '') AS student_names
            FROM sessions se
            LEFT JOIN session_students ss ON ss.session_id = se.id
            LEFT JOIN students s ON s.id = ss.student_id
            LEFT JOIN users u ON u.id = s.user_id
            WHERE se.mentor_id = :mentor_id AND {status_sql}
            GROUP BY se.id
            ORDER BY se.scheduled_at {'ASC' if status == 'upcoming' else 'DESC'}
            LIMIT :limit
            """
        ),
        {"mentor_id": current_user["id"], "limit": limit},
    ).fetchall()
    items = [
        {
            "id": row.id,
            "session_type": row.session_type,
            "agenda": row.agenda,
            "scheduled_at": str(row.scheduled_at),
            "completed_at": str(row.completed_at) if row.completed_at else None,
            "notes": row.notes,
            "student_names": row.student_names,
        }
        for row in rows
    ]
    return {"items": items, "total": len(items)}


@mentor_router.post("/sessions", status_code=201)
def create_session(
    data: SessionRequest,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_mentor(current_user)
    if data.session_type not in ["one_on_one", "group"]:
        raise HTTPException(status_code=400, detail="Invalid session type")
    if not data.student_ids:
        raise HTTPException(status_code=400, detail="At least one student is required")
    for student_id in data.student_ids:
        ensure_assigned_student(db, current_user["id"], student_id)
    result = db.execute(
        text(
            """
            INSERT INTO sessions (mentor_id, session_type, agenda, scheduled_at)
            VALUES (:mentor_id, :session_type, :agenda, :scheduled_at)
            RETURNING id, session_type, agenda, scheduled_at, completed_at, notes
            """
        ),
        {
            "mentor_id": current_user["id"],
            "session_type": data.session_type,
            "agenda": data.agenda.strip(),
            "scheduled_at": data.scheduled_at,
        },
    )
    row = result.fetchone()
    for student_id in data.student_ids:
        db.execute(
            text(
                """
                INSERT INTO session_students (session_id, student_id, notified_at)
                VALUES (:session_id, :student_id, NOW())
                ON CONFLICT (session_id, student_id) DO NOTHING
                """
            ),
            {"session_id": row.id, "student_id": student_id},
        )
    db.commit()
    return {
        "id": row.id,
        "session_type": row.session_type,
        "agenda": row.agenda,
        "scheduled_at": str(row.scheduled_at),
        "completed_at": None,
        "notes": row.notes,
    }


@mentor_router.patch("/sessions/{session_id}/complete")
def complete_session(
    session_id: int,
    data: CompleteSessionRequest,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, str]:
    require_mentor(current_user)
    session = db.execute(
        text("SELECT id, session_type FROM sessions WHERE id = :id AND mentor_id = :mentor_id"),
        {"id": session_id, "mentor_id": current_user["id"]},
    ).fetchone()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.execute(
        text(
            """
            UPDATE sessions
            SET completed_at = NOW(), notes = :notes
            WHERE id = :session_id
            """
        ),
        {"session_id": session_id, "notes": data.notes.strip()},
    )
    students = db.execute(
        text("SELECT student_id FROM session_students WHERE session_id = :session_id"),
        {"session_id": session_id},
    ).fetchall()
    for student in students:
        db.execute(
            text(
                """
                INSERT INTO interventions (
                    student_id, mentor_id, intervention_type, action_taken, notes
                )
                VALUES (
                    :student_id, :mentor_id, :intervention_type,
                    'Completed mentoring session', :notes
                )
                """
            ),
            {
                "student_id": student.student_id,
                "mentor_id": current_user["id"],
                "intervention_type": "one_on_one"
                if session.session_type == "one_on_one"
                else "group_session",
                "notes": data.notes.strip(),
            },
        )
    db.commit()
    return {"status": "completed"}


@mentor_router.get("/interventions")
def list_interventions(
    student_id: Optional[int] = None,
    intervention_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_mentor(current_user)
    where_clauses = ["i.mentor_id = :mentor_id"]
    params: Dict[str, Any] = {"mentor_id": current_user["id"]}
    if student_id:
        ensure_assigned_student(db, current_user["id"], student_id)
        where_clauses.append("i.student_id = :student_id")
        params["student_id"] = student_id
    if intervention_type:
        where_clauses.append("i.intervention_type = :intervention_type")
        params["intervention_type"] = intervention_type
    rows = db.execute(
        text(
            f"""
            SELECT i.id, i.intervention_type, i.action_taken, i.notes,
                   i.follow_up_date, i.created_at, s.id AS student_id, u.name AS student_name
            FROM interventions i
            JOIN students s ON s.id = i.student_id
            JOIN users u ON u.id = s.user_id
            WHERE {" AND ".join(where_clauses)}
            ORDER BY i.created_at DESC
            LIMIT 100
            """
        ),
        params,
    ).fetchall()
    items = [
        {
            "id": row.id,
            "student_id": row.student_id,
            "student_name": row.student_name,
            "intervention_type": row.intervention_type,
            "action_taken": row.action_taken,
            "notes": row.notes,
            "follow_up_date": str(row.follow_up_date) if row.follow_up_date else None,
            "created_at": str(row.created_at),
        }
        for row in rows
    ]
    return {"items": items, "total": len(items)}


@mentor_router.post("/interventions", status_code=201)
def create_intervention(
    data: InterventionRequest,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, str]:
    require_mentor(current_user)
    ensure_assigned_student(db, current_user["id"], data.student_id)
    if data.intervention_type not in VALID_INTERVENTION_TYPES:
        raise HTTPException(status_code=400, detail="Invalid intervention type")
    db.execute(
        text(
            """
            INSERT INTO interventions (
                student_id, mentor_id, intervention_type, action_taken, notes, follow_up_date
            )
            VALUES (
                :student_id, :mentor_id, :intervention_type,
                :action_taken, :notes, :follow_up_date
            )
            """
        ),
        {
            "student_id": data.student_id,
            "mentor_id": current_user["id"],
            "intervention_type": data.intervention_type,
            "action_taken": data.action_taken.strip(),
            "notes": data.notes.strip() if data.notes else None,
            "follow_up_date": data.follow_up_date,
        },
    )
    db.commit()
    return {"status": "created"}


@mentor_router.get("/thinking-path/{attempt_id}")
def get_thinking_path(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_mentor(current_user)
    attempt = db.execute(
        text(
            """
            SELECT csa.*, cs.title AS case_title, cs.estimated_minutes,
                   s.id AS student_record_id, u.name AS student_name,
                   ce.total_score, ce.ai_utilization_score
            FROM case_study_attempts csa
            JOIN users u ON u.id = csa.student_id
            JOIN students s ON s.user_id = u.id
            JOIN case_studies cs ON cs.id = csa.case_study_id
            LEFT JOIN cs_evaluations ce ON ce.attempt_id = csa.id
            WHERE csa.id = :attempt_id AND s.mentor_id = :mentor_id
            """
        ),
        {"attempt_id": attempt_id, "mentor_id": current_user["id"]},
    ).fetchone()
    if not attempt:
        raise HTTPException(status_code=404, detail="Thinking path not found")
    conversation_rows = db.execute(
        text(
            """
            SELECT id, role, stage, message, timestamp
            FROM cs_ai_conversations
            WHERE attempt_id = :attempt_id
            ORDER BY timestamp, id
            """
        ),
        {"attempt_id": attempt_id},
    ).fetchall()
    comment_rows = db.execute(
        text(
            """
            SELECT id, stage, comment_text, flagged_for_session, created_at
            FROM mentor_attempt_comments
            WHERE attempt_id = :attempt_id AND mentor_id = :mentor_id
            ORDER BY created_at DESC
            """
        ),
        {"attempt_id": attempt_id, "mentor_id": current_user["id"]},
    ).fetchall()
    return {
        "attempt": {
            "id": attempt.id,
            "student_id": attempt.student_record_id,
            "student_name": attempt.student_name,
            "case_title": attempt.case_title,
            "expected_minutes": attempt.estimated_minutes,
            "time_taken_minutes": attempt.time_taken_minutes,
            "final_score": attempt.total_score,
            "ai_utilization_score": attempt.ai_utilization_score,
            "status": attempt.status,
        },
        "stages": {
            "initial_analysis": attempt.initial_analysis,
            "solution": attempt.final_solution,
            "defense": attempt.defense_responses,
            "reflection": attempt.reflection_text,
        },
        "conversation": [
            {
                "id": row.id,
                "role": row.role,
                "stage": row.stage,
                "message": row.message,
                "timestamp": str(row.timestamp),
            }
            for row in conversation_rows
        ],
        "comments": [
            {
                "id": row.id,
                "stage": row.stage,
                "comment_text": row.comment_text,
                "flagged_for_session": row.flagged_for_session,
                "created_at": str(row.created_at),
            }
            for row in comment_rows
        ],
    }


@mentor_router.post("/thinking-path/{attempt_id}/comment", status_code=201)
def add_attempt_comment(
    attempt_id: int,
    data: AttemptCommentRequest,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, str]:
    require_mentor(current_user)
    get_thinking_path(attempt_id, db, current_user)
    if data.stage not in VALID_COMMENT_STAGES:
        raise HTTPException(status_code=400, detail="Invalid comment stage")
    db.execute(
        text(
            """
            INSERT INTO mentor_attempt_comments (
                attempt_id, mentor_id, stage, comment_text, flagged_for_session
            )
            VALUES (
                :attempt_id, :mentor_id, :stage, :comment_text, :flagged_for_session
            )
            """
        ),
        {
            "attempt_id": attempt_id,
            "mentor_id": current_user["id"],
            "stage": data.stage,
            "comment_text": data.comment_text.strip(),
            "flagged_for_session": data.flagged_for_session,
        },
    )
    db.commit()
    return {"status": "created"}


@mentor_router.post("/thinking-path/{attempt_id}/flag", status_code=201)
def flag_attempt_stage(
    attempt_id: int,
    data: AttemptCommentRequest,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, str]:
    data.flagged_for_session = True
    return add_attempt_comment(attempt_id, data, db, current_user)
