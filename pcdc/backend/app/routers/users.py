import re
import secrets
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..config import settings
from ..db import get_db
from ..models import User, Subject, MentorSubject, StudentSubject, CustomUserField
from ..schemas import (
    MentorInviteIn, StudentInviteIn, StudentImportRow, UserOut, UserUpdateIn,
    BulkImportIn, CustomFieldIn, CustomFieldOut, InviteLinkOut, AssignDeptIn,
)
from ..security import require_role, hash_pw

router = APIRouter(prefix="/api", tags=["users"])
admin_only = require_role("admin")
admin_or_mentor = require_role("admin", "mentor")

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
# PATCH may only set these; pending/accepted/revoked are reached via invite/accept/revoke actions.
TOGGLE_STATUS = ("active", "inactive")


def _temp_password() -> str:
    return secrets.token_urlsafe(8)  # placeholder until the user sets one on accept


def _new_invitation(u: User) -> None:
    """Mark a user as freshly invited: pending status + new single-use link token."""
    u.status = "pending"
    u.invitation_token = secrets.token_urlsafe(24)
    u.invited_at = datetime.utcnow()
    u.accepted_at = None
    u.must_reset_pw = True


def _invite_link(token: str) -> str:
    return f"{(settings.APP_URL or '').strip().rstrip('/')}/invitations/accept?token={token}"


def slugify_key(label: str) -> str:
    k = re.sub(r"[^a-z0-9]+", "_", label.strip().lower()).strip("_")
    return k or "field"


def _mentor_subject_ids(db: Session, user: User) -> list[int]:
    return [r[0] for r in db.query(MentorSubject.subject_id).filter(MentorSubject.mentor_id == user.id).all()]


def _dept_map(db: Session, role: str) -> dict[int, list[str]]:
    """user_id -> [department (subject) names] from the role's mapping table."""
    if role == "mentor":
        rows = db.query(MentorSubject.mentor_id, Subject.name).join(Subject, Subject.id == MentorSubject.subject_id).all()
    else:
        rows = db.query(StudentSubject.student_id, Subject.name).join(Subject, Subject.id == StudentSubject.subject_id).all()
    out: dict[int, list[str]] = {}
    for uid, name in rows:
        out.setdefault(uid, []).append(name)
    return out


def _to_out(u: User, depts: list[str]) -> UserOut:
    o = UserOut.model_validate(u)
    o.departments = depts
    return o


def _depts_for(db: Session, u: User) -> list[str]:
    if u.role == "mentor":
        rows = db.query(Subject.name).join(MentorSubject, MentorSubject.subject_id == Subject.id).filter(MentorSubject.mentor_id == u.id).all()
    elif u.role == "student":
        rows = db.query(Subject.name).join(StudentSubject, StudentSubject.subject_id == Subject.id).filter(StudentSubject.student_id == u.id).all()
    else:
        rows = []
    return [r[0] for r in rows]


# ---- Edit / activate-deactivate / delete a user ----
@router.patch("/users/{uid}", response_model=UserOut)
def update_user(uid: int, body: UserUpdateIn, db: Session = Depends(get_db), _: User = Depends(admin_only)):
    u = db.get(User, uid)
    if not u:
        raise HTTPException(404, "User not found")
    if u.role == "admin":
        raise HTTPException(400, "Admin accounts are managed separately")
    if body.status is not None:
        if body.status not in TOGGLE_STATUS:
            raise HTTPException(400, "Only active/inactive can be set here; use invite/revoke for invitations")
        if u.status in ("pending", "revoked"):
            raise HTTPException(400, "This user hasn't accepted their invitation yet")
    for field in ("full_name", "phone", "status", "college_id", "program", "batch",
                  "employee_id", "designation", "qualification", "experience"):
        val = getattr(body, field)
        if val is not None:
            setattr(u, field, val.strip() if isinstance(val, str) else val)
    # replace department mapping if provided
    if body.subject_ids is not None:
        if u.role == "mentor":
            db.query(MentorSubject).filter(MentorSubject.mentor_id == uid).delete()
            for sid in body.subject_ids:
                if db.get(Subject, sid):
                    db.add(MentorSubject(mentor_id=uid, subject_id=sid))
        elif u.role == "student":
            new_sid = body.subject_ids[0] if body.subject_ids else None
            existing = db.query(StudentSubject).filter(StudentSubject.student_id == uid).first()
            if new_sid and (not existing or existing.subject_id != new_sid):
                if not db.get(Subject, new_sid):
                    raise HTTPException(400, "Unknown department")
                db.query(StudentSubject).filter(StudentSubject.student_id == uid).delete()
                db.add(StudentSubject(student_id=uid, subject_id=new_sid, current_level=1))
    db.commit(); db.refresh(u)
    return _to_out(u, _depts_for(db, u))


@router.delete("/users/{uid}", status_code=204)
def delete_user(uid: int, db: Session = Depends(get_db), me: User = Depends(admin_only)):
    u = db.get(User, uid)
    if not u:
        raise HTTPException(404, "User not found")
    if u.role == "admin":
        raise HTTPException(400, "Admin accounts cannot be deleted here")
    # clean up mappings and any Head-of-Department references
    db.query(MentorSubject).filter(MentorSubject.mentor_id == uid).delete()
    db.query(StudentSubject).filter(StudentSubject.student_id == uid).delete()
    db.query(Subject).filter(Subject.head_id == uid).update({"head_id": None})
    db.delete(u); db.commit()


# ---- Invitation lifecycle actions ----
@router.post("/users/{uid}/revoke", response_model=UserOut)
def revoke_invitation(uid: int, db: Session = Depends(get_db), _: User = Depends(admin_only)):
    """Expire a pending invitation: the link stops working and access is denied."""
    u = db.get(User, uid)
    if not u:
        raise HTTPException(404, "User not found")
    if u.status != "pending":
        raise HTTPException(400, "Only a pending invitation can be revoked")
    u.status = "revoked"
    u.invitation_token = None          # link no longer validates
    db.commit(); db.refresh(u)
    return _to_out(u, _depts_for(db, u))


@router.post("/users/{uid}/resend-invite", response_model=InviteLinkOut)
def resend_invite(uid: int, db: Session = Depends(get_db), _: User = Depends(admin_only)):
    """(Re)send an invitation — issues a fresh link for a pending or revoked user."""
    u = db.get(User, uid)
    if not u:
        raise HTTPException(404, "User not found")
    if u.status not in ("pending", "revoked"):
        raise HTTPException(400, "Only pending or revoked users can be re-invited")
    _new_invitation(u)
    db.commit()
    return InviteLinkOut(invite_link=_invite_link(u.invitation_token))


@router.get("/users/{uid}/invite-link", response_model=InviteLinkOut)
def get_invite_link(uid: int, db: Session = Depends(get_db), _: User = Depends(admin_only)):
    u = db.get(User, uid)
    if not u or u.status != "pending" or not u.invitation_token:
        raise HTTPException(404, "No active invitation for this user")
    return InviteLinkOut(invite_link=_invite_link(u.invitation_token))


# ---- Mentors ----
@router.get("/mentors", response_model=list[UserOut])
def list_mentors(db: Session = Depends(get_db), _: User = Depends(admin_only)):
    dm = _dept_map(db, "mentor")
    users = db.query(User).filter(User.role == "mentor").order_by(User.id).all()
    return [_to_out(u, dm.get(u.id, [])) for u in users]


@router.post("/mentors/invite", response_model=UserOut, status_code=201)
def invite_mentor(body: MentorInviteIn, db: Session = Depends(get_db), _: User = Depends(admin_only)):
    email = body.email.strip().lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(409, "A user with this email already exists")
    m = User(full_name=body.full_name.strip(), email=email,
             password_hash=hash_pw(_temp_password()), role="mentor",
             phone=body.phone, employee_id=body.employee_id,
             designation=body.designation, qualification=body.qualification,
             experience=body.experience)
    _new_invitation(m)
    db.add(m); db.flush()
    depts = []
    for sid in body.subject_ids:
        s = db.get(Subject, sid)
        if s:
            db.add(MentorSubject(mentor_id=m.id, subject_id=sid)); depts.append(s.name)
    db.commit(); db.refresh(m)
    return _to_out(m, depts)


# ---- Students ----
@router.get("/students", response_model=list[UserOut])
def list_students(db: Session = Depends(get_db), me: User = Depends(require_role("admin", "mentor"))):
    dm = _dept_map(db, "student")
    q = db.query(User).filter(User.role == "student")
    if me.role == "mentor":   # a mentor only sees students in their own departments
        sids = [r[0] for r in db.query(MentorSubject.subject_id).filter(MentorSubject.mentor_id == me.id).all()]
        stu_ids = [r[0] for r in db.query(StudentSubject.student_id).filter(StudentSubject.subject_id.in_(sids)).all()]
        q = q.filter(User.id.in_(stu_ids))
    users = q.order_by(User.id).all()
    return [_to_out(u, dm.get(u.id, [])) for u in users]


@router.get("/students/directory", response_model=list[UserOut])
def students_directory(db: Session = Depends(get_db), me: User = Depends(admin_or_mentor)):
    """All students across the org — used by a mentor to pick existing students to add to their dept."""
    dm = _dept_map(db, "student")
    mine = set(_mentor_subject_ids(db, me)) if me.role == "mentor" else set()
    mine_names = {s.name for s in db.query(Subject).filter(Subject.id.in_(mine)).all()} if mine else set()
    out = []
    for u in db.query(User).filter(User.role == "student").order_by(User.full_name).all():
        depts = dm.get(u.id, [])
        o = _to_out(u, depts)
        # mark whether the student is already in one of the mentor's departments
        o.extra = {**(o.extra or {}), "_in_my_dept": bool(mine_names & set(depts))}
        out.append(o)
    return out


@router.post("/students/{sid}/assign-department", response_model=UserOut)
def assign_department(sid: int, body: AssignDeptIn, db: Session = Depends(get_db), me: User = Depends(admin_or_mentor)):
    u = db.get(User, sid)
    if not u or u.role != "student":
        raise HTTPException(404, "Student not found")
    if me.role == "mentor" and body.subject_id not in _mentor_subject_ids(db, me):
        raise HTTPException(403, "You can only assign students to your own departments")
    if not db.get(Subject, body.subject_id):
        raise HTTPException(400, "Unknown department")
    exists = db.query(StudentSubject).filter(StudentSubject.student_id == sid, StudentSubject.subject_id == body.subject_id).first()
    if not exists:
        db.add(StudentSubject(student_id=sid, subject_id=body.subject_id, current_level=1))
        db.commit()
    return _to_out(u, _depts_for(db, u))


@router.post("/students/invite", response_model=UserOut, status_code=201)
def invite_student(body: StudentInviteIn, db: Session = Depends(get_db), me: User = Depends(admin_or_mentor)):
    email = body.email.strip().lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(409, "A user with this email already exists")
    if me.role == "mentor" and body.subject_id not in _mentor_subject_ids(db, me):
        raise HTTPException(403, "You can only add students to your own departments")
    dept = db.get(Subject, body.subject_id)
    if not dept:
        raise HTTPException(400, "Unknown department")
    s = User(full_name=body.full_name.strip(), email=email,
             password_hash=hash_pw(_temp_password()), role="student", phone=body.phone,
             college_id=body.college_id, program=body.program, batch=body.batch)
    _new_invitation(s)
    db.add(s); db.flush()
    db.add(StudentSubject(student_id=s.id, subject_id=body.subject_id, current_level=1))
    db.commit(); db.refresh(s)
    return _to_out(s, [dept.name])


# ---- custom user fields ----
@router.get("/users/fields", response_model=list[CustomFieldOut])
def list_custom_fields(db: Session = Depends(get_db), _: User = Depends(require_role("admin", "mentor"))):
    return db.query(CustomUserField).order_by(CustomUserField.id).all()


def _ensure_custom_fields(db: Session, fields: list[CustomFieldIn]) -> dict[str, str]:
    """Register any new custom fields; return a map of incoming-key -> stored key."""
    existing = {f.key: f for f in db.query(CustomUserField).all()}
    keymap: dict[str, str] = {}
    for f in fields:
        key = slugify_key(f.key or f.label)
        keymap[f.key] = key
        if key not in existing:
            row = CustomUserField(key=key, label=(f.label or f.key).strip())
            db.add(row); existing[key] = row
    db.flush()
    return keymap


# ---- bulk import (any-format Excel/CSV, field-mapped on the client) ----
@router.post("/users/import")
def bulk_import(body: BulkImportIn, db: Session = Depends(get_db), me: User = Depends(admin_or_mentor)):
    keymap = _ensure_custom_fields(db, body.custom_fields)
    subj_by_name = {s.name.lower(): s.id for s in db.query(Subject).all()}
    existing_emails = {e.lower() for (e,) in db.query(User.email).all()}
    # mentors may only import STUDENTS into their own departments
    mentor_dept_ids = set(_mentor_subject_ids(db, me)) if me.role == "mentor" else None
    default_dept_id = next(iter(mentor_dept_ids), None) if mentor_dept_ids else None

    created, skipped, errors = 0, 0, []
    seen_in_batch: set[str] = set()
    for i, r in enumerate(body.records):
        line = i + 1
        name = (r.full_name or "").strip()
        email = (r.email or "").strip().lower()
        role = "student" if me.role == "mentor" else (r.role or body.role or "student").strip().lower()
        if not name or not email:
            errors.append({"line": line, "email": r.email, "reason": "Missing name or email"}); continue
        if not EMAIL_RE.match(email):
            errors.append({"line": line, "email": r.email, "reason": "Invalid email"}); continue
        if role not in ("student", "mentor"):
            errors.append({"line": line, "email": email, "reason": f"Unsupported role '{role}'"}); continue
        if email in existing_emails or email in seen_in_batch:
            skipped += 1; continue

        # remap incoming custom-field keys to their stored keys
        extra = {keymap.get(k, slugify_key(k)): v for k, v in (r.extra or {}).items() if v not in (None, "")}
        u = User(full_name=name, email=email, password_hash=hash_pw(_temp_password()),
                 role=role, phone=r.phone,
                 college_id=r.college_id, program=r.program, batch=r.batch,
                 employee_id=r.employee_id, designation=r.designation,
                 qualification=r.qualification, experience=r.experience,
                 extra=extra or None)
        _new_invitation(u)
        db.add(u); db.flush()
        sid = subj_by_name.get((r.subject or "").strip().lower())
        if mentor_dept_ids is not None:   # mentor import: force into their dept(s)
            if sid not in mentor_dept_ids:
                sid = default_dept_id
        if sid and role == "student":
            db.add(StudentSubject(student_id=u.id, subject_id=sid, current_level=1))
        elif sid and role == "mentor":
            db.add(MentorSubject(mentor_id=u.id, subject_id=sid))
        seen_in_batch.add(email); created += 1

    db.commit()
    return {"success": True, "data": {
        "created": created, "skipped": skipped, "errors": errors,
        "custom_fields": [{"key": v, "label": next((f.label for f in body.custom_fields if f.key == k), v)}
                          for k, v in keymap.items()],
    }}


@router.post("/students/import")
def import_students(rows: list[StudentImportRow], db: Session = Depends(get_db), _: User = Depends(admin_only)):
    created, skipped = 0, 0
    subj_by_name = {s.name.lower(): s.id for s in db.query(Subject).all()}
    for r in rows:
        email = r.email.strip().lower()
        sid = subj_by_name.get((r.subject or "").strip().lower())
        if not sid or db.query(User).filter(User.email == email).first():
            skipped += 1
            continue
        u = User(full_name=r.full_name.strip(), email=email,
                 password_hash=hash_pw(_temp_password()), role="student", college_id=r.college_id)
        _new_invitation(u)
        db.add(u); db.flush()
        db.add(StudentSubject(student_id=u.id, subject_id=sid, current_level=1))
        created += 1
    db.commit()
    return {"success": True, "data": {"created": created, "skipped": skipped}}
