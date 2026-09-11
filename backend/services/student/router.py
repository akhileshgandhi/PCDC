from datetime import date, timedelta
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from services.auth.service import get_current_user
from services.student import capability_engine
from shared.cache import cache_get, cache_set
from shared.database import get_db

student_router = APIRouter(prefix="/student", tags=["student"])


def require_student(current_user: Dict[str, Any]) -> None:
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Student access required")


def mentor_initials(mentor_name: str) -> str:
    parts = [part for part in mentor_name.split() if part]
    if not parts:
        return ""
    if len(parts) == 1:
        return parts[0][0].upper()
    return (parts[0][0] + parts[-1][0]).upper()


@student_router.get("/profile")
def student_profile(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_student(current_user)
    row = db.execute(
        text("""
            SELECT s.id AS student_id, s.current_level,
                   u.name AS full_name, u.email,
                   c.name AS course_name, b.name AS batch_name,
                   cs.name AS section_name, se.semester_number, se.name AS semester_name,
                   m.name AS mentor_name, ct.name AS career_track_name
            FROM students s
            JOIN users u ON u.id = s.user_id
            LEFT JOIN courses c ON c.id = s.course_id
            LEFT JOIN batches b ON b.id = s.batch_id
            LEFT JOIN class_sections cs ON cs.id = s.current_section_id
            LEFT JOIN semesters se ON se.id = cs.semester_id
            LEFT JOIN users m ON m.id = s.mentor_id
            LEFT JOIN career_tracks ct ON ct.id = s.career_track_id
            WHERE s.user_id = :user_id
        """),
        {"user_id": current_user["id"]},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return {
        "student_id": row.student_id,
        "current_level": row.current_level,
        "full_name": row.full_name,
        "email": row.email,
        "course_name": row.course_name,
        "batch_name": row.batch_name,
        "section_name": row.section_name,
        "semester_number": row.semester_number,
        "semester_name": row.semester_name,
        "mentor_name": row.mentor_name,
        "career_track_name": row.career_track_name,
        "mentor": (
            {"name": row.mentor_name, "initials": mentor_initials(row.mentor_name)}
            if row.mentor_name
            else None
        ),
    }


@student_router.get("/dashboard/summary")
def student_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_student(current_user)
    user_id = current_user["id"]
    cache_key = f"student_dashboard_summary:{user_id}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    student_row = db.execute(
        text("SELECT id, current_level FROM students WHERE user_id = :user_id"),
        {"user_id": user_id},
    ).fetchone()
    if not student_row:
        raise HTTPException(status_code=404, detail="Student profile not found")
    student_id = student_row.id

    capability_rows = db.execute(
        text("""
            SELECT c.name, sc.current_score
            FROM student_capabilities sc
            JOIN capabilities c ON c.id = sc.capability_id
            WHERE sc.student_id = :student_id
            ORDER BY c.name
        """),
        {"student_id": student_id},
    ).fetchall()

    overall_score = db.execute(
        text("""
            SELECT AVG(current_score)
            FROM student_capabilities
            WHERE student_id = :student_id
        """),
        {"student_id": student_id},
    ).scalar()

    pending_simulations = db.execute(
        text("""
            SELECT COUNT(*)
            FROM assigned_cases
            WHERE student_id = :student_id AND status = 'pending'
        """),
        {"student_id": student_id},
    ).scalar() or 0

    completed_simulations = db.execute(
        text("""
            SELECT COUNT(*)
            FROM case_study_attempts
            WHERE student_id = :user_id AND status = 'evaluated'
        """),
        {"user_id": user_id},
    ).scalar() or 0

    active_case_row = db.execute(
        text("""
            SELECT cs.id AS case_id, cs.title, cs.domain, cs.difficulty,
                   cs.case_code, cs.subject, cs.difficulty_label, ac.due_date, ac.status
            FROM assigned_cases ac
            JOIN case_studies cs ON cs.id = ac.case_study_id
            WHERE ac.student_id = :student_id AND ac.status IN ('pending', 'active')
            ORDER BY (ac.status = 'active') DESC, ac.assigned_at DESC
            LIMIT 1
        """),
        {"student_id": student_id},
    ).fetchone()

    upcoming_session_row = db.execute(
        text("""
            SELECT se.id, se.session_type, se.scheduled_at, u.name AS mentor_name
            FROM session_students ss
            JOIN sessions se ON se.id = ss.session_id
            JOIN users u ON u.id = se.mentor_id
            WHERE ss.student_id = :student_id
              AND se.completed_at IS NULL
              AND se.scheduled_at > NOW()
            ORDER BY se.scheduled_at ASC
            LIMIT 1
        """),
        {"student_id": student_id},
    ).fetchone()

    matrix = capability_engine.get_capability_matrix(db, student_id)

    result = {
        "overall_capability_score": round(float(overall_score), 1) if overall_score is not None else 0,
        "capability_scores": [
            {"capability": row.name, "score": int(row.current_score)}
            for row in capability_rows
        ],
        "pending_simulations": int(pending_simulations),
        "completed_simulations": int(completed_simulations),
        "current_level": student_row.current_level,
        "level_label": capability_engine.get_level_label(student_row.current_level),
        "hero_message": capability_engine.get_hero_message(
            matrix["categories"], matrix["total_attempts"]
        ),
        "active_case": {
            "case_id": active_case_row.case_id,
            "title": active_case_row.title,
            "domain": active_case_row.domain,
            "difficulty": active_case_row.difficulty,
            "case_code": active_case_row.case_code,
            "subject": active_case_row.subject,
            "difficulty_label": active_case_row.difficulty_label,
            "due_date": str(active_case_row.due_date) if active_case_row.due_date else None,
            "started": active_case_row.status == "active",
        } if active_case_row else None,
        "upcoming_session": {
            "id": upcoming_session_row.id,
            "session_type": upcoming_session_row.session_type,
            "scheduled_at": str(upcoming_session_row.scheduled_at),
            "mentor_name": upcoming_session_row.mentor_name,
        } if upcoming_session_row else None,
    }
    return cache_set(cache_key, result)


@student_router.get("/dashboard/capabilities")
def student_dashboard_capabilities(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_student(current_user)
    student_row = db.execute(
        text("SELECT id FROM students WHERE user_id = :user_id"),
        {"user_id": current_user["id"]},
    ).fetchone()
    if not student_row:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return capability_engine.get_capability_matrix(db, student_row.id)


SIMULATION_GROUPS = [
    ("think", "Think"),
    ("lead", "Lead"),
    ("execute", "Execute"),
    ("grow", "Grow"),
]


@student_router.get("/active-engagements")
def student_active_engagements(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_student(current_user)
    student_row = db.execute(
        text("SELECT id FROM students WHERE user_id = :user_id"),
        {"user_id": current_user["id"]},
    ).fetchone()
    if not student_row:
        raise HTTPException(status_code=404, detail="Student profile not found")
    student_id = student_row.id

    active_case_row = db.execute(
        text("""
            SELECT cs.id AS case_id, cs.title, cs.domain, cs.difficulty,
                   cs.case_code, cs.subject, cs.difficulty_label, ac.due_date, ac.status
            FROM assigned_cases ac
            JOIN case_studies cs ON cs.id = ac.case_study_id
            WHERE ac.student_id = :student_id AND ac.status IN ('pending', 'active')
            ORDER BY (ac.status = 'active') DESC, ac.assigned_at DESC
            LIMIT 1
        """),
        {"student_id": student_id},
    ).fetchone()

    simulation_rows = db.execute(
        text("""
            SELECT c.capability_group, c.name, COALESCE(sc.current_score, 0) AS score
            FROM capabilities c
            LEFT JOIN student_capabilities sc
                ON sc.capability_id = c.id AND sc.student_id = :student_id
            WHERE c.engagement_type = 'simulation'
            ORDER BY c.capability_group, c.name
        """),
        {"student_id": student_id},
    ).fetchall()

    capabilities_by_group: Dict[str, Any] = {key: [] for key, _ in SIMULATION_GROUPS}
    for row in simulation_rows:
        if row.capability_group in capabilities_by_group:
            capabilities_by_group[row.capability_group].append(
                {"name": row.name, "score": int(row.score)}
            )

    return {
        "active_case_study": {
            "case_id": active_case_row.case_id,
            "title": active_case_row.title,
            "domain": active_case_row.domain,
            "difficulty": active_case_row.difficulty,
            "case_code": active_case_row.case_code,
            "subject": active_case_row.subject,
            "difficulty_label": active_case_row.difficulty_label,
            "due_date": str(active_case_row.due_date) if active_case_row.due_date else None,
            "started": active_case_row.status == "active",
        } if active_case_row else None,
        "simulations": {
            "groups": [
                {"name": label, "capabilities": capabilities_by_group[key]}
                for key, label in SIMULATION_GROUPS
            ]
        },
        "concept_study": {
            "status": "coming_soon",
            "groups": [label for _, label in SIMULATION_GROUPS],
        },
    }


def _evaluation_status_label(score: float) -> str:
    if score >= 75:
        return "Excellent"
    if score >= 65:
        return "Good"
    if score >= 50:
        return "Improving"
    return "Needs Work"


@student_router.get("/recent-evaluations")
def student_recent_evaluations(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_student(current_user)
    rows = db.execute(
        text("""
            SELECT cs.title,
                   COALESCE(csa.end_time, csa.start_time) AS dt,
                   ev.total_score
            FROM case_study_attempts csa
            JOIN case_studies cs ON cs.id = csa.case_study_id
            JOIN cs_evaluations ev ON ev.attempt_id = csa.id
            WHERE csa.student_id = :user_id
            ORDER BY csa.id DESC
            LIMIT 5
        """),
        {"user_id": current_user["id"]},
    ).fetchall()
    return {
        "items": [
            {
                "title": row.title,
                "date": str(row.dt) if row.dt else None,
                "score": int(round(float(row.total_score or 0))),
                "status": _evaluation_status_label(float(row.total_score or 0)),
            }
            for row in rows
        ]
    }


@student_router.get("/achievements")
def student_achievements(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_student(current_user)
    user_id = current_user["id"]
    student = db.execute(
        text("SELECT id, current_level FROM students WHERE user_id = :uid"),
        {"uid": user_id},
    ).fetchone()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    student_id = student.id
    current_level = student.current_level or 1

    attempts = db.execute(
        text("""
            SELECT cs.difficulty, cs.domain, ev.total_score
            FROM case_study_attempts csa
            JOIN case_studies cs ON cs.id = csa.case_study_id
            JOIN cs_evaluations ev ON ev.attempt_id = csa.id
            WHERE csa.student_id = :uid
        """),
        {"uid": user_id},
    ).fetchall()
    scores = [float(a.total_score or 0) for a in attempts]
    completed = len(attempts)
    max_score = max(scores) if scores else 0
    scored_70 = sum(1 for s in scores if s >= 70)
    hardest = max((a.difficulty or 0 for a in attempts), default=0)
    domains = {a.domain for a in attempts if a.domain}

    caps = db.execute(
        text("""
            SELECT c.capability_group, sc.current_score
            FROM student_capabilities sc
            JOIN capabilities c ON c.id = sc.capability_id
            WHERE sc.student_id = :sid
        """),
        {"sid": student_id},
    ).fetchall()
    max_cap = max((float(c.current_score or 0) for c in caps), default=0)
    groups_with_score = {c.capability_group for c in caps if float(c.current_score or 0) > 0}
    total_groups = {c.capability_group for c in caps if c.capability_group}

    def badge(key: str, label: str, description: str, earned: bool) -> Dict[str, Any]:
        return {"key": key, "label": label, "description": description, "earned": bool(earned)}

    badges = [
        badge("first_case", "First Case", "Complete your first case study", completed >= 1),
        badge("high_scorer", "High Scorer", "Score 85 or above on a case", max_score >= 85),
        badge("consistent", "Consistent Performer", "Score 70+ on three cases", scored_70 >= 3),
        badge("capability_master", "Capability Master", "Reach 80 in any capability", max_cap >= 80),
        badge("level_up", "Level Up", "Advance beyond Foundation level", current_level >= 2),
        badge("difficulty_climber", "Difficulty Climber", "Complete a Level 3+ case", hardest >= 3),
        badge("domain_explorer", "Domain Explorer", "Complete cases in three domains", len(domains) >= 3),
        badge(
            "well_rounded",
            "Well-Rounded",
            "Score in every capability group",
            bool(total_groups) and total_groups <= groups_with_score,
        ),
    ]

    target = 3 if completed < 3 else (5 if completed < 5 else 10)
    next_milestone = {
        "label": f"Complete {target} case studies",
        "current": min(completed, target),
        "target": target,
    }

    # --- streak: consecutive active days from login history ---
    login_days = db.execute(
        text("SELECT DISTINCT DATE(created_at) AS d FROM login_events WHERE user_id = :uid"),
        {"uid": user_id},
    ).fetchall()
    day_set = {row.d for row in login_days}
    streak = 0
    cursor = date.today()
    if cursor not in day_set and (cursor - timedelta(days=1)) in day_set:
        cursor = cursor - timedelta(days=1)
    while cursor in day_set:
        streak += 1
        cursor = cursor - timedelta(days=1)

    total_points = int(sum(scores))

    # --- cohort leaderboard: students sharing this student's section(s) ---
    cohort_rows = db.execute(
        text("""
            SELECT u.id AS user_id, u.name, COALESCE(s.current_level, 1) AS level,
                   COALESCE(ROUND(AVG(sc.current_score)), 0) AS score,
                   COALESCE(ca.cases, 0) AS cases
            FROM student_sections mine
            JOIN student_sections ss
                ON ss.section_id = mine.section_id AND ss.status = 'active'
            JOIN students s ON s.id = ss.student_id
            JOIN users u ON u.id = s.user_id
            LEFT JOIN student_capabilities sc ON sc.student_id = s.id
            LEFT JOIN LATERAL (
                SELECT COUNT(*) AS cases
                FROM case_study_attempts csa
                JOIN cs_evaluations ev ON ev.attempt_id = csa.id
                WHERE csa.student_id = u.id
            ) ca ON true
            WHERE mine.student_id = :sid AND mine.status = 'active'
            GROUP BY u.id, u.name, s.current_level, ca.cases
            ORDER BY score DESC, cases DESC, u.name ASC
        """),
        {"sid": student_id},
    ).fetchall()

    leaderboard = []
    self_rank = None
    for index, row in enumerate(cohort_rows):
        rank = index + 1
        is_self = row.user_id == user_id
        if is_self:
            self_rank = rank
        parts = (row.name or "").split()
        if is_self:
            display = "You"
        elif len(parts) > 1:
            display = f"{parts[0]} {parts[-1][0]}."
        elif parts:
            display = parts[0]
        else:
            display = "Student"
        leaderboard.append({
            "rank": rank,
            "name": display,
            "score": int(row.score or 0),
            "level": int(row.level or 1),
            "cases": int(row.cases or 0),
            "self": is_self,
        })

    top_leaderboard = leaderboard[:10]
    if self_rank and self_rank > 10:
        top_leaderboard.append(leaderboard[self_rank - 1])

    milestones = [
        {"title": b["label"], "date": "Earned", "status": "done"}
        for b in badges
        if b["earned"]
    ]
    milestones.append(
        {"title": next_milestone["label"], "date": "Pending", "status": "pending"}
    )

    earned_count = sum(1 for b in badges if b["earned"])
    return {
        "badges": badges,
        "earned_count": earned_count,
        "next_milestone": next_milestone,
        "stats": {
            "badges_earned": earned_count,
            "streak_days": streak,
            "total_points": total_points,
            "cohort_rank": self_rank,
            "cohort_size": len(leaderboard),
        },
        "leaderboard": top_leaderboard,
        "milestones": milestones,
    }


@student_router.get("/career-pathway")
def student_career_pathway(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_student(current_user)
    user_id = current_user["id"]
    student = db.execute(
        text("SELECT id, career_track_id FROM students WHERE user_id = :uid"),
        {"uid": user_id},
    ).fetchone()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    student_id = student.id

    track_name = None
    if student.career_track_id:
        track_row = db.execute(
            text("SELECT name FROM career_tracks WHERE id = :tid"),
            {"tid": student.career_track_id},
        ).fetchone()
        track_name = track_row.name if track_row else None

    progress = db.execute(
        text("""
            SELECT COUNT(*) AS total,
                   COUNT(*) FILTER (WHERE current_score > 0) AS developed
            FROM student_capabilities WHERE student_id = :sid
        """),
        {"sid": student_id},
    ).fetchone()

    # Focus = the weakest capability from each capability group (think/lead/
    # execute/grow), so the 3 areas are spread across skill areas rather than
    # three alphabetically-adjacent items when many scores are tied.
    focus = db.execute(
        text("""
            WITH ranked AS (
                SELECT c.name, sc.current_score,
                       ROW_NUMBER() OVER (
                           PARTITION BY c.capability_group
                           ORDER BY sc.current_score ASC, c.name ASC
                       ) AS rn
                FROM student_capabilities sc
                JOIN capabilities c ON c.id = sc.capability_id
                WHERE sc.student_id = :sid AND c.engagement_type = 'simulation'
            )
            SELECT name, current_score
            FROM ranked
            WHERE rn = 1
            ORDER BY current_score ASC, name ASC
            LIMIT 3
        """),
        {"sid": student_id},
    ).fetchall()

    focus_set = {row.name for row in focus}
    # Pending cases plus the combination of capabilities each one develops
    # (a case can build several capabilities, and a capability spans many cases).
    rec_rows = db.execute(
        text("""
            SELECT cs.id, cs.title, cs.difficulty, cs.difficulty_label, cs.domain,
                   COALESCE(
                       ARRAY_AGG(DISTINCT t.tag_value) FILTER (WHERE t.tag_value IS NOT NULL),
                       ARRAY[]::text[]
                   ) AS develops
            FROM assigned_cases ac
            JOIN case_studies cs ON cs.id = ac.case_study_id
            LEFT JOIN case_study_tags t
                ON t.case_study_id = cs.id AND t.tag_type = 'capability'
            WHERE ac.student_id = :sid AND ac.status <> 'completed'
            GROUP BY cs.id, cs.title, cs.difficulty, cs.difficulty_label, cs.domain
        """),
        {"sid": student_id},
    ).fetchall()

    # Prioritise cases that develop the student's focus (weak) capabilities.
    recs = sorted(
        rec_rows,
        key=lambda r: (
            -len(focus_set.intersection(r.develops or [])),
            r.difficulty or 0,
            r.title or "",
        ),
    )[:3]

    return {
        "pathway_name": track_name or "Your Development Path",
        "has_track": track_name is not None,
        "progress": {
            "developed": int(progress.developed or 0),
            "total": int(progress.total or 0),
        },
        "focus_areas": [
            {"capability": row.name, "score": int(row.current_score or 0)} for row in focus
        ],
        "recommended_cases": [
            {
                "case_id": row.id,
                "title": row.title,
                "level": row.difficulty_label or f"Level {row.difficulty}",
                "domain": row.domain,
                "develops": list(row.develops or []),
            }
            for row in recs
        ],
    }
