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
    section_id: Optional[int] = None


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


class AdminCourseCreate(BaseModel):
    name: str
    code: str
    total_semesters: int
    duration_years: int


class AdminCourseUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None


class AdminBatchCreate(BaseModel):
    name: str
    start_year: int
    end_year: int


class AdminSectionCreate(BaseModel):
    semester_id: int
    batch_id: int
    name: str
    academic_year: Optional[str] = None


class AdminSectionFacultyAssign(BaseModel):
    faculty_id: int
    subject: str


class AdminSectionStudentsEnroll(BaseModel):
    student_user_ids: List[int]


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


ROMAN_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"]


def semester_name(semester_number: int) -> str:
    if 1 <= semester_number <= len(ROMAN_NUMERALS):
        return f"Semester {ROMAN_NUMERALS[semester_number - 1]}"
    return f"Semester {semester_number}"


def ensure_course(db: Session, course_id: int) -> Any:
    row = db.execute(
        text("SELECT id, name, total_semesters FROM courses WHERE id = :course_id"),
        {"course_id": course_id},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Course not found")
    return row


def ensure_section(db: Session, section_id: int) -> Any:
    row = db.execute(
        text("""
            SELECT cs.id, cs.course_id, cs.semester_id, cs.batch_id, cs.name,
                   se.semester_number
            FROM class_sections cs
            JOIN semesters se ON se.id = cs.semester_id
            WHERE cs.id = :section_id
        """),
        {"section_id": section_id},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Class section not found")
    return row


def enroll_student_in_section(
    db: Session, student_id: int, section_id: int, actor_user_id: int
) -> Any:
    section = ensure_section(db, section_id)
    db.execute(
        text("""
            UPDATE student_sections SET status = 'dropped'
            WHERE student_id = :student_id AND status = 'active'
        """),
        {"student_id": student_id},
    )
    db.execute(
        text("""
            INSERT INTO student_sections (student_id, section_id, enrolled_by, status)
            VALUES (:student_id, :section_id, :actor_user_id, 'active')
        """),
        {"student_id": student_id, "section_id": section_id, "actor_user_id": actor_user_id},
    )
    db.execute(
        text("""
            UPDATE students
            SET course_id = :course_id, batch_id = :batch_id,
                current_section_id = :section_id, current_semester_number = :semester_number
            WHERE id = :student_id
        """),
        {
            "course_id": section.course_id,
            "batch_id": section.batch_id,
            "section_id": section_id,
            "semester_number": section.semester_number,
            "student_id": student_id,
        },
    )
    return section


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
    row_keys = row._mapping.keys() if hasattr(row, "_mapping") else []
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
        "course_name": row.course_name if "course_name" in row_keys else None,
        "batch_name": row.batch_name if "batch_name" in row_keys else None,
        "section_name": row.section_name if "section_name" in row_keys else None,
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
        where_clauses.append("u.role = :role")
        params["role"] = normalize_role(role)
    if program:
        where_clauses.append("u.program = :program")
        params["program"] = program
    if status:
        where_clauses.append("u.status = :status")
        params["status"] = normalize_status(status)
    if batch:
        where_clauses.append("u.admission_year = :batch")
        params["batch"] = batch
    if search:
        where_clauses.append("(u.name ILIKE :search OR u.email ILIKE :search)")
        params["search"] = f"%{search.strip()}%"

    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

    total = db.execute(
        text(f"SELECT COUNT(*) FROM users u {where_sql}"),
        params,
    ).scalar() or 0
    rows = db.execute(
        text(f"""
            SELECT u.id, u.name, u.email, u.role, u.program, u.specialization,
                   u.admission_year, u.status, u.last_login_at, u.created_at, u.updated_at,
                   c.name AS course_name, b.name AS batch_name, cs.name AS section_name
            FROM users u
            LEFT JOIN students s ON s.user_id = u.id
            LEFT JOIN courses c ON c.id = s.course_id
            LEFT JOIN batches b ON b.id = s.batch_id
            LEFT JOIN class_sections cs ON cs.id = s.current_section_id
            {where_sql}
            ORDER BY u.created_at DESC, u.id DESC
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
    if data.section_id is not None:
        ensure_section(db, data.section_id)
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
    if role == "student" and data.section_id is not None and student_id is not None:
        enroll_student_in_section(db, student_id, data.section_id, current_user["id"])
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


def course_response(row: Any) -> Dict[str, Any]:
    return {
        "id": row.id,
        "name": row.name,
        "code": row.code,
        "total_semesters": row.total_semesters,
        "duration_years": row.duration_years,
        "status": row.status,
        "batch_count": int(row.batch_count),
        "section_count": int(row.section_count),
        "student_count": int(row.student_count),
        "faculty_count": int(row.faculty_count),
        "created_at": str(row.created_at),
    }


@admin_router.get("/courses")
def list_admin_courses(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    rows = db.execute(
        text("""
            SELECT c.id, c.name, c.code, c.total_semesters, c.duration_years, c.status,
                   c.created_at,
                   COUNT(DISTINCT b.id) AS batch_count,
                   COUNT(DISTINCT cs.id) AS section_count,
                   COUNT(DISTINCT s.id) AS student_count,
                   COUNT(DISTINCT fs.faculty_id) AS faculty_count
            FROM courses c
            LEFT JOIN batches b ON b.course_id = c.id
            LEFT JOIN class_sections cs ON cs.course_id = c.id
            LEFT JOIN students s ON s.course_id = c.id
            LEFT JOIN faculty_sections fs ON fs.section_id = cs.id
            GROUP BY c.id
            ORDER BY c.name
        """)
    ).fetchall()
    return {"items": [course_response(row) for row in rows], "total": len(rows)}


@admin_router.post("/courses", status_code=201)
def create_admin_course(
    data: AdminCourseCreate,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    if not data.name.strip() or not data.code.strip():
        raise HTTPException(status_code=400, detail="Course name and code are required")
    if data.total_semesters < 1:
        raise HTTPException(status_code=400, detail="Total semesters must be at least 1")
    existing = db.execute(
        text("SELECT id FROM courses WHERE code = :code"),
        {"code": data.code.strip().upper()},
    ).fetchone()
    if existing:
        raise HTTPException(status_code=409, detail="Course code already exists")

    row = db.execute(
        text("""
            INSERT INTO courses (name, code, total_semesters, duration_years, status)
            VALUES (:name, :code, :total_semesters, :duration_years, 'active')
            RETURNING id
        """),
        {
            "name": data.name.strip(),
            "code": data.code.strip().upper(),
            "total_semesters": data.total_semesters,
            "duration_years": data.duration_years,
        },
    ).fetchone()
    for semester_number in range(1, data.total_semesters + 1):
        db.execute(
            text("""
                INSERT INTO semesters (course_id, semester_number, name)
                VALUES (:course_id, :semester_number, :name)
            """),
            {
                "course_id": row.id,
                "semester_number": semester_number,
                "name": semester_name(semester_number),
            },
        )
    record_system_event(
        db, current_user["id"], "course_created", f"Created course {data.name.strip()}"
    )
    db.commit()
    course_row = db.execute(
        text("""
            SELECT c.id, c.name, c.code, c.total_semesters, c.duration_years, c.status,
                   c.created_at, 0 AS batch_count, 0 AS section_count,
                   0 AS student_count, 0 AS faculty_count
            FROM courses c WHERE c.id = :course_id
        """),
        {"course_id": row.id},
    ).fetchone()
    return course_response(course_row)


@admin_router.patch("/courses/{course_id}")
def update_admin_course(
    course_id: int,
    data: AdminCourseUpdate,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    ensure_course(db, course_id)
    if data.status is not None and data.status not in {"active", "inactive"}:
        raise HTTPException(status_code=400, detail="Invalid course status")
    db.execute(
        text("""
            UPDATE courses
            SET name = COALESCE(:name, name), status = COALESCE(:status, status)
            WHERE id = :course_id
        """),
        {
            "name": data.name.strip() if data.name else None,
            "status": data.status,
            "course_id": course_id,
        },
    )
    db.commit()
    row = db.execute(
        text("""
            SELECT c.id, c.name, c.code, c.total_semesters, c.duration_years, c.status,
                   c.created_at,
                   COUNT(DISTINCT b.id) AS batch_count,
                   COUNT(DISTINCT cs.id) AS section_count,
                   COUNT(DISTINCT s.id) AS student_count,
                   COUNT(DISTINCT fs.faculty_id) AS faculty_count
            FROM courses c
            LEFT JOIN batches b ON b.course_id = c.id
            LEFT JOIN class_sections cs ON cs.course_id = c.id
            LEFT JOIN students s ON s.course_id = c.id
            LEFT JOIN faculty_sections fs ON fs.section_id = cs.id
            WHERE c.id = :course_id
            GROUP BY c.id
        """),
        {"course_id": course_id},
    ).fetchone()
    return course_response(row)


@admin_router.get("/courses/{course_id}/semesters")
def list_admin_course_semesters(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    ensure_course(db, course_id)
    rows = db.execute(
        text("""
            SELECT id, semester_number, name
            FROM semesters WHERE course_id = :course_id ORDER BY semester_number
        """),
        {"course_id": course_id},
    ).fetchall()
    return {
        "items": [
            {"id": row.id, "semester_number": row.semester_number, "name": row.name}
            for row in rows
        ]
    }


@admin_router.post("/courses/{course_id}/batches", status_code=201)
def create_admin_batch(
    course_id: int,
    data: AdminBatchCreate,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    ensure_course(db, course_id)
    if not data.name.strip():
        raise HTTPException(status_code=400, detail="Batch name is required")
    if data.end_year < data.start_year:
        raise HTTPException(status_code=400, detail="End year must not be before start year")
    row = db.execute(
        text("""
            INSERT INTO batches (course_id, name, start_year, end_year, status)
            VALUES (:course_id, :name, :start_year, :end_year, 'active')
            RETURNING id, course_id, name, start_year, end_year, status, created_at
        """),
        {
            "course_id": course_id,
            "name": data.name.strip(),
            "start_year": data.start_year,
            "end_year": data.end_year,
        },
    ).fetchone()
    record_system_event(
        db, current_user["id"], "batch_created", f"Created batch {data.name.strip()}"
    )
    db.commit()
    return {
        "id": row.id,
        "course_id": row.course_id,
        "name": row.name,
        "start_year": row.start_year,
        "end_year": row.end_year,
        "status": row.status,
        "created_at": str(row.created_at),
    }


@admin_router.get("/courses/{course_id}/batches")
def list_admin_course_batches(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    ensure_course(db, course_id)
    rows = db.execute(
        text("""
            SELECT id, course_id, name, start_year, end_year, status, created_at
            FROM batches WHERE course_id = :course_id ORDER BY start_year DESC
        """),
        {"course_id": course_id},
    ).fetchall()
    return {
        "items": [
            {
                "id": row.id,
                "course_id": row.course_id,
                "name": row.name,
                "start_year": row.start_year,
                "end_year": row.end_year,
                "status": row.status,
                "created_at": str(row.created_at),
            }
            for row in rows
        ]
    }


def section_response(row: Any) -> Dict[str, Any]:
    return {
        "id": row.id,
        "course_id": row.course_id,
        "name": row.name,
        "academic_year": row.academic_year,
        "status": row.status,
        "semester_number": row.semester_number,
        "semester_name": row.semester_name,
        "batch_name": row.batch_name,
        "student_count": int(row.student_count),
        "faculty_count": int(row.faculty_count),
    }


@admin_router.get("/courses/{course_id}/sections")
def list_admin_course_sections(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    ensure_course(db, course_id)
    rows = db.execute(
        text("""
            SELECT cs.id, cs.course_id, cs.name, cs.academic_year, cs.status,
                   se.semester_number, se.name AS semester_name, b.name AS batch_name,
                   COUNT(DISTINCT ss.student_id) FILTER (WHERE ss.status = 'active') AS student_count,
                   COUNT(DISTINCT fs.faculty_id) AS faculty_count
            FROM class_sections cs
            JOIN semesters se ON se.id = cs.semester_id
            JOIN batches b ON b.id = cs.batch_id
            LEFT JOIN student_sections ss ON ss.section_id = cs.id
            LEFT JOIN faculty_sections fs ON fs.section_id = cs.id
            WHERE cs.course_id = :course_id
            GROUP BY cs.id, se.semester_number, se.name, b.name
            ORDER BY se.semester_number, b.name, cs.name
        """),
        {"course_id": course_id},
    ).fetchall()
    return {"items": [section_response(row) for row in rows], "total": len(rows)}


@admin_router.post("/courses/{course_id}/sections", status_code=201)
def create_admin_section(
    course_id: int,
    data: AdminSectionCreate,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    ensure_course(db, course_id)
    if not data.name.strip():
        raise HTTPException(status_code=400, detail="Section name is required")
    semester_row = db.execute(
        text("SELECT id FROM semesters WHERE id = :semester_id AND course_id = :course_id"),
        {"semester_id": data.semester_id, "course_id": course_id},
    ).fetchone()
    if not semester_row:
        raise HTTPException(status_code=404, detail="Semester not found for this course")
    batch_row = db.execute(
        text("SELECT id FROM batches WHERE id = :batch_id AND course_id = :course_id"),
        {"batch_id": data.batch_id, "course_id": course_id},
    ).fetchone()
    if not batch_row:
        raise HTTPException(status_code=404, detail="Batch not found for this course")
    existing = db.execute(
        text("""
            SELECT id FROM class_sections
            WHERE course_id = :course_id AND semester_id = :semester_id
              AND batch_id = :batch_id AND name = :name
        """),
        {
            "course_id": course_id,
            "semester_id": data.semester_id,
            "batch_id": data.batch_id,
            "name": data.name.strip(),
        },
    ).fetchone()
    if existing:
        raise HTTPException(status_code=409, detail="This section already exists")

    row = db.execute(
        text("""
            INSERT INTO class_sections (course_id, semester_id, batch_id, name, academic_year, status)
            VALUES (:course_id, :semester_id, :batch_id, :name, :academic_year, 'active')
            RETURNING id
        """),
        {
            "course_id": course_id,
            "semester_id": data.semester_id,
            "batch_id": data.batch_id,
            "name": data.name.strip(),
            "academic_year": data.academic_year,
        },
    ).fetchone()
    record_system_event(
        db, current_user["id"], "section_created", f"Created class section {data.name.strip()}"
    )
    db.commit()
    section_row = db.execute(
        text("""
            SELECT cs.id, cs.course_id, cs.name, cs.academic_year, cs.status,
                   se.semester_number, se.name AS semester_name, b.name AS batch_name,
                   0 AS student_count, 0 AS faculty_count
            FROM class_sections cs
            JOIN semesters se ON se.id = cs.semester_id
            JOIN batches b ON b.id = cs.batch_id
            WHERE cs.id = :section_id
        """),
        {"section_id": row.id},
    ).fetchone()
    return section_response(section_row)


@admin_router.get("/sections/{section_id}")
def get_admin_section(
    section_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    section_row = db.execute(
        text("""
            SELECT cs.id, cs.course_id, cs.name, cs.academic_year, cs.status,
                   se.semester_number, se.name AS semester_name, b.name AS batch_name,
                   COUNT(DISTINCT ss.student_id) FILTER (WHERE ss.status = 'active') AS student_count,
                   COUNT(DISTINCT fs.faculty_id) AS faculty_count
            FROM class_sections cs
            JOIN semesters se ON se.id = cs.semester_id
            JOIN batches b ON b.id = cs.batch_id
            LEFT JOIN student_sections ss ON ss.section_id = cs.id
            LEFT JOIN faculty_sections fs ON fs.section_id = cs.id
            WHERE cs.id = :section_id
            GROUP BY cs.id, se.semester_number, se.name, b.name
        """),
        {"section_id": section_id},
    ).fetchone()
    if not section_row:
        raise HTTPException(status_code=404, detail="Class section not found")

    faculty_rows = db.execute(
        text("""
            SELECT fs.id, fs.faculty_id, u.name AS faculty_name, fs.subject
            FROM faculty_sections fs
            JOIN users u ON u.id = fs.faculty_id
            WHERE fs.section_id = :section_id
            ORDER BY u.name
        """),
        {"section_id": section_id},
    ).fetchall()
    student_rows = db.execute(
        text("""
            SELECT s.id AS student_id, u.id AS user_id, u.name, u.email
            FROM student_sections ss
            JOIN students s ON s.id = ss.student_id
            JOIN users u ON u.id = s.user_id
            WHERE ss.section_id = :section_id AND ss.status = 'active'
            ORDER BY u.name
        """),
        {"section_id": section_id},
    ).fetchall()

    result = section_response(section_row)
    result["faculty"] = [
        {
            "id": row.id,
            "faculty_id": row.faculty_id,
            "faculty_name": row.faculty_name,
            "subject": row.subject,
        }
        for row in faculty_rows
    ]
    result["students"] = [
        {"student_id": row.student_id, "user_id": row.user_id, "name": row.name, "email": row.email}
        for row in student_rows
    ]
    return result


@admin_router.post("/sections/{section_id}/faculty", status_code=201)
def assign_admin_section_faculty(
    section_id: int,
    data: AdminSectionFacultyAssign,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    ensure_section(db, section_id)
    if not data.subject.strip():
        raise HTTPException(status_code=400, detail="Subject is required")
    faculty_row = db.execute(
        text("""
            SELECT id, name FROM users
            WHERE id = :faculty_id AND role = 'faculty' AND status = 'active'
        """),
        {"faculty_id": data.faculty_id},
    ).fetchone()
    if not faculty_row:
        raise HTTPException(status_code=404, detail="Active faculty not found")

    existing = db.execute(
        text("""
            SELECT id FROM faculty_sections
            WHERE faculty_id = :faculty_id AND section_id = :section_id AND subject = :subject
        """),
        {
            "faculty_id": data.faculty_id,
            "section_id": section_id,
            "subject": data.subject.strip(),
        },
    ).fetchone()
    if existing:
        return {"id": existing.id, "already_assigned": True}

    row = db.execute(
        text("""
            INSERT INTO faculty_sections (faculty_id, section_id, subject, assigned_by)
            VALUES (:faculty_id, :section_id, :subject, :assigned_by)
            RETURNING id
        """),
        {
            "faculty_id": data.faculty_id,
            "section_id": section_id,
            "subject": data.subject.strip(),
            "assigned_by": current_user["id"],
        },
    ).fetchone()
    record_system_event(
        db,
        current_user["id"],
        "faculty_assigned_section",
        f"Assigned {faculty_row.name} to section {section_id} for {data.subject.strip()}",
    )
    db.commit()
    return {"id": row.id, "already_assigned": False}


@admin_router.post("/sections/{section_id}/students")
def enroll_admin_section_students(
    section_id: int,
    data: AdminSectionStudentsEnroll,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    ensure_section(db, section_id)
    if not data.student_user_ids:
        raise HTTPException(status_code=400, detail="At least one student is required")
    results = []
    for student_user_id in data.student_user_ids:
        student = get_student_for_user(db, student_user_id)
        enroll_student_in_section(db, student.id, section_id, current_user["id"])
        results.append({"student_user_id": student_user_id, "student_id": student.id})
    record_system_event(
        db,
        current_user["id"],
        "students_enrolled_section",
        f"Enrolled {len(results)} student(s) into section {section_id}",
    )
    db.commit()
    return {"enrolled": results, "count": len(results)}


@admin_router.post("/batches/{batch_id}/advance-semester")
def advance_batch_semester(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    batch_row = db.execute(
        text("SELECT id, course_id, name FROM batches WHERE id = :batch_id"),
        {"batch_id": batch_id},
    ).fetchone()
    if not batch_row:
        raise HTTPException(status_code=404, detail="Batch not found")

    sections = db.execute(
        text("""
            SELECT cs.id, cs.name, se.semester_number
            FROM class_sections cs
            JOIN semesters se ON se.id = cs.semester_id
            WHERE cs.batch_id = :batch_id
        """),
        {"batch_id": batch_id},
    ).fetchall()

    advanced = []
    flagged = []
    for section in sections:
        next_section = db.execute(
            text("""
                SELECT cs.id, cs.name
                FROM class_sections cs
                JOIN semesters se ON se.id = cs.semester_id
                WHERE cs.batch_id = :batch_id AND cs.course_id = :course_id
                  AND se.semester_number = :next_semester_number
                LIMIT 1
            """),
            {
                "batch_id": batch_id,
                "course_id": batch_row.course_id,
                "next_semester_number": section.semester_number + 1,
            },
        ).fetchone()

        active_students = db.execute(
            text("""
                SELECT ss.student_id, u.name
                FROM student_sections ss
                JOIN students s ON s.id = ss.student_id
                JOIN users u ON u.id = s.user_id
                WHERE ss.section_id = :section_id AND ss.status = 'active'
            """),
            {"section_id": section.id},
        ).fetchall()

        for student in active_students:
            if next_section:
                enroll_student_in_section(db, student.student_id, next_section.id, current_user["id"])
                advanced.append(
                    {
                        "student_id": student.student_id,
                        "student_name": student.name,
                        "from_section": section.name,
                        "to_section": next_section.name,
                    }
                )
            else:
                flagged.append(
                    {
                        "student_id": student.student_id,
                        "student_name": student.name,
                        "current_section": section.name,
                        "reason": "No section exists for the next semester",
                    }
                )

    record_system_event(
        db,
        current_user["id"],
        "batch_semester_advanced",
        f"Advanced semester for batch {batch_row.name}: {len(advanced)} moved, {len(flagged)} flagged",
    )
    db.commit()
    return {
        "advanced": advanced,
        "flagged": flagged,
        "advanced_count": len(advanced),
        "flagged_count": len(flagged),
    }
