"""Role dashboards: the extra "what needs attention / how is it going" data.

Read-only and additive: the existing /dashboard/summary endpoints are left as
they are, and each portal loads these alongside them. Every query is scoped
the same way the rest of that portal already is:

- admin: admin_scope (Central / unrestricted = everything, Institute Admin =
  their institutes only);
- faculty: cases they created plus students in their approved sections (the
  same rule as faculty_can_view_attempt);
- student: only their own records. Never includes AI-content data.

Scores are percentages (marks_total / total_marks) so cases with different
total marks can be averaged together.
"""

from typing import Any, Dict, List, Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

from services.admin.scope import (
    admin_scope,
    course_child_in_scope_sql,
    course_in_scope_sql,
    scope_params,
    user_in_scope_sql,
)
from shared.cache import cache_get, cache_set

INSIGHTS_TTL_SECONDS = 60
AI_FLAG_PCT = 50

SCORE_PCT_SQL = "csa.marks_total * 100.0 / NULLIF(cs.total_marks, 0)"
SUBMITTED_STATUSES = "('solution_submitted', 'defense_complete', 'evaluated')"
OPEN_ASSIGNMENT = "ac.status IN ('pending', 'active')"


def _pct(value: Any) -> Optional[float]:
    return None if value is None else round(float(value), 1)


def _ratio_pct(part: Any, whole: Any) -> Optional[float]:
    return round(100.0 * int(part or 0) / int(whole), 1) if whole else None


def _ts(value: Any) -> Optional[str]:
    return None if value is None else str(value)


# One state per assigned case, for the status charts. Mutually exclusive:
# overdue wins over pending/active.
_STATUS_COUNTS_SQL = f"""
    COUNT(*) FILTER (WHERE ac.status = 'completed') AS completed,
    COUNT(*) FILTER (WHERE {OPEN_ASSIGNMENT} AND ac.due_date < NOW()) AS overdue,
    COUNT(*) FILTER (WHERE ac.status = 'active' AND (ac.due_date IS NULL OR ac.due_date >= NOW())) AS in_progress,
    COUNT(*) FILTER (WHERE ac.status = 'pending' AND (ac.due_date IS NULL OR ac.due_date >= NOW())) AS not_started
"""


def _status_counts(row: Any) -> Dict[str, int]:
    return {key: int(getattr(row, key) or 0) for key in ("completed", "in_progress", "not_started", "overdue")}


# Monday-start weeks, oldest first, ending with the current week.
TREND_WEEKS = 8
_WEEKS_CTE = f"""
    weeks AS (
        SELECT generate_series(
            date_trunc('week', NOW()) - INTERVAL '{TREND_WEEKS - 1} weeks',
            date_trunc('week', NOW()),
            INTERVAL '1 week'
        ) AS wk
    )
"""

# Score bands for the distribution chart: (label, lower bound inclusive).
SCORE_BANDS = [("Below 40", 0), ("40–49", 40), ("50–59", 50), ("60–69", 60), ("70–79", 70), ("80–100", 80)]


def _band_case_sql(score_sql: str) -> str:
    whens = " ".join(
        f"WHEN {score_sql} >= {low} THEN '{label}'" for label, low in reversed(SCORE_BANDS[1:])
    )
    return f"CASE {whens} ELSE '{SCORE_BANDS[0][0]}' END"


# ---------------------------------------------------------------------------
# Admin
# ---------------------------------------------------------------------------

def admin_dashboard_insights(db: Session, current_user: Dict[str, Any]) -> Dict[str, Any]:
    scope = admin_scope(current_user)
    cache_key = "admin_insights" if scope is None else f"admin_insights:{','.join(map(str, sorted(scope)))}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    params = scope_params(current_user)
    scoped = scope is not None
    student_scope = course_child_in_scope_sql("s") if scoped else "TRUE"
    section_scope = course_child_in_scope_sql("cs") if scoped else "TRUE"
    course_scope = course_in_scope_sql("c") if scoped else "TRUE"
    user_scope = user_in_scope_sql("u") if scoped else "TRUE"

    def scalar(sql: str) -> int:
        return int(db.execute(text(sql), params).scalar() or 0)

    attention = {
        "students_without_section": scalar(f"""
            SELECT COUNT(*) FROM students s JOIN users su ON su.id = s.user_id
            WHERE COALESCE(su.status, 'active') = 'active' AND s.current_section_id IS NULL AND {student_scope}
        """),
        "sections_without_faculty": scalar(f"""
            SELECT COUNT(*) FROM class_sections cs
            WHERE COALESCE(cs.status, 'active') = 'active' AND {section_scope}
              AND NOT EXISTS (
                  SELECT 1 FROM faculty_sections fs
                  WHERE fs.section_id = cs.id AND COALESCE(fs.status, 'active') = 'active'
              )
        """),
        "overdue_assignments": scalar(f"""
            SELECT COUNT(*) FROM assigned_cases ac JOIN students s ON s.id = ac.student_id
            WHERE {OPEN_ASSIGNMENT} AND ac.due_date < NOW() AND {student_scope}
        """),
        "ai_flagged_attempts_30d": scalar(f"""
            SELECT COUNT(DISTINCT a.attempt_id)
            FROM answer_ai_checks a
            JOIN case_study_attempts csa ON csa.id = a.attempt_id
            JOIN students s ON s.user_id = csa.student_id
            WHERE a.ai_pct >= {AI_FLAG_PCT} AND a.checked_at >= NOW() - INTERVAL '30 days' AND {student_scope}
        """),
    }

    totals = {
        "institutions": len(scope) if scoped else scalar(
            "SELECT COUNT(*) FROM institutions WHERE COALESCE(status, 'active') = 'active'"
        ),
        "courses": scalar(f"SELECT COUNT(*) FROM courses c WHERE COALESCE(c.status, 'active') = 'active' AND {course_scope}"),
        "sections": scalar(f"SELECT COUNT(*) FROM class_sections cs WHERE COALESCE(cs.status, 'active') = 'active' AND {section_scope}"),
        "students": scalar(f"""
            SELECT COUNT(*) FROM students s JOIN users su ON su.id = s.user_id
            WHERE COALESCE(su.status, 'active') = 'active' AND {student_scope}
        """),
        "faculty": scalar(f"""
            SELECT COUNT(*) FROM users u
            WHERE u.role = 'faculty' AND COALESCE(u.status, 'active') = 'active' AND {user_scope}
        """),
        "published_cases": scalar(f"""
            SELECT COUNT(*) FROM case_studies c
            WHERE c.status = 'published'
              AND ({'TRUE' if not scoped else f"EXISTS (SELECT 1 FROM users u WHERE u.id = c.created_by AND {user_scope})"})
        """),
    }

    eng = db.execute(
        text(f"""
            SELECT
                (SELECT COUNT(*) FROM assigned_cases ac JOIN students s ON s.id = ac.student_id
                  WHERE ac.assigned_at >= NOW() - INTERVAL '30 days' AND {student_scope}) AS assigned,
                (SELECT COUNT(*) FROM assigned_cases ac JOIN students s ON s.id = ac.student_id
                  WHERE ac.status = 'completed' AND ac.completed_at >= NOW() - INTERVAL '30 days'
                    AND {student_scope}) AS completed,
                (SELECT COUNT(*) FROM case_study_attempts csa JOIN students s ON s.user_id = csa.student_id
                  WHERE csa.start_time >= NOW() - INTERVAL '30 days' AND {student_scope}) AS attempts_started,
                (SELECT COUNT(*) FROM case_study_attempts csa JOIN students s ON s.user_id = csa.student_id
                  WHERE csa.status = 'evaluated' AND COALESCE(csa.end_time, csa.start_time) >= NOW() - INTERVAL '30 days'
                    AND {student_scope}) AS attempts_evaluated,
                (SELECT AVG({SCORE_PCT_SQL}) FROM case_study_attempts csa
                   JOIN case_studies cs ON cs.id = csa.case_study_id
                   JOIN students s ON s.user_id = csa.student_id
                  WHERE csa.status = 'evaluated' AND COALESCE(csa.end_time, csa.start_time) >= NOW() - INTERVAL '30 days'
                    AND {student_scope}) AS avg_score_pct,
                (SELECT COUNT(DISTINCT s.id) FROM case_study_attempts csa JOIN students s ON s.user_id = csa.student_id
                  WHERE csa.start_time >= NOW() - INTERVAL '30 days' AND {student_scope}) AS active_students
        """),
        params,
    ).fetchone()
    engagement = {
        "cases_assigned": int(eng.assigned or 0),
        "cases_completed": int(eng.completed or 0),
        "attempts_started": int(eng.attempts_started or 0),
        "attempts_evaluated": int(eng.attempts_evaluated or 0),
        "avg_score_pct": _pct(eng.avg_score_pct),
        "active_students": int(eng.active_students or 0),
    }

    status_row = db.execute(
        text(f"""
            SELECT {_STATUS_COUNTS_SQL}
            FROM assigned_cases ac JOIN students s ON s.id = ac.student_id
            WHERE {student_scope}
        """),
        params,
    ).fetchone()
    weekly_rows = db.execute(
        text(f"""
            WITH {_WEEKS_CTE}
            SELECT w.wk,
                   (SELECT COUNT(*) FROM case_study_attempts csa JOIN students s ON s.user_id = csa.student_id
                     WHERE csa.start_time >= w.wk AND csa.start_time < w.wk + INTERVAL '1 week'
                       AND {student_scope}) AS started,
                   (SELECT COUNT(*) FROM case_study_attempts csa JOIN students s ON s.user_id = csa.student_id
                     WHERE csa.status = 'evaluated'
                       AND COALESCE(csa.end_time, csa.start_time) >= w.wk
                       AND COALESCE(csa.end_time, csa.start_time) < w.wk + INTERVAL '1 week'
                       AND {student_scope}) AS evaluated
            FROM weeks w ORDER BY w.wk
        """),
        params,
    ).fetchall()

    # Central Admin compares institutes; an Institute Admin compares the
    # specializations (courses) inside their own institutes.
    if scoped:
        group_label = "Specialization"
        groups_sql = f"SELECT c.id AS gid, c.name AS gname, c.id AS course_id FROM courses c WHERE {course_scope}"
    else:
        group_label = "Institute"
        groups_sql = """
            SELECT i.id AS gid, i.name AS gname, c.id AS course_id
            FROM institutions i
            LEFT JOIN departments d ON d.institution_id = i.id
            LEFT JOIN courses c ON c.department_id = d.id
            WHERE COALESCE(i.status, 'active') = 'active'
        """
    breakdown_rows = db.execute(
        text(f"""
            WITH g AS ({groups_sql})
            SELECT g.gid, g.gname,
                   (SELECT COUNT(*) FROM students s WHERE s.course_id IN (SELECT course_id FROM g g2 WHERE g2.gid = g.gid)) AS students,
                   (SELECT COUNT(*) FROM case_study_attempts csa JOIN students s ON s.user_id = csa.student_id
                     WHERE s.course_id IN (SELECT course_id FROM g g2 WHERE g2.gid = g.gid)
                       AND csa.start_time >= NOW() - INTERVAL '30 days') AS attempts_30d,
                   (SELECT AVG({SCORE_PCT_SQL}) FROM case_study_attempts csa
                      JOIN case_studies cs ON cs.id = csa.case_study_id
                      JOIN students s ON s.user_id = csa.student_id
                     WHERE s.course_id IN (SELECT course_id FROM g g2 WHERE g2.gid = g.gid)
                       AND csa.status = 'evaluated') AS avg_score_pct,
                   (SELECT COUNT(*) FROM assigned_cases ac JOIN students s ON s.id = ac.student_id
                     WHERE s.course_id IN (SELECT course_id FROM g g2 WHERE g2.gid = g.gid)) AS assigned,
                   (SELECT COUNT(*) FROM assigned_cases ac JOIN students s ON s.id = ac.student_id
                     WHERE s.course_id IN (SELECT course_id FROM g g2 WHERE g2.gid = g.gid)
                       AND ac.status = 'completed') AS completed
            FROM (SELECT DISTINCT gid, gname FROM g) g
            ORDER BY students DESC, g.gname
            LIMIT 8
        """),
        params,
    ).fetchall()

    return cache_set(cache_key, {
        "attention": attention,
        "totals": totals,
        "engagement": engagement,
        "assignment_status": _status_counts(status_row),
        "weekly_activity": [
            {"week_start": str(r.wk.date()), "attempts_started": int(r.started), "attempts_evaluated": int(r.evaluated)}
            for r in weekly_rows
        ],
        "breakdown": {
            "group_label": group_label,
            "rows": [
                {
                    "id": r.gid,
                    "name": r.gname,
                    "students": int(r.students or 0),
                    "attempts_30d": int(r.attempts_30d or 0),
                    "avg_score_pct": _pct(r.avg_score_pct),
                    "completion_pct": _ratio_pct(r.completed, r.assigned),
                }
                for r in breakdown_rows
            ],
        },
    }, INSIGHTS_TTL_SECONDS)


# ---------------------------------------------------------------------------
# Faculty
# ---------------------------------------------------------------------------

# Cases this faculty wrote, plus everything their section students attempt.
_FACULTY_CTES = """
    my_sections AS (
        SELECT DISTINCT section_id FROM faculty_sections
        WHERE faculty_id = :fid AND COALESCE(status, 'active') = 'active'
    ),
    my_students AS (
        SELECT DISTINCT s.id AS student_id, s.user_id, ss.section_id
        FROM student_sections ss JOIN students s ON s.id = ss.student_id
        WHERE ss.status = 'active' AND ss.section_id IN (SELECT section_id FROM my_sections)
    ),
    my_attempts AS (
        SELECT csa.id FROM case_study_attempts csa
        JOIN case_studies cs ON cs.id = csa.case_study_id
        WHERE cs.created_by = :fid OR csa.student_id IN (SELECT user_id FROM my_students)
    ),
    my_assignments AS (
        SELECT ac.* FROM assigned_cases ac
        WHERE ac.assigned_by = :fid
           OR ac.case_study_id IN (SELECT id FROM case_studies WHERE created_by = :fid)
    )
"""


def faculty_dashboard_insights(db: Session, current_user: Dict[str, Any]) -> Dict[str, Any]:
    fid = current_user["id"]
    cache_key = f"faculty_insights:{fid}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached
    params = {"fid": fid}

    def run(sql: str):
        return db.execute(text(f"WITH {_FACULTY_CTES} {sql}"), params)

    att = run(f"""
        SELECT
            (SELECT COUNT(*) FROM my_assignments ac
              WHERE {OPEN_ASSIGNMENT} AND ac.due_date >= NOW() AND ac.due_date < NOW() + INTERVAL '7 days') AS due_7d,
            (SELECT COUNT(*) FROM my_assignments ac WHERE {OPEN_ASSIGNMENT} AND ac.due_date < NOW()) AS overdue,
            (SELECT COUNT(DISTINCT a.attempt_id) FROM answer_ai_checks a
              WHERE a.ai_pct >= {AI_FLAG_PCT} AND a.attempt_id IN (SELECT id FROM my_attempts)) AS ai_flagged,
            (SELECT COUNT(*) FROM faculty_sections WHERE faculty_id = :fid AND status = 'pending') AS teaching_pending
    """).fetchone()
    attention = {
        "due_next_7_days": int(att.due_7d or 0),
        "overdue_submissions": int(att.overdue or 0),
        "ai_flagged_attempts": int(att.ai_flagged or 0),
        "teaching_pending_approval": int(att.teaching_pending or 0),
    }

    status_row = run(f"SELECT {_STATUS_COUNTS_SQL} FROM my_assignments ac").fetchone()
    weekly_rows = db.execute(
        text(f"""
            WITH {_FACULTY_CTES}, {_WEEKS_CTE}
            SELECT w.wk,
                   (SELECT COUNT(*) FROM case_study_attempts csa
                     WHERE csa.id IN (SELECT id FROM my_attempts) AND csa.status IN {SUBMITTED_STATUSES}
                       AND COALESCE(csa.end_time, csa.start_time) >= w.wk
                       AND COALESCE(csa.end_time, csa.start_time) < w.wk + INTERVAL '1 week') AS submitted
            FROM weeks w ORDER BY w.wk
        """),
        params,
    ).fetchall()
    band_counts = {
        r.band: int(r.n)
        for r in run(f"""
            SELECT {_band_case_sql(SCORE_PCT_SQL)} AS band, COUNT(*) AS n
            FROM case_study_attempts csa JOIN case_studies cs ON cs.id = csa.case_study_id
            WHERE csa.id IN (SELECT id FROM my_attempts) AND csa.status = 'evaluated'
              AND csa.marks_total IS NOT NULL AND cs.total_marks > 0
            GROUP BY 1
        """).fetchall()
    }

    deadline_rows = run(f"""
        SELECT ac.case_study_id, cs.title, ac.due_date,
               COUNT(*) AS students,
               COUNT(*) FILTER (WHERE ac.status = 'completed') AS completed
        FROM my_assignments ac JOIN case_studies cs ON cs.id = ac.case_study_id
        WHERE ac.due_date IS NOT NULL AND ac.due_date >= NOW() - INTERVAL '7 days'
        GROUP BY ac.case_study_id, cs.title, ac.due_date
        HAVING COUNT(*) FILTER (WHERE {OPEN_ASSIGNMENT}) > 0
        ORDER BY ac.due_date
        LIMIT 6
    """).fetchall()

    section_rows = run(f"""
        SELECT sec.id, sec.name, c.name AS course_name, se.name AS semester_name,
               (SELECT COUNT(*) FROM my_students ms WHERE ms.section_id = sec.id) AS students,
               (SELECT AVG({SCORE_PCT_SQL}) FROM case_study_attempts csa
                  JOIN case_studies cs ON cs.id = csa.case_study_id
                 WHERE csa.status = 'evaluated'
                   AND csa.student_id IN (SELECT user_id FROM my_students ms WHERE ms.section_id = sec.id)) AS avg_score_pct,
               (SELECT COUNT(*) FROM assigned_cases ac
                 WHERE ac.student_id IN (SELECT student_id FROM my_students ms WHERE ms.section_id = sec.id)) AS assigned,
               (SELECT COUNT(*) FROM assigned_cases ac
                 WHERE ac.status = 'completed'
                   AND ac.student_id IN (SELECT student_id FROM my_students ms WHERE ms.section_id = sec.id)) AS completed
        FROM class_sections sec
        JOIN courses c ON c.id = sec.course_id
        LEFT JOIN semesters se ON se.id = sec.semester_id
        WHERE sec.id IN (SELECT section_id FROM my_sections)
        ORDER BY c.name, se.semester_number, sec.name
    """).fetchall()

    submission_rows = run(f"""
        SELECT csa.id, csa.status, csa.marks_total, cs.total_marks,
               COALESCE(csa.end_time, csa.start_time) AS at,
               u.name AS student_name, cs.title AS case_title,
               EXISTS (SELECT 1 FROM answer_ai_checks a
                       WHERE a.attempt_id = csa.id AND a.ai_pct >= {AI_FLAG_PCT}) AS ai_flagged
        FROM case_study_attempts csa
        JOIN case_studies cs ON cs.id = csa.case_study_id
        JOIN users u ON u.id = csa.student_id
        WHERE csa.id IN (SELECT id FROM my_attempts) AND csa.status IN {SUBMITTED_STATUSES}
        ORDER BY COALESCE(csa.end_time, csa.start_time) DESC NULLS LAST
        LIMIT 8
    """).fetchall()

    attention_rows = run(f"""
        SELECT u.id AS user_id, u.name, AVG({SCORE_PCT_SQL}) AS avg_score_pct, COUNT(*) AS evaluated
        FROM case_study_attempts csa
        JOIN case_studies cs ON cs.id = csa.case_study_id
        JOIN users u ON u.id = csa.student_id
        WHERE csa.status = 'evaluated' AND csa.student_id IN (SELECT user_id FROM my_students)
        GROUP BY u.id, u.name
        HAVING AVG({SCORE_PCT_SQL}) < 50
        ORDER BY avg_score_pct
        LIMIT 5
    """).fetchall()

    return cache_set(cache_key, {
        "attention": attention,
        "assignment_status": _status_counts(status_row),
        "weekly_submissions": [
            {"week_start": str(r.wk.date()), "submissions": int(r.submitted)} for r in weekly_rows
        ],
        "score_distribution": [{"band": label, "attempts": band_counts.get(label, 0)} for label, _ in SCORE_BANDS],
        "deadlines": [
            {
                "case_id": r.case_study_id,
                "title": r.title,
                "due_date": _ts(r.due_date),
                "students": int(r.students),
                "completed": int(r.completed),
            }
            for r in deadline_rows
        ],
        "sections": [
            {
                "id": r.id,
                "name": r.name,
                "course_name": r.course_name,
                "semester_name": r.semester_name,
                "students": int(r.students or 0),
                "avg_score_pct": _pct(r.avg_score_pct),
                "completion_pct": _ratio_pct(r.completed, r.assigned),
            }
            for r in section_rows
        ],
        "recent_submissions": [
            {
                "attempt_id": r.id,
                "student_name": r.student_name,
                "case_title": r.case_title,
                "status": r.status,
                "score_pct": _pct(float(r.marks_total) * 100.0 / float(r.total_marks))
                if r.marks_total is not None and r.total_marks else None,
                "submitted_at": _ts(r.at),
                "ai_flagged": bool(r.ai_flagged),
            }
            for r in submission_rows
        ],
        "students_needing_support": [
            {
                "user_id": r.user_id,
                "name": r.name,
                "avg_score_pct": _pct(r.avg_score_pct),
                "evaluated_attempts": int(r.evaluated),
            }
            for r in attention_rows
        ],
    }, INSIGHTS_TTL_SECONDS)


# ---------------------------------------------------------------------------
# Student
# ---------------------------------------------------------------------------

def student_dashboard_insights(db: Session, current_user: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    user_id = current_user["id"]
    cache_key = f"student_insights:{user_id}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached
    student_id = db.execute(
        text("SELECT id FROM students WHERE user_id = :uid"), {"uid": user_id}
    ).scalar()
    if student_id is None:
        return None
    params = {"sid": student_id, "uid": user_id}

    counts = db.execute(
        text(f"""
            SELECT
                COUNT(*) AS assigned,
                COUNT(*) FILTER (WHERE ac.status = 'completed') AS completed,
                COUNT(*) FILTER (WHERE {OPEN_ASSIGNMENT} AND ac.due_date < NOW()) AS overdue,
                COUNT(*) FILTER (WHERE {OPEN_ASSIGNMENT} AND ac.due_date >= NOW()
                                   AND ac.due_date < NOW() + INTERVAL '7 days') AS due_7d
            FROM assigned_cases ac WHERE ac.student_id = :sid
        """),
        params,
    ).fetchone()

    status_row = db.execute(
        text(f"SELECT {_STATUS_COUNTS_SQL} FROM assigned_cases ac WHERE ac.student_id = :sid"),
        params,
    ).fetchone()

    deadline_rows = db.execute(
        text(f"""
            SELECT cs.id AS case_id, cs.title, ac.due_date, ac.status
            FROM assigned_cases ac JOIN case_studies cs ON cs.id = ac.case_study_id
            WHERE ac.student_id = :sid AND {OPEN_ASSIGNMENT}
            ORDER BY ac.due_date ASC NULLS LAST, ac.assigned_at DESC
            LIMIT 6
        """),
        params,
    ).fetchall()

    trend_rows = db.execute(
        text(f"""
            SELECT * FROM (
                SELECT cs.id AS case_id, cs.title, {SCORE_PCT_SQL} AS score_pct,
                       COALESCE(csa.end_time, csa.start_time) AS at
                FROM case_study_attempts csa JOIN case_studies cs ON cs.id = csa.case_study_id
                WHERE csa.student_id = :uid AND csa.status = 'evaluated' AND csa.marks_total IS NOT NULL
                ORDER BY COALESCE(csa.end_time, csa.start_time) DESC NULLS LAST
                LIMIT 6
            ) recent ORDER BY at ASC NULLS FIRST
        """),
        params,
    ).fetchall()

    return cache_set(cache_key, {
        "progress": {
            "assigned": int(counts.assigned or 0),
            "completed": int(counts.completed or 0),
            "completion_pct": _ratio_pct(counts.completed, counts.assigned),
            "overdue": int(counts.overdue or 0),
            "due_next_7_days": int(counts.due_7d or 0),
        },
        "assignment_status": _status_counts(status_row),
        "deadlines": [
            {
                "case_id": r.case_id,
                "title": r.title,
                "due_date": _ts(r.due_date),
                "started": r.status == "active",
            }
            for r in deadline_rows
        ],
        "score_trend": [
            {"case_id": r.case_id, "title": r.title, "score_pct": _pct(r.score_pct), "at": _ts(r.at)}
            for r in trend_rows
        ],
    }, INSIGHTS_TTL_SECONDS)
