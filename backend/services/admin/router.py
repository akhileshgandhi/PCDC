import csv
import io
import secrets
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, EmailStr
from sqlalchemy import text
from sqlalchemy.orm import Session

from services.auth.service import get_current_user, hash_password
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


class AdminUserStatusUpdate(BaseModel):
    status: str


class AdminUserRoleUpdate(BaseModel):
    role: str


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


def ensure_role_profile(db: Session, user_id: int, role: str) -> None:
    if role == "student":
        exists = db.execute(
            text("SELECT id FROM students WHERE user_id = :user_id"),
            {"user_id": user_id},
        ).fetchone()
        if not exists:
            db.execute(
                text("""
                    INSERT INTO students (user_id, current_level)
                    VALUES (:user_id, 1)
                """),
                {"user_id": user_id},
            )
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

    return {
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
    }


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
    ensure_role_profile(db, row.id, role)
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
    db.commit()
    return {
        "user": user_response(row),
        "onboarding_status": "welcome_email_queued",
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
