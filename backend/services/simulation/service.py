import json
import os
from typing import Any, Dict, List, Optional

from anthropic import Anthropic
from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .models import CaseStudyCreate


DISCUSSION_SYSTEM_PROMPT = """
You are an expert business advisor and case study mentor.
The student has submitted their initial analysis of a case study.
Your role is to:
1. Ask probing questions to deepen their thinking
2. Provide relevant frameworks, data, or perspectives they may have missed
3. Challenge assumptions gently but firmly
4. Never give them the answer directly - guide their thinking
5. Keep responses concise and focused

The student's initial analysis is provided in the conversation history.
"""

DEFENSE_PROMPT = """
You are a critical examiner reviewing the student's solution.
Generate exactly 3 challenging defense questions based on their solution.
Questions must test:
1. Risk awareness - what could go wrong?
2. Alternative thinking - what other approaches exist?
3. Implementation reality - how would this actually work?

Return exactly 3 questions as a JSON array:
["question1", "question2", "question3"]
"""

EVALUATION_PROMPT = """
You are an expert capability evaluator. Evaluate the student's
complete case study attempt and return a JSON object with these
exact keys:

{
  "thinking_depth": 0-100,
  "logic_score": 0-100,
  "creativity_score": 0-100,
  "practicality_score": 0-100,
  "risk_awareness_score": 0-100,
  "reflection_score": 0-100,
  "ai_utilization_score": 0-100,
  "time_score": 0-100,
  "strengths": "2-3 sentences",
  "weaknesses": "2-3 sentences",
  "blind_spots": "1-2 sentences",
  "improvement_areas": "2-3 actionable suggestions"
}

Weighted total = (thinking_depth * 0.30) + (logic * 0.20) +
(creativity * 0.15) + (practicality * 0.15) +
(risk_awareness * 0.10) + (reflection * 0.10)
"""

VALID_DOMAINS = {
    "geopolitics",
    "sports",
    "business",
    "social",
    "science",
    "technology",
    "environment",
    "healthcare",
}
VALID_SOURCES = {"faculty", "mentor", "ai_generated", "admin_import"}
VALID_TAG_TYPES = {"domain", "career_track", "capability"}

CAPABILITY_MAP = {
    "analytical_thinking": 1,
    "critical_thinking": 2,
    "strategic_thinking": 3,
    "decision_making": 4,
    "communication": 5,
    "leadership": 6,
    "innovation": 7,
    "risk_assessment": 8,
}


def require_role(current_user: Dict[str, Any], allowed_roles: List[str], message: str) -> None:
    if current_user["role"] not in allowed_roles:
        raise HTTPException(status_code=403, detail=message)


def count_words(text_value: str) -> int:
    return len([word for word in text_value.split() if word.strip()])


def get_case_tags(db: Session, case_study_id: int) -> List[Dict[str, Any]]:
    rows = db.execute(
        text("""
            SELECT tag_type, tag_value
            FROM case_study_tags
            WHERE case_study_id = :case_study_id
            ORDER BY tag_type, tag_value
        """),
        {"case_study_id": case_study_id},
    ).fetchall()
    return [{"tag_type": row[0], "tag_value": row[1]} for row in rows]


def case_row_to_response(db: Session, row: Any) -> Dict[str, Any]:
    return {
        "id": row.id,
        "title": row.title,
        "description": row.description,
        "domain": row.domain,
        "difficulty": row.difficulty,
        "estimated_minutes": row.estimated_minutes,
        "source": row.source,
        "status": row.status,
        "created_by": row.created_by,
        "tags": get_case_tags(db, row.id),
        "created_at": str(row.created_at),
    }


def validate_case_study(data: CaseStudyCreate) -> None:
    if data.domain not in VALID_DOMAINS:
        raise HTTPException(status_code=400, detail="Invalid case study domain")
    if data.difficulty < 1 or data.difficulty > 7:
        raise HTTPException(status_code=400, detail="Difficulty must be between 1 and 7")
    if data.source not in VALID_SOURCES:
        raise HTTPException(status_code=400, detail="Invalid case study source")
    for tag in data.tags:
        if tag.tag_type not in VALID_TAG_TYPES:
            raise HTTPException(status_code=400, detail="Invalid case study tag type")


def create_case_study(
    db: Session, data: CaseStudyCreate, current_user: Dict[str, Any]
) -> Dict[str, Any]:
    require_role(
        current_user,
        ["faculty", "mentor", "admin"],
        "Only faculty, mentors, and admins can create cases",
    )
    validate_case_study(data)
    result = db.execute(
        text("""
            INSERT INTO case_studies (
                title, description, content, domain, difficulty,
                estimated_minutes, source, status, created_by,
                evaluation_rubric, learning_outcomes, reflection_questions
            )
            VALUES (
                :title, :description, :content, :domain, :difficulty,
                :estimated_minutes, :source, 'draft', :created_by,
                :evaluation_rubric, :learning_outcomes, :reflection_questions
            )
            RETURNING id, title, description, domain, difficulty,
                      estimated_minutes, source, status, created_by, created_at
        """),
        {
            "title": data.title,
            "description": data.description,
            "content": data.content,
            "domain": data.domain,
            "difficulty": data.difficulty,
            "estimated_minutes": data.estimated_minutes,
            "source": data.source,
            "created_by": current_user["id"],
            "evaluation_rubric": data.evaluation_rubric,
            "learning_outcomes": data.learning_outcomes,
            "reflection_questions": data.reflection_questions,
        },
    )
    row = result.fetchone()
    insert_case_tags(db, row.id, data.tags)
    db.commit()
    return case_row_to_response(db, row)


def insert_case_tags(db: Session, case_study_id: int, tags: List[Any]) -> None:
    for tag in tags:
        db.execute(
            text("""
                INSERT INTO case_study_tags (case_study_id, tag_type, tag_value)
                VALUES (:case_study_id, :tag_type, :tag_value)
                ON CONFLICT (case_study_id, tag_type, tag_value) DO NOTHING
            """),
            {
                "case_study_id": case_study_id,
                "tag_type": tag.tag_type,
                "tag_value": tag.tag_value,
            },
        )


def list_case_studies(
    db: Session,
    current_user: Dict[str, Any],
    domain: Optional[str],
    difficulty: Optional[int],
    career_track: Optional[str],
    capability: Optional[str],
    status: str,
) -> List[Dict[str, Any]]:
    where_clauses = ["cs.status = :status"]
    params: Dict[str, Any] = {"status": status}
    add_case_filters(where_clauses, params, domain, difficulty, career_track, capability)
    rows = db.execute(
        text(f"""
            SELECT cs.id, cs.title, cs.description, cs.domain, cs.difficulty,
                   cs.estimated_minutes, cs.source, cs.status, cs.created_by,
                   cs.created_at
            FROM case_studies cs
            WHERE {" AND ".join(where_clauses)}
            ORDER BY cs.created_at DESC
        """),
        params,
    ).fetchall()
    return [case_row_to_response(db, row) for row in rows]


def add_case_filters(
    where_clauses: List[str],
    params: Dict[str, Any],
    domain: Optional[str],
    difficulty: Optional[int],
    career_track: Optional[str],
    capability: Optional[str],
) -> None:
    if domain:
        where_clauses.append("cs.domain = :domain")
        params["domain"] = domain
    if difficulty:
        where_clauses.append("cs.difficulty = :difficulty")
        params["difficulty"] = difficulty
    if career_track:
        add_tag_filter(where_clauses, params, "career_track", career_track, "career_track")
    if capability:
        add_tag_filter(where_clauses, params, "capability", capability, "capability")


def add_tag_filter(
    where_clauses: List[str], params: Dict[str, Any], tag_type: str, tag_value: str, key: str
) -> None:
    where_clauses.append(f"""
        EXISTS (
            SELECT 1 FROM case_study_tags cst
            WHERE cst.case_study_id = cs.id
              AND cst.tag_type = :{key}_type
              AND cst.tag_value = :{key}
        )
    """)
    params[f"{key}_type"] = tag_type
    params[key] = tag_value


def get_case_study(db: Session, case_id: int, current_user: Dict[str, Any]) -> Dict[str, Any]:
    row = db.execute(
        text("""
            SELECT id, title, description, domain, difficulty,
                   estimated_minutes, source, status, created_by, created_at
            FROM case_studies
            WHERE id = :case_id
        """),
        {"case_id": case_id},
    ).fetchone()
    if not row or (row.status != "published" and current_user["role"] == "student"):
        raise HTTPException(status_code=404, detail="Case study not found")
    return case_row_to_response(db, row)


def update_case_status(
    db: Session, case_id: int, status: str, current_user: Dict[str, Any]
) -> Dict[str, Any]:
    require_role(current_user, ["faculty", "admin"], "Only faculty and admins can update cases")
    result = db.execute(
        text("""
            UPDATE case_studies
            SET status = :status, updated_at = NOW()
            WHERE id = :case_id
            RETURNING id, title, description, domain, difficulty,
                      estimated_minutes, source, status, created_by, created_at
        """),
        {"case_id": case_id, "status": status},
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Case study not found")
    db.commit()
    return case_row_to_response(db, row)


def start_case_attempt(
    db: Session, case_study_id: int, current_user: Dict[str, Any]
) -> Dict[str, Any]:
    require_role(current_user, ["student"], "Only students can start case attempts")
    case_row = get_published_case_content(db, case_study_id)
    try:
        result = db.execute(
            text("""
                INSERT INTO case_study_attempts (
                    case_study_id, student_id, initial_word_count, status
                )
                VALUES (:case_study_id, :student_id, 0, 'analysis_submitted')
                RETURNING id, status
            """),
            {"case_study_id": case_study_id, "student_id": current_user["id"]},
        )
        attempt_row = result.fetchone()
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409, detail="You have already attempted this case study"
        )
    return {
        "attempt_id": attempt_row.id,
        "case_study_id": case_row.id,
        "title": case_row.title,
        "content": case_row.content,
        "reflection_questions": case_row.reflection_questions,
        "status": attempt_row.status,
    }


def get_published_case_content(db: Session, case_study_id: int) -> Any:
    row = db.execute(
        text("""
            SELECT id, title, content, reflection_questions
            FROM case_studies
            WHERE id = :case_study_id AND status = 'published'
        """),
        {"case_study_id": case_study_id},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Case study not found")
    return row


def submit_initial_analysis(
    db: Session, attempt_id: int, initial_analysis: str, current_user: Dict[str, Any]
) -> Dict[str, Any]:
    require_role(current_user, ["student"], "Only students can submit analysis")
    attempt = get_student_attempt(db, attempt_id, current_user["id"])
    if attempt.status != "analysis_submitted":
        raise HTTPException(status_code=400, detail="Initial analysis already submitted")
    word_count = count_words(initial_analysis)
    if word_count < 200:
        raise HTTPException(
            status_code=400,
            detail=f"Minimum 200 words required. Current: {word_count} words",
        )
    db.execute(
        text("""
            UPDATE case_study_attempts
            SET initial_analysis = :initial_analysis,
                initial_word_count = :word_count,
                ai_unlocked_at = NOW(),
                status = 'ai_discussion'
            WHERE id = :attempt_id
        """),
        {
            "attempt_id": attempt.id,
            "initial_analysis": initial_analysis,
            "word_count": word_count,
        },
    )
    db.commit()
    return {"ai_unlocked": True, "attempt_id": attempt_id}


def get_student_attempt(db: Session, attempt_id: int, student_id: int) -> Any:
    row = db.execute(
        text("""
            SELECT *
            FROM case_study_attempts
            WHERE id = :attempt_id AND student_id = :student_id
        """),
        {"attempt_id": attempt_id, "student_id": student_id},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Attempt not found")
    return row


def send_ai_message(
    db: Session, attempt_id: int, message: str, current_user: Dict[str, Any]
) -> Dict[str, str]:
    require_role(current_user, ["student"], "Only students can message the AI")
    attempt = get_student_attempt(db, attempt_id, current_user["id"])
    if attempt.status != "ai_discussion":
        raise HTTPException(status_code=403, detail="Please submit your initial analysis first")
    messages = build_discussion_messages(db, attempt, message)
    response = call_claude(DISCUSSION_SYSTEM_PROMPT, messages, 900)
    log_conversation(db, attempt_id, "student", "discussion", message)
    log_conversation(db, attempt_id, "ai", "discussion", response)
    db.commit()
    return {"response": response}


def build_discussion_messages(db: Session, attempt: Any, message: str) -> List[Dict[str, str]]:
    history = get_conversation_messages(db, attempt.id)
    messages = [{"role": "user", "content": f"Initial analysis:\n{attempt.initial_analysis}"}]
    messages.extend(history)
    messages.append({"role": "user", "content": message})
    return messages


def get_conversation_messages(db: Session, attempt_id: int) -> List[Dict[str, str]]:
    rows = db.execute(
        text("""
            SELECT role, message
            FROM cs_ai_conversations
            WHERE attempt_id = :attempt_id
            ORDER BY timestamp, id
        """),
        {"attempt_id": attempt_id},
    ).fetchall()
    return [
        {"role": "assistant" if row.role == "ai" else "user", "content": row.message}
        for row in rows
    ]


def submit_solution(
    db: Session, attempt_id: int, final_solution: str, current_user: Dict[str, Any]
) -> Dict[str, List[str]]:
    require_role(current_user, ["student"], "Only students can submit solutions")
    attempt = get_student_attempt(db, attempt_id, current_user["id"])
    if attempt.status != "ai_discussion":
        raise HTTPException(status_code=403, detail="Please complete AI discussion first")
    db.execute(
        text("""
            UPDATE case_study_attempts
            SET final_solution = :final_solution, status = 'solution_submitted'
            WHERE id = :attempt_id
        """),
        {"attempt_id": attempt.id, "final_solution": final_solution},
    )
    questions = generate_defense_questions(db, attempt.id, final_solution)
    log_conversation(db, attempt.id, "ai", "defense", json.dumps(questions))
    db.commit()
    return {"defense_questions": questions}


def generate_defense_questions(db: Session, attempt_id: int, final_solution: str) -> List[str]:
    attempt_context = get_attempt_context(db, attempt_id)
    prompt = (
        f"Case:\n{attempt_context['case_content']}\n\n"
        f"Initial analysis:\n{attempt_context['initial_analysis']}\n\n"
        f"Final solution:\n{final_solution}"
    )
    response = call_claude(DEFENSE_PROMPT, [{"role": "user", "content": prompt}], 500)
    questions = parse_json_response(response)
    if not isinstance(questions, list) or len(questions) != 3:
        raise HTTPException(status_code=500, detail="AI defense generation failed")
    return [str(question) for question in questions]


def submit_defense(
    db: Session, attempt_id: int, defense_responses: str, current_user: Dict[str, Any]
) -> Dict[str, Any]:
    require_role(current_user, ["student"], "Only students can submit defense responses")
    attempt = get_student_attempt(db, attempt_id, current_user["id"])
    if attempt.status != "solution_submitted":
        raise HTTPException(status_code=403, detail="Please submit your solution first")
    db.execute(
        text("""
            UPDATE case_study_attempts
            SET defense_responses = :defense_responses, status = 'defense_complete'
            WHERE id = :attempt_id
        """),
        {"attempt_id": attempt.id, "defense_responses": defense_responses},
    )
    log_conversation(db, attempt.id, "student", "defense", defense_responses)
    evaluation = generate_and_save_evaluation(db, attempt.id)
    db.commit()
    return evaluation


def submit_reflection(
    db: Session, attempt_id: int, reflection_text: str, current_user: Dict[str, Any]
) -> Dict[str, Any]:
    require_role(current_user, ["student"], "Only students can submit reflections")
    attempt = get_student_attempt(db, attempt_id, current_user["id"])
    if attempt.status != "defense_complete":
        raise HTTPException(status_code=403, detail="Please submit your defense first")
    db.execute(
        text("""
            UPDATE case_study_attempts
            SET reflection_text = :reflection_text,
                status = 'evaluated',
                end_time = NOW(),
                time_taken_minutes = CAST(EXTRACT(EPOCH FROM (NOW() - start_time)) / 60 AS INTEGER)
            WHERE id = :attempt_id
        """),
        {"attempt_id": attempt.id, "reflection_text": reflection_text},
    )
    evaluation = get_or_create_evaluation(db, attempt.id)
    update_capability_scores(db, current_user["id"], attempt.id, evaluation)
    db.commit()
    evaluation["status"] = "evaluated"
    return evaluation


def get_or_create_evaluation(db: Session, attempt_id: int) -> Dict[str, Any]:
    evaluation = get_evaluation(db, attempt_id)
    if evaluation:
        return evaluation
    return generate_and_save_evaluation(db, attempt_id)


def generate_and_save_evaluation(db: Session, attempt_id: int) -> Dict[str, Any]:
    attempt_context = get_attempt_context(db, attempt_id)
    response = call_claude(
        EVALUATION_PROMPT,
        [{"role": "user", "content": json.dumps(attempt_context)}],
        1200,
    )
    evaluation = normalize_evaluation(parse_json_response(response))
    save_evaluation(db, attempt_id, evaluation)
    evaluation["attempt_id"] = attempt_id
    return evaluation


def get_attempt_context(db: Session, attempt_id: int) -> Dict[str, Any]:
    row = db.execute(
        text("""
            SELECT c.title, c.content, a.initial_analysis, a.final_solution,
                   a.defense_responses, a.reflection_text, a.initial_word_count,
                   a.time_taken_minutes
            FROM case_study_attempts a
            JOIN case_studies c ON c.id = a.case_study_id
            WHERE a.id = :attempt_id
        """),
        {"attempt_id": attempt_id},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Attempt not found")
    return {
        "case_title": row.title,
        "case_content": row.content,
        "initial_analysis": row.initial_analysis,
        "final_solution": row.final_solution,
        "defense_responses": row.defense_responses,
        "reflection_text": row.reflection_text,
        "initial_word_count": row.initial_word_count,
        "time_taken_minutes": row.time_taken_minutes,
        "conversation": get_conversation_messages(db, attempt_id),
    }


def normalize_evaluation(data: Any) -> Dict[str, Any]:
    if not isinstance(data, dict):
        raise HTTPException(status_code=500, detail="AI evaluation failed")
    scores = {
        "thinking_depth": bounded_score(data.get("thinking_depth")),
        "logic_score": bounded_score(data.get("logic_score")),
        "creativity_score": bounded_score(data.get("creativity_score")),
        "practicality_score": bounded_score(data.get("practicality_score")),
        "risk_awareness_score": bounded_score(data.get("risk_awareness_score")),
        "reflection_score": bounded_score(data.get("reflection_score")),
        "ai_utilization_score": bounded_score(data.get("ai_utilization_score")),
        "time_score": bounded_score(data.get("time_score")),
    }
    scores["total_score"] = calculate_total_score(scores)
    scores["strengths"] = str(data.get("strengths", ""))
    scores["weaknesses"] = str(data.get("weaknesses", ""))
    scores["blind_spots"] = str(data.get("blind_spots", ""))
    scores["improvement_areas"] = str(data.get("improvement_areas", ""))
    scores["next_recommended_case_id"] = data.get("next_recommended_case_id")
    return scores


def bounded_score(value: Any) -> int:
    try:
        score = int(value)
    except (TypeError, ValueError):
        score = 0
    return max(0, min(100, score))


def calculate_total_score(scores: Dict[str, int]) -> int:
    total = (
        scores["thinking_depth"] * 0.30
        + scores["logic_score"] * 0.20
        + scores["creativity_score"] * 0.15
        + scores["practicality_score"] * 0.15
        + scores["risk_awareness_score"] * 0.10
        + scores["reflection_score"] * 0.10
    )
    return round(total)


def save_evaluation(db: Session, attempt_id: int, evaluation: Dict[str, Any]) -> None:
    values = {"attempt_id": attempt_id, **evaluation}
    db.execute(
        text("""
            INSERT INTO cs_evaluations (
                attempt_id, thinking_depth, logic_score, creativity_score,
                practicality_score, risk_awareness_score, reflection_score,
                total_score, time_score, ai_utilization_score, strengths,
                weaknesses, blind_spots, improvement_areas, next_recommended_case_id
            )
            VALUES (
                :attempt_id, :thinking_depth, :logic_score, :creativity_score,
                :practicality_score, :risk_awareness_score, :reflection_score,
                :total_score, :time_score, :ai_utilization_score, :strengths,
                :weaknesses, :blind_spots, :improvement_areas,
                :next_recommended_case_id
            )
            ON CONFLICT (attempt_id) DO UPDATE SET
                thinking_depth = EXCLUDED.thinking_depth,
                logic_score = EXCLUDED.logic_score,
                creativity_score = EXCLUDED.creativity_score,
                practicality_score = EXCLUDED.practicality_score,
                risk_awareness_score = EXCLUDED.risk_awareness_score,
                reflection_score = EXCLUDED.reflection_score,
                total_score = EXCLUDED.total_score,
                time_score = EXCLUDED.time_score,
                ai_utilization_score = EXCLUDED.ai_utilization_score,
                strengths = EXCLUDED.strengths,
                weaknesses = EXCLUDED.weaknesses,
                blind_spots = EXCLUDED.blind_spots,
                improvement_areas = EXCLUDED.improvement_areas,
                next_recommended_case_id = EXCLUDED.next_recommended_case_id,
                evaluated_at = NOW()
        """),
        values,
    )


def get_evaluation(db: Session, attempt_id: int) -> Optional[Dict[str, Any]]:
    row = db.execute(
        text("""
            SELECT *
            FROM cs_evaluations
            WHERE attempt_id = :attempt_id
        """),
        {"attempt_id": attempt_id},
    ).fetchone()
    if not row:
        return None
    return evaluation_row_to_dict(row)


def evaluation_row_to_dict(row: Any) -> Dict[str, Any]:
    return {
        "attempt_id": row.attempt_id,
        "thinking_depth": row.thinking_depth,
        "logic_score": row.logic_score,
        "creativity_score": row.creativity_score,
        "practicality_score": row.practicality_score,
        "risk_awareness_score": row.risk_awareness_score,
        "reflection_score": row.reflection_score,
        "ai_utilization_score": row.ai_utilization_score,
        "time_score": row.time_score,
        "total_score": row.total_score,
        "strengths": row.strengths,
        "weaknesses": row.weaknesses,
        "blind_spots": row.blind_spots,
        "improvement_areas": row.improvement_areas,
        "next_recommended_case_id": row.next_recommended_case_id,
    }


def update_capability_scores(
    db: Session, student_user_id: int, attempt_id: int, evaluation: Dict[str, Any]
) -> None:
    student_profile = get_student_profile(db, student_user_id)
    if not student_profile:
        return
    capability_ids = get_attempt_capability_ids(db, attempt_id)
    for capability_id in capability_ids:
        update_single_capability_score(
            db, student_profile.id, capability_id, evaluation["total_score"]
        )


def get_student_profile(db: Session, student_user_id: int) -> Optional[Any]:
    return db.execute(
        text("SELECT id FROM students WHERE user_id = :user_id"),
        {"user_id": student_user_id},
    ).fetchone()


def get_attempt_capability_ids(db: Session, attempt_id: int) -> List[int]:
    rows = db.execute(
        text("""
            SELECT tag_value
            FROM case_study_tags
            WHERE tag_type = 'capability'
              AND case_study_id = (
                  SELECT case_study_id
                  FROM case_study_attempts
                  WHERE id = :attempt_id
              )
        """),
        {"attempt_id": attempt_id},
    ).fetchall()
    return [CAPABILITY_MAP[row.tag_value] for row in rows if row.tag_value in CAPABILITY_MAP]


def update_single_capability_score(
    db: Session, student_id: int, capability_id: int, total_score: int
) -> None:
    row = db.execute(
        text("""
            SELECT id, current_score
            FROM student_capabilities
            WHERE student_id = :student_id AND capability_id = :capability_id
        """),
        {"student_id": student_id, "capability_id": capability_id},
    ).fetchone()
    if row:
        new_score = round((row.current_score * 0.7) + (total_score * 0.3))
        db.execute(
            text("""
                UPDATE student_capabilities
                SET current_score = :new_score, last_updated = NOW()
                WHERE id = :id
            """),
            {"new_score": new_score, "id": row.id},
        )
        return
    db.execute(
        text("""
            INSERT INTO student_capabilities (student_id, capability_id, current_score)
            VALUES (:student_id, :capability_id, :current_score)
        """),
        {
            "student_id": student_id,
            "capability_id": capability_id,
            "current_score": total_score,
        },
    )


def get_attempt_detail(
    db: Session, attempt_id: int, current_user: Dict[str, Any]
) -> Dict[str, Any]:
    row = get_attempt_for_view(db, attempt_id, current_user)
    return attempt_row_to_response(db, row)


def get_attempt_for_view(db: Session, attempt_id: int, current_user: Dict[str, Any]) -> Any:
    row = db.execute(
        text("SELECT * FROM case_study_attempts WHERE id = :attempt_id"),
        {"attempt_id": attempt_id},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if can_view_attempt(db, row, current_user):
        return row
    raise HTTPException(status_code=403, detail="You do not have access to this attempt")


def can_view_attempt(db: Session, attempt: Any, current_user: Dict[str, Any]) -> bool:
    if current_user["role"] == "admin":
        return True
    if current_user["role"] == "student":
        return attempt.student_id == current_user["id"]
    if current_user["role"] == "mentor":
        return is_assigned_mentor(db, current_user["id"], attempt.student_id)
    if current_user["role"] == "faculty":
        return faculty_created_case(db, current_user["id"], attempt.case_study_id)
    return False


def is_assigned_mentor(db: Session, mentor_id: int, student_user_id: int) -> bool:
    row = db.execute(
        text("""
            SELECT id
            FROM students
            WHERE user_id = :student_user_id AND mentor_id = :mentor_id
        """),
        {"student_user_id": student_user_id, "mentor_id": mentor_id},
    ).fetchone()
    return row is not None


def faculty_created_case(db: Session, faculty_id: int, case_study_id: int) -> bool:
    row = db.execute(
        text("""
            SELECT id
            FROM case_studies
            WHERE id = :case_study_id AND created_by = :faculty_id
        """),
        {"case_study_id": case_study_id, "faculty_id": faculty_id},
    ).fetchone()
    return row is not None


def attempt_row_to_response(db: Session, row: Any) -> Dict[str, Any]:
    return {
        "id": row.id,
        "case_study_id": row.case_study_id,
        "student_id": row.student_id,
        "status": row.status,
        "initial_analysis": row.initial_analysis,
        "initial_word_count": row.initial_word_count,
        "final_solution": row.final_solution,
        "defense_responses": row.defense_responses,
        "reflection_text": row.reflection_text,
        "time_taken_minutes": row.time_taken_minutes,
        "conversations": get_conversations_for_response(db, row.id),
        "evaluation": get_evaluation(db, row.id),
    }


def get_conversations_for_response(db: Session, attempt_id: int) -> List[Dict[str, Any]]:
    rows = db.execute(
        text("""
            SELECT role, stage, message, timestamp
            FROM cs_ai_conversations
            WHERE attempt_id = :attempt_id
            ORDER BY timestamp, id
        """),
        {"attempt_id": attempt_id},
    ).fetchall()
    return [
        {
            "role": row.role,
            "stage": row.stage,
            "message": row.message,
            "timestamp": str(row.timestamp),
        }
        for row in rows
    ]


def get_student_attempts_for_mentor(
    db: Session, student_id: int, current_user: Dict[str, Any]
) -> List[Dict[str, Any]]:
    require_role(current_user, ["mentor"], "Only mentors can view student attempts")
    if not is_assigned_mentor(db, current_user["id"], student_id):
        raise HTTPException(status_code=403, detail="You do not have access to this student")
    rows = db.execute(
        text("""
            SELECT *
            FROM case_study_attempts
            WHERE student_id = :student_id
            ORDER BY start_time DESC
        """),
        {"student_id": student_id},
    ).fetchall()
    return [attempt_row_to_response(db, row) for row in rows]


def get_thinking_path_for_mentor(
    db: Session, student_id: int, attempt_id: int, current_user: Dict[str, Any]
) -> Dict[str, Any]:
    require_role(current_user, ["mentor"], "Only mentors can view thinking paths")
    if not is_assigned_mentor(db, current_user["id"], student_id):
        raise HTTPException(status_code=403, detail="You do not have access to this student")
    attempt = get_student_attempt(db, attempt_id, student_id)
    return {
        "attempt_id": attempt.id,
        "student_id": student_id,
        "conversations": get_conversations_for_response(db, attempt.id),
    }


def log_conversation(
    db: Session, attempt_id: int, role: str, stage: str, message: str
) -> None:
    db.execute(
        text("""
            INSERT INTO cs_ai_conversations (attempt_id, role, stage, message)
            VALUES (:attempt_id, :role, :stage, :message)
        """),
        {
            "attempt_id": attempt_id,
            "role": role,
            "stage": stage,
            "message": message,
        },
    )


def call_claude(
    system_prompt: str, messages: List[Dict[str, str]], max_tokens: int
) -> str:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="AI service is not configured")
    client = Anthropic(api_key=api_key)
    result = client.messages.create(
        model=os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6"),
        max_tokens=max_tokens,
        system=system_prompt,
        messages=messages,
    )
    return "".join(
        block.text for block in result.content if getattr(block, "type", None) == "text"
    ).strip()


def parse_json_response(response: str) -> Any:
    try:
        return json.loads(response)
    except json.JSONDecodeError:
        start = response.find("{")
        end = response.rfind("}")
        if start >= 0 and end > start:
            return json.loads(response[start : end + 1])
        start = response.find("[")
        end = response.rfind("]")
        if start >= 0 and end > start:
            return json.loads(response[start : end + 1])
    raise HTTPException(status_code=500, detail="AI returned invalid JSON")
