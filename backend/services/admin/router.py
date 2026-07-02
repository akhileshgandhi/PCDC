import csv
import io
import secrets
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, EmailStr
from sqlalchemy import text
from sqlalchemy.orm import Session

from services.auth.service import get_current_user, hash_password
from shared.cache import cache_get, cache_set
from shared.database import get_db

admin_router = APIRouter(prefix="/admin", tags=["admin"])

VALID_ROLES = {"student", "faculty", "mentor", "admin", "director"}
VALID_STATUSES = {"active", "inactive"}


class AdminUserCreate(BaseModel):
    name: str
    email: EmailStr
    role: str
    program: Optional[str] = None
    specialization: Optional[str] = None
    admission_year: Optional[int] = None
    mentor_id: Optional[int] = None
    career_track_id: Optional[int] = None


class AdminUserStatusUpdate(BaseModel):
    status: str


class AdminUserRoleUpdate(BaseModel):
    role: str


class AdminUserMentorUpdate(BaseModel):
    mentor_id: int


class AdminBulkMentorAssign(BaseModel):
    student_user_ids: List[int]
    mentor_id: int


class AdminCareerTrackUpdate(BaseModel):
    career_track_id: Optional[int] = None


def require_admin(current_user: Dict[str, Any]) -> None:
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")


def normalize_role(role: str) -> str:
    normalized = role.strip().lower()
    if normalized not in VALID_ROLES:
        raise HTTPException(status_code=400, detail="Invalid role")
    return normalized


def normalize_status(status: str) -> str:
    normalized = status.strip().lower()
    if normalized not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status")
    return normalized


def record_system_event(
    db: Session,
    actor_user_id: int,
    event_type: str,
    message: str,
    metadata: Optional[str] = None,
) -> None:
    db.execute(
        text("""
            INSERT INTO system_events (actor_user_id, event_type, message, metadata)
            VALUES (:actor_user_id, :event_type, :message, :metadata)
        """),
        {
            "actor_user_id": actor_user_id,
            "event_type": event_type,
            "message": message,
            "metadata": metadata,
        },
    )


def seed_student_capabilities(db: Session, student_id: int) -> None:
    capability_rows = db.execute(text("SELECT id FROM capabilities")).fetchall()
    for capability in capability_rows:
        db.execute(
            text("""
                INSERT INTO student_capabilities (student_id, capability_id, current_score)
                VALUES (:student_id, :capability_id, 0)
                ON CONFLICT DO NOTHING
            """),
            {"student_id": student_id, "capability_id": capability.id},
        )


def ensure_role_profile(
    db: Session,
    user_id: int,
    role: str,
    mentor_id: Optional[int] = None,
    career_track_id: Optional[int] = None,
) -> Optional[int]:
    if role == "student":
        exists = db.execute(
            text("SELECT id FROM students WHERE user_id = :user_id"),
            {"user_id": user_id},
        ).fetchone()
        if not exists:
            row = db.execute(
                text("""
                    INSERT INTO students (user_id, mentor_id, career_track_id, current_level)
                    VALUES (:user_id, :mentor_id, :career_track_id, 1)
                    RETURNING id
                """),
                {
                    "user_id": user_id,
                    "mentor_id": mentor_id,
                    "career_track_id": career_track_id,
                },
            ).fetchone()
            seed_student_capabilities(db, row.id)
            return row.id
        seed_student_capabilities(db, exists.id)
        return exists.id
    if role == "mentor":
        exists = db.execute(
            text("SELECT id FROM mentors WHERE user_id = :user_id"),
            {"user_id": user_id},
        ).fetchone()
        if not exists:
            db.execute(
                text("""
                    INSERT INTO mentors (user_id, max_students)
                    VALUES (:user_id, 25)
                """),
                {"user_id": user_id},
            )
    return None


def ensure_active_mentor(db: Session, mentor_id: int) -> Any:
    row = db.execute(
        text("""
            SELECT u.id, u.name, COALESCE(COUNT(s.id), 0) AS student_count
            FROM users u
            LEFT JOIN students s ON s.mentor_id = u.id
            WHERE u.id = :mentor_id AND u.role = 'mentor' AND u.status = 'active'
            GROUP BY u.id, u.name
        """),
        {"mentor_id": mentor_id},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Active mentor not found")
    return row


def ensure_career_track(db: Session, career_track_id: Optional[int]) -> None:
    if career_track_id is None:
        return
    row = db.execute(
        text("SELECT id FROM career_tracks WHERE id = :career_track_id"),
        {"career_track_id": career_track_id},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Career track not found")


def get_student_for_user(db: Session, user_id: int) -> Any:
    row = db.execute(
        text("""
            SELECT s.id, s.user_id, s.mentor_id, u.name
            FROM students s
            JOIN users u ON u.id = s.user_id
            WHERE s.user_id = :user_id
        """),
        {"user_id": user_id},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return row


def assign_student_mentor(
    db: Session, student_user_id: int, mentor_id: int, actor_user_id: int
) -> Dict[str, Any]:
    mentor = ensure_active_mentor(db, mentor_id)
    student = get_student_for_user(db, student_user_id)
    db.execute(
        text("UPDATE students SET mentor_id = :mentor_id WHERE id = :student_id"),
        {"mentor_id": mentor_id, "student_id": student.id},
    )
    db.execute(
        text("UPDATE alerts SET mentor_id = :mentor_id WHERE student_id = :student_id"),
        {"mentor_id": mentor_id, "student_id": student.id},
    )
    db.execute(
        text("""
            INSERT INTO notification_log (
                recipient_user_id, event_type, channel, status, subject, body
            )
            VALUES
                (:student_user_id, 'mentor_assigned', 'email', 'pending',
                 'Your PCDC mentor has been assigned', :student_body),
                (:mentor_id, 'student_assigned', 'email', 'pending',
                 'New student assigned', :mentor_body)
        """),
        {
            "student_user_id": student_user_id,
            "mentor_id": mentor_id,
            "student_body": f"{mentor.name} has been assigned as your mentor.",
            "mentor_body": f"{student.name} has been assigned to you.",
        },
    )
    record_system_event(
        db,
        actor_user_id,
        "mentor_assigned",
        f"Assigned {student.name} to mentor {mentor.name}",
    )
    return {
        "student_user_id": student_user_id,
        "student_id": student.id,
        "mentor_id": mentor_id,
        "mentor_name": mentor.name,
        "mentor_student_count": int(mentor.student_count) + (0 if student.mentor_id == mentor_id else 1),
        "overloaded": int(mentor.student_count) >= 25,
    }


def user_response(row: Any) -> Dict[str, Any]:
    return {
        "id": row.id,
        "name": row.name,
        "email": row.email,
        "role": row.role,
        "program": row.program,
        "specialization": row.specialization,
        "admission_year": row.admission_year,
        "status": row.status,
        "last_login_at": str(row.last_login_at) if row.last_login_at else None,
        "created_at": str(row.created_at),
        "updated_at": str(row.updated_at) if row.updated_at else None,
    }


@admin_router.get("/dashboard/summary")
def admin_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    cache_key = "admin_dashboard_summary"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    total_users = db.execute(text("SELECT COUNT(*) FROM users")).scalar() or 0
    active_today = db.execute(
        text("""
            SELECT COUNT(DISTINCT user_id)
            FROM login_events
            WHERE created_at >= NOW() - INTERVAL '24 hours'
        """)
    ).scalar() or 0
    pending_imports = db.execute(
        text("""
            SELECT COUNT(*)
            FROM case_imports
            WHERE status IN ('draft', 'pending_review')
        """)
    ).scalar() or 0
    role_rows = db.execute(
        text("""
            SELECT role, COUNT(*) AS count
            FROM users
            GROUP BY role
            ORDER BY role
        """)
    ).fetchall()
    event_rows = db.execute(
        text("""
            SELECT id, event_type, message, created_at
            FROM system_events
            ORDER BY created_at DESC
            LIMIT 10
        """)
    ).fetchall()

    return cache_set(cache_key, {
        "total_users": int(total_users),
        "active_today": int(active_today),
        "pending_imports": int(pending_imports),
        "users_by_role": {row.role: int(row.count) for row in role_rows},
        "recent_activity": [
            {
                "id": row.id,
                "event_type": row.event_type,
                "message": row.message,
                "created_at": str(row.created_at),
            }
            for row in event_rows
        ],
    })


@admin_router.get("/users")
def list_admin_users(
    role: Optional[str] = None,
    program: Optional[str] = None,
    status: Optional[str] = None,
    batch: Optional[int] = None,
    search: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)

    where_clauses: List[str] = []
    params: Dict[str, Any] = {
        "limit": page_size,
        "offset": (page - 1) * page_size,
    }

    if role:
        where_clauses.append("role = :role")
        params["role"] = normalize_role(role)
    if program:
        where_clauses.append("program = :program")
        params["program"] = program
    if status:
        where_clauses.append("status = :status")
        params["status"] = normalize_status(status)
    if batch:
        where_clauses.append("admission_year = :batch")
        params["batch"] = batch
    if search:
        where_clauses.append("(name ILIKE :search OR email ILIKE :search)")
        params["search"] = f"%{search.strip()}%"

    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

    total = db.execute(
        text(f"SELECT COUNT(*) FROM users {where_sql}"),
        params,
    ).scalar() or 0
    rows = db.execute(
        text(f"""
            SELECT id, name, email, role, program, specialization,
                   admission_year, status, last_login_at, created_at, updated_at
            FROM users
            {where_sql}
            ORDER BY created_at DESC, id DESC
            LIMIT :limit OFFSET :offset
        """),
        params,
    ).fetchall()

    return {
        "items": [user_response(row) for row in rows],
        "total": int(total),
        "page": page,
        "page_size": page_size,
    }


@admin_router.post("/users", status_code=201)
def create_admin_user(
    data: AdminUserCreate,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    role = normalize_role(data.role)
    if data.mentor_id is not None:
        ensure_active_mentor(db, data.mentor_id)
    ensure_career_track(db, data.career_track_id)
    if not data.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")

    existing = db.execute(
        text("SELECT id FROM users WHERE email = :email"),
        {"email": str(data.email).lower()},
    ).fetchone()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    temporary_secret = secrets.token_urlsafe(32)
    result = db.execute(
        text("""
            INSERT INTO users (
                name, email, password_hash, role, program, specialization,
                admission_year, status, updated_at
            )
            VALUES (
                :name, :email, :password_hash, :role, :program, :specialization,
                :admission_year, 'active', NOW()
            )
            RETURNING id, name, email, role, program, specialization,
                      admission_year, status, last_login_at, created_at, updated_at
        """),
        {
            "name": data.name.strip(),
            "email": str(data.email).lower(),
            "password_hash": hash_password(temporary_secret),
            "role": role,
            "program": data.program.strip() if data.program else None,
            "specialization": data.specialization.strip() if data.specialization else None,
            "admission_year": data.admission_year,
        },
    )
    row = result.fetchone()
    student_id = ensure_role_profile(
        db,
        row.id,
        role,
        mentor_id=data.mentor_id if role == "student" else None,
        career_track_id=data.career_track_id if role == "student" else None,
    )
    db.execute(
        text("""
            INSERT INTO notification_log (
                recipient_user_id, event_type, channel, status, subject, body
            )
            VALUES (
                :recipient_user_id, 'welcome_email', 'email', 'pending',
                'Welcome to PCDC', 'Account created. Send set-password link.'
            )
        """),
        {"recipient_user_id": row.id},
    )
    record_system_event(
        db,
        current_user["id"],
        "user_created",
        f"Created {role} account for {row.name}",
    )
    if role == "student" and data.mentor_id:
        db.execute(
            text("""
                INSERT INTO notification_log (
                    recipient_user_id, event_type, channel, status, subject, body
                )
                VALUES (
                    :mentor_id, 'student_assigned', 'email', 'pending',
                    'New student assigned', :body
                )
            """),
            {"mentor_id": data.mentor_id, "body": f"{row.name} has been assigned to you."},
        )
    db.commit()
    return {
        "user": user_response(row),
        "onboarding_status": "welcome_email_queued",
        "student_id": student_id,
    }


@admin_router.get("/users/import/template")
def download_user_import_template(
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Response:
    require_admin(current_user)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Name", "Email", "Role", "Program", "Batch", "MentorID"])
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=pcdc-user-import-template.csv"},
    )


@admin_router.patch("/users/{user_id}/status")
def update_admin_user_status(
    user_id: int,
    data: AdminUserStatusUpdate,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    status = normalize_status(data.status)
    result = db.execute(
        text("""
            UPDATE users
            SET status = :status, updated_at = NOW()
            WHERE id = :user_id
            RETURNING id, name, email, role, program, specialization,
                      admission_year, status, last_login_at, created_at, updated_at
        """),
        {"user_id": user_id, "status": status},
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    record_system_event(
        db,
        current_user["id"],
        "user_status_changed",
        f"Set {row.name} to {status}",
    )
    db.commit()
    return user_response(row)


@admin_router.patch("/users/{user_id}/role")
def update_admin_user_role(
    user_id: int,
    data: AdminUserRoleUpdate,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    role = normalize_role(data.role)
    result = db.execute(
        text("""
            UPDATE users
            SET role = :role, updated_at = NOW()
            WHERE id = :user_id
            RETURNING id, name, email, role, program, specialization,
                      admission_year, status, last_login_at, created_at, updated_at
        """),
        {"user_id": user_id, "role": role},
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    ensure_role_profile(db, row.id, role)
    record_system_event(
        db,
        current_user["id"],
        "user_role_changed",
        f"Changed {row.name} role to {role}",
    )
    db.commit()
    return user_response(row)


@admin_router.post("/users/{user_id}/reset-password")
def reset_admin_user_password(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, str]:
    require_admin(current_user)
    row = db.execute(
        text("SELECT id, name FROM users WHERE id = :user_id"),
        {"user_id": user_id},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")

    db.execute(
        text("""
            INSERT INTO notification_log (
                recipient_user_id, event_type, channel, status, subject, body
            )
            VALUES (
                :recipient_user_id, 'password_reset', 'email', 'pending',
                'Reset your PCDC password', 'Password reset requested by admin.'
            )
        """),
        {"recipient_user_id": user_id},
    )
    record_system_event(
        db,
        current_user["id"],
        "password_reset_requested",
        f"Queued password reset for {row.name}",
    )
    db.commit()
    return {"status": "reset_email_queued"}


@admin_router.get("/mentors")
def list_admin_mentors(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    require_admin(current_user)
    rows = db.execute(
        text("""
            SELECT u.id, u.name, u.email, u.status, COALESCE(COUNT(s.id), 0) AS student_count
            FROM users u
            LEFT JOIN students s ON s.mentor_id = u.id
            WHERE u.role = 'mentor'
            GROUP BY u.id, u.name, u.email, u.status
            ORDER BY u.name
        """)
    ).fetchall()
    return [
        {
            "id": row.id,
            "name": row.name,
            "email": row.email,
            "status": row.status,
            "student_count": int(row.student_count),
            "overloaded": int(row.student_count) >= 25,
        }
        for row in rows
    ]


@admin_router.get("/career-tracks")
def list_admin_career_tracks(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    require_admin(current_user)
    rows = db.execute(
        text("SELECT id, name, description FROM career_tracks ORDER BY name")
    ).fetchall()
    return [
        {"id": row.id, "name": row.name, "description": row.description}
        for row in rows
    ]


@admin_router.patch("/users/{user_id}/mentor")
def update_student_mentor(
    user_id: int,
    data: AdminUserMentorUpdate,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    result = assign_student_mentor(db, user_id, data.mentor_id, current_user["id"])
    db.commit()
    return result


@admin_router.post("/users/bulk-assign-mentor")
def bulk_assign_student_mentor(
    data: AdminBulkMentorAssign,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    if not data.student_user_ids:
        raise HTTPException(status_code=400, detail="At least one student is required")
    results = [
        assign_student_mentor(db, student_user_id, data.mentor_id, current_user["id"])
        for student_user_id in data.student_user_ids
    ]
    db.commit()
    return {"assigned": results, "count": len(results)}


@admin_router.patch("/users/{user_id}/career-track")
def update_student_career_track(
    user_id: int,
    data: AdminCareerTrackUpdate,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    ensure_career_track(db, data.career_track_id)
    student = get_student_for_user(db, user_id)
    db.execute(
        text("""
            UPDATE students
            SET career_track_id = :career_track_id
            WHERE id = :student_id
        """),
        {"career_track_id": data.career_track_id, "student_id": student.id},
    )
    record_system_event(
        db,
        current_user["id"],
        "career_track_changed",
        f"Updated career track for {student.name}",
    )
    db.commit()
    return {
        "student_user_id": user_id,
        "student_id": student.id,
        "career_track_id": data.career_track_id,
    }
