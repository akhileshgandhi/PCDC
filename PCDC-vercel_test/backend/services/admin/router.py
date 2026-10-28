import csv
import io
import json
import secrets
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, Response, UploadFile
from pydantic import BaseModel, EmailStr
from sqlalchemy import text
from sqlalchemy.orm import Session

from services.auth.service import create_setup_token, get_current_user, hash_password
from shared.cache import cache_get, cache_set
from shared.database import get_db
from shared.email import (
    admin_invite_email,
    app_base_url,
    faculty_invite_email,
    password_reset_email,
    send_email,
)

from .teaching_alerts import TEACHING_REQUEST_EVENT, pending_teaching_count
from services.dashboard_insights import admin_dashboard_insights
from .scope import (
    admin_scope,
    can_manage_platform,
    course_child_in_scope_sql,
    course_in_scope_sql,
    department_in_scope_sql,
    ensure_batch_in_scope,
    ensure_course_in_scope,
    ensure_department_in_scope,
    ensure_faculty_section_in_scope,
    ensure_institution_ids_in_scope,
    ensure_institution_in_scope,
    ensure_not_last_superadmin,
    ensure_section_in_scope,
    ensure_semester_in_scope,
    ensure_subject_in_scope,
    guard_target_user,
    institution_in_scope_sql,
    is_superadmin,
    link_admin_to_institution,
    require_admin,
    require_platform_admin,
    require_superadmin,
    scope_params,
    subject_in_scope_sql,
    user_in_scope_sql,
)

admin_router = APIRouter(prefix="/admin", tags=["admin"])

VALID_ROLES = {"student", "faculty", "admin", "superadmin"}
VALID_STATUSES = {"active", "inactive"}
VALID_TITLES = ("Dr.", "Prof.", "Mr.", "Mrs.", "Ms.")


class AdminUserCreate(BaseModel):
    name: str
    email: EmailStr
    role: str
    title: Optional[str] = None
    admission_year: Optional[int] = None
    career_track_id: Optional[int] = None
    section_id: Optional[int] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    employee_id: Optional[str] = None
    experience_years: Optional[int] = None
    college_id: Optional[str] = None
    # Faculty scope: institutions/departments the admin allows this faculty to
    # pick from during onboarding. Departments imply their institution.
    institution_ids: Optional[List[int]] = None
    department_ids: Optional[List[int]] = None


class AdminUserStatusUpdate(BaseModel):
    status: str


class AdminUserRoleUpdate(BaseModel):
    role: str


class AdminCareerTrackUpdate(BaseModel):
    career_track_id: Optional[int] = None


class AdminInstitutionCreate(BaseModel):
    name: str
    code: str
    # Central Admin only: existing admins to link to the new institute.
    admin_ids: Optional[List[int]] = None


class AdminInstitutionUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None


class AdminDepartmentCreate(BaseModel):
    name: str
    code: str
    institution_id: Optional[int] = None


class AdminDepartmentUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    institution_id: Optional[int] = None


class AdminSubjectCreate(BaseModel):
    name: str
    code: Optional[str] = None
    department_id: Optional[int] = None
    course_id: Optional[int] = None
    semester_id: Optional[int] = None


class AdminSubjectUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    department_id: Optional[int] = None
    course_id: Optional[int] = None
    semester_id: Optional[int] = None
    status: Optional[str] = None


class AdminCourseCreate(BaseModel):
    name: str
    code: str
    total_semesters: int
    duration_years: int
    department_id: Optional[int] = None


class AdminCourseUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    department_id: Optional[int] = None


class AdminBatchCreate(BaseModel):
    name: str
    start_year: int
    end_year: int


class AdminBatchUpdate(BaseModel):
    name: Optional[str] = None
    start_year: Optional[int] = None
    end_year: Optional[int] = None
    status: Optional[str] = None


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


def normalize_role(role: str) -> str:
    normalized = role.strip().lower()
    if normalized not in VALID_ROLES:
        raise HTTPException(status_code=400, detail="Invalid role")
    return normalized


def check_role_assignment(current_user: Dict[str, Any], role: str) -> None:
    """Who may create a user with / change a user to `role`:
    - superadmin: Central Admin only;
    - admin: Central Admin and unrestricted (pre-existing) admins;
    - student/faculty: any admin."""
    if role == "superadmin" and not is_superadmin(current_user):
        raise HTTPException(status_code=403, detail="Only the Central Admin can assign the superadmin role")
    if role == "admin" and not can_manage_platform(current_user):
        raise HTTPException(status_code=403, detail="Only the Central Admin can create or assign admins")


def check_user_placement(
    db: Session,
    current_user: Dict[str, Any],
    role: str,
    section_id: Optional[int],
    institution_ids: Optional[List[int]],
    department_ids: Optional[List[int]],
) -> None:
    """The Central Admin and scoped admins must place every new student or
    faculty member in an institute (students via a section, faculty via
    institutes/departments) — otherwise no institute admin could see them.
    Unrestricted (pre-existing) admins keep today's behaviour: no requirement."""
    if role not in ("student", "faculty"):
        return
    if admin_scope(current_user) is None and not is_superadmin(current_user):
        return
    if role == "student":
        if section_id is None:
            raise HTTPException(status_code=400, detail="Choose a section (this places the student in an institute)")
        ensure_section_in_scope(db, current_user, section_id)
        return
    if not institution_ids and not department_ids:
        raise HTTPException(status_code=400, detail="Choose at least one institute or department for this faculty member")
    ensure_institution_ids_in_scope(current_user, institution_ids or [])
    for department_id in department_ids or []:
        ensure_department_in_scope(db, current_user, department_id)


def normalize_title(title: Optional[str]) -> Optional[str]:
    """'dr', 'Dr', 'DR.' -> 'Dr.'; blank -> None; anything else is rejected."""
    cleaned = (title or "").strip().rstrip(".").lower()
    if not cleaned:
        return None
    for valid in VALID_TITLES:
        if valid.rstrip(".").lower() == cleaned:
            return valid
    raise HTTPException(status_code=400, detail=f"Title must be one of {', '.join(VALID_TITLES)}")


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
                    INSERT INTO students (user_id, career_track_id, current_level)
                    VALUES (:user_id, :career_track_id, 1)
                    RETURNING id
                """),
                {
                    "user_id": user_id,
                    "career_track_id": career_track_id,
                },
            ).fetchone()
            seed_student_capabilities(db, row.id)
            return row.id
        seed_student_capabilities(db, exists.id)
        return exists.id
    return None


def ensure_career_track(db: Session, career_track_id: Optional[int]) -> None:
    if career_track_id is None:
        return
    row = db.execute(
        text("SELECT id FROM career_tracks WHERE id = :career_track_id"),
        {"career_track_id": career_track_id},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Career track not found")


def semester_name(semester_number: int) -> str:
    # Plain "Semester N" — matches every seeded/legacy course so naming stays
    # consistent across the whole system regardless of how a course was created.
    return f"Semester {semester_number}"


def ensure_course(db: Session, course_id: int) -> Any:
    row = db.execute(
        text("SELECT id, name, total_semesters, duration_years FROM courses WHERE id = :course_id"),
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


def fetch_full_user_row(db: Session, user_id: int) -> Any:
    # Single source of truth for "give me everything about this user, including
    # the joined course/batch/section context" — used after any write so the
    # response never silently drops fields a narrower RETURNING clause omitted.
    return db.execute(
        text("""
            SELECT u.id, u.name, u.email, u.role, u.title,
                   u.admission_year, u.status, u.last_login_at, u.created_at, u.updated_at,
                   u.department, u.designation, u.employee_id, u.experience_years,
                   u.college_id,
                   COALESCE(sub.course_name, NULL) AS course_name,
                   COALESCE(sub.batch_name, NULL) AS batch_name,
                   COALESCE(sub.section_name, NULL) AS section_name,
                   COALESCE(fac_sub.sections_teaching, 0) AS sections_teaching
            FROM users u
            LEFT JOIN LATERAL (
                SELECT c.name AS course_name, b.name AS batch_name, cs.name AS section_name
                FROM students s
                LEFT JOIN courses c ON c.id = s.course_id
                LEFT JOIN batches b ON b.id = s.batch_id
                LEFT JOIN class_sections cs ON cs.id = s.current_section_id
                WHERE s.user_id = u.id
                LIMIT 1
            ) sub ON TRUE
            LEFT JOIN LATERAL (
                SELECT COUNT(*)::int AS sections_teaching
                FROM faculty_sections fs
                WHERE fs.faculty_id = u.id
            ) fac_sub ON u.role = 'faculty'
            WHERE u.id = :user_id
        """),
        {"user_id": user_id},
    ).fetchone()


def user_response(row: Any) -> Dict[str, Any]:
    row_keys = row._mapping.keys() if hasattr(row, "_mapping") else []
    return {
        "id": row.id,
        "name": row.name,
        "email": row.email,
        "role": row.role,
        "title": row.title if "title" in row_keys else None,
        "admission_year": row.admission_year,
        "department": row.department if "department" in row_keys else None,
        "designation": row.designation if "designation" in row_keys else None,
        "employee_id": row.employee_id if "employee_id" in row_keys else None,
        "experience_years": row.experience_years if "experience_years" in row_keys else None,
        "college_id": row.college_id if "college_id" in row_keys else None,
        "sections_teaching": int(row.sections_teaching) if "sections_teaching" in row_keys and row.sections_teaching else 0,
        "status": row.status,
        "last_login_at": str(row.last_login_at) if row.last_login_at else None,
        "created_at": str(row.created_at),
        "updated_at": str(row.updated_at) if row.updated_at else None,
        "course_name": row.course_name if "course_name" in row_keys else None,
        "batch_name": row.batch_name if "batch_name" in row_keys else None,
        "section_name": row.section_name if "section_name" in row_keys else None,
        "department_name": row.department_name if "department_name" in row_keys else None,
        "institution_name": row.institution_name if "institution_name" in row_keys else None,
        "semester_number": row.semester_number if "semester_number" in row_keys else None,
    }


def scoped_events_sql() -> str:
    """system_events a scoped admin may see: their own actions, plus actions by
    students/faculty of their institutes."""
    return f"""
        (CASE WHEN e.event_type = '{TEACHING_REQUEST_EVENT}'
              -- Teaching-approval requests belong to one institute: only
              -- that institute's admins see them.
              THEN COALESCE(CAST(CAST(e.metadata AS jsonb) ->> 'institution_id' AS INTEGER), -1)
                   = ANY(CAST(:scope_ids AS INTEGER[]))
              ELSE (e.actor_user_id = :self_id
                    OR e.actor_user_id IN (SELECT u.id FROM users u WHERE {user_in_scope_sql('u')}))
         END)
    """


def scoped_dashboard_summary(db: Session, current_user: Dict[str, Any]) -> Dict[str, Any]:
    params = {**scope_params(current_user), "self_id": current_user["id"]}
    in_scope = user_in_scope_sql("u")
    role_rows = db.execute(
        text(f"SELECT u.role, COUNT(*) AS count FROM users u WHERE {in_scope} GROUP BY u.role ORDER BY u.role"),
        params,
    ).fetchall()
    users_by_role = {row.role: int(row.count) for row in role_rows}
    active_today = db.execute(
        text(f"""
            SELECT COUNT(DISTINCT le.user_id)
            FROM login_events le JOIN users u ON u.id = le.user_id
            WHERE le.created_at >= NOW() - INTERVAL '24 hours' AND {in_scope}
        """),
        params,
    ).scalar() or 0
    # Case imports/bank stay platform-wide (shared across institutes).
    pending_imports = db.execute(
        text("SELECT COUNT(*) FROM case_imports WHERE status IN ('draft', 'pending_review')")
    ).scalar() or 0
    event_rows = db.execute(
        text(f"""
            SELECT e.id, e.event_type, e.message, e.created_at
            FROM system_events e
            WHERE {scoped_events_sql()}
            ORDER BY e.created_at DESC
            LIMIT 10
        """),
        params,
    ).fetchall()
    return {
        "total_users": sum(users_by_role.values()),
        "active_today": int(active_today),
        "pending_imports": int(pending_imports),
        "users_by_role": users_by_role,
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


@admin_router.get("/dashboard/summary")
def admin_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    summary = _admin_dashboard_summary_cached(db, current_user)
    # Live, never cached: admins must see a new approval request right away.
    return {**summary, "pending_teaching_approvals": pending_teaching_count(db, current_user)}


@admin_router.get("/dashboard/insights")
def admin_dashboard_insights_endpoint(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    return admin_dashboard_insights(db, current_user)


def _admin_dashboard_summary_cached(db: Session, current_user: Dict[str, Any]) -> Dict[str, Any]:
    scope = admin_scope(current_user)
    # One cache entry per scope so a scoped admin never gets another
    # institute's (or the platform-wide) numbers.
    cache_key = (
        "admin_dashboard_summary"
        if scope is None
        else f"admin_dashboard_summary:{current_user['id']}:{','.join(map(str, scope))}"
    )
    cached = cache_get(cache_key)
    if cached is not None:
        return cached
    if scope is not None:
        return cache_set(cache_key, scoped_dashboard_summary(db, current_user))

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


@admin_router.get("/notifications")
def admin_notifications(
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Recent platform activity for the admin notification bell. Not cached —
    the bell should always reflect the latest events."""
    require_admin(current_user)
    if admin_scope(current_user) is None:
        rows = db.execute(
            text("""
                SELECT id, event_type, message, created_at
                FROM system_events
                ORDER BY id DESC
                LIMIT :limit
            """),
            {"limit": limit},
        ).fetchall()
    else:
        rows = db.execute(
            text(f"""
                SELECT e.id, e.event_type, e.message, e.created_at
                FROM system_events e
                WHERE {scoped_events_sql()}
                ORDER BY e.id DESC
                LIMIT :limit
            """),
            {**scope_params(current_user), "self_id": current_user["id"], "limit": limit},
        ).fetchall()
    return {
        "items": [
            {
                "id": row.id,
                "event_type": row.event_type,
                "message": row.message,
                "created_at": str(row.created_at),
            }
            for row in rows
        ],
        "total": len(rows),
    }


@admin_router.get("/users")
def list_admin_users(
    role: Optional[str] = None,
    status: Optional[str] = None,
    batch: Optional[int] = None,
    search: Optional[str] = None,
    # Student-listing filters (People > Students). Each narrows to students
    # whose enrolment matches, so they only make sense alongside role=student.
    institution_id: Optional[int] = None,
    department_id: Optional[int] = None,
    course_id: Optional[int] = None,
    batch_id: Optional[int] = None,
    semester: Optional[int] = None,
    section_id: Optional[int] = None,
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
    if status:
        where_clauses.append("u.status = :status")
        params["status"] = normalize_status(status)
    if batch:
        where_clauses.append("u.admission_year = :batch")
        params["batch"] = batch
    if search:
        # college_id holds a student's scholar number (their login).
        where_clauses.append("(u.name ILIKE :search OR u.email ILIKE :search OR u.college_id ILIKE :search)")
        params["search"] = f"%{search.strip()}%"
    for column, value in (
        ("sub.institution_id", institution_id),
        ("sub.department_id", department_id),
        ("sub.course_id", course_id),
        ("sub.batch_id", batch_id),
        ("sub.semester_number", semester),
        ("sub.section_id", section_id),
    ):
        if value:
            key = column.split(".")[1]
            where_clauses.append(f"{column} = :{key}")
            params[key] = value
    if admin_scope(current_user) is not None:
        where_clauses.append(user_in_scope_sql("u"))
        params.update(scope_params(current_user))

    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

    total = 0
    rows = db.execute(
        text(f"""
            SELECT u.id, u.name, u.email, u.role, u.title,
                   u.admission_year, u.status, u.last_login_at, u.created_at, u.updated_at,
                   u.department, u.designation, u.employee_id, u.experience_years,
                   u.college_id,
                   COALESCE(sub.course_name, NULL) AS course_name,
                   COALESCE(sub.batch_name, NULL) AS batch_name,
                   COALESCE(sub.section_name, NULL) AS section_name,
                   sub.department_name, sub.institution_name, sub.semester_number,
                   COALESCE(fac_sub.sections_teaching, 0) AS sections_teaching,
                   COUNT(*) OVER() AS _total
            FROM users u
            LEFT JOIN LATERAL (
                SELECT c.name AS course_name, b.name AS batch_name, cs.name AS section_name,
                       s.course_id, s.batch_id, s.current_section_id AS section_id,
                       c.department_id, d.name AS department_name,
                       d.institution_id, inst.name AS institution_name,
                       COALESCE(s.current_semester_number, sem.semester_number) AS semester_number
                FROM students s
                LEFT JOIN courses c ON c.id = s.course_id
                LEFT JOIN departments d ON d.id = c.department_id
                LEFT JOIN institutions inst ON inst.id = d.institution_id
                LEFT JOIN batches b ON b.id = s.batch_id
                LEFT JOIN class_sections cs ON cs.id = s.current_section_id
                LEFT JOIN semesters sem ON sem.id = cs.semester_id
                WHERE s.user_id = u.id
                LIMIT 1
            ) sub ON TRUE
            LEFT JOIN LATERAL (
                SELECT COUNT(*)::int AS sections_teaching
                FROM faculty_sections fs
                WHERE fs.faculty_id = u.id
            ) fac_sub ON u.role = 'faculty'
            {where_sql}
            ORDER BY u.created_at DESC, u.id DESC
            LIMIT :limit OFFSET :offset
        """),
        params,
    ).fetchall()
    if rows:
        total = rows[0]._mapping["_total"]

    return {
        "items": [user_response(row) for row in rows],
        "total": int(total),
        "page": page,
        "page_size": page_size,
    }


def send_onboarding_email(db: Session, request: Request, row: Any, role: str) -> bool:
    """Invite email with a one-time "set your password" link (faculty and
    admins), logged to notification_log. Other roles just get a queued
    welcome entry, as before. Returns whether the email was sent."""
    email_sent = False
    subject = "Welcome to PCDC Case Studio"
    body = "Account created. Send set-password link."
    if role in ("faculty", "admin", "superadmin"):
        raw_token = create_setup_token(db, row.id, purpose="invite")
        # Point the link at the frontend the admin is actually using (the request
        # Origin), so localhost stays localhost and Vercel stays Vercel. Fall back
        # to APP_BASE_URL only when no Origin is present (e.g. server-to-server).
        base = (request.headers.get("origin") or "").rstrip("/") or app_base_url()
        setup_url = f"{base}/set-password?token={raw_token}"
        invite_email = faculty_invite_email if role == "faculty" else admin_invite_email
        subject, text_body, html_body = invite_email(row.name, row.email, setup_url)
        email_sent = send_email(row.email, subject, text_body, html_body)
        body = text_body

    if role == "faculty":
        event_type = "faculty_invite"
    elif role in ("admin", "superadmin"):
        event_type = "admin_invite"
    else:
        event_type = "welcome_email"
    db.execute(
        text("""
            INSERT INTO notification_log (
                recipient_user_id, event_type, channel, status, subject, body
            )
            VALUES (
                :recipient_user_id, :event_type, 'email', :status, :subject, :body
            )
        """),
        {
            "recipient_user_id": row.id,
            "event_type": event_type,
            "status": "sent" if email_sent else "pending",
            "subject": subject,
            "body": body,
        },
    )
    return email_sent


@admin_router.post("/users", status_code=201)
def create_admin_user(
    data: AdminUserCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    role = normalize_role(data.role)
    check_role_assignment(current_user, role)
    ensure_career_track(db, data.career_track_id)
    if data.section_id is not None:
        ensure_section(db, data.section_id)
    check_user_placement(db, current_user, role, data.section_id, data.institution_ids, data.department_ids)
    # For role=admin, institution_ids are the institutes the new admin will
    # own — only the Central Admin links admins to institutes.
    admin_institution_ids = sorted(set(data.institution_ids or [])) if role == "admin" else []
    if admin_institution_ids:
        require_superadmin(current_user)
        found = db.execute(
            text("SELECT COUNT(*) FROM institutions WHERE id = ANY(CAST(:ids AS INTEGER[]))"),
            {"ids": admin_institution_ids},
        ).scalar()
        if found != len(admin_institution_ids):
            raise HTTPException(status_code=404, detail="Institution not found")
    if not data.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")

    existing = db.execute(
        text("SELECT id FROM users WHERE email = :email"),
        {"email": str(data.email).lower()},
    ).fetchone()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # The invitee sets their own password via the emailed link; start with an
    # unusable random hash so the account cannot be signed into until then.
    temporary_secret = secrets.token_urlsafe(48)
    result = db.execute(
        text("""
            INSERT INTO users (
                name, email, password_hash, role, title,
                admission_year, department, designation, employee_id,
                experience_years, college_id, status, updated_at
            )
            VALUES (
                :name, :email, :password_hash, :role, :title,
                :admission_year, :department, :designation, :employee_id,
                :experience_years, :college_id, 'active', NOW()
            )
            RETURNING id, name, email, role, title,
                      admission_year, department, designation, employee_id,
                      experience_years, college_id, status, last_login_at,
                      created_at, updated_at
        """),
        {
            "name": data.name.strip(),
            "email": str(data.email).lower(),
            "password_hash": hash_password(temporary_secret),
            "role": role,
            "title": normalize_title(data.title) if role == "faculty" else None,
            "admission_year": data.admission_year,
            "department": data.department.strip() if data.department else None,
            "designation": data.designation.strip() if data.designation else None,
            "employee_id": data.employee_id.strip() if data.employee_id else None,
            "experience_years": data.experience_years,
            "college_id": data.college_id.strip() if data.college_id else None,
        },
    )
    row = result.fetchone()
    student_id = ensure_role_profile(
        db,
        row.id,
        role,
        career_track_id=data.career_track_id if role == "student" else None,
    )
    if role == "student" and data.section_id is not None and student_id is not None:
        enroll_student_in_section(db, student_id, data.section_id, current_user["id"])

    # Record the admin-assigned scope (institutions/departments) for faculty so
    # onboarding only shows what they're allowed to pick from.
    if role == "faculty":
        scope_pairs = set()  # (institution_id, department_id|None)
        for dept_id in data.department_ids or []:
            drow = db.execute(
                text("SELECT institution_id FROM departments WHERE id = :id"),
                {"id": dept_id},
            ).fetchone()
            if drow and drow.institution_id is not None:
                scope_pairs.add((drow.institution_id, dept_id))
        # Institutions selected without any of their departments -> institution-wide.
        depts_by_inst = {inst for inst, _ in scope_pairs}
        for inst_id in data.institution_ids or []:
            if inst_id not in depts_by_inst:
                scope_pairs.add((inst_id, None))
        for inst_id, dept_id in scope_pairs:
            db.execute(
                text(
                    "INSERT INTO faculty_scope (faculty_id, institution_id, department_id) "
                    "VALUES (:f, :i, :d)"
                ),
                {"f": row.id, "i": inst_id, "d": dept_id},
            )

    for institution_id in admin_institution_ids:
        link_admin_to_institution(db, row.id, institution_id)

    email_sent = send_onboarding_email(db, request, row, role)
    record_system_event(
        db,
        current_user["id"],
        "user_created",
        f"Created {role} account for {row.name}",
    )
    db.commit()
    return {
        "user": user_response(row),
        "onboarding_status": "invite_sent" if email_sent else "welcome_email_queued",
        "email_sent": email_sent,
        "student_id": student_id,
    }


USER_IMPORT_COLUMNS = [
    "Name",
    "Email",
    "Role",
    "Program",
    "AdmissionYear",
    "CourseCode",
    "BatchName",
    "SectionName",
]

STUDENT_IMPORT_COLUMNS = [
    "Name",
    "Email",
    "Department",
    "CollegeID",
    "Program",
    "AdmissionYear",
    "CourseCode",
    "BatchName",
    "SectionName",
]

FACULTY_IMPORT_COLUMNS = [
    "Name",
    "Email",
    "Department",
    "Designation",
    "EmployeeID",
    "ExperienceYears",
    "Program",
    "Specialization",
]


@admin_router.get("/users/import/template")
def download_user_import_template(
    current_user: Dict[str, Any] = Depends(get_current_user),
    role: str = Query(default="", description="Role-specific template: student or faculty"),
) -> Response:
    require_admin(current_user)
    role = role.strip().lower()
    if role == "student":
        columns = STUDENT_IMPORT_COLUMNS
        filename = "pcdc-student-import-template.csv"
    elif role == "faculty":
        columns = FACULTY_IMPORT_COLUMNS
        filename = "pcdc-faculty-import-template.csv"
    else:
        columns = USER_IMPORT_COLUMNS
        filename = "pcdc-user-import-template.csv"
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(columns)
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@admin_router.post("/users/import")
async def import_admin_users(
    file: UploadFile = File(...),
    role: str = Query(default="", description="Force role for all rows: student or faculty"),
    institution_id: Optional[int] = Query(
        default=None, description="Institute to place imported faculty in (Central Admin / institute admins)"
    ),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    forced_role = role.strip().lower() if role else ""
    if forced_role and forced_role not in ("student", "faculty"):
        raise HTTPException(status_code=400, detail="Role parameter must be 'student' or 'faculty'")
    # The Central Admin and institute admins must place every imported user in
    # an institute: students through their CourseCode/BatchName/SectionName
    # (checked per row below), faculty through this institution_id.
    scope = admin_scope(current_user)
    placement_required = scope is not None or is_superadmin(current_user)
    if placement_required and institution_id is None and scope is not None and len(scope) == 1:
        institution_id = scope[0]
    if institution_id is not None:
        if not db.execute(text("SELECT 1 FROM institutions WHERE id = :id"), {"id": institution_id}).fetchone():
            raise HTTPException(status_code=404, detail="Institution not found")
        ensure_institution_ids_in_scope(current_user, [institution_id])
    raw = await file.read()
    try:
        decoded = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File must be UTF-8 encoded CSV")

    reader = csv.DictReader(io.StringIO(decoded))
    fieldnames = {(name or "").strip() for name in (reader.fieldnames or [])}
    if not {"Name", "Email"}.issubset(fieldnames):
        raise HTTPException(
            status_code=400, detail="CSV must include Name and Email columns"
        )
    if not forced_role and "Role" not in fieldnames:
        raise HTTPException(
            status_code=400, detail="CSV must include a Role column (or use role-specific import)"
        )

    created: List[Dict[str, Any]] = []
    errors: List[Dict[str, Any]] = []

    for line_number, raw_row in enumerate(reader, start=2):
        row = {(key or "").strip(): (value or "").strip() for key, value in raw_row.items()}
        name = row.get("Name", "")
        email = row.get("Email", "").lower()
        try:
            with db.begin_nested():
                if not name:
                    raise ValueError("Name is required")
                if not email:
                    raise ValueError("Email is required")
                role = normalize_role(forced_role or row.get("Role") or "student")
                check_role_assignment(current_user, role)
                if placement_required and role == "faculty" and institution_id is None:
                    raise ValueError("Choose the institute to import faculty into")

                existing = db.execute(
                    text("SELECT id FROM users WHERE email = :email"), {"email": email}
                ).fetchone()
                if existing:
                    raise ValueError("Email already registered")

                section_id = None
                course_code = row.get("CourseCode")
                batch_name = row.get("BatchName")
                section_name = row.get("SectionName")
                if role == "student" and course_code:
                    course_row = db.execute(
                        text("SELECT id FROM courses WHERE code = :code"),
                        {"code": course_code},
                    ).fetchone()
                    if not course_row:
                        raise ValueError(f"Course code '{course_code}' not found")
                    if batch_name:
                        batch_row = db.execute(
                            text("""
                                SELECT id FROM batches
                                WHERE course_id = :course_id AND name = :name
                            """),
                            {"course_id": course_row.id, "name": batch_name},
                        ).fetchone()
                        if not batch_row:
                            raise ValueError(
                                f"Batch '{batch_name}' not found for course '{course_code}'"
                            )
                        if section_name:
                            section_row = db.execute(
                                text("""
                                    SELECT id FROM class_sections
                                    WHERE course_id = :course_id AND batch_id = :batch_id
                                          AND name = :name
                                """),
                                {
                                    "course_id": course_row.id,
                                    "batch_id": batch_row.id,
                                    "name": section_name,
                                },
                            ).fetchone()
                            if not section_row:
                                raise ValueError(
                                    f"Section '{section_name}' not found for batch '{batch_name}'"
                                )
                            section_id = section_row.id
                if placement_required and role == "student":
                    if section_id is None:
                        raise ValueError("CourseCode, BatchName and SectionName are required to place this student")
                    ensure_section_in_scope(db, current_user, section_id)

                admission_year_raw = row.get("AdmissionYear")
                admission_year = (
                    int(admission_year_raw)
                    if admission_year_raw and admission_year_raw.isdigit()
                    else None
                )

                specialization = row.get("Specialization") or None
                department = row.get("Department") or None
                designation = row.get("Designation") or None
                # Optional column; templates without it import exactly as before.
                title_val = normalize_title(row.get("Title")) if role == "faculty" else None
                employee_id_val = row.get("EmployeeID") or None
                college_id_val = row.get("CollegeID") or None
                experience_years_raw = row.get("ExperienceYears")
                experience_years = (
                    int(experience_years_raw)
                    if experience_years_raw and experience_years_raw.isdigit()
                    else None
                )

                temporary_secret = secrets.token_urlsafe(32)
                inserted = db.execute(
                    text("""
                        INSERT INTO users (
                            name, email, password_hash, role, title, program,
                            specialization, admission_year, department,
                            designation, employee_id, experience_years,
                            college_id, status, updated_at
                        )
                        VALUES (
                            :name, :email, :password_hash, :role, :title, :program,
                            :specialization, :admission_year, :department,
                            :designation, :employee_id, :experience_years,
                            :college_id, 'active', NOW()
                        )
                        RETURNING id
                    """),
                    {
                        "name": name,
                        "email": email,
                        "password_hash": hash_password(temporary_secret),
                        "role": role,
                        "title": title_val,
                        "program": row.get("Program") or None,
                        "specialization": specialization,
                        "admission_year": admission_year,
                        "department": department,
                        "designation": designation,
                        "employee_id": employee_id_val,
                        "experience_years": experience_years,
                        "college_id": college_id_val,
                    },
                ).fetchone()

                student_id = ensure_role_profile(
                    db,
                    inserted.id,
                    role,
                )
                if role == "student" and section_id is not None and student_id is not None:
                    enroll_student_in_section(db, student_id, section_id, current_user["id"])
                if role == "faculty" and institution_id is not None:
                    db.execute(
                        text(
                            "INSERT INTO faculty_scope (faculty_id, institution_id, department_id) "
                            "VALUES (:f, :i, NULL)"
                        ),
                        {"f": inserted.id, "i": institution_id},
                    )

                db.execute(
                    text("""
                        INSERT INTO notification_log (
                            recipient_user_id, event_type, channel, status, subject, body
                        )
                        VALUES (
                            :recipient_user_id, 'welcome_email', 'email', 'pending',
                            'Welcome to PCDC', 'Account created via CSV import.'
                        )
                    """),
                    {"recipient_user_id": inserted.id},
                )
            created.append({"row": line_number, "name": name, "email": email, "user_id": inserted.id})
        except (ValueError, HTTPException) as exc:
            detail = exc.detail if isinstance(exc, HTTPException) else str(exc)
            errors.append({"row": line_number, "email": email, "error": detail})

    if created:
        record_system_event(
            db,
            current_user["id"],
            "users_imported",
            f"Imported {len(created)} user(s) via CSV ({len(errors)} error(s))",
        )
    db.commit()
    return {
        "created": created,
        "created_count": len(created),
        "errors": errors,
        "error_count": len(errors),
    }


class AdminUserUpdate(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    admission_year: Optional[int] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    employee_id: Optional[str] = None
    experience_years: Optional[int] = None
    college_id: Optional[str] = None


@admin_router.get("/users/{user_id}")
def get_admin_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    guard_target_user(db, current_user, user_id)

    row = fetch_full_user_row(db, user_id)
    if not row:
        raise HTTPException(status_code=404, detail="User not found")

    login_rows = db.execute(
        text("""
            SELECT id, user_agent, ip_address, created_at
            FROM login_events
            WHERE user_id = :user_id
            ORDER BY created_at DESC
            LIMIT 10
        """),
        {"user_id": user_id},
    ).fetchall()

    detail = user_response(row)
    detail["login_history"] = [
        {
            "id": r.id,
            "user_agent": r.user_agent,
            "ip_address": r.ip_address,
            "created_at": str(r.created_at),
        }
        for r in login_rows
    ]
    return detail


@admin_router.patch("/users/{user_id}")
def update_admin_user(
    user_id: int,
    data: AdminUserUpdate,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    guard_target_user(db, current_user, user_id)

    sets: List[str] = []
    params: Dict[str, Any] = {"user_id": user_id}

    if data.name is not None:
        if not data.name.strip():
            raise HTTPException(status_code=400, detail="Name cannot be empty")
        sets.append("name = :name")
        params["name"] = data.name.strip()
    if data.title is not None:
        # Empty string clears the title.
        sets.append("title = :title")
        params["title"] = normalize_title(data.title)
    if data.admission_year is not None:
        sets.append("admission_year = :admission_year")
        params["admission_year"] = data.admission_year if data.admission_year > 0 else None
    if data.department is not None:
        sets.append("department = :department")
        params["department"] = data.department.strip() or None
    if data.designation is not None:
        sets.append("designation = :designation")
        params["designation"] = data.designation.strip() or None
    if data.employee_id is not None:
        sets.append("employee_id = :employee_id")
        params["employee_id"] = data.employee_id.strip() or None
    if data.experience_years is not None:
        sets.append("experience_years = :experience_years")
        params["experience_years"] = data.experience_years if data.experience_years > 0 else None
    if data.college_id is not None:
        sets.append("college_id = :college_id")
        params["college_id"] = data.college_id.strip() or None

    if not sets:
        raise HTTPException(status_code=400, detail="No fields to update")

    sets.append("updated_at = NOW()")
    set_sql = ", ".join(sets)

    row = db.execute(
        text(f"""
            UPDATE users
            SET {set_sql}
            WHERE id = :user_id
            RETURNING id, name
        """),
        params,
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")

    record_system_event(
        db,
        current_user["id"],
        "user_updated",
        f"Updated profile for {row.name}",
    )
    db.commit()
    return user_response(fetch_full_user_row(db, user_id))


@admin_router.patch("/users/{user_id}/status")
def update_admin_user_status(
    user_id: int,
    data: AdminUserStatusUpdate,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    guard_target_user(db, current_user, user_id)
    status = normalize_status(data.status)
    if status != "active":
        ensure_not_last_superadmin(db, user_id)
    result = db.execute(
        text("""
            UPDATE users
            SET status = :status, updated_at = NOW()
            WHERE id = :user_id
            RETURNING id, name
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
    return user_response(fetch_full_user_row(db, user_id))


@admin_router.patch("/users/{user_id}/role")
def update_admin_user_role(
    user_id: int,
    data: AdminUserRoleUpdate,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    guard_target_user(db, current_user, user_id)
    role = normalize_role(data.role)
    check_role_assignment(current_user, role)
    current_role = db.execute(text("SELECT role FROM users WHERE id = :id"), {"id": user_id}).scalar()
    if current_role == "admin" and role != "admin" and not can_manage_platform(current_user):
        raise HTTPException(status_code=403, detail="Only the Central Admin can change an admin's role")
    if role != "superadmin":
        ensure_not_last_superadmin(db, user_id)
    result = db.execute(
        text("""
            UPDATE users
            SET role = :role, updated_at = NOW()
            WHERE id = :user_id
            RETURNING id, name
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
    return user_response(fetch_full_user_row(db, user_id))


@admin_router.post("/users/{user_id}/reset-password")
def reset_admin_user_password(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, str]:
    require_admin(current_user)
    guard_target_user(db, current_user, user_id)
    row = db.execute(
        text("SELECT id, name, email FROM users WHERE id = :user_id"),
        {"user_id": user_id},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    if not row.email:
        raise HTTPException(status_code=400, detail="This user has no email on file to send a reset link to.")

    raw_token = create_setup_token(db, row.id, purpose="reset")
    base = (request.headers.get("origin") or "").rstrip("/") or app_base_url()
    reset_url = f"{base}/set-password?token={raw_token}"
    subject, text_body, html_body = password_reset_email(row.name, row.email, reset_url)
    email_sent = send_email(row.email, subject, text_body, html_body)

    db.execute(
        text("""
            INSERT INTO notification_log (
                recipient_user_id, event_type, channel, status, subject, body
            )
            VALUES (
                :recipient_user_id, 'password_reset', 'email', :status, :subject, :body
            )
        """),
        {
            "recipient_user_id": user_id,
            "status": "sent" if email_sent else "failed",
            "subject": subject,
            "body": text_body,
        },
    )
    record_system_event(
        db,
        current_user["id"],
        "password_reset_requested",
        f"Sent password reset link to {row.name}",
    )
    db.commit()
    return {"status": "reset_email_sent" if email_sent else "reset_email_failed"}


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


@admin_router.delete("/users/{user_id}")
def delete_admin_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, str]:
    require_admin(current_user)
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    guard_target_user(db, current_user, user_id)
    ensure_not_last_superadmin(db, user_id)
    row = db.execute(
        text("SELECT id, name, email, role FROM users WHERE id = :user_id"),
        {"user_id": user_id},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")

    # Remove related records first
    db.execute(text("DELETE FROM notification_log WHERE recipient_user_id = :uid"), {"uid": user_id})
    db.execute(text("DELETE FROM login_events WHERE user_id = :uid"), {"uid": user_id})
    if row.role == "student":
        student = db.execute(
            text("SELECT id FROM students WHERE user_id = :uid"), {"uid": user_id}
        ).fetchone()
        if student:
            db.execute(text("DELETE FROM student_sections WHERE student_id = :sid"), {"sid": student.id})
            db.execute(text("DELETE FROM student_capabilities WHERE student_id = :sid"), {"sid": student.id})
            db.execute(text("DELETE FROM assigned_cases WHERE student_id = :sid"), {"sid": student.id})
            db.execute(text("DELETE FROM students WHERE id = :sid"), {"sid": student.id})
    db.execute(text("DELETE FROM faculty_sections WHERE faculty_id = :uid"), {"uid": user_id})
    db.execute(text("DELETE FROM users WHERE id = :uid"), {"uid": user_id})

    record_system_event(
        db,
        current_user["id"],
        "user_deleted",
        f"Deleted user {row.name} ({row.email}, {row.role})",
    )
    db.commit()
    return {"status": "deleted", "name": row.name}


@admin_router.patch("/users/{user_id}/career-track")
def update_student_career_track(
    user_id: int,
    data: AdminCareerTrackUpdate,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    guard_target_user(db, current_user, user_id)
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
        "department_id": getattr(row, "department_id", None),
        "department_name": getattr(row, "department_name", None),
        "batch_count": int(row.batch_count),
        "section_count": int(row.section_count),
        "student_count": int(row.student_count),
        "faculty_count": int(row.faculty_count),
        "created_at": str(row.created_at),
    }


# ---------------------------------------------------------------------------
# Academic Setup: Departments, Subjects, and a counts summary for the tabs
# ---------------------------------------------------------------------------

def department_response(row: Any) -> Dict[str, Any]:
    return {
        "id": row.id,
        "name": row.name,
        "code": row.code,
        "status": row.status,
        "course_count": int(row.course_count),
        "institution_id": getattr(row, "institution_id", None),
        "institution_name": getattr(row, "institution_name", None),
        "created_at": str(row.created_at),
    }


def subject_response(row: Any) -> Dict[str, Any]:
    return {
        "id": row.id,
        "name": row.name,
        "code": row.code,
        "status": row.status,
        "department_id": row.department_id,
        "department_name": row.department_name,
        "course_id": row.course_id,
        "course_name": row.course_name,
        "semester_id": getattr(row, "semester_id", None),
        "semester_name": getattr(row, "semester_name", None),
        "created_at": str(row.created_at),
    }


@admin_router.get("/academic/summary")
def academic_summary(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, int]:
    require_admin(current_user)
    if admin_scope(current_user) is None:
        row = db.execute(
            text("""
                SELECT
                    (SELECT COUNT(*) FROM institutions) AS institutions,
                    (SELECT COUNT(*) FROM departments) AS departments,
                    (SELECT COUNT(*) FROM courses) AS courses,
                    (SELECT COUNT(*) FROM batches) AS batches,
                    (SELECT COUNT(*) FROM semesters) AS semesters,
                    (SELECT COUNT(*) FROM class_sections) AS sections,
                    (SELECT COUNT(*) FROM subjects) AS subjects
            """)
        ).fetchone()
    else:
        row = db.execute(
            text(f"""
                SELECT
                    (SELECT COUNT(*) FROM institutions i WHERE {institution_in_scope_sql('i')}) AS institutions,
                    (SELECT COUNT(*) FROM departments d WHERE {department_in_scope_sql('d')}) AS departments,
                    (SELECT COUNT(*) FROM courses c WHERE {course_in_scope_sql('c')}) AS courses,
                    (SELECT COUNT(*) FROM batches b WHERE {course_child_in_scope_sql('b')}) AS batches,
                    (SELECT COUNT(*) FROM semesters se WHERE {course_child_in_scope_sql('se')}) AS semesters,
                    (SELECT COUNT(*) FROM class_sections cs WHERE {course_child_in_scope_sql('cs')}) AS sections,
                    (SELECT COUNT(*) FROM subjects s WHERE {subject_in_scope_sql('s')}) AS subjects
            """),
            scope_params(current_user),
        ).fetchone()
    return {
        "institutions": int(row.institutions),
        "departments": int(row.departments),
        "courses": int(row.courses),
        "batches": int(row.batches),
        "semesters": int(row.semesters),
        "sections": int(row.sections),
        "subjects": int(row.subjects),
    }


def institution_response(row: Any) -> Dict[str, Any]:
    return {
        "id": row.id,
        "name": row.name,
        "code": row.code,
        "status": row.status,
        "department_count": int(row.department_count),
        "created_at": str(row.created_at),
        "admins": getattr(row, "admins", None) or [],
    }


class TeachingApprovalSetting(BaseModel):
    require_approval: bool


def _teaching_approval_required(db: Session) -> bool:
    row = db.execute(
        text("SELECT config FROM platform_settings WHERE section = 'teaching_approvals'")
    ).fetchone()
    if not row:
        return True  # default: require approval
    try:
        return bool(json.loads(row.config).get("require_approval", True))
    except (json.JSONDecodeError, TypeError):
        return True


@admin_router.get("/teaching-approvals")
def get_teaching_approvals(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Faculty self-selections awaiting approval, plus the approval setting.

    Self-selection during onboarding isn't wired yet, so `pending` is empty for
    now; the setting persists so the workflow is ready when it lands."""
    require_admin(current_user)
    scope_sql = "" if admin_scope(current_user) is None else f"AND {course_child_in_scope_sql('cs')}"
    rows = db.execute(
        text(f"""
            SELECT fs.id, fs.faculty_id, u.name AS faculty_name, fs.subject, fs.status,
                   cs.name AS section_name, c.name AS course_name, sem.name AS semester_name
            FROM faculty_sections fs
            JOIN users u ON u.id = fs.faculty_id
            JOIN class_sections cs ON cs.id = fs.section_id
            JOIN courses c ON c.id = cs.course_id
            JOIN semesters sem ON sem.id = cs.semester_id
            WHERE fs.status IN ('pending', 'active') {scope_sql}
            ORDER BY u.name, c.name, sem.name
        """),
        scope_params(current_user),
    ).fetchall()
    pending: Dict[int, Dict[str, Any]] = {}
    approved: Dict[int, Dict[str, Any]] = {}
    for r in rows:
        bucket = pending if r.status == "pending" else approved
        person = bucket.setdefault(
            r.faculty_id,
            {"faculty_id": r.faculty_id, "faculty_name": r.faculty_name, "items": []},
        )
        person["items"].append(
            {
                "id": r.id,
                "subject": r.subject,
                "section_name": r.section_name,
                "course_name": r.course_name,
                "semester_name": r.semester_name,
            }
        )
    return {
        "require_approval": _teaching_approval_required(db),
        "pending": list(pending.values()),
        "approved": list(approved.values()),
    }


@admin_router.get("/teaching-approvals/pending-count")
def get_pending_teaching_count(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Live pending count for the sidebar badge (same scope as the list)."""
    require_admin(current_user)
    return {"pending": pending_teaching_count(db, current_user)}


@admin_router.post("/teaching-approvals/{selection_id}/approve")
def approve_teaching_selection(
    selection_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    ensure_faculty_section_in_scope(db, current_user, selection_id)
    db.execute(
        text("UPDATE faculty_sections SET status = 'active' WHERE id = :id AND status = 'pending'"),
        {"id": selection_id},
    )
    db.commit()
    return {"status": "approved", "id": selection_id}


@admin_router.post("/teaching-approvals/{selection_id}/reject")
def reject_teaching_selection(
    selection_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    ensure_faculty_section_in_scope(db, current_user, selection_id)
    db.execute(
        text("DELETE FROM faculty_sections WHERE id = :id AND status = 'pending'"),
        {"id": selection_id},
    )
    db.commit()
    return {"status": "rejected", "id": selection_id}


@admin_router.post("/teaching-approvals/{selection_id}/remove")
def remove_teaching_selection(
    selection_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Revoke an approved (active) teaching assignment."""
    require_admin(current_user)
    ensure_faculty_section_in_scope(db, current_user, selection_id)
    db.execute(text("DELETE FROM faculty_sections WHERE id = :id"), {"id": selection_id})
    db.commit()
    return {"status": "removed", "id": selection_id}


@admin_router.patch("/teaching-approvals/settings")
def set_teaching_approval_setting(
    data: TeachingApprovalSetting,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_platform_admin(current_user)
    config = json.dumps({"require_approval": data.require_approval})
    db.execute(
        text("""
            INSERT INTO platform_settings (section, config, updated_by, updated_at)
            VALUES ('teaching_approvals', :config, :uid, NOW())
            ON CONFLICT (section) DO UPDATE
            SET config = :config, updated_by = :uid, updated_at = NOW()
        """),
        {"config": config, "uid": current_user["id"]},
    )
    db.commit()
    return {"require_approval": data.require_approval}


@admin_router.get("/faculty")
def list_admin_faculty(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Faculty with their teaching load and a derived state:
    awaiting (invited, never logged in) / active / needs_attention (no subjects)."""
    require_admin(current_user)
    scope_sql = "" if admin_scope(current_user) is None else f"AND {user_in_scope_sql('u')}"
    rows = db.execute(
        text(f"""
            SELECT u.id, u.name, u.email, u.department,
                   COALESCE(u.status, 'active') AS status, u.last_login_at,
                   COUNT(DISTINCT fs.subject) AS subject_count,
                   COUNT(DISTINCT fs.section_id) AS section_count
            FROM users u
            LEFT JOIN faculty_sections fs ON fs.faculty_id = u.id
            WHERE u.role = 'faculty' {scope_sql}
            GROUP BY u.id
            ORDER BY u.name
        """),
        scope_params(current_user),
    ).fetchall()
    items = []
    for row in rows:
        joined = row.last_login_at is not None
        subject_count = int(row.subject_count)
        if not joined:
            state = "awaiting"
        elif subject_count == 0:
            state = "needs_attention"
        else:
            state = "active"
        items.append(
            {
                "id": row.id,
                "name": row.name,
                "email": row.email,
                "department": row.department,
                "status": row.status,
                "joined": joined,
                "subject_count": subject_count,
                "section_count": int(row.section_count),
                "state": state,
            }
        )
    return {"items": items, "total": len(items)}


def ensure_faculty_target(db: Session, current_user: Dict[str, Any], faculty_id: int) -> None:
    """Admin guard for the read-only faculty activity views: in scope and a faculty account."""
    require_admin(current_user)
    guard_target_user(db, current_user, faculty_id)
    role = db.execute(text("SELECT role FROM users WHERE id = :id"), {"id": faculty_id}).scalar()
    if role != "faculty":
        raise HTTPException(status_code=404, detail="Faculty not found")


def _float_or_none(value: Any) -> Optional[float]:
    return None if value is None else round(float(value), 1)


def _str_or_none(value: Any) -> Optional[str]:
    return None if value is None else str(value)


@admin_router.get("/faculty/{faculty_id}/activity")
def get_admin_faculty_activity(
    faculty_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Everything a faculty member has done, derived from the records they own.
    Read-only: no faculty workflow writes anything new for this."""
    ensure_faculty_target(db, current_user, faculty_id)
    params = {"fid": faculty_id}

    summary = db.execute(
        text("""
            SELECT
                (SELECT COUNT(*) FROM case_studies WHERE created_by = :fid) AS cases_total,
                (SELECT COUNT(*) FROM case_studies WHERE created_by = :fid AND status = 'published') AS cases_published,
                (SELECT COUNT(*) FROM case_studies WHERE created_by = :fid AND status = 'draft') AS cases_draft,
                (SELECT COUNT(*) FROM deleted_case_studies
                  WHERE created_by = :fid AND restored_at IS NULL) AS cases_deleted,
                (SELECT COUNT(*) FROM case_study_bank WHERE created_by = :fid) AS bank_items,
                (SELECT COUNT(*) FROM case_section_assignments WHERE assigned_by = :fid) AS section_assignments,
                (SELECT COUNT(*) FROM assigned_cases
                  WHERE assigned_by = :fid AND section_assignment_id IS NULL) AS student_assignments,
                (SELECT COUNT(*) FROM case_study_attempts csa
                   JOIN case_studies cs ON cs.id = csa.case_study_id
                  WHERE cs.created_by = :fid) AS attempts_total,
                (SELECT COUNT(DISTINCT csa.student_id) FROM case_study_attempts csa
                   JOIN case_studies cs ON cs.id = csa.case_study_id
                  WHERE cs.created_by = :fid) AS students_reached,
                (SELECT AVG(csa.marks_total) FROM case_study_attempts csa
                   JOIN case_studies cs ON cs.id = csa.case_study_id
                  WHERE cs.created_by = :fid) AS avg_marks,
                (SELECT COUNT(*) FROM login_events WHERE user_id = :fid) AS login_count
        """),
        params,
    ).fetchone()

    teaching_rows = db.execute(
        text("""
            SELECT fs.id, fs.subject, COALESCE(fs.status, 'active') AS status, fs.assigned_at,
                   sec.id AS section_id, sec.name AS section_name,
                   c.name AS course_name, se.name AS semester_name, b.name AS batch_name,
                   (SELECT COUNT(*) FROM student_sections ss
                     WHERE ss.section_id = sec.id AND ss.status = 'active') AS student_count
            FROM faculty_sections fs
            JOIN class_sections sec ON sec.id = fs.section_id
            LEFT JOIN courses c ON c.id = sec.course_id
            LEFT JOIN semesters se ON se.id = sec.semester_id
            LEFT JOIN batches b ON b.id = sec.batch_id
            WHERE fs.faculty_id = :fid
            ORDER BY fs.assigned_at DESC NULLS LAST
        """),
        params,
    ).fetchall()

    case_rows = db.execute(
        text("""
            SELECT cs.id, cs.title, cs.status, cs.subject, cs.difficulty, cs.created_at, cs.updated_at,
                   COUNT(csa.id) AS attempts, AVG(csa.marks_total) AS avg_marks,
                   (SELECT COUNT(*) FROM case_section_assignments a
                     WHERE a.case_study_id = cs.id) AS section_count
            FROM case_studies cs
            LEFT JOIN case_study_attempts csa ON csa.case_study_id = cs.id
            WHERE cs.created_by = :fid
            GROUP BY cs.id
            ORDER BY COALESCE(cs.updated_at, cs.created_at) DESC
            LIMIT 200
        """),
        params,
    ).fetchall()

    section_assignment_rows = db.execute(
        text("""
            SELECT a.id, a.case_study_id, cs.title AS case_title, sec.name AS section_name,
                   c.name AS course_name, a.assigned_at, a.due_date, a.status,
                   (SELECT COUNT(*) FROM assigned_cases ac
                     WHERE ac.section_assignment_id = a.id) AS student_count,
                   (SELECT COUNT(*) FROM assigned_cases ac
                     WHERE ac.section_assignment_id = a.id AND ac.status = 'completed') AS completed_count
            FROM case_section_assignments a
            LEFT JOIN case_studies cs ON cs.id = a.case_study_id
            LEFT JOIN class_sections sec ON sec.id = a.section_id
            LEFT JOIN courses c ON c.id = sec.course_id
            WHERE a.assigned_by = :fid
            ORDER BY a.assigned_at DESC NULLS LAST
            LIMIT 200
        """),
        params,
    ).fetchall()

    student_assignment_rows = db.execute(
        text("""
            SELECT ac.id, ac.case_study_id, cs.title AS case_title, u.name AS student_name,
                   ac.assigned_at, ac.status, ac.completed_at
            FROM assigned_cases ac
            LEFT JOIN case_studies cs ON cs.id = ac.case_study_id
            LEFT JOIN students s ON s.id = ac.student_id
            LEFT JOIN users u ON u.id = s.user_id
            WHERE ac.assigned_by = :fid AND ac.section_assignment_id IS NULL
            ORDER BY ac.assigned_at DESC NULLS LAST
            LIMIT 200
        """),
        params,
    ).fetchall()

    bank_rows = db.execute(
        text("""
            SELECT id, title, subject, semester_number, difficulty, source, status, created_at
            FROM case_study_bank
            WHERE created_by = :fid
            ORDER BY created_at DESC
            LIMIT 200
        """),
        params,
    ).fetchall()

    return {
        "summary": {
            "cases_total": int(summary.cases_total or 0),
            "cases_published": int(summary.cases_published or 0),
            "cases_draft": int(summary.cases_draft or 0),
            "cases_deleted": int(summary.cases_deleted or 0),
            "bank_items": int(summary.bank_items or 0),
            "section_assignments": int(summary.section_assignments or 0),
            "student_assignments": int(summary.student_assignments or 0),
            "attempts_total": int(summary.attempts_total or 0),
            "students_reached": int(summary.students_reached or 0),
            "avg_marks": _float_or_none(summary.avg_marks),
            "login_count": int(summary.login_count or 0),
        },
        "teaching": [
            {
                "id": r.id,
                "subject": r.subject,
                "status": r.status,
                "assigned_at": _str_or_none(r.assigned_at),
                "section_id": r.section_id,
                "section_name": r.section_name,
                "course_name": r.course_name,
                "semester_name": r.semester_name,
                "batch_name": r.batch_name,
                "student_count": int(r.student_count or 0),
            }
            for r in teaching_rows
        ],
        "cases": [
            {
                "id": r.id,
                "title": r.title,
                "status": r.status,
                "subject": r.subject,
                "difficulty": r.difficulty,
                "created_at": _str_or_none(r.created_at),
                "updated_at": _str_or_none(r.updated_at),
                "attempts": int(r.attempts or 0),
                "avg_marks": _float_or_none(r.avg_marks),
                "section_count": int(r.section_count or 0),
            }
            for r in case_rows
        ],
        "section_assignments": [
            {
                "id": r.id,
                "case_study_id": r.case_study_id,
                "case_title": r.case_title,
                "section_name": r.section_name,
                "course_name": r.course_name,
                "assigned_at": _str_or_none(r.assigned_at),
                "due_date": _str_or_none(r.due_date),
                "status": r.status,
                "student_count": int(r.student_count or 0),
                "completed_count": int(r.completed_count or 0),
            }
            for r in section_assignment_rows
        ],
        "student_assignments": [
            {
                "id": r.id,
                "case_study_id": r.case_study_id,
                "case_title": r.case_title,
                "student_name": r.student_name,
                "assigned_at": _str_or_none(r.assigned_at),
                "status": r.status,
                "completed_at": _str_or_none(r.completed_at),
            }
            for r in student_assignment_rows
        ],
        "bank_items": [
            {
                "id": r.id,
                "title": r.title,
                "subject": r.subject,
                "semester_number": r.semester_number,
                "difficulty": r.difficulty,
                "source": r.source,
                "status": r.status,
                "created_at": _str_or_none(r.created_at),
            }
            for r in bank_rows
        ],
    }


@admin_router.get("/faculty/{faculty_id}/timeline")
def get_admin_faculty_timeline(
    faculty_id: int,
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    all: bool = Query(False, description="Return every remaining item from offset, ignoring limit"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """One chronological feed of a faculty member's activity, newest first,
    stitched together from the tables that already record it."""
    limit_sql = "" if all else "LIMIT :limit"
    ensure_faculty_target(db, current_user, faculty_id)
    rows = db.execute(
        text(f"""
            SELECT type, title, detail, ref_id, occurred_at FROM (
                SELECT 'login' AS type, 'Logged in' AS title,
                       NULL::text AS detail, NULL::int AS ref_id, le.created_at AS occurred_at
                FROM login_events le WHERE le.user_id = :fid

                UNION ALL
                SELECT 'case_created', 'Created case study', cs.title, cs.id, cs.created_at
                FROM case_studies cs WHERE cs.created_by = :fid

                UNION ALL
                SELECT 'case_updated', 'Last updated case study', cs.title, cs.id, cs.updated_at
                FROM case_studies cs
                WHERE cs.created_by = :fid AND cs.updated_at IS NOT NULL
                  AND cs.updated_at > cs.created_at + INTERVAL '1 minute'

                UNION ALL
                SELECT 'case_assigned_section', 'Assigned case to section',
                       COALESCE(cs.title, 'Case') || ' → ' || COALESCE(sec.name, 'section'),
                       a.case_study_id, a.assigned_at
                FROM case_section_assignments a
                LEFT JOIN case_studies cs ON cs.id = a.case_study_id
                LEFT JOIN class_sections sec ON sec.id = a.section_id
                WHERE a.assigned_by = :fid

                UNION ALL
                SELECT 'case_assigned_student', 'Assigned case to student',
                       COALESCE(cs.title, 'Case') || ' → ' || COALESCE(u.name, 'student'),
                       ac.case_study_id, ac.assigned_at
                FROM assigned_cases ac
                LEFT JOIN case_studies cs ON cs.id = ac.case_study_id
                LEFT JOIN students s ON s.id = ac.student_id
                LEFT JOIN users u ON u.id = s.user_id
                WHERE ac.assigned_by = :fid AND ac.section_assignment_id IS NULL

                UNION ALL
                SELECT 'case_deleted', 'Deleted case study', d.title, NULL, d.deleted_at
                FROM deleted_case_studies d WHERE d.deleted_by = :fid

                UNION ALL
                SELECT 'case_deleted', 'Case study deleted by admin', d.title, NULL, d.deleted_at
                FROM deleted_case_studies d
                WHERE d.created_by = :fid AND d.deleted_by IS DISTINCT FROM :fid

                UNION ALL
                SELECT 'case_restored', 'Case study restored by admin', d.title, d.case_id, d.restored_at
                FROM deleted_case_studies d WHERE d.created_by = :fid AND d.restored_at IS NOT NULL

                UNION ALL
                SELECT 'bank_contribution', 'Added to Case Bank', b.title, NULL, b.created_at
                FROM case_study_bank b WHERE b.created_by = :fid

                UNION ALL
                SELECT 'teaching', 'Teaching selection',
                       COALESCE(fs.subject || ' · ', '') || COALESCE(sec.name, 'section'),
                       NULL, fs.assigned_at
                FROM faculty_sections fs
                LEFT JOIN class_sections sec ON sec.id = fs.section_id
                WHERE fs.faculty_id = :fid

                UNION ALL
                SELECT 'system', e.event_type, e.message, NULL, e.created_at
                FROM system_events e WHERE e.actor_user_id = :fid
            ) feed
            WHERE occurred_at IS NOT NULL
            ORDER BY occurred_at DESC, type, ref_id NULLS LAST, title, detail NULLS LAST
            {limit_sql} OFFSET :offset
        """),
        {"fid": faculty_id, "limit": limit + 1, "offset": offset},
    ).fetchall()

    has_more = not all and len(rows) > limit
    page = rows if all else rows[:limit]
    return {
        "items": [
            {
                "type": r.type,
                "title": r.title,
                "detail": r.detail,
                "ref_id": r.ref_id,
                "occurred_at": str(r.occurred_at),
            }
            for r in page
        ],
        "has_more": has_more,
        "next_offset": offset + len(page) if has_more else None,
    }


@admin_router.post("/faculty/{faculty_id}/resend-invite")
def resend_faculty_invite(
    faculty_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Send a fresh invite link to a faculty member who hasn't logged in yet
    (the "awaiting" state in /faculty) — e.g. because their original link
    already expired, or they lost the email."""
    require_admin(current_user)
    guard_target_user(db, current_user, faculty_id)
    row = db.execute(
        text("SELECT id, name, email, last_login_at FROM users WHERE id = :id AND role = 'faculty'"),
        {"id": faculty_id},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Faculty not found")
    if row.last_login_at is not None:
        raise HTTPException(
            status_code=400, detail="This faculty member has already signed in — nothing to resend."
        )

    raw_token = create_setup_token(db, row.id, purpose="invite")
    base = (request.headers.get("origin") or "").rstrip("/") or app_base_url()
    setup_url = f"{base}/set-password?token={raw_token}"
    subject, text_body, html_body = faculty_invite_email(row.name, row.email, setup_url)
    email_sent = send_email(row.email, subject, text_body, html_body)

    db.execute(
        text("""
            INSERT INTO notification_log (
                recipient_user_id, event_type, channel, status, subject, body
            )
            VALUES (:recipient_user_id, 'faculty_invite', 'email', :status, :subject, :body)
        """),
        {
            "recipient_user_id": row.id,
            "status": "sent" if email_sent else "pending",
            "subject": subject,
            "body": text_body,
        },
    )
    record_system_event(
        db, current_user["id"], "faculty_invite_resent", f"Resent invite to {row.name}"
    )
    db.commit()
    return {"email_sent": email_sent}


@admin_router.get("/institutions")
def list_admin_institutions(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    scope_sql = "" if admin_scope(current_user) is None else f"WHERE {institution_in_scope_sql('i')}"
    rows = db.execute(
        text(f"""
            SELECT i.id, i.name, i.code, i.status, i.created_at,
                   (SELECT COUNT(*) FROM departments d WHERE d.institution_id = i.id) AS department_count,
                   COALESCE((
                       SELECT json_agg(json_build_object('id', au.id, 'name', au.name, 'email', au.email)
                                       ORDER BY au.name)
                       FROM admin_institutions ai JOIN users au ON au.id = ai.admin_id
                       WHERE ai.institution_id = i.id AND au.role = 'admin'
                   ), '[]'::json) AS admins
            FROM institutions i
            {scope_sql}
            ORDER BY i.name
        """),
        scope_params(current_user),
    ).fetchall()
    return {"items": [institution_response(row) for row in rows], "total": len(rows)}


@admin_router.post("/institutions", status_code=201)
def create_admin_institution(
    data: AdminInstitutionCreate,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    row = insert_institution(db, current_user, data.name, data.code)
    if data.admin_ids:
        require_superadmin(current_user)
        for admin_id in set(data.admin_ids):
            ensure_admin_account(db, admin_id)
            link_admin_to_institution(db, admin_id, row.id)
    db.commit()
    return institution_response(row)


def insert_institution(db: Session, current_user: Dict[str, Any], name: str, code: str) -> Any:
    """Create an institute (no commit). A scoped admin's new institute is
    linked to them so it becomes theirs; unrestricted admins and the Central
    Admin are not linked (they already see every institute)."""
    if not name.strip() or not code.strip():
        raise HTTPException(status_code=400, detail="Institution name and code are required")
    code = code.strip().upper()
    existing = db.execute(
        text("SELECT id FROM institutions WHERE code = :code"), {"code": code}
    ).fetchone()
    if existing:
        raise HTTPException(status_code=409, detail="Institution code already exists")
    row = db.execute(
        text("""
            INSERT INTO institutions (name, code, status, created_by)
            VALUES (:name, :code, 'active', :created_by)
            RETURNING id, name, code, status, created_at, 0 AS department_count
        """),
        {"name": name.strip(), "code": code, "created_by": current_user["id"]},
    ).fetchone()
    if admin_scope(current_user) is not None:
        link_admin_to_institution(db, current_user["id"], row.id)
    record_system_event(
        db, current_user["id"], "institution_created", f"Created institution {name.strip()}"
    )
    return row


def ensure_admin_account(db: Session, user_id: int) -> Any:
    row = db.execute(
        text("SELECT id, name, email, role FROM users WHERE id = :id AND role = 'admin'"),
        {"id": user_id},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Admin not found")
    return row


@admin_router.patch("/institutions/{institution_id}")
def update_admin_institution(
    institution_id: int,
    data: AdminInstitutionUpdate,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    ensure_institution_in_scope(db, current_user, institution_id)
    if data.status is not None and data.status not in {"active", "inactive"}:
        raise HTTPException(status_code=400, detail="Invalid institution status")
    db.execute(
        text("""
            UPDATE institutions
            SET name = COALESCE(:name, name), status = COALESCE(:status, status)
            WHERE id = :id
        """),
        {"name": data.name.strip() if data.name else None, "status": data.status, "id": institution_id},
    )
    db.commit()
    row = db.execute(
        text("""
            SELECT i.id, i.name, i.code, i.status, i.created_at, COUNT(d.id) AS department_count
            FROM institutions i LEFT JOIN departments d ON d.institution_id = i.id
            WHERE i.id = :id GROUP BY i.id
        """),
        {"id": institution_id},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Institution not found")
    return institution_response(row)


@admin_router.delete("/institutions/{institution_id}")
def delete_admin_institution(
    institution_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    ensure_institution_in_scope(db, current_user, institution_id)
    row = db.execute(
        text("SELECT name FROM institutions WHERE id = :id"), {"id": institution_id}
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Institution not found")
    db.execute(text("DELETE FROM institutions WHERE id = :id"), {"id": institution_id})
    record_system_event(
        db, current_user["id"], "institution_deleted", f"Deleted institution {row.name}"
    )
    db.commit()
    return {"status": "deleted", "id": institution_id}


@admin_router.get("/departments")
def list_admin_departments(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    scope_sql = "" if admin_scope(current_user) is None else f"WHERE {department_in_scope_sql('d')}"
    rows = db.execute(
        text(f"""
            SELECT d.id, d.name, d.code, d.status, d.created_at,
                   d.institution_id, inst.name AS institution_name,
                   COUNT(c.id) AS course_count
            FROM departments d
            LEFT JOIN courses c ON c.department_id = d.id
            LEFT JOIN institutions inst ON inst.id = d.institution_id
            {scope_sql}
            GROUP BY d.id, inst.name
            ORDER BY d.name
        """),
        scope_params(current_user),
    ).fetchall()
    return {"items": [department_response(row) for row in rows], "total": len(rows)}


def scoped_institution_for_create(current_user: Dict[str, Any], institution_id: Optional[int]) -> Optional[int]:
    """A scoped admin's new department must sit in one of their institutes;
    with exactly one institute it's filled in for them."""
    scope = admin_scope(current_user)
    if scope is None:
        return institution_id
    if institution_id is None:
        if len(scope) != 1:
            raise HTTPException(status_code=400, detail="Choose which of your institutes this belongs to")
        return scope[0]
    ensure_institution_ids_in_scope(current_user, [institution_id])
    return institution_id


def require_scoped_parent(current_user: Dict[str, Any], *parent_ids: Optional[int]) -> None:
    """Scoped admins can't create rows that hang off nothing (they'd belong to
    no institute and immediately disappear from their view)."""
    if admin_scope(current_user) is not None and all(p is None for p in parent_ids):
        raise HTTPException(status_code=400, detail="Choose a department or course from your institute")


@admin_router.post("/departments", status_code=201)
def create_admin_department(
    data: AdminDepartmentCreate,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    if not data.name.strip() or not data.code.strip():
        raise HTTPException(status_code=400, detail="Department name and code are required")
    institution_id = scoped_institution_for_create(current_user, data.institution_id)
    code = data.code.strip().upper()
    existing = db.execute(
        text("SELECT id FROM departments WHERE code = :code"), {"code": code}
    ).fetchone()
    if existing:
        raise HTTPException(status_code=409, detail="Department code already exists")
    row = db.execute(
        text("""
            INSERT INTO departments (name, code, status, institution_id)
            VALUES (:name, :code, 'active', :institution_id)
            RETURNING id, name, code, status, created_at, institution_id, 0 AS course_count
        """),
        {"name": data.name.strip(), "code": code, "institution_id": institution_id},
    ).fetchone()
    record_system_event(
        db, current_user["id"], "department_created", f"Created department {data.name.strip()}"
    )
    db.commit()
    return department_response(row)


@admin_router.patch("/departments/{department_id}")
def update_admin_department(
    department_id: int,
    data: AdminDepartmentUpdate,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    ensure_department_in_scope(db, current_user, department_id)
    if data.institution_id is not None:
        ensure_institution_ids_in_scope(current_user, [data.institution_id])
    if data.status is not None and data.status not in {"active", "inactive"}:
        raise HTTPException(status_code=400, detail="Invalid department status")
    db.execute(
        text("""
            UPDATE departments
            SET name = COALESCE(:name, name),
                status = COALESCE(:status, status),
                institution_id = COALESCE(:institution_id, institution_id)
            WHERE id = :id
        """),
        {
            "name": data.name.strip() if data.name else None,
            "status": data.status,
            "institution_id": data.institution_id,
            "id": department_id,
        },
    )
    db.commit()
    row = db.execute(
        text("""
            SELECT d.id, d.name, d.code, d.status, d.created_at,
                   d.institution_id, inst.name AS institution_name,
                   COUNT(c.id) AS course_count
            FROM departments d
            LEFT JOIN courses c ON c.department_id = d.id
            LEFT JOIN institutions inst ON inst.id = d.institution_id
            WHERE d.id = :id GROUP BY d.id, inst.name
        """),
        {"id": department_id},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Department not found")
    return department_response(row)


@admin_router.delete("/departments/{department_id}")
def delete_admin_department(
    department_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    ensure_department_in_scope(db, current_user, department_id)
    row = db.execute(
        text("SELECT name FROM departments WHERE id = :id"), {"id": department_id}
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Department not found")
    # Courses keep existing; their department_id is set NULL by the FK.
    db.execute(text("DELETE FROM departments WHERE id = :id"), {"id": department_id})
    record_system_event(
        db, current_user["id"], "department_deleted", f"Deleted department {row.name}"
    )
    db.commit()
    return {"status": "deleted", "id": department_id}


@admin_router.get("/subjects")
def list_admin_subjects(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    scope_sql = "" if admin_scope(current_user) is None else f"WHERE {subject_in_scope_sql('su')}"
    rows = db.execute(
        text(f"""
            SELECT su.id, su.name, su.code, su.status, su.created_at,
                   su.department_id, d.name AS department_name,
                   su.course_id, c.name AS course_name,
                   su.semester_id, sem.name AS semester_name
            FROM subjects su
            LEFT JOIN departments d ON d.id = su.department_id
            LEFT JOIN courses c ON c.id = su.course_id
            LEFT JOIN semesters sem ON sem.id = su.semester_id
            {scope_sql}
            ORDER BY su.name
        """),
        scope_params(current_user),
    ).fetchall()
    return {"items": [subject_response(row) for row in rows], "total": len(rows)}


@admin_router.post("/subjects", status_code=201)
def create_admin_subject(
    data: AdminSubjectCreate,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    if not data.name.strip():
        raise HTTPException(status_code=400, detail="Subject name is required")
    require_scoped_parent(current_user, data.department_id, data.course_id)
    ensure_department_in_scope(db, current_user, data.department_id)
    ensure_course_in_scope(db, current_user, data.course_id)
    ensure_semester_in_scope(db, current_user, data.semester_id)

    # Auto-generate a code like MBA-MKT-S1-1 (course code + semester + a
    # running index across the course) when the client doesn't supply one.
    code = data.code.strip().upper() if data.code else None
    if not code and data.course_id and data.semester_id:
        info = db.execute(
            text("""
                SELECT c.code AS course_code, sem.semester_number AS semnum
                FROM courses c
                JOIN semesters sem ON sem.id = :semester_id
                WHERE c.id = :course_id
            """),
            {"course_id": data.course_id, "semester_id": data.semester_id},
        ).fetchone()
        if info:
            existing = db.execute(
                text("SELECT COUNT(*) AS n FROM subjects WHERE course_id = :course_id"),
                {"course_id": data.course_id},
            ).fetchone()
            code = f"{info.course_code}-S{info.semnum}-{int(existing.n) + 1}"

    row = db.execute(
        text("""
            INSERT INTO subjects (name, code, department_id, course_id, semester_id, status)
            VALUES (:name, :code, :department_id, :course_id, :semester_id, 'active')
            RETURNING id
        """),
        {
            "name": data.name.strip(),
            "code": code,
            "department_id": data.department_id,
            "course_id": data.course_id,
            "semester_id": data.semester_id,
        },
    ).fetchone()
    record_system_event(
        db, current_user["id"], "subject_created", f"Created subject {data.name.strip()}"
    )
    db.commit()
    return _subject_by_id(db, row.id)


@admin_router.patch("/subjects/{subject_id}")
def update_admin_subject(
    subject_id: int,
    data: AdminSubjectUpdate,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    ensure_subject_in_scope(db, current_user, subject_id)
    ensure_department_in_scope(db, current_user, data.department_id)
    ensure_course_in_scope(db, current_user, data.course_id)
    ensure_semester_in_scope(db, current_user, data.semester_id)
    if data.status is not None and data.status not in {"active", "inactive"}:
        raise HTTPException(status_code=400, detail="Invalid subject status")
    db.execute(
        text("""
            UPDATE subjects
            SET name = COALESCE(:name, name),
                code = COALESCE(:code, code),
                department_id = COALESCE(:department_id, department_id),
                course_id = COALESCE(:course_id, course_id),
                semester_id = COALESCE(:semester_id, semester_id),
                status = COALESCE(:status, status)
            WHERE id = :id
        """),
        {
            "name": data.name.strip() if data.name else None,
            "code": data.code.strip().upper() if data.code else None,
            "department_id": data.department_id,
            "course_id": data.course_id,
            "semester_id": data.semester_id,
            "status": data.status,
            "id": subject_id,
        },
    )
    db.commit()
    return _subject_by_id(db, subject_id)


@admin_router.delete("/subjects/{subject_id}")
def delete_admin_subject(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    ensure_subject_in_scope(db, current_user, subject_id)
    row = db.execute(text("SELECT id FROM subjects WHERE id = :id"), {"id": subject_id}).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Subject not found")
    db.execute(text("DELETE FROM subjects WHERE id = :id"), {"id": subject_id})
    db.commit()
    return {"status": "deleted", "id": subject_id}


def _subject_by_id(db: Session, subject_id: int) -> Dict[str, Any]:
    row = db.execute(
        text("""
            SELECT su.id, su.name, su.code, su.status, su.created_at,
                   su.department_id, d.name AS department_name,
                   su.course_id, c.name AS course_name,
                   su.semester_id, sem.name AS semester_name
            FROM subjects su
            LEFT JOIN departments d ON d.id = su.department_id
            LEFT JOIN courses c ON c.id = su.course_id
            LEFT JOIN semesters sem ON sem.id = su.semester_id
            WHERE su.id = :id
        """),
        {"id": subject_id},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Subject not found")
    return subject_response(row)


@admin_router.get("/batches")
def list_admin_all_batches(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    scope_sql = "" if admin_scope(current_user) is None else f"WHERE {course_child_in_scope_sql('b')}"
    rows = db.execute(
        text(f"""
            SELECT b.id, b.name, b.start_year, b.end_year, b.status, b.created_at,
                   c.id AS course_id, c.name AS course_name, c.code AS course_code,
                   COUNT(DISTINCT cs.id) AS section_count
            FROM batches b
            JOIN courses c ON c.id = b.course_id
            LEFT JOIN class_sections cs ON cs.batch_id = b.id
            {scope_sql}
            GROUP BY b.id, c.id
            ORDER BY c.name, b.name
        """),
        scope_params(current_user),
    ).fetchall()
    return {
        "items": [
            {
                "id": row.id,
                "name": row.name,
                "start_year": row.start_year,
                "end_year": row.end_year,
                "status": row.status,
                "course_id": row.course_id,
                "course_name": row.course_name,
                "course_code": row.course_code,
                "section_count": int(row.section_count),
                "created_at": str(row.created_at),
            }
            for row in rows
        ],
        "total": len(rows),
    }


@admin_router.get("/semesters")
def list_admin_all_semesters(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    scope_sql = "" if admin_scope(current_user) is None else f"WHERE {course_child_in_scope_sql('s')}"
    rows = db.execute(
        text(f"""
            SELECT s.id, s.semester_number, s.name,
                   c.id AS course_id, c.name AS course_name, c.code AS course_code,
                   (SELECT COUNT(*) FROM class_sections cs WHERE cs.semester_id = s.id)
                       AS section_count,
                   (SELECT COUNT(*) FROM subjects su WHERE su.semester_id = s.id)
                       AS subject_count
            FROM semesters s
            JOIN courses c ON c.id = s.course_id
            {scope_sql}
            ORDER BY c.name, s.semester_number
        """),
        scope_params(current_user),
    ).fetchall()
    return {
        "items": [
            {
                "id": row.id,
                "semester_number": row.semester_number,
                "name": row.name,
                "course_id": row.course_id,
                "course_name": row.course_name,
                "course_code": row.course_code,
                "section_count": int(row.section_count),
                "subject_count": int(row.subject_count),
            }
            for row in rows
        ],
        "total": len(rows),
    }


@admin_router.get("/courses")
def list_admin_courses(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    scope_sql = "" if admin_scope(current_user) is None else f"WHERE {course_in_scope_sql('c')}"
    rows = db.execute(
        text(f"""
            SELECT c.id, c.name, c.code, c.total_semesters, c.duration_years, c.status,
                   c.created_at, c.department_id, dept.name AS department_name,
                   COUNT(DISTINCT b.id) AS batch_count,
                   COUNT(DISTINCT cs.id) AS section_count,
                   COUNT(DISTINCT s.id) AS student_count,
                   COUNT(DISTINCT fs.faculty_id) AS faculty_count
            FROM courses c
            LEFT JOIN batches b ON b.course_id = c.id
            LEFT JOIN class_sections cs ON cs.course_id = c.id
            LEFT JOIN students s ON s.course_id = c.id
            LEFT JOIN faculty_sections fs ON fs.section_id = cs.id
            LEFT JOIN departments dept ON dept.id = c.department_id
            {scope_sql}
            GROUP BY c.id, dept.name
            ORDER BY c.name
        """),
        scope_params(current_user),
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
    require_scoped_parent(current_user, data.department_id)
    ensure_department_in_scope(db, current_user, data.department_id)
    if data.total_semesters < 1:
        raise HTTPException(status_code=400, detail="Total semesters must be at least 1")
    if data.duration_years < 1:
        raise HTTPException(status_code=400, detail="Duration must be at least 1 year")
    # Every program follows 2 semesters per academic year — reject any other
    # combination (e.g. 2 semesters over a 2-year duration).
    expected_semesters = data.duration_years * 2
    if data.total_semesters != expected_semesters:
        raise HTTPException(
            status_code=400,
            detail=(
                f"{data.duration_years} year(s) should have {expected_semesters} "
                f"semesters (2 per year), not {data.total_semesters}."
            ),
        )
    existing = db.execute(
        text("SELECT id FROM courses WHERE code = :code"),
        {"code": data.code.strip().upper()},
    ).fetchone()
    if existing:
        raise HTTPException(status_code=409, detail="Course code already exists")

    row = db.execute(
        text("""
            INSERT INTO courses (name, code, total_semesters, duration_years, status, department_id)
            VALUES (:name, :code, :total_semesters, :duration_years, 'active', :department_id)
            RETURNING id
        """),
        {
            "name": data.name.strip(),
            "code": data.code.strip().upper(),
            "total_semesters": data.total_semesters,
            "duration_years": data.duration_years,
            "department_id": data.department_id,
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
                   c.created_at, c.department_id, dept.name AS department_name,
                   0 AS batch_count, 0 AS section_count,
                   0 AS student_count, 0 AS faculty_count
            FROM courses c
            LEFT JOIN departments dept ON dept.id = c.department_id
            WHERE c.id = :course_id
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
    ensure_course_in_scope(db, current_user, course_id)
    ensure_department_in_scope(db, current_user, data.department_id)
    ensure_course(db, course_id)
    if data.status is not None and data.status not in {"active", "inactive"}:
        raise HTTPException(status_code=400, detail="Invalid course status")
    db.execute(
        text("""
            UPDATE courses
            SET name = COALESCE(:name, name),
                status = COALESCE(:status, status),
                department_id = COALESCE(:department_id, department_id)
            WHERE id = :course_id
        """),
        {
            "name": data.name.strip() if data.name else None,
            "status": data.status,
            "department_id": data.department_id,
            "course_id": course_id,
        },
    )
    db.commit()
    row = db.execute(
        text("""
            SELECT c.id, c.name, c.code, c.total_semesters, c.duration_years, c.status,
                   c.created_at, c.department_id, dept.name AS department_name,
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


@admin_router.delete("/courses/{course_id}")
def delete_admin_course(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    ensure_course_in_scope(db, current_user, course_id)
    course = ensure_course(db, course_id)
    # Cascade delete: faculty_sections → student_sections → class_sections → semesters → batches → course
    # Unlink students from this course (set course_id, batch_id, current_section_id to NULL)
    db.execute(
        text("""
            UPDATE students
            SET course_id = NULL, batch_id = NULL,
                current_section_id = NULL, current_semester_number = NULL
            WHERE course_id = :course_id
        """),
        {"course_id": course_id},
    )
    db.execute(
        text("""
            DELETE FROM faculty_sections
            WHERE section_id IN (SELECT id FROM class_sections WHERE course_id = :course_id)
        """),
        {"course_id": course_id},
    )
    db.execute(
        text("""
            DELETE FROM student_sections
            WHERE section_id IN (SELECT id FROM class_sections WHERE course_id = :course_id)
        """),
        {"course_id": course_id},
    )
    db.execute(
        text("DELETE FROM class_sections WHERE course_id = :course_id"),
        {"course_id": course_id},
    )
    db.execute(
        text("DELETE FROM semesters WHERE course_id = :course_id"),
        {"course_id": course_id},
    )
    db.execute(
        text("DELETE FROM batches WHERE course_id = :course_id"),
        {"course_id": course_id},
    )
    db.execute(
        text("DELETE FROM courses WHERE id = :course_id"),
        {"course_id": course_id},
    )
    record_system_event(
        db, current_user["id"], "course_deleted", f"Deleted course {course.name}"
    )
    db.commit()
    return {"status": "deleted", "name": course.name}


@admin_router.delete("/batches/{batch_id}")
def delete_admin_batch(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    ensure_batch_in_scope(db, current_user, batch_id)
    batch = db.execute(text("SELECT id, name FROM batches WHERE id = :id"), {"id": batch_id}).fetchone()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    # Unlink students, then delete the batch's sections and their enrolments.
    db.execute(
        text("UPDATE students SET batch_id = NULL WHERE batch_id = :id"), {"id": batch_id}
    )
    db.execute(
        text("DELETE FROM faculty_sections WHERE section_id IN (SELECT id FROM class_sections WHERE batch_id = :id)"),
        {"id": batch_id},
    )
    db.execute(
        text("DELETE FROM student_sections WHERE section_id IN (SELECT id FROM class_sections WHERE batch_id = :id)"),
        {"id": batch_id},
    )
    db.execute(text("DELETE FROM class_sections WHERE batch_id = :id"), {"id": batch_id})
    db.execute(text("DELETE FROM batches WHERE id = :id"), {"id": batch_id})
    record_system_event(db, current_user["id"], "batch_deleted", f"Deleted batch {batch.name}")
    db.commit()
    return {"status": "deleted", "name": batch.name}


@admin_router.delete("/semesters/{semester_id}")
def delete_admin_semester(
    semester_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    ensure_semester_in_scope(db, current_user, semester_id)
    sem = db.execute(text("SELECT id, name FROM semesters WHERE id = :id"), {"id": semester_id}).fetchone()
    if not sem:
        raise HTTPException(status_code=404, detail="Semester not found")
    # Remove sections + subjects that hang off this semester, then the semester.
    db.execute(
        text("DELETE FROM faculty_sections WHERE section_id IN (SELECT id FROM class_sections WHERE semester_id = :id)"),
        {"id": semester_id},
    )
    db.execute(
        text("DELETE FROM student_sections WHERE section_id IN (SELECT id FROM class_sections WHERE semester_id = :id)"),
        {"id": semester_id},
    )
    db.execute(text("DELETE FROM class_sections WHERE semester_id = :id"), {"id": semester_id})
    db.execute(text("DELETE FROM subjects WHERE semester_id = :id"), {"id": semester_id})
    db.execute(text("DELETE FROM semesters WHERE id = :id"), {"id": semester_id})
    record_system_event(db, current_user["id"], "semester_deleted", f"Deleted semester {sem.name}")
    db.commit()
    return {"status": "deleted", "name": sem.name}


@admin_router.delete("/sections/{section_id}")
def delete_admin_section(
    section_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    ensure_section_in_scope(db, current_user, section_id)
    section = ensure_section(db, section_id)
    section_name = getattr(section, "name", str(section_id))
    # Unlink students whose current section is this one, then drop links + section.
    db.execute(
        text("UPDATE students SET current_section_id = NULL, current_semester_number = NULL WHERE current_section_id = :id"),
        {"id": section_id},
    )
    db.execute(text("DELETE FROM faculty_sections WHERE section_id = :id"), {"id": section_id})
    db.execute(text("DELETE FROM student_sections WHERE section_id = :id"), {"id": section_id})
    db.execute(text("DELETE FROM case_section_assignments WHERE section_id = :id"), {"id": section_id})
    db.execute(text("DELETE FROM class_sections WHERE id = :id"), {"id": section_id})
    record_system_event(db, current_user["id"], "section_deleted", f"Deleted section {section_name}")
    db.commit()
    return {"status": "deleted", "name": section_name}


@admin_router.get("/courses/{course_id}/semesters")
def list_admin_course_semesters(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    ensure_course_in_scope(db, current_user, course_id)
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
    ensure_course_in_scope(db, current_user, course_id)
    course = ensure_course(db, course_id)
    if not data.name.strip():
        raise HTTPException(status_code=400, detail="Batch name is required")
    # Reject nonsensical years outright (e.g. a typo like "2065555").
    if not (1900 <= data.start_year <= 2100) or not (1900 <= data.end_year <= 2100):
        raise HTTPException(status_code=400, detail="Start and end year must be realistic calendar years (1900–2100).")
    if data.end_year < data.start_year:
        raise HTTPException(status_code=400, detail="End year must not be before start year")
    # The batch's year span must match the course's duration exactly.
    span = data.end_year - data.start_year
    if course.duration_years and span != course.duration_years:
        raise HTTPException(
            status_code=400,
            detail=(
                f"This batch spans {span} year(s), but \"{course.name}\" runs for "
                f"{course.duration_years} year(s). Adjust the start/end year."
            ),
        )
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


@admin_router.patch("/batches/{batch_id}")
def update_admin_batch(
    batch_id: int,
    data: AdminBatchUpdate,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    ensure_batch_in_scope(db, current_user, batch_id)
    row = db.execute(
        text("""
            SELECT b.id, b.course_id, b.name, b.start_year, b.end_year, b.status,
                   c.name AS course_name, c.duration_years
            FROM batches b
            JOIN courses c ON c.id = b.course_id
            WHERE b.id = :batch_id
        """),
        {"batch_id": batch_id},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Batch not found")

    name = data.name.strip() if data.name is not None else row.name
    start_year = data.start_year if data.start_year is not None else row.start_year
    end_year = data.end_year if data.end_year is not None else row.end_year
    status = data.status.strip().lower() if data.status is not None else row.status

    if not name:
        raise HTTPException(status_code=400, detail="Batch name is required")
    if not (1900 <= start_year <= 2100) or not (1900 <= end_year <= 2100):
        raise HTTPException(status_code=400, detail="Start and end year must be realistic calendar years (1900–2100).")
    if end_year < start_year:
        raise HTTPException(status_code=400, detail="End year must not be before start year")
    span = end_year - start_year
    if row.duration_years and span != row.duration_years:
        raise HTTPException(
            status_code=400,
            detail=(
                f"This batch spans {span} year(s), but \"{row.course_name}\" runs for "
                f"{row.duration_years} year(s). Adjust the start/end year."
            ),
        )
    if status not in {"active", "completed", "upcoming"}:
        raise HTTPException(status_code=400, detail="Invalid batch status")

    updated = db.execute(
        text("""
            UPDATE batches
            SET name = :name, start_year = :start_year, end_year = :end_year, status = :status
            WHERE id = :batch_id
            RETURNING id, course_id, name, start_year, end_year, status, created_at
        """),
        {
            "batch_id": batch_id,
            "name": name,
            "start_year": start_year,
            "end_year": end_year,
            "status": status,
        },
    ).fetchone()
    record_system_event(db, current_user["id"], "batch_updated", f"Updated batch {name}")
    db.commit()
    return {
        "id": updated.id,
        "course_id": updated.course_id,
        "name": updated.name,
        "start_year": updated.start_year,
        "end_year": updated.end_year,
        "status": updated.status,
        "created_at": str(updated.created_at),
    }


@admin_router.get("/courses/{course_id}/batches")
def list_admin_course_batches(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    ensure_course_in_scope(db, current_user, course_id)
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
    ensure_course_in_scope(db, current_user, course_id)
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
    ensure_course_in_scope(db, current_user, course_id)
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


def section_list_response(
    row: Any, faculty_by_section: Dict[int, List[Dict[str, Any]]]
) -> Dict[str, Any]:
    return {
        "id": row.id,
        "course_id": row.course_id,
        "course_name": row.course_name,
        "batch_id": row.batch_id,
        "batch_name": row.batch_name,
        "name": row.name,
        "academic_year": row.academic_year,
        "status": row.status,
        "semester_number": row.semester_number,
        "semester_name": row.semester_name,
        "student_count": int(row.student_count),
        "faculty_count": int(row.faculty_count),
        "cases_assigned_count": int(row.cases_assigned_count),
        "faculty": faculty_by_section.get(row.id, []),
    }


@admin_router.get("/sections")
def list_admin_sections(
    course_id: Optional[int] = None,
    batch_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)

    where_clauses: List[str] = []
    params: Dict[str, Any] = {}
    if course_id:
        where_clauses.append("cs.course_id = :course_id")
        params["course_id"] = course_id
    if batch_id:
        where_clauses.append("cs.batch_id = :batch_id")
        params["batch_id"] = batch_id
    if status:
        where_clauses.append("cs.status = :status")
        params["status"] = status
    if admin_scope(current_user) is not None:
        where_clauses.append(course_child_in_scope_sql("cs"))
        params.update(scope_params(current_user))
    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

    rows = db.execute(
        text(f"""
            SELECT cs.id, cs.course_id, c.name AS course_name, cs.batch_id, b.name AS batch_name,
                   cs.name, cs.academic_year, cs.status,
                   se.semester_number, se.name AS semester_name,
                   COUNT(DISTINCT ss.student_id) FILTER (WHERE ss.status = 'active') AS student_count,
                   COUNT(DISTINCT fs.faculty_id) AS faculty_count,
                   COUNT(DISTINCT csa.id) FILTER (WHERE csa.status = 'active') AS cases_assigned_count
            FROM class_sections cs
            JOIN courses c ON c.id = cs.course_id
            JOIN semesters se ON se.id = cs.semester_id
            JOIN batches b ON b.id = cs.batch_id
            LEFT JOIN student_sections ss ON ss.section_id = cs.id
            LEFT JOIN faculty_sections fs ON fs.section_id = cs.id
            LEFT JOIN case_section_assignments csa ON csa.section_id = cs.id
            {where_sql}
            GROUP BY cs.id, c.name, b.name, se.semester_number, se.name
            ORDER BY c.name, se.semester_number, b.name, cs.name
        """),
        params,
    ).fetchall()

    section_ids = [row.id for row in rows]
    faculty_by_section: Dict[int, List[Dict[str, Any]]] = {}
    if section_ids:
        faculty_rows = db.execute(
            text("""
                SELECT fs.section_id, fs.faculty_id, u.name AS faculty_name, fs.subject
                FROM faculty_sections fs
                JOIN users u ON u.id = fs.faculty_id
                WHERE fs.section_id = ANY(:section_ids)
                ORDER BY u.name
            """),
            {"section_ids": section_ids},
        ).fetchall()
        for faculty_row in faculty_rows:
            faculty_by_section.setdefault(faculty_row.section_id, []).append(
                {
                    "faculty_id": faculty_row.faculty_id,
                    "faculty_name": faculty_row.faculty_name,
                    "subject": faculty_row.subject,
                }
            )

    return {
        "items": [section_list_response(row, faculty_by_section) for row in rows],
        "total": len(rows),
    }


@admin_router.get("/sections/{section_id}")
def get_admin_section(
    section_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    ensure_section_in_scope(db, current_user, section_id)
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


@admin_router.get("/sections/{section_id}/eligible-students")
def list_admin_section_eligible_students(
    section_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    ensure_section_in_scope(db, current_user, section_id)
    section = ensure_section(db, section_id)
    # A scoped admin only sees students already in this section's course —
    # unplaced students (no course yet) belong to no institute.
    course_sql = (
        "(s.course_id IS NULL OR s.course_id = :course_id)"
        if admin_scope(current_user) is None
        else "s.course_id = :course_id"
    )
    rows = db.execute(
        text(f"""
            SELECT u.id, u.name, u.email
            FROM students s
            JOIN users u ON u.id = s.user_id
            WHERE u.role = 'student' AND u.status = 'active'
              AND s.current_section_id IS NULL
              AND {course_sql}
              AND (s.batch_id IS NULL OR s.batch_id = :batch_id)
            ORDER BY u.name
        """),
        {"course_id": section.course_id, "batch_id": section.batch_id},
    ).fetchall()
    return {"items": [{"id": row.id, "name": row.name, "email": row.email} for row in rows]}


@admin_router.post("/sections/{section_id}/faculty", status_code=201)
def assign_admin_section_faculty(
    section_id: int,
    data: AdminSectionFacultyAssign,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    ensure_section_in_scope(db, current_user, section_id)
    ensure_section(db, section_id)
    if not data.subject.strip():
        raise HTTPException(status_code=400, detail="Subject is required")
    if admin_scope(current_user) is not None:
        guard_target_user(db, current_user, data.faculty_id)
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
    ensure_section_in_scope(db, current_user, section_id)
    ensure_section(db, section_id)
    if not data.student_user_ids:
        raise HTTPException(status_code=400, detail="At least one student is required")
    results = []
    for student_user_id in data.student_user_ids:
        if admin_scope(current_user) is not None:
            guard_target_user(db, current_user, student_user_id)
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


@admin_router.delete("/sections/{section_id}/faculty/{faculty_id}")
def remove_admin_section_faculty(
    section_id: int,
    faculty_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    ensure_section_in_scope(db, current_user, section_id)
    ensure_section(db, section_id)
    removed = db.execute(
        text("""
            DELETE FROM faculty_sections
            WHERE section_id = :section_id AND faculty_id = :faculty_id
            RETURNING id
        """),
        {"section_id": section_id, "faculty_id": faculty_id},
    ).fetchall()
    if not removed:
        raise HTTPException(status_code=404, detail="Faculty is not assigned to this section")
    record_system_event(
        db,
        current_user["id"],
        "faculty_removed_section",
        f"Removed faculty {faculty_id} from section {section_id}",
    )
    db.commit()
    return {"removed_count": len(removed)}


@admin_router.delete("/sections/{section_id}/students/{student_id}")
def remove_admin_section_student(
    section_id: int,
    student_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    ensure_section_in_scope(db, current_user, section_id)
    ensure_section(db, section_id)
    removed = db.execute(
        text("""
            UPDATE student_sections SET status = 'removed'
            WHERE section_id = :section_id AND student_id = :student_id AND status = 'active'
            RETURNING id
        """),
        {"section_id": section_id, "student_id": student_id},
    ).fetchone()
    if not removed:
        raise HTTPException(status_code=404, detail="Student is not enrolled in this section")
    db.execute(
        text("""
            UPDATE students
            SET current_section_id = NULL, current_semester_number = NULL
            WHERE id = :student_id AND current_section_id = :section_id
        """),
        {"student_id": student_id, "section_id": section_id},
    )
    record_system_event(
        db,
        current_user["id"],
        "student_removed_section",
        f"Removed student {student_id} from section {section_id}",
    )
    db.commit()
    return {"removed": True}


@admin_router.post("/sections/{section_id}/students/bulk")
async def bulk_enroll_admin_section_students(
    section_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    ensure_section_in_scope(db, current_user, section_id)
    ensure_section(db, section_id)
    raw = await file.read()
    try:
        decoded = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File must be UTF-8 encoded CSV")

    reader = csv.DictReader(io.StringIO(decoded))
    fieldnames = {(name or "").strip() for name in (reader.fieldnames or [])}
    if "Email" not in fieldnames:
        raise HTTPException(status_code=400, detail="CSV must include an Email column")

    enrolled: List[Dict[str, Any]] = []
    errors: List[Dict[str, Any]] = []
    for line_number, raw_row in enumerate(reader, start=2):
        row = {(key or "").strip(): (value or "").strip() for key, value in raw_row.items()}
        email = row.get("Email", "").lower()
        try:
            with db.begin_nested():
                if not email:
                    raise ValueError("Email is required")
                user_row = db.execute(
                    text("SELECT id FROM users WHERE email = :email AND role = 'student'"),
                    {"email": email},
                ).fetchone()
                if not user_row:
                    raise ValueError("No student account found for this email")
                student = get_student_for_user(db, user_row.id)
                enroll_student_in_section(db, student.id, section_id, current_user["id"])
            enrolled.append({"row": line_number, "email": email})
        except (ValueError, HTTPException) as exc:
            detail = exc.detail if isinstance(exc, HTTPException) else str(exc)
            errors.append({"row": line_number, "email": email, "error": detail})

    if enrolled:
        record_system_event(
            db,
            current_user["id"],
            "students_bulk_enrolled_section",
            f"Bulk-enrolled {len(enrolled)} student(s) into section {section_id} via CSV "
            f"({len(errors)} error(s))",
        )
    db.commit()
    return {
        "enrolled": enrolled,
        "enrolled_count": len(enrolled),
        "errors": errors,
        "error_count": len(errors),
    }


class AdminAddStudent(BaseModel):
    section_id: int
    name: str
    scholar_number: str
    email: Optional[str] = None
    # Optional; blank falls back to the scholar number. Must be changed at
    # first login either way.
    temporary_password: Optional[str] = None


@admin_router.post("/students/add", status_code=201)
def admin_add_student(
    data: AdminAddStudent,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Create a student login and enroll them into a section (admin-driven).
    The initial password is the admin's temporary password if given, else the
    scholar number; the student is forced to change it on first login."""
    require_admin(current_user)
    ensure_section_in_scope(db, current_user, data.section_id)
    ensure_section(db, data.section_id)
    name = data.name.strip()
    scholar = data.scholar_number.strip()
    if not name or not scholar:
        raise HTTPException(status_code=400, detail="Name and scholar number are required")
    # Same rules the student's own change-password screen enforces.
    temporary_password = data.temporary_password or None
    if temporary_password is not None:
        if temporary_password != temporary_password.strip():
            raise HTTPException(status_code=400, detail="Temporary password cannot start or end with a space.")
        if len(temporary_password) < 8:
            raise HTTPException(status_code=400, detail="Temporary password must be at least 8 characters.")
        if len(temporary_password.encode("utf-8")) > 72:
            raise HTTPException(status_code=400, detail="Temporary password is too long (max 72 bytes).")

    # Reuse the faculty create+enroll helper (lazy import avoids any import cycle).
    from services.faculty.router import _create_and_enroll_student

    try:
        result = _create_and_enroll_student(
            db, current_user["id"], data.section_id, name, scholar, data.email,
            temporary_password=temporary_password,
        )
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))
    record_system_event(
        db,
        current_user["id"],
        "student_added_section",
        f"Added student {name} to section {data.section_id}",
    )
    db.commit()
    return result


@admin_router.post("/students/bulk-import")
async def admin_bulk_import_students(
    section_id: int = Query(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Create + enroll many students into a section from a CSV (columns: Name,
    MBA/ PGDM, Semester, Scholar ID, Mobile Number, Email ID). MBA/PGDM and
    Semester must match the section selected above (which already implies a
    course and semester) — if ANY row disagrees, the whole file is rejected
    upfront and nothing is imported, rather than silently enrolling the rest
    into the wrong section."""
    require_admin(current_user)
    ensure_section_in_scope(db, current_user, section_id)
    section = db.execute(
        text("""
            SELECT cs.id, c.name AS course_name, se.semester_number
            FROM class_sections cs
            JOIN courses c ON c.id = cs.course_id
            JOIN semesters se ON se.id = cs.semester_id
            WHERE cs.id = :section_id
        """),
        {"section_id": section_id},
    ).fetchone()
    if not section:
        raise HTTPException(status_code=404, detail="Class section not found")
    raw = await file.read()
    try:
        decoded = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File must be UTF-8 encoded CSV")

    from services.faculty.router import _create_and_enroll_student

    reader = csv.DictReader(io.StringIO(decoded))
    parsed_rows: List[Dict[str, Any]] = []
    mismatches: List[Dict[str, Any]] = []
    for i, raw_row in enumerate(reader, start=2):
        row = {(k or "").strip().lower(): (v or "").strip() for k, v in raw_row.items()}
        name = row.get("name", "")
        scholar = (
            row.get("scholar id")
            or row.get("scholar_number")
            or row.get("scholar")
            or row.get("roll_number", "")
        )
        email = row.get("email id") or row.get("email") or None
        mobile_number = row.get("mobile number") or row.get("mobile_number") or None
        course_value = row.get("mba/ pgdm") or row.get("mba/pgdm") or row.get("course") or ""
        semester_value = row.get("semester") or ""
        if not name and not scholar:
            continue

        if course_value and course_value.strip().lower() != section.course_name.strip().lower():
            mismatches.append(
                {
                    "row": i,
                    "name": name or scholar,
                    "reason": (
                        f'"{course_value}" does not match the selected section\'s '
                        f'course ({section.course_name})'
                    ),
                }
            )
            continue
        semester_digits = "".join(ch for ch in semester_value if ch.isdigit())
        if semester_value and (
            not semester_digits or int(semester_digits) != section.semester_number
        ):
            mismatches.append(
                {
                    "row": i,
                    "name": name or scholar,
                    "reason": (
                        f'"{semester_value}" does not match the selected section\'s '
                        f'semester ({section.semester_number})'
                    ),
                }
            )
            continue

        parsed_rows.append(
            {"row": i, "name": name, "scholar": scholar, "email": email, "mobile": mobile_number}
        )

    if mismatches:
        raise HTTPException(
            status_code=400,
            detail={
                "message": (
                    "Upload rejected: some rows don't match the selected section's "
                    "course/semester. Fix these rows and re-upload the whole file."
                ),
                "mismatches": mismatches,
            },
        )

    created: List[Dict[str, Any]] = []
    skipped: List[Dict[str, Any]] = []
    for parsed in parsed_rows:
        i, name, scholar, email, mobile_number = (
            parsed["row"],
            parsed["name"],
            parsed["scholar"],
            parsed["email"],
            parsed["mobile"],
        )
        try:
            created.append(
                _create_and_enroll_student(
                    db, current_user["id"], section_id, name, scholar, email, mobile_number
                )
            )
            db.commit()
        except (ValueError, HTTPException) as exc:
            db.rollback()
            reason = exc.detail if isinstance(exc, HTTPException) else str(exc)
            skipped.append({"row": i, "name": name or scholar, "reason": reason})

    if created:
        record_system_event(
            db,
            current_user["id"],
            "students_bulk_added_section",
            f"Added {len(created)} student(s) to section {section_id} via CSV "
            f"({len(skipped)} skipped)",
        )
        db.commit()
    return {
        "created": created,
        "skipped": skipped,
        "created_count": len(created),
        "skipped_count": len(skipped),
    }


@admin_router.post("/batches/{batch_id}/advance-semester")
def advance_batch_semester(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    ensure_batch_in_scope(db, current_user, batch_id)
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


# ---------------------------------------------------------------------------
# Central Admin (superadmin): admins and institute onboarding
# ---------------------------------------------------------------------------

class AdminInstitutionsSet(BaseModel):
    institution_ids: List[int]


class AdminOnboardInstitution(BaseModel):
    institution_name: str
    institution_code: str
    admin_name: str
    admin_email: EmailStr


def admin_account_response(db: Session, user_id: int) -> Dict[str, Any]:
    row = db.execute(
        text("""
            SELECT u.id, u.name, u.email, u.role, COALESCE(u.status, 'active') AS status,
                   u.admin_unrestricted, u.last_login_at, u.created_at,
                   COALESCE((
                       SELECT json_agg(json_build_object('id', i.id, 'name', i.name, 'code', i.code)
                                       ORDER BY i.name)
                       FROM admin_institutions ai JOIN institutions i ON i.id = ai.institution_id
                       WHERE ai.admin_id = u.id
                   ), '[]'::json) AS institutions
            FROM users u
            WHERE u.id = :id
        """),
        {"id": user_id},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Admin not found")
    return {
        "id": row.id,
        "name": row.name,
        "email": row.email,
        "role": row.role,
        "status": row.status,
        "admin_unrestricted": row.role == "superadmin" or bool(row.admin_unrestricted),
        "last_login_at": str(row.last_login_at) if row.last_login_at else None,
        "created_at": str(row.created_at),
        "institutions": row.institutions or [],
    }


@admin_router.get("/admins")
def list_admin_accounts(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Every admin and Central Admin with the institutes they own."""
    require_superadmin(current_user)
    ids = db.execute(
        text("""
            SELECT id FROM users
            WHERE role IN ('admin', 'superadmin')
            ORDER BY CASE role WHEN 'superadmin' THEN 0 ELSE 1 END, name
        """)
    ).fetchall()
    items = [admin_account_response(db, row.id) for row in ids]
    return {"items": items, "total": len(items)}


@admin_router.put("/users/{user_id}/institutions")
def set_admin_institutions(
    user_id: int,
    data: AdminInstitutionsSet,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Replace the set of institutes an admin owns."""
    require_superadmin(current_user)
    admin = ensure_admin_account(db, user_id)
    institution_ids = sorted(set(data.institution_ids))
    if institution_ids:
        found = db.execute(
            text("SELECT COUNT(*) FROM institutions WHERE id = ANY(CAST(:ids AS INTEGER[]))"),
            {"ids": institution_ids},
        ).scalar()
        if found != len(institution_ids):
            raise HTTPException(status_code=404, detail="Institution not found")
    db.execute(text("DELETE FROM admin_institutions WHERE admin_id = :id"), {"id": user_id})
    for institution_id in institution_ids:
        link_admin_to_institution(db, user_id, institution_id)
    record_system_event(
        db,
        current_user["id"],
        "admin_institutions_changed",
        f"Set institutes for admin {admin.name} ({len(institution_ids)} linked)",
    )
    db.commit()
    return admin_account_response(db, user_id)


@admin_router.post("/institutions/onboard", status_code=201)
def onboard_institution(
    data: AdminOnboardInstitution,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Create an institute and its first admin in one transaction, then email
    the admin a set-password link. If anything fails, nothing is saved."""
    require_superadmin(current_user)
    admin_name = data.admin_name.strip()
    admin_email = str(data.admin_email).lower()
    if not admin_name:
        raise HTTPException(status_code=400, detail="Admin name is required")
    if db.execute(text("SELECT id FROM users WHERE LOWER(email) = :email"), {"email": admin_email}).fetchone():
        raise HTTPException(status_code=400, detail="Email already registered")
    try:
        institution = insert_institution(db, current_user, data.institution_name, data.institution_code)
        admin = db.execute(
            text("""
                INSERT INTO users (name, email, password_hash, role, status, updated_at)
                VALUES (:name, :email, :password_hash, 'admin', 'active', NOW())
                RETURNING id, name, email
            """),
            {
                "name": admin_name,
                "email": admin_email,
                # Unusable until the admin sets their own password from the invite.
                "password_hash": hash_password(secrets.token_urlsafe(48)),
            },
        ).fetchone()
        link_admin_to_institution(db, admin.id, institution.id)
        record_system_event(
            db,
            current_user["id"],
            "institution_onboarded",
            f"Onboarded {institution.name} with admin {admin.name}",
        )
        db.commit()
    except Exception:
        db.rollback()
        raise
    # Email after the commit, so a mail failure can't undo the onboarding;
    # the admin can always be re-sent a link with "Reset password".
    email_sent = send_onboarding_email(db, request, admin, "admin")
    db.commit()
    return {
        "institution": institution_response(institution),
        "admin": admin_account_response(db, admin.id),
        "email_sent": email_sent,
    }
