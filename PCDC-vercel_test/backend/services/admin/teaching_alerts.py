"""Teaching-approval alerts: tell the right admins when faculty self-selections
are waiting for their approval.

When a faculty member's My Teaching save creates *pending* selections (approval
switched on), this:

1. records one in-app notification (system_events, event_type
   TEACHING_REQUEST_EVENT) per institute involved, which shows up in the
   admin notification bell;
2. emails the concerned admins once per save (not once per subject). Who is
   concerned, per institute, first match wins:
      - Institute Admins linked to that institute (admin_institutions);
      - otherwise the Central Admin(s);
      - otherwise unrestricted (pre-existing) admins,
   so a request is never left unseen.

It runs after the selections are committed and never raises: a failed alert
must not undo or block the faculty's save. Emails go out in a background task
after the response, so the save stays instant.

`pending_teaching_count` is the live (uncached) pending count shown on the
admin dashboard and the sidebar badge; it uses the same scope rule as the
Teaching Approvals list so the numbers always match.
"""

import html
import json
import logging
from typing import Any, Dict, List, Optional, Sequence

from fastapi import BackgroundTasks
from sqlalchemy import text
from sqlalchemy.orm import Session

from services.admin.scope import admin_scope, course_child_in_scope_sql, scope_params
from shared.email import send_email

logger = logging.getLogger(__name__)

TEACHING_REQUEST_EVENT = "teaching_approval_requested"
APPROVALS_PATH = "/admin/people/teaching-approvals"


def pending_teaching_count(db: Session, current_user: Dict[str, Any]) -> int:
    scope_sql = "" if admin_scope(current_user) is None else f"AND {course_child_in_scope_sql('cs')}"
    return int(
        db.execute(
            text(f"""
                SELECT COUNT(*)
                FROM faculty_sections fs
                JOIN class_sections cs ON cs.id = fs.section_id
                WHERE fs.status = 'pending' {scope_sql}
            """),
            scope_params(current_user),
        ).scalar()
        or 0
    )


def _faculty_display_name(db: Session, faculty_id: int) -> str:
    row = db.execute(text("SELECT name, title FROM users WHERE id = :id"), {"id": faculty_id}).fetchone()
    if not row:
        return "A faculty member"
    name = (row.name or "").strip() or "A faculty member"
    title = (row.title or "").strip()
    if title and not name.lower().startswith(title.lower()):
        return f"{title} {name}"
    return name


def _admins_to_notify(db: Session, institution_id: int) -> List[Any]:
    """Concerned admins for one institute (see module docstring)."""
    queries = [
        ("""
            SELECT u.id, u.name, u.email FROM admin_institutions ai
            JOIN users u ON u.id = ai.admin_id
            WHERE ai.institution_id = :iid AND u.role = 'admin'
        """),
        "SELECT u.id, u.name, u.email FROM users u WHERE u.role = 'superadmin'",
        "SELECT u.id, u.name, u.email FROM users u WHERE u.role = 'admin' AND u.admin_unrestricted = TRUE",
    ]
    for sql in queries:
        rows = db.execute(
            text(f"{sql} AND u.status = 'active' AND u.email IS NOT NULL AND u.email <> '' ORDER BY u.id"),
            {"iid": institution_id},
        ).fetchall()
        if rows:
            return rows
    return []


def teaching_request_email(
    admin_name: str, faculty_name: str, items: Sequence[Dict[str, Any]], review_url: str
) -> tuple[str, str, str]:
    """Return (subject, text_body, html_body) for a pending-approval alert."""
    count = len(items)
    plural = "request" if count == 1 else "requests"
    subject = f"Teaching approval needed: {count} new {plural} from {faculty_name}"
    lines = [f"  - {i['subject']} ({i['section_label']})" for i in items]
    text_body = (
        f"Hi {admin_name or 'there'},\n\n"
        f"{faculty_name} has selected {count} teaching {'subject' if count == 1 else 'subjects'} "
        "that need your approval:\n\n" + "\n".join(lines) + "\n\n"
        f"Review and approve them here:\n  {review_url}\n\n"
        "Prestige Capability Development Centre\nPCDC Case Studio"
    )
    rows_html = "".join(
        f'<li style="margin:0 0 6px;"><strong style="color:#0b1d3a;">{html.escape(i["subject"])}</strong>'
        f' <span style="color:#667085;">— {html.escape(i["section_label"])}</span></li>'
        for i in items
    )
    html_body = f"""\
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#eef1f5;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1b2735;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f5;padding:32px 12px;">
      <tr><td align="center">
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="width:520px;max-width:100%;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(16,32,51,0.08);">
          <tr><td style="background:#0b1d3a;padding:24px 30px;">
            <div style="font-size:19px;font-weight:700;letter-spacing:2px;color:#ffffff;">PCDC</div>
            <div style="font-size:11px;color:#c9a227;letter-spacing:0.5px;margin-top:2px;">CASE STUDIO</div>
          </td></tr>
          <tr><td style="height:3px;background:#c9a227;line-height:3px;font-size:0;">&nbsp;</td></tr>
          <tr><td style="padding:30px;">
            <h1 style="margin:0 0 14px;font-size:20px;color:#0b1d3a;">Teaching approval needed</h1>
            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#42526b;">
              Hi {html.escape(admin_name or 'there')}, <strong style="color:#0b1d3a;">{html.escape(faculty_name)}</strong>
              has selected {count} teaching {'subject' if count == 1 else 'subjects'} that need your approval:
            </p>
            <ul style="margin:0 0 22px;padding-left:20px;font-size:14px;line-height:1.5;color:#42526b;">{rows_html}</ul>
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td style="background:#0b1d3a;border-radius:8px;">
                <a href="{review_url}" style="display:inline-block;padding:13px 30px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Review approvals &rarr;</a>
              </td>
            </tr></table>
            <p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#98a2b3;word-break:break-all;">
              Button not working? Copy this link:<br />{review_url}
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>"""
    return subject, text_body, html_body


def _send_alert_emails(messages: List[Dict[str, str]]) -> None:
    for msg in messages:
        try:
            send_email(msg["to"], msg["subject"], msg["text"], msg["html"])
        except Exception:  # noqa: BLE001 - one bad address must not stop the rest
            logger.warning("Teaching-approval alert email to %s failed", msg["to"], exc_info=True)


def notify_pending_teaching(
    db: Session,
    faculty_id: int,
    section_subjects: Sequence[tuple],
    background_tasks: Optional[BackgroundTasks],
    base_url: str,
) -> None:
    """Alert admins about newly created *pending* selections.

    section_subjects: (section_id, subject) pairs that were just inserted as
    pending. Never raises."""
    if not section_subjects:
        return
    try:
        section_ids = sorted({int(sid) for sid, _ in section_subjects})
        sections = {
            row.id: row
            for row in db.execute(
                text("""
                    SELECT cs.id, cs.name AS section_name, c.name AS course_name,
                           sem.name AS semester_name, d.institution_id
                    FROM class_sections cs
                    JOIN courses c ON c.id = cs.course_id
                    LEFT JOIN semesters sem ON sem.id = cs.semester_id
                    LEFT JOIN departments d ON d.id = c.department_id
                    WHERE cs.id = ANY(CAST(:ids AS INTEGER[]))
                """),
                {"ids": section_ids},
            ).fetchall()
        }
        faculty_name = _faculty_display_name(db, faculty_id)

        # Group the new selections by institute.
        by_institution: Dict[Optional[int], List[Dict[str, Any]]] = {}
        for section_id, subject in section_subjects:
            sec = sections.get(int(section_id))
            if not sec:
                continue
            label = " · ".join(p for p in (sec.section_name, sec.course_name, sec.semester_name) if p)
            by_institution.setdefault(sec.institution_id, []).append(
                {"subject": subject, "section_label": label}
            )

        # One in-app notification per institute, so a scoped admin's bell
        # only shows requests for their own institutes.
        for institution_id, items in by_institution.items():
            n = len(items)
            message = (
                f"{faculty_name} requested {n} teaching {'subject' if n == 1 else 'subjects'} — awaiting approval"
            )
            db.execute(
                text("""
                    INSERT INTO system_events (actor_user_id, event_type, message, metadata)
                    VALUES (:actor, :etype, :message, :metadata)
                """),
                {
                    "actor": faculty_id,
                    "etype": TEACHING_REQUEST_EVENT,
                    "message": message,
                    "metadata": json.dumps({"institution_id": institution_id, "count": n, "link": APPROVALS_PATH}),
                },
            )

        # One email per admin per save, listing everything they need to approve.
        per_admin: Dict[int, Dict[str, Any]] = {}
        for institution_id, items in by_institution.items():
            admins = _admins_to_notify(db, institution_id) if institution_id is not None else []
            if not admins:
                admins = _admins_to_notify(db, -1)  # no institute: Central / unrestricted admins
            for admin in admins:
                entry = per_admin.setdefault(admin.id, {"admin": admin, "items": []})
                entry["items"].extend(items)
        db.commit()

        review_url = f"{base_url.rstrip('/')}{APPROVALS_PATH}"
        messages = []
        for entry in per_admin.values():
            admin = entry["admin"]
            subject, text_body, html_body = teaching_request_email(
                admin.name, faculty_name, entry["items"], review_url
            )
            messages.append({"to": admin.email, "subject": subject, "text": text_body, "html": html_body})
        if messages:
            if background_tasks is not None:
                background_tasks.add_task(_send_alert_emails, messages)
            else:
                _send_alert_emails(messages)
    except Exception:  # noqa: BLE001 - alerts must never break the faculty's save
        db.rollback()
        logger.warning("Teaching-approval alert failed for faculty %s", faculty_id, exc_info=True)
