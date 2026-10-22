"""Admin roles and institute scoping.

Three kinds of admin user:

- superadmin (Central Admin): everything, across all institutes.
- admin with admin_unrestricted = TRUE: every admin that existed before
  migration 0032. Behaves exactly as admins always have (platform-wide).
- admin with admin_unrestricted = FALSE (a "scoped" admin): only sees and
  manages the institutes they own (admin_institutions).

`admin_scope(user)` returns None for the first two (no filtering at all, so
their queries are unchanged) and the list of owned institution ids for a
scoped admin (possibly empty -> they see nothing yet).

The SQL helpers below return a fragment that is TRUE when a row belongs to one
of the scoped admin's institutes; they always bind the ids as :scope_ids.
"""

from typing import Any, Dict, List, Optional

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

ADMIN_ROLES = ("admin", "superadmin")


def is_admin_role(current_user: Optional[Dict[str, Any]]) -> bool:
    return bool(current_user) and current_user.get("role") in ADMIN_ROLES


def is_superadmin(current_user: Dict[str, Any]) -> bool:
    return current_user.get("role") == "superadmin"


def require_admin(current_user: Dict[str, Any]) -> None:
    if not is_admin_role(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")


def require_superadmin(current_user: Dict[str, Any]) -> None:
    if not is_superadmin(current_user):
        raise HTTPException(status_code=403, detail="Central Admin access required")


def admin_scope(current_user: Dict[str, Any]) -> Optional[List[int]]:
    """None = no institute filter (superadmin / unrestricted admin);
    a list = only these institutes (scoped admin)."""
    if is_superadmin(current_user) or current_user.get("admin_unrestricted"):
        return None
    return list(current_user.get("institution_ids") or [])


def is_scoped(current_user: Dict[str, Any]) -> bool:
    return admin_scope(current_user) is not None


def can_manage_platform(current_user: Dict[str, Any]) -> bool:
    """Platform-wide settings and creating admins: superadmin and
    unrestricted (pre-existing) admins only."""
    return admin_scope(current_user) is None


def require_platform_admin(current_user: Dict[str, Any]) -> None:
    require_admin(current_user)
    if not can_manage_platform(current_user):
        raise HTTPException(
            status_code=403,
            detail="This setting applies to every institute — only the Central Admin can change it",
        )


def scope_params(current_user: Dict[str, Any]) -> Dict[str, Any]:
    scope = admin_scope(current_user)
    return {} if scope is None else {"scope_ids": scope}


# ---------------------------------------------------------------------------
# SQL fragments: "this row belongs to one of :scope_ids"
# ---------------------------------------------------------------------------

def institution_in_scope_sql(alias: str = "i") -> str:
    return f"{alias}.id = ANY(CAST(:scope_ids AS INTEGER[]))"


def department_in_scope_sql(alias: str = "d") -> str:
    return f"{alias}.institution_id = ANY(CAST(:scope_ids AS INTEGER[]))"


def _course_in_scope(course_col: str) -> str:
    return (
        f"{course_col} IN (SELECT sc.id FROM courses sc JOIN departments sd ON sd.id = sc.department_id "
        f"WHERE sd.institution_id = ANY(CAST(:scope_ids AS INTEGER[])))"
    )


def course_in_scope_sql(alias: str = "c") -> str:
    return _course_in_scope(f"{alias}.id")


def course_child_in_scope_sql(alias: str) -> str:
    """batches / semesters / class_sections — anything with a course_id."""
    return _course_in_scope(f"{alias}.course_id")


def subject_in_scope_sql(alias: str = "s") -> str:
    return (
        f"({alias}.department_id IN (SELECT sd.id FROM departments sd WHERE sd.institution_id = ANY(CAST(:scope_ids AS INTEGER[]))) "
        f"OR {_course_in_scope(f'{alias}.course_id')})"
    )


def user_in_scope_sql(alias: str = "u") -> str:
    """Students via their course; faculty via faculty_scope or the sections
    they teach. Admins/superadmins are never in a scoped admin's view."""
    return f"""(
        ({alias}.role = 'student' AND EXISTS (
            SELECT 1 FROM students ss WHERE ss.user_id = {alias}.id AND {_course_in_scope('ss.course_id')}
        ))
        OR ({alias}.role = 'faculty' AND (
            EXISTS (SELECT 1 FROM faculty_scope fsc
                    WHERE fsc.faculty_id = {alias}.id AND fsc.institution_id = ANY(CAST(:scope_ids AS INTEGER[])))
            OR EXISTS (SELECT 1 FROM faculty_sections ffs JOIN class_sections fcs ON fcs.id = ffs.section_id
                       WHERE ffs.faculty_id = {alias}.id AND {_course_in_scope('fcs.course_id')})
        ))
    )"""


# ---------------------------------------------------------------------------
# Per-row checks for /{id} endpoints: 404 when outside the admin's scope, so a
# scoped admin can't even confirm another institute's row exists.
# ---------------------------------------------------------------------------

def _ensure(db: Session, current_user: Dict[str, Any], sql: str, row_id: Optional[int], label: str) -> None:
    scope = admin_scope(current_user)
    if scope is None or row_id is None:
        return
    found = db.execute(text(sql), {"row_id": row_id, "scope_ids": scope}).fetchone()
    if not found:
        raise HTTPException(status_code=404, detail=f"{label} not found")


def ensure_institution_in_scope(db: Session, current_user: Dict[str, Any], institution_id: Optional[int]) -> None:
    _ensure(db, current_user, f"SELECT 1 FROM institutions i WHERE i.id = :row_id AND {institution_in_scope_sql('i')}",
            institution_id, "Institution")


def ensure_department_in_scope(db: Session, current_user: Dict[str, Any], department_id: Optional[int]) -> None:
    _ensure(db, current_user, f"SELECT 1 FROM departments d WHERE d.id = :row_id AND {department_in_scope_sql('d')}",
            department_id, "Department")


def ensure_course_in_scope(db: Session, current_user: Dict[str, Any], course_id: Optional[int]) -> None:
    _ensure(db, current_user, f"SELECT 1 FROM courses c WHERE c.id = :row_id AND {course_in_scope_sql('c')}",
            course_id, "Course")


def ensure_batch_in_scope(db: Session, current_user: Dict[str, Any], batch_id: Optional[int]) -> None:
    _ensure(db, current_user, f"SELECT 1 FROM batches b WHERE b.id = :row_id AND {course_child_in_scope_sql('b')}",
            batch_id, "Batch")


def ensure_semester_in_scope(db: Session, current_user: Dict[str, Any], semester_id: Optional[int]) -> None:
    _ensure(db, current_user, f"SELECT 1 FROM semesters se WHERE se.id = :row_id AND {course_child_in_scope_sql('se')}",
            semester_id, "Semester")


def ensure_section_in_scope(db: Session, current_user: Dict[str, Any], section_id: Optional[int]) -> None:
    _ensure(db, current_user, f"SELECT 1 FROM class_sections cs WHERE cs.id = :row_id AND {course_child_in_scope_sql('cs')}",
            section_id, "Class section")


def ensure_subject_in_scope(db: Session, current_user: Dict[str, Any], subject_id: Optional[int]) -> None:
    _ensure(db, current_user, f"SELECT 1 FROM subjects s WHERE s.id = :row_id AND {subject_in_scope_sql('s')}",
            subject_id, "Subject")


def ensure_user_in_scope(db: Session, current_user: Dict[str, Any], user_id: Optional[int]) -> None:
    _ensure(db, current_user, f"SELECT 1 FROM users u WHERE u.id = :row_id AND {user_in_scope_sql('u')}",
            user_id, "User")


def ensure_faculty_section_in_scope(db: Session, current_user: Dict[str, Any], selection_id: Optional[int]) -> None:
    _ensure(
        db, current_user,
        f"SELECT 1 FROM faculty_sections fs JOIN class_sections cs ON cs.id = fs.section_id "
        f"WHERE fs.id = :row_id AND {course_child_in_scope_sql('cs')}",
        selection_id, "Teaching assignment",
    )


def ensure_institution_ids_in_scope(current_user: Dict[str, Any], institution_ids: List[int]) -> None:
    """For creates that name institutes in the body (e.g. faculty scope)."""
    scope = admin_scope(current_user)
    if scope is None:
        return
    outside = [i for i in institution_ids if i not in scope]
    if outside:
        raise HTTPException(status_code=403, detail="You can only use your own institutes")


def guard_target_user(db: Session, current_user: Dict[str, Any], user_id: int) -> None:
    """Before acting on another user account:
    - nobody but a superadmin may touch a superadmin account;
    - a scoped admin may only touch students/faculty of their institutes."""
    target = db.execute(text("SELECT role FROM users WHERE id = :id"), {"id": user_id}).fetchone()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.role == "superadmin" and not is_superadmin(current_user):
        raise HTTPException(status_code=403, detail="Only the Central Admin can manage this account")
    ensure_user_in_scope(db, current_user, user_id)


def ensure_not_last_superadmin(db: Session, user_id: int) -> None:
    """Call before demoting / deactivating / deleting user_id."""
    target = db.execute(
        text("SELECT role, COALESCE(status, 'active') AS status FROM users WHERE id = :id"), {"id": user_id}
    ).fetchone()
    if not target or target.role != "superadmin":
        return
    others = db.execute(
        text("""
            SELECT COUNT(*) FROM users
            WHERE role = 'superadmin' AND COALESCE(status, 'active') = 'active' AND id <> :id
        """),
        {"id": user_id},
    ).scalar() or 0
    if others == 0:
        raise HTTPException(status_code=400, detail="This is the last Central Admin — it can't be removed or demoted")


def link_admin_to_institution(db: Session, admin_id: int, institution_id: int) -> None:
    db.execute(
        text("""
            INSERT INTO admin_institutions (admin_id, institution_id)
            VALUES (:a, :i)
            ON CONFLICT (admin_id, institution_id) DO NOTHING
        """),
        {"a": admin_id, "i": institution_id},
    )
