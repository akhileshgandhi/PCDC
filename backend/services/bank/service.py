"""Case Study Bank — shared helpers.

Kept free of imports from services.faculty.router so the faculty router can
call into here (auto-storing AI-generated cases, releasing used entries)
without creating an import cycle.
"""

import json
from typing import Any, Dict, List, Optional

from sqlalchemy import text
from sqlalchemy.orm import Session


def parse_snapshot(raw: Optional[str]) -> Dict[str, Any]:
    try:
        parsed = json.loads(raw or "{}")
    except json.JSONDecodeError:
        parsed = {}
    return parsed if isinstance(parsed, dict) else {}


def build_snapshot_from_case(db: Session, case_id: int) -> Optional[Dict[str, Any]]:
    """Snapshot a case_studies row (sections, questions, tags, instructions)
    into the JSON shape stored in case_study_bank.case_snapshot."""
    row = db.execute(
        text("""
            SELECT id, title, description, content, domain, difficulty,
                   estimated_minutes, subject, functional_area,
                   reading_time_minutes, answer_writing_time_minutes,
                   student_instructions_before, student_instructions_during,
                   student_instructions_submission, company_background,
                   industry_background, faculty_common_mistakes,
                   faculty_discussion_points, key_learning_points,
                   evaluation_rubric, recommended_semesters
            FROM case_studies WHERE id = :cid
        """),
        {"cid": case_id},
    ).fetchone()
    if not row:
        return None

    try:
        content = json.loads(row.content or "{}")
    except json.JSONDecodeError:
        content = {"sections": {"situation": row.content or ""}}
    sections = content.get("sections") or {}

    capabilities = [
        r.tag_value
        for r in db.execute(
            text("""
                SELECT tag_value FROM case_study_tags
                WHERE case_study_id = :cid AND tag_type = 'capability'
                ORDER BY tag_value
            """),
            {"cid": case_id},
        ).fetchall()
    ]
    questions = [
        {
            "question_text": r.question_text,
            "blooms_level": r.blooms_level,
            "word_limit_min": r.word_limit_min,
            "word_limit_max": r.word_limit_max,
            "instructions": r.instructions,
            "model_answer": r.model_answer,
            "alternative_answers": r.alternative_answers,
            "marking_scheme": r.marking_scheme,
        }
        for r in db.execute(
            text("""
                SELECT question_text, blooms_level, word_limit_min, word_limit_max,
                       instructions, model_answer, alternative_answers, marking_scheme
                FROM case_questions WHERE case_study_id = :cid
                ORDER BY question_number
            """),
            {"cid": case_id},
        ).fetchall()
    ]

    rubric = {}
    if row.evaluation_rubric:
        try:
            rubric = json.loads(row.evaluation_rubric)
        except json.JSONDecodeError:
            rubric = {}

    return {
        "description": row.description or "",
        "industry": row.domain,
        "capabilities": capabilities,
        "sections": sections,
        "metadata": {"subject": row.subject, "functional_area": row.functional_area},
        "timing": {
            "reading_time_minutes": row.reading_time_minutes,
            "answer_writing_time_minutes": row.answer_writing_time_minutes,
        },
        "estimated_minutes": row.estimated_minutes,
        "instructions": {
            "student_instructions_before": row.student_instructions_before,
            "student_instructions_during": row.student_instructions_during,
            "student_instructions_submission": row.student_instructions_submission,
            "company_background": row.company_background,
            "industry_background": row.industry_background,
            "faculty_common_mistakes": row.faculty_common_mistakes,
            "faculty_discussion_points": row.faculty_discussion_points,
            "key_learning_points": row.key_learning_points,
        },
        "questions": questions,
        "case_specific_criteria": (rubric.get("case_specific_criteria") or [])[:2],
    }


def _first_semester(recommended_semesters: Optional[str]) -> Optional[int]:
    try:
        parsed = json.loads(recommended_semesters or "[]")
        return int(parsed[0]) if isinstance(parsed, list) and parsed else None
    except (json.JSONDecodeError, TypeError, ValueError, IndexError):
        return None


def upsert_ai_bank_entry(db: Session, case_id: int, current_user: Dict[str, Any]) -> None:
    """Store (or refresh) an AI-generated case in the shared bank.

    Called after a successful faculty AI-fill: every faculty's AI-generated
    case study lands in the bank automatically, tagged with their name.
    One bank entry per origin case (unique partial index on origin_case_id)."""
    snapshot = build_snapshot_from_case(db, case_id)
    if not snapshot:
        return
    row = db.execute(
        text("SELECT title, subject, difficulty, recommended_semesters FROM case_studies WHERE id = :cid"),
        {"cid": case_id},
    ).fetchone()
    if not row:
        return
    db.execute(
        text("""
            INSERT INTO case_study_bank (
                title, brief, case_snapshot, subject, semester_number, difficulty,
                source, created_by, creator_name, origin_case_id, status
            )
            VALUES (
                :title, :brief, :snapshot, :subject, :semester, :difficulty,
                'ai_generated', :uid, :uname, :cid, 'available'
            )
            ON CONFLICT (origin_case_id) WHERE origin_case_id IS NOT NULL
            DO UPDATE SET
                title = EXCLUDED.title,
                brief = EXCLUDED.brief,
                case_snapshot = EXCLUDED.case_snapshot,
                subject = EXCLUDED.subject,
                semester_number = EXCLUDED.semester_number,
                difficulty = EXCLUDED.difficulty,
                updated_at = NOW()
        """),
        {
            "title": row.title,
            "brief": snapshot.get("description") or "",
            "snapshot": json.dumps(snapshot),
            "subject": row.subject,
            "semester": _first_semester(row.recommended_semesters),
            "difficulty": row.difficulty or 1,
            "uid": current_user["id"],
            "uname": current_user.get("name"),
            "cid": case_id,
        },
    )


def release_used_entries(db: Session, case_id: int) -> None:
    """A bank entry hidden by an as-is publish of this case becomes visible
    again — the live copy is no longer an unmodified duplicate (edited or
    about to be deleted)."""
    db.execute(
        text("""
            UPDATE case_study_bank
            SET status = 'available', used_case_id = NULL, updated_at = NOW()
            WHERE used_case_id = :cid AND status = 'used'
        """),
        {"cid": case_id},
    )
