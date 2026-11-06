"""Semester progression: promote, repeat, graduate or exit students.

One student at a time, a selection from a section, or a CSV upload. Nothing is
deleted:

- promote:  moves the student to a section of the next semester. The old
            enrollment is kept as 'promoted'.
- repeat:   the student stays in their current section (no change).
- graduate: final-semester students only. The account is made inactive, so
            they can no longer sign in. Their section, cases and results stay.
- exit:     leaving early. Same as graduate, any semester.

Case studies are assigned per student (assigned_cases), so a student keeps
every case they had whether they are promoted or repeat.

Scope: the Central Admin and unrestricted admins act on any student; an
institute admin only on students and sections of their own institutes.
"""

import csv
import io
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from services.auth.service import get_current_user
from shared.database import get_db

from .router import enroll_student_in_section, mark_section_promoted, record_system_event
from .scope import admin_scope, course_child_in_scope_sql, ensure_section_in_scope, require_admin, scope_params

promotion_router = APIRouter(prefix="/admin/promotion", tags=["admin"])

ACTIONS = ("promote", "repeat", "graduate", "exit")
TEMPLATE_COLUMNS = ["Email", "CollegeID", "Action", "TargetSection"]


class PromotionItem(BaseModel):
    student_id: int  # students.id
    action: str
    target_section_id: Optional[int] = None


class PromotionRequest(BaseModel):
    items: List[PromotionItem]


def _scope_filter(current_user: Dict[str, Any], alias: str = "cs") -> str:
    return "" if admin_scope(current_user) is None else f" AND {course_child_in_scope_sql(alias)}"


# Everything the planner needs about a student, in one row.
_STUDENT_SQL = """
    SELECT s.id AS student_id, u.id AS user_id, u.name, u.email, u.college_id,
           COALESCE(u.status, 'active') AS user_status,
           cs.id AS section_id, cs.name AS section_name, cs.course_id, cs.batch_id,
           se.semester_number, c.total_semesters, b.name AS batch_name
    FROM students s
    JOIN users u ON u.id = s.user_id
    LEFT JOIN student_sections ss ON ss.student_id = s.id AND ss.status = 'active'
    LEFT JOIN class_sections cs ON cs.id = ss.section_id
    LEFT JOIN semesters se ON se.id = cs.semester_id
    LEFT JOIN courses c ON c.id = cs.course_id
    LEFT JOIN batches b ON b.id = cs.batch_id
"""


def _student_rows(db: Session, current_user: Dict[str, Any], where: str, params: Dict[str, Any]) -> List[Any]:
    scope = ""
    if admin_scope(current_user) is not None:
        # A scoped admin only reaches students whose course is in their institutes.
        scope = (
            " AND s.course_id IN (SELECT sc.id FROM courses sc JOIN departments sd ON sd.id = sc.department_id "
            "WHERE sd.institution_id = ANY(CAST(:scope_ids AS INTEGER[])))"
        )
    return db.execute(
        text(f"{_STUDENT_SQL} WHERE {where}{scope}"),
        {**params, **scope_params(current_user)},
    ).fetchall()


def _next_sections(db: Session, student: Any) -> List[Any]:
    """Sections of the student's course in the next semester; same batch and
    same section name first."""
    if student.section_id is None or student.semester_number is None:
        return []
    return db.execute(
        text("""
            SELECT cs.id, cs.name, cs.batch_id, b.name AS batch_name, se.semester_number, se.name AS semester_name
            FROM class_sections cs
            JOIN semesters se ON se.id = cs.semester_id
            LEFT JOIN batches b ON b.id = cs.batch_id
            WHERE cs.course_id = :course_id AND se.semester_number = :next
              AND COALESCE(cs.status, 'active') = 'active'
            ORDER BY (cs.batch_id = :batch_id) DESC, (cs.name = :name) DESC, cs.name, cs.id
        """),
        {
            "course_id": student.course_id,
            "next": student.semester_number + 1,
            "batch_id": student.batch_id,
            "name": student.section_name,
        },
    ).fetchall()


def _pick_target(candidates: List[Any], student: Any) -> Optional[Any]:
    """Automatic target: same batch + same name, else the only section in the
    same batch, else the only section at all. None when it's ambiguous."""
    same_batch = [c for c in candidates if c.batch_id == student.batch_id]
    for c in same_batch:
        if c.name == student.section_name:
            return c
    if len(same_batch) == 1:
        return same_batch[0]
    if len(candidates) == 1:
        return candidates[0]
    return None


def _plan(
    db: Session,
    student: Any,
    action: str,
    target_section_id: Optional[int] = None,
    target_section_name: str = "",
) -> Dict[str, Any]:
    """What would happen to one student. No writes."""
    result: Dict[str, Any] = {
        "student_id": student.student_id,
        "user_id": student.user_id,
        "name": student.name,
        "email": student.email,
        "action": action,
        "from_section": student.section_name,
        "from_semester": student.semester_number,
        "to_section_id": None,
        "to_section": None,
        "to_semester": None,
        "ok": False,
        "message": "",
    }
    if action not in ACTIONS:
        result["message"] = "Action must be Promote, Repeat, Graduate or Exit"
        return result
    is_final = (
        student.semester_number is not None
        and student.total_semesters is not None
        and student.semester_number >= student.total_semesters
    )

    if action == "exit":
        if student.user_status != "active":
            result["message"] = "Already inactive"
            return result
        result.update(ok=True, message="Account will be made inactive (left the institute). Nothing is deleted.")
        return result

    if student.section_id is None:
        result["message"] = "Not enrolled in a section"
        return result

    if action == "graduate":
        if not is_final:
            result["message"] = (
                f"Not in the final semester (Semester {student.semester_number} of {student.total_semesters}). "
                "Use Exit if they are leaving early."
            )
            return result
        if student.user_status != "active":
            result["message"] = "Already inactive"
            return result
        result.update(ok=True, message="Graduates: account will be made inactive. Nothing is deleted.")
        return result

    if student.user_status != "active":
        result["message"] = "Account is inactive. Reactivate it first (Reactivate on this page, or People → All Users)."
        return result

    if action == "repeat":
        result.update(
            ok=True,
            to_section_id=student.section_id,
            to_section=student.section_name,
            to_semester=student.semester_number,
            message=f"Repeats Semester {student.semester_number}; stays in section {student.section_name}.",
        )
        return result

    # promote
    if is_final:
        result["message"] = "Already in the final semester. Use Graduate."
        return result
    candidates = _next_sections(db, student)
    if not candidates:
        result["message"] = f"No section exists for Semester {student.semester_number + 1}. Create one in Academic Setup."
        return result
    target = None
    if target_section_id is not None:
        target = next((c for c in candidates if c.id == target_section_id), None)
        if target is None:
            result["message"] = "The chosen section isn't in the next semester of this student's specialization"
            return result
    elif target_section_name:
        named = [c for c in candidates if c.name.strip().lower() == target_section_name.strip().lower()]
        same_batch = [c for c in named if c.batch_id == student.batch_id]
        target = (same_batch or named or [None])[0]
        if target is None:
            options = ", ".join(sorted({c.name for c in candidates}))
            result["message"] = f"No section '{target_section_name}' in Semester {student.semester_number + 1} (options: {options})"
            return result
    else:
        target = _pick_target(candidates, student)
        if target is None:
            options = ", ".join(sorted({c.name for c in candidates}))
            result["message"] = f"Choose the Semester {student.semester_number + 1} section ({options})"
            return result
    result.update(
        ok=True,
        to_section_id=target.id,
        to_section=target.name,
        to_semester=target.semester_number,
        message=f"Moves to Semester {target.semester_number}, section {target.name}.",
    )
    return result


def _apply(db: Session, current_user: Dict[str, Any], plan: Dict[str, Any]) -> None:
    action = plan["action"]
    if action == "promote":
        mark_section_promoted(db, plan["student_id"])
        enroll_student_in_section(db, plan["student_id"], plan["to_section_id"], current_user["id"])
        message = (
            f"Promoted {plan['name']} from Semester {plan['from_semester']} ({plan['from_section']}) "
            f"to Semester {plan['to_semester']} ({plan['to_section']})"
        )
    elif action in ("graduate", "exit"):
        db.execute(
            text("UPDATE users SET status = 'inactive', updated_at = NOW() WHERE id = :id"),
            {"id": plan["user_id"]},
        )
        message = f"{'Graduated' if action == 'graduate' else 'Exited'} {plan['name']}; account made inactive"
    else:
        message = f"{plan['name']} repeats Semester {plan['from_semester']} in section {plan['from_section']}"
    record_system_event(db, current_user["id"], f"student_{action}", message)


def _run(db: Session, current_user: Dict[str, Any], plans: List[Dict[str, Any]], dry_run: bool) -> Dict[str, Any]:
    if not dry_run:
        for plan in plans:
            if not plan["ok"]:
                continue
            try:
                with db.begin_nested():
                    _apply(db, current_user, plan)
            except Exception as exc:  # noqa: BLE001 - report per row, keep the rest
                plan.update(ok=False, message=f"Could not apply: {exc.__class__.__name__}")
        db.commit()
    done = [p for p in plans if p["ok"]]
    counts = {a: sum(1 for p in done if p["action"] == a) for a in ACTIONS}
    return {
        "dry_run": dry_run,
        "items": plans,
        "ok_count": len(done),
        "error_count": len(plans) - len(done),
        "counts": counts,
    }


@promotion_router.get("/sections")
def promotion_sections(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Sections the admin may manage, with how many active students each has."""
    require_admin(current_user)
    rows = db.execute(
        text(f"""
            SELECT cs.id, cs.name, se.semester_number, se.name AS semester_name,
                   c.id AS course_id, c.name AS course_name, c.code AS course_code, c.total_semesters,
                   b.name AS batch_name, d.name AS program_name, i.name AS institution_name,
                   (SELECT COUNT(*) FROM student_sections ss
                     WHERE ss.section_id = cs.id AND ss.status = 'active') AS student_count
            FROM class_sections cs
            JOIN semesters se ON se.id = cs.semester_id
            JOIN courses c ON c.id = cs.course_id
            LEFT JOIN batches b ON b.id = cs.batch_id
            LEFT JOIN departments d ON d.id = c.department_id
            LEFT JOIN institutions i ON i.id = d.institution_id
            WHERE TRUE{_scope_filter(current_user)}
            ORDER BY i.name NULLS LAST, c.name, b.name, se.semester_number, cs.name
        """),
        scope_params(current_user),
    ).fetchall()
    return {"items": [dict(r._mapping) for r in rows]}


@promotion_router.get("/sections/{section_id}")
def promotion_section_detail(
    section_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Active students of one section with each one's default plan, plus the
    next-semester sections they can be moved to."""
    require_admin(current_user)
    ensure_section_in_scope(db, current_user, section_id)
    students = _student_rows(db, current_user, "ss.section_id = :sec", {"sec": section_id})
    students = sorted(students, key=lambda r: (r.name or "").lower())
    first = students[0] if students else None
    if first is None:
        section = db.execute(
            text("""
                SELECT cs.id AS section_id, cs.name AS section_name, cs.course_id, cs.batch_id,
                       se.semester_number, c.total_semesters
                FROM class_sections cs
                JOIN semesters se ON se.id = cs.semester_id
                JOIN courses c ON c.id = cs.course_id
                WHERE cs.id = :sec
            """),
            {"sec": section_id},
        ).fetchone()
    else:
        section = first
    next_sections = _next_sections(db, section) if section else []
    is_final = bool(section and section.semester_number >= section.total_semesters)
    default_action = "graduate" if is_final else "promote"
    default_target = _pick_target(next_sections, section) if section and next_sections else None
    return {
        "section_id": section_id,
        "semester_number": section.semester_number if section else None,
        "total_semesters": section.total_semesters if section else None,
        "is_final_semester": is_final,
        "default_action": default_action,
        "default_target_section_id": default_target.id if default_target else None,
        "next_sections": [
            {
                "id": c.id,
                "name": c.name,
                "batch_name": c.batch_name,
                "semester_number": c.semester_number,
                "semester_name": c.semester_name,
            }
            for c in next_sections
        ],
        "students": [
            {
                "student_id": s.student_id,
                "user_id": s.user_id,
                "name": s.name,
                "email": s.email,
                "college_id": s.college_id,
                "status": s.user_status,
            }
            for s in students
        ],
    }


@promotion_router.post("/apply")
def apply_promotions(
    data: PromotionRequest,
    dry_run: bool = Query(default=False),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """One student or many. Each item is checked on its own; one bad row
    never blocks the rest."""
    require_admin(current_user)
    if not data.items:
        raise HTTPException(status_code=400, detail="Choose at least one student")
    if len(data.items) > 2000:
        raise HTTPException(status_code=400, detail="At most 2000 students per request")
    ids = list({item.student_id for item in data.items})
    rows = {r.student_id: r for r in _student_rows(db, current_user, "s.id = ANY(:ids)", {"ids": ids})}
    plans: List[Dict[str, Any]] = []
    seen = set()
    for item in data.items:
        action = (item.action or "").strip().lower()
        student = rows.get(item.student_id)
        if student is None:
            plans.append({"student_id": item.student_id, "name": None, "action": action, "ok": False,
                          "message": "Student not found"})
            continue
        if item.student_id in seen:
            plans.append({**_plan(db, student, action), "ok": False, "message": "Listed twice; only the first is used"})
            continue
        seen.add(item.student_id)
        plans.append(_plan(db, student, action, item.target_section_id))
    return _run(db, current_user, plans, dry_run)


@promotion_router.get("/template")
def promotion_template(current_user: Dict[str, Any] = Depends(get_current_user)) -> Response:
    require_admin(current_user)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(TEMPLATE_COLUMNS)
    writer.writerow(["student1@example.edu", "", "Promote", ""])
    writer.writerow(["", "CID-1002", "Repeat", ""])
    writer.writerow(["student3@example.edu", "", "Promote", "B"])
    writer.writerow(["student4@example.edu", "", "Graduate", ""])
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=pcdc-semester-progression-template.csv"},
    )


@promotion_router.post("/import")
async def import_promotions(
    file: UploadFile = File(...),
    dry_run: bool = Query(default=True, description="Preview only; send false to apply"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """CSV: Email or CollegeID, Action (Promote / Repeat / Graduate / Exit),
    optional TargetSection (section name in the next semester). Previews by
    default."""
    require_admin(current_user)
    raw = await file.read()
    try:
        decoded = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File must be UTF-8 encoded CSV")
    reader = csv.DictReader(io.StringIO(decoded))
    fields = {(f or "").strip().lower() for f in (reader.fieldnames or [])}
    if "action" not in fields or not ({"email", "collegeid"} & fields):
        raise HTTPException(status_code=400, detail="CSV must have an Action column and an Email or CollegeID column")

    plans: List[Dict[str, Any]] = []
    seen = set()
    for line, raw_row in enumerate(reader, start=2):
        row = {(k or "").strip().lower(): (v or "").strip() for k, v in raw_row.items()}
        email = row.get("email", "").lower()
        college_id = row.get("collegeid", "")
        action = row.get("action", "").lower()
        target_name = row.get("targetsection", "")
        if not email and not college_id and not action:
            continue  # blank line
        base = {"row": line, "student_id": None, "name": email or college_id, "action": action, "ok": False}
        if not email and not college_id:
            plans.append({**base, "message": "Email or CollegeID is required"})
            continue
        if email:
            found = _student_rows(db, current_user, "LOWER(u.email) = :v", {"v": email})
        else:
            found = _student_rows(db, current_user, "u.college_id = :v", {"v": college_id})
        if not found:
            plans.append({**base, "message": "No student with this Email/CollegeID in your institutes"})
            continue
        if len(found) > 1:
            plans.append({**base, "message": "More than one student matches; use Email"})
            continue
        student = found[0]
        plan = {**_plan(db, student, action, target_section_name=target_name), "row": line}
        if student.student_id in seen:
            plan.update(ok=False, message="Listed twice; only the first row is used")
        seen.add(student.student_id)
        plans.append(plan)
    if not plans:
        raise HTTPException(status_code=400, detail="The file has no student rows")
    if len(plans) > 2000:
        raise HTTPException(status_code=400, detail="At most 2000 rows per file")
    return _run(db, current_user, plans, dry_run)
