import csv
import io
import secrets
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile
from pydantic import BaseModel, EmailStr
from sqlalchemy import text
from sqlalchemy.orm import Session

from services.auth.service import get_current_user, hash_password
from shared.cache import cache_get, cache_set
from shared.database import get_db

admin_router = APIRouter(prefix="/admin", tags=["admin"])

VALID_ROLES = {"student", "faculty", "admin"}
VALID_STATUSES = {"active", "inactive"}


class AdminUserCreate(BaseModel):
    name: str
    email: EmailStr
    role: str
    program: Optional[str] = None
    specialization: Optional[str] = None
    admission_year: Optional[int] = None
    career_track_id: Optional[int] = None
    section_id: Optional[int] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    employee_id: Optional[str] = None
    experience_years: Optional[int] = None
    college_id: Optional[str] = None


class AdminUserStatusUpdate(BaseModel):
    status: str


class AdminUserRoleUpdate(BaseModel):
    role: str


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

    total = 0
    rows = db.execute(
        text(f"""
            SELECT u.id, u.name, u.email, u.role, u.program, u.specialization,
                   u.admission_year, u.status, u.last_login_at, u.created_at, u.updated_at,
                   u.department, u.designation, u.employee_id, u.experience_years,
                   u.college_id,
                   COALESCE(sub.course_name, NULL) AS course_name,
                   COALESCE(sub.batch_name, NULL) AS batch_name,
                   COALESCE(sub.section_name, NULL) AS section_name,
                   COALESCE(fac_sub.sections_teaching, 0) AS sections_teaching,
                   COUNT(*) OVER() AS _total
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


@admin_router.post("/users", status_code=201)
def create_admin_user(
    data: AdminUserCreate,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    role = normalize_role(data.role)
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
                admission_year, department, designation, employee_id,
                experience_years, college_id, status, updated_at
            )
            VALUES (
                :name, :email, :password_hash, :role, :program, :specialization,
                :admission_year, :department, :designation, :employee_id,
                :experience_years, :college_id, 'active', NOW()
            )
            RETURNING id, name, email, role, program, specialization,
                      admission_year, department, designation, employee_id,
                      experience_years, college_id, status, last_login_at,
                      created_at, updated_at
        """),
        {
            "name": data.name.strip(),
            "email": str(data.email).lower(),
            "password_hash": hash_password(temporary_secret),
            "role": role,
            "program": data.program.strip() if data.program else None,
            "specialization": data.specialization.strip() if data.specialization else None,
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
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
    forced_role = role.strip().lower() if role else ""
    if forced_role and forced_role not in ("student", "faculty"):
        raise HTTPException(status_code=400, detail="Role parameter must be 'student' or 'faculty'")
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

                admission_year_raw = row.get("AdmissionYear")
                admission_year = (
                    int(admission_year_raw)
                    if admission_year_raw and admission_year_raw.isdigit()
                    else None
                )

                specialization = row.get("Specialization") or None
                department = row.get("Department") or None
                designation = row.get("Designation") or None
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
                            name, email, password_hash, role, program,
                            specialization, admission_year, department,
                            designation, employee_id, experience_years,
                            college_id, status, updated_at
                        )
                        VALUES (
                            :name, :email, :password_hash, :role, :program,
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
    program: Optional[str] = None
    specialization: Optional[str] = None
    admission_year: Optional[int] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    employee_id: Optional[str] = None
    experience_years: Optional[int] = None
    college_id: Optional[str] = None


@admin_router.patch("/users/{user_id}")
def update_admin_user(
    user_id: int,
    data: AdminUserUpdate,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)

    sets: List[str] = []
    params: Dict[str, Any] = {"user_id": user_id}

    if data.name is not None:
        if not data.name.strip():
            raise HTTPException(status_code=400, detail="Name cannot be empty")
        sets.append("name = :name")
        params["name"] = data.name.strip()
    if data.program is not None:
        sets.append("program = :program")
        params["program"] = data.program.strip() or None
    if data.specialization is not None:
        sets.append("specialization = :specialization")
        params["specialization"] = data.specialization.strip() or None
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
            RETURNING id, name, email, role, program, specialization,
                      admission_year, department, designation, employee_id,
                      experience_years, college_id, status, last_login_at,
                      created_at, updated_at
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
    return user_response(row)


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


@admin_router.delete("/courses/{course_id}")
def delete_admin_course(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
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
    section = ensure_section(db, section_id)
    rows = db.execute(
        text("""
            SELECT u.id, u.name, u.email
            FROM students s
            JOIN users u ON u.id = s.user_id
            WHERE u.role = 'student' AND u.status = 'active'
              AND s.current_section_id IS NULL
              AND (s.course_id IS NULL OR s.course_id = :course_id)
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


@admin_router.delete("/sections/{section_id}/faculty/{faculty_id}")
def remove_admin_section_faculty(
    section_id: int,
    faculty_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_admin(current_user)
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
