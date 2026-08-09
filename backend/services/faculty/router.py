import csv
import io
import json
import os
import secrets
import threading
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from services.auth.service import get_current_user, hash_password
from shared.cache import cache_get, cache_set
from shared.database import SessionLocal, get_db
from shared.llm import (
    get_llm_client,
    get_llm_model,
    json_response_format,
    parse_json_content,
)

faculty_router = APIRouter(prefix="/faculty", tags=["faculty"])

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

CASE_SECTIONS = [
    "situation",
    "background",
    "data",
    "characters",
    "constraints",
    "objectives",
    "timeline",
    "reflection_questions",
    "learning_outcomes",
]

ARRAY_SECTIONS = {"reflection_questions", "learning_outcomes"}

DEFAULT_CAPABILITIES = [
    "Communication",
    "Leadership",
    "Problem Solving",
    "Decision Making",
    "Innovation",
    "Strategic Thinking",
    "Entrepreneurship",
    "Professionalism",
]

DEFAULT_RUBRIC_WEIGHTS = {
    "thinking_depth": 30,
    "logic": 20,
    "creativity": 15,
    "practicality": 15,
    "risk_awareness": 10,
    "reflection": 10,
}

RUBRIC_CRITERIA = [
    {"key": "thinking_depth", "label": "Thinking Depth"},
    {"key": "logic", "label": "Logic"},
    {"key": "creativity", "label": "Creativity"},
    {"key": "practicality", "label": "Practicality"},
    {"key": "risk_awareness", "label": "Risk Awareness"},
    {"key": "reflection", "label": "Reflection"},
]

CASE_GENERATION_MODEL = os.getenv("OPENAI_CASE_GENERATION_MODEL", "gpt-4o-mini")

CASE_GENERATION_PROMPT = """
You are generating a business case study simulation for MBA students.
Given the core fields and any existing sections, produce realistic,
internally consistent case content calibrated to the stated difficulty.
The case must be solvable from the provided inputs, must avoid real named
companies and real living people, and must be faculty-editable.
Reflection questions should provoke analysis, not summary.
Output must match the provided JSON schema exactly.
"""

CASE_GENERATION_JOBS: Dict[str, Dict[str, Any]] = {}
CASE_GENERATION_JOBS_LOCK = threading.Lock()

DIFFICULTY_LABELS = ["Foundation", "Regular", "Pro", "Expert", "Champion"]
FIXED_QUESTION_MARKS = [2, 2, 3]
RAPID_FIRE_GENERATION_COUNT = 3

GENERATE_QUESTIONS_PROMPT = """
You are generating Structured Written Questions for an MBA/PGDM business
case study simulation. Given the case's core fields and a short case summary,
produce exactly 3 written questions with model answers and a marking scheme,
calibrated to the stated difficulty and targeted capabilities. Follow a
Bloom's taxonomy progression across the 3 questions: question 1 should test
lower-order thinking (Remember/Understand), question 2 middle-order
(Apply/Analyze), and question 3 higher-order thinking (Evaluate/Create).
Output must match the provided JSON schema exactly.
"""

GENERATE_RAPID_FIRE_PROMPT = """
You are generating Rapid Fire round questions for an MBA/PGDM business case
study simulation. Given the case's core fields and a short case summary,
produce exactly 3 short-answer factual questions that test recall and
understanding of the case facts, each worth 1 mark (3 rapid fire marks total),
with a concise 1-2 sentence answer. Output must match the provided JSON
schema exactly.
"""


def difficulty_label_for(difficulty: int) -> str:
    index = max(0, min(difficulty - 1, len(DIFFICULTY_LABELS) - 1))
    return DIFFICULTY_LABELS[index]


class CaseCoreFields(BaseModel):
    title: str
    industry: str
    difficulty: int
    duration_minutes: int
    capabilities: List[str] = Field(default_factory=list)
    expected_outcomes: Optional[str] = ""
    metadata: Optional[Dict[str, Any]] = None
    timing: Optional[Dict[str, Any]] = None
    marks: Optional[Dict[str, Any]] = None
    instructions: Optional[Dict[str, Any]] = None
    recommendation: Optional[Dict[str, Any]] = None


class CaseUpdateRequest(BaseModel):
    title: Optional[str] = None
    industry: Optional[str] = None
    difficulty: Optional[int] = None
    duration_minutes: Optional[int] = None
    capabilities: Optional[List[str]] = None
    expected_outcomes: Optional[str] = None
    sections: Optional[Dict[str, Any]] = None
    section_meta: Optional[Dict[str, str]] = None
    metadata: Optional[Dict[str, Any]] = None
    timing: Optional[Dict[str, Any]] = None
    marks: Optional[Dict[str, Any]] = None
    instructions: Optional[Dict[str, Any]] = None
    questions: Optional[List[Dict[str, Any]]] = None
    rapid_fire_questions: Optional[List[Dict[str, Any]]] = None
    recommendation: Optional[Dict[str, Any]] = None


class GenerateCaseRequest(BaseModel):
    scope: str
    sections: Optional[List[str]] = None
    overwrite_manual: bool = False


class GenerateCaseJobResponse(BaseModel):
    job_id: str
    case_id: int
    status: str
    scope: str
    sections: List[str]
    message: str


class RubricRequest(BaseModel):
    weights: Dict[str, int]
    case_specific_criteria: List[str] = Field(default_factory=list)


class GenerateQuestionsRequest(BaseModel):
    summary: str


class GenerateRapidFireRequest(BaseModel):
    summary: str


class AssignCaseToSectionsRequest(BaseModel):
    section_ids: List[int]
    due_date: Optional[str] = None
    instructions: Optional[str] = None


class AssignCaseToStudentsRequest(BaseModel):
    student_ids: List[int]  # students.id (from the faculty roster)
    due_date: Optional[str] = None
    instructions: Optional[str] = None


def require_faculty(current_user: Dict[str, Any]) -> None:
    if current_user["role"] not in ["faculty", "admin"]:
        raise HTTPException(status_code=403, detail="Faculty access required")


def normalize_domain(value: str) -> str:
    normalized = value.strip().lower().replace(" ", "_")
    if normalized not in VALID_DOMAINS:
        raise HTTPException(status_code=400, detail="Invalid industry/domain")
    return normalized


def validate_core_fields(data: CaseCoreFields) -> None:
    if not data.title.strip():
        raise HTTPException(status_code=400, detail="Title is required")
    normalize_domain(data.industry)
    if data.difficulty < 1 or data.difficulty > 7:
        raise HTTPException(status_code=400, detail="Difficulty must be between 1 and 7")
    if data.duration_minutes < 1:
        raise HTTPException(status_code=400, detail="Duration must be at least 1 minute")
    if not data.capabilities:
        raise HTTPException(status_code=400, detail="At least one capability is required")


def empty_sections() -> Dict[str, Any]:
    return {
        section: [] if section in ARRAY_SECTIONS else ""
        for section in CASE_SECTIONS
    }


def empty_section_meta() -> Dict[str, str]:
    return {section: "manual" for section in CASE_SECTIONS}


def normalize_section_value(section: str, value: Any) -> Any:
    if section in ARRAY_SECTIONS:
        if isinstance(value, list):
            return [str(item).strip() for item in value if str(item).strip()]
        if isinstance(value, str):
            stripped = value.strip()
            if not stripped:
                return []
            try:
                parsed = json.loads(stripped)
            except json.JSONDecodeError:
                parsed = None
            if isinstance(parsed, list):
                return [str(item).strip() for item in parsed if str(item).strip()]
            # Handle literal \n (two chars) from textarea input
            normalized = stripped.replace("\\n", "\n")
            return [line.strip() for line in normalized.splitlines() if line.strip()]
        return []
    if isinstance(value, list):
        return "\n".join(str(item).strip() for item in value if str(item).strip())
    return str(value or "").strip()


def section_has_content(value: Any) -> bool:
    if isinstance(value, list):
        return any(str(item).strip() for item in value)
    return bool(str(value or "").strip())


def section_to_text(value: Any) -> str:
    if isinstance(value, list):
        return "\n".join(str(item).strip() for item in value if str(item).strip())
    return str(value or "")


def safe_mapping(row: Any) -> Dict[str, Any]:
    return dict(getattr(row, "_mapping", {}) or {})


def text_value(value: Any) -> Optional[str]:
    if value is None:
        return None
    stripped = str(value).strip()
    return stripped or None


def int_value(value: Any) -> Optional[int]:
    if value is None or value == "":
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Numeric case metadata is invalid")


def float_value(value: Any) -> Optional[float]:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Marks metadata is invalid")


def json_text(value: Any) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, str):
        stripped = value.strip()
        return stripped or None
    return json.dumps(value)


def normalize_case_metadata(data: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    data = data or {}
    blooms = data.get("blooms_levels")
    if isinstance(blooms, list):
        blooms_value = json.dumps([str(item).strip() for item in blooms if str(item).strip()])
    else:
        blooms_value = text_value(blooms)
    return {
        "case_code": text_value(data.get("case_code")),
        "volume": text_value(data.get("volume")),
        "subject": text_value(data.get("subject")),
        "functional_area": text_value(data.get("functional_area")),
        "capability_category": text_value(data.get("capability_category")),
        "blooms_levels": blooms_value,
        "target_learners": text_value(data.get("target_learners")),
        "difficulty_label": text_value(data.get("difficulty_label")),
    }


# Rapid Fire is always 3 AI-generated questions worth 1 mark each. The rapid
# fire time default and the total-marks default are platform constants; the
# faculty-entered Total Marks now drives the written/total split.
RAPID_FIRE_TIME_MINUTES = 8
RAPID_FIRE_MARKS = 3
WRITTEN_MARKS = 7
TOTAL_MARKS = 10


def normalize_case_timing(data: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    data = data or {}
    return {
        "reading_time_minutes": int_value(data.get("reading_time_minutes")),
        "answer_writing_time_minutes": int_value(data.get("answer_writing_time_minutes")),
        "rapid_fire_time_minutes": RAPID_FIRE_TIME_MINUTES,
    }


def normalize_case_marks(data: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Total Marks is faculty-configurable. Rapid fire stays a fixed 3 (three
    AI-generated questions, 1 mark each); written marks is the remainder so the
    parts always sum to the declared total."""
    data = data or {}
    total = float_value((data or {}).get("total_marks"))
    if total is None or total <= 0:
        total = float(TOTAL_MARKS)
    rapid = float(RAPID_FIRE_MARKS)
    written = round(total - rapid, 2)
    if written < 0:
        written = 0.0
    return {
        "total_marks": total,
        "written_marks": written,
        "rapid_fire_marks": rapid,
    }


def normalize_case_instructions(data: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    data = data or {}
    return {
        "student_instructions_before": text_value(data.get("student_instructions_before")),
        "student_instructions_during": text_value(data.get("student_instructions_during")),
        "student_instructions_submission": text_value(
            data.get("student_instructions_submission")
        ),
        "company_background": text_value(data.get("company_background")),
        "industry_background": text_value(data.get("industry_background")),
        "faculty_common_mistakes": text_value(data.get("faculty_common_mistakes")),
        "faculty_discussion_points": text_value(data.get("faculty_discussion_points")),
        "key_learning_points": text_value(data.get("key_learning_points")),
    }


def normalize_int_list(value: Any) -> str:
    if not isinstance(value, list):
        return "[]"
    cleaned = []
    for item in value:
        try:
            cleaned.append(int(item))
        except (TypeError, ValueError):
            continue
    return json.dumps(cleaned)


def normalize_case_recommendation(data: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    data = data or {}
    return {
        "recommended_semesters": normalize_int_list(data.get("recommended_semesters")),
        "recommended_course_ids": normalize_int_list(data.get("recommended_course_ids")),
    }


def recommendation_from_row(row: Any) -> Dict[str, Any]:
    values = safe_mapping(row)
    return {
        "recommended_semesters": [
            int(item) for item in parse_json_or_lines(values.get("recommended_semesters"))
        ],
        "recommended_course_ids": [
            int(item) for item in parse_json_or_lines(values.get("recommended_course_ids"))
        ],
    }


def metadata_from_row(row: Any) -> Dict[str, Any]:
    values = safe_mapping(row)
    return {
        "case_code": values.get("case_code"),
        "volume": values.get("volume"),
        "subject": values.get("subject"),
        "functional_area": values.get("functional_area"),
        "capability_category": values.get("capability_category"),
        "blooms_levels": parse_json_or_lines(values.get("blooms_levels")),
        "target_learners": values.get("target_learners"),
        "difficulty_label": values.get("difficulty_label"),
    }


def timing_from_row(row: Any) -> Dict[str, Any]:
    values = safe_mapping(row)
    return {
        "reading_time_minutes": values.get("reading_time_minutes"),
        "answer_writing_time_minutes": values.get("answer_writing_time_minutes"),
        "rapid_fire_time_minutes": values.get("rapid_fire_time_minutes"),
    }


def marks_from_row(row: Any) -> Dict[str, Any]:
    values = safe_mapping(row)
    return {
        "total_marks": float(values["total_marks"]) if values.get("total_marks") is not None else 10,
        "written_marks": float(values["written_marks"]) if values.get("written_marks") is not None else 7,
        "rapid_fire_marks": float(values["rapid_fire_marks"]) if values.get("rapid_fire_marks") is not None else 3,
    }


def instructions_from_row(row: Any) -> Dict[str, Any]:
    values = safe_mapping(row)
    return {
        "student_instructions_before": values.get("student_instructions_before"),
        "student_instructions_during": values.get("student_instructions_during"),
        "student_instructions_submission": values.get("student_instructions_submission"),
        "company_background": values.get("company_background"),
        "industry_background": values.get("industry_background"),
        "faculty_common_mistakes": values.get("faculty_common_mistakes"),
        "faculty_discussion_points": values.get("faculty_discussion_points"),
        "key_learning_points": values.get("key_learning_points"),
    }


def parse_json_or_lines(value: Optional[str]) -> List[str]:
    if not value:
        return []
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        parsed = None
    if isinstance(parsed, list):
        return [str(item) for item in parsed]
    return [line.strip() for line in str(value).splitlines() if line.strip()]


def parse_case_content(content: Optional[str]) -> Dict[str, Any]:
    try:
        parsed = json.loads(content or "{}")
    except json.JSONDecodeError:
        parsed = {"legacy_content": content or ""}
    sections = empty_sections()
    for section, value in (parsed.get("sections") or {}).items():
        if section in CASE_SECTIONS:
            sections[section] = normalize_section_value(section, value)
    section_meta = empty_section_meta()
    section_meta.update(parsed.get("section_meta") or {})
    return {
        "expected_outcomes": parsed.get("expected_outcomes", ""),
        "sections": sections,
        "section_meta": section_meta,
    }


def serialize_case_content(
    expected_outcomes: str,
    sections: Dict[str, Any],
    section_meta: Dict[str, str],
) -> str:
    return json.dumps(
        {
            "expected_outcomes": expected_outcomes,
            "sections": {
                section: normalize_section_value(section, sections.get(section))
                for section in CASE_SECTIONS
            },
            "section_meta": {
                section: section_meta.get(section, "manual") for section in CASE_SECTIONS
            },
        }
    )


def get_capability_tags(db: Session, case_id: int) -> List[str]:
    rows = db.execute(
        text("""
            SELECT tag_value
            FROM case_study_tags
            WHERE case_study_id = :case_id AND tag_type = 'capability'
            ORDER BY tag_value
        """),
        {"case_id": case_id},
    ).fetchall()
    return [row.tag_value for row in rows]


def get_active_attempts_count(db: Session, case_id: int) -> int:
    active_attempts = db.execute(
        text("""
            SELECT COUNT(*)
            FROM case_study_attempts
            WHERE case_study_id = :case_id
              AND status IN ('analysis_submitted', 'ai_discussion', 'solution_submitted')
        """),
        {"case_id": case_id},
    ).scalar() or 0
    return int(active_attempts)


def default_rubric() -> Dict[str, Any]:
    return {
        "weights": dict(DEFAULT_RUBRIC_WEIGHTS),
        "case_specific_criteria": [],
    }


def normalize_rubric(raw_rubric: Optional[str]) -> Dict[str, Any]:
    if not raw_rubric:
        return default_rubric()
    try:
        parsed = json.loads(raw_rubric)
    except json.JSONDecodeError:
        return default_rubric()

    weights = dict(DEFAULT_RUBRIC_WEIGHTS)
    incoming_weights = parsed.get("weights") if isinstance(parsed, dict) else {}
    if isinstance(incoming_weights, dict):
        for key in DEFAULT_RUBRIC_WEIGHTS:
            try:
                weights[key] = int(incoming_weights.get(key, DEFAULT_RUBRIC_WEIGHTS[key]))
            except (TypeError, ValueError):
                weights[key] = DEFAULT_RUBRIC_WEIGHTS[key]

    raw_criteria = parsed.get("case_specific_criteria") if isinstance(parsed, dict) else []
    criteria = []
    if isinstance(raw_criteria, list):
        criteria = [str(item).strip() for item in raw_criteria if str(item).strip()][:2]

    return {
        "weights": weights,
        "case_specific_criteria": criteria,
    }


def validate_rubric(data: RubricRequest) -> Dict[str, Any]:
    if set(data.weights.keys()) != set(DEFAULT_RUBRIC_WEIGHTS.keys()):
        raise HTTPException(status_code=400, detail="Rubric must include all default criteria")

    weights: Dict[str, int] = {}
    for key in DEFAULT_RUBRIC_WEIGHTS:
        try:
            weight = int(data.weights[key])
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="Rubric weights must be numbers")
        if weight < 0 or weight > 100:
            raise HTTPException(status_code=400, detail="Rubric weights must be between 0 and 100")
        weights[key] = weight

    if sum(weights.values()) != 100:
        raise HTTPException(status_code=400, detail="Rubric weights must total 100")

    criteria = [criterion.strip() for criterion in data.case_specific_criteria if criterion.strip()]
    if len(criteria) > 2:
        raise HTTPException(status_code=400, detail="Case-specific criteria are capped at 2")
    if any(len(criterion) > 160 for criterion in criteria):
        raise HTTPException(
            status_code=400,
            detail="Case-specific criteria must be 160 characters or fewer",
        )

    return {
        "weights": weights,
        "case_specific_criteria": criteria,
    }


def rubric_response(db: Session, row: Any, rubric: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "case_id": row.id,
        "case_title": row.title,
        "case_status": row.status,
        "active_attempts": get_active_attempts_count(db, row.id),
        "criteria": RUBRIC_CRITERIA,
        "rubric": rubric,
        "rubric_exists": bool(row.evaluation_rubric),
        "updated_at": str(row.updated_at),
    }


def replace_capability_tags(db: Session, case_id: int, capabilities: List[str]) -> None:
    db.execute(
        text("""
            DELETE FROM case_study_tags
            WHERE case_study_id = :case_id AND tag_type = 'capability'
        """),
        {"case_id": case_id},
    )
    for capability in capabilities:
        tag_value = capability.strip()
        if not tag_value:
            continue
        db.execute(
            text("""
                INSERT INTO case_study_tags (case_study_id, tag_type, tag_value)
                VALUES (:case_id, 'capability', :tag_value)
                ON CONFLICT (case_study_id, tag_type, tag_value) DO NOTHING
            """),
            {"case_id": case_id, "tag_value": tag_value},
        )


CASE_EDITOR_COLUMNS = """
    id, title, description, content, domain, difficulty, estimated_minutes,
    status, evaluation_rubric, reflection_questions, learning_outcomes,
    case_code, volume, subject, functional_area, capability_category,
    blooms_levels, target_learners, difficulty_label, reading_time_minutes,
    answer_writing_time_minutes, rapid_fire_time_minutes, total_marks,
    written_marks, rapid_fire_marks, student_instructions_before,
    student_instructions_during, student_instructions_submission,
    company_background, industry_background, faculty_common_mistakes,
    faculty_discussion_points, key_learning_points, recommended_semesters,
    recommended_course_ids, created_at, updated_at
"""


def question_response(row: Any) -> Dict[str, Any]:
    return {
        "id": row.id,
        "question_number": row.question_number,
        "question_text": row.question_text,
        "marks": float(row.marks),
        "blooms_level": row.blooms_level,
        "word_limit_min": row.word_limit_min,
        "word_limit_max": row.word_limit_max,
        "instructions": row.instructions,
        "model_answer": row.model_answer,
        "alternative_answers": parse_json_or_lines(row.alternative_answers),
        "marking_scheme": row.marking_scheme,
    }


def rapid_fire_response(row: Any) -> Dict[str, Any]:
    return {
        "id": row.id,
        "sequence": row.sequence,
        "question_text": row.question_text,
        "answer_text": row.answer_text,
    }


def get_case_questions(db: Session, case_id: int) -> List[Dict[str, Any]]:
    rows = db.execute(
        text("""
            SELECT id, question_number, question_text, marks, blooms_level,
                   word_limit_min, word_limit_max, instructions, model_answer,
                   alternative_answers, marking_scheme
            FROM case_questions
            WHERE case_study_id = :case_id
            ORDER BY question_number
        """),
        {"case_id": case_id},
    ).fetchall()
    return [question_response(row) for row in rows]


def get_rapid_fire_questions(db: Session, case_id: int) -> List[Dict[str, Any]]:
    rows = db.execute(
        text("""
            SELECT id, sequence, question_text, answer_text
            FROM rapid_fire_questions
            WHERE case_study_id = :case_id
            ORDER BY sequence
        """),
        {"case_id": case_id},
    ).fetchall()
    return [rapid_fire_response(row) for row in rows]


def replace_case_questions(
    db: Session, case_id: int, questions: Optional[List[Dict[str, Any]]]
) -> None:
    if questions is None:
        return
    db.execute(text("DELETE FROM case_questions WHERE case_study_id = :case_id"), {"case_id": case_id})
    for index, question in enumerate(questions, start=1):
        question_text = text_value(question.get("question_text"))
        if not question_text:
            continue
        db.execute(
            text("""
                INSERT INTO case_questions (
                    case_study_id, question_number, question_text, marks,
                    blooms_level, word_limit_min, word_limit_max, instructions,
                    model_answer, alternative_answers, marking_scheme
                )
                VALUES (
                    :case_id, :question_number, :question_text, :marks,
                    :blooms_level, :word_limit_min, :word_limit_max, :instructions,
                    :model_answer, :alternative_answers, :marking_scheme
                )
            """),
            {
                "case_id": case_id,
                "question_number": int_value(question.get("question_number")) or index,
                "question_text": question_text,
                "marks": float_value(question.get("marks")) or 0,
                "blooms_level": text_value(question.get("blooms_level")),
                "word_limit_min": int_value(question.get("word_limit_min")),
                "word_limit_max": int_value(question.get("word_limit_max")),
                "instructions": text_value(question.get("instructions")),
                "model_answer": text_value(question.get("model_answer")),
                "alternative_answers": json_text(question.get("alternative_answers")),
                "marking_scheme": json_text(question.get("marking_scheme")),
            },
        )


def replace_rapid_fire_questions(
    db: Session, case_id: int, questions: Optional[List[Dict[str, Any]]]
) -> None:
    if questions is None:
        return
    db.execute(
        text("DELETE FROM rapid_fire_questions WHERE case_study_id = :case_id"),
        {"case_id": case_id},
    )
    for index, question in enumerate(questions, start=1):
        question_text = text_value(question.get("question_text"))
        if not question_text:
            continue
        db.execute(
            text("""
                INSERT INTO rapid_fire_questions (
                    case_study_id, sequence, question_text, answer_text
                )
                VALUES (:case_id, :sequence, :question_text, :answer_text)
            """),
            {
                "case_id": case_id,
                "sequence": int_value(question.get("sequence")) or index,
                "question_text": question_text,
                "answer_text": text_value(question.get("answer_text")),
            },
        )


def case_editor_response(db: Session, row: Any) -> Dict[str, Any]:
    parsed_content = parse_case_content(row.content)
    return {
        "id": row.id,
        "title": row.title,
        "industry": row.domain,
        "difficulty": row.difficulty,
        "duration_minutes": row.estimated_minutes,
        "metadata": metadata_from_row(row),
        "timing": timing_from_row(row),
        "marks": marks_from_row(row),
        "instructions": instructions_from_row(row),
        "recommendation": recommendation_from_row(row),
        "questions": get_case_questions(db, row.id),
        "rapid_fire_questions": get_rapid_fire_questions(db, row.id),
        "status": row.status,
        "capabilities": get_capability_tags(db, row.id),
        "expected_outcomes": parsed_content["expected_outcomes"],
        "sections": parsed_content["sections"],
        "section_meta": parsed_content["section_meta"],
        "rubric_exists": bool(row.evaluation_rubric),
        "active_attempts": get_active_attempts_count(db, row.id),
        "created_at": str(row.created_at),
        "updated_at": str(row.updated_at),
    }


def get_owned_case_row(db: Session, case_id: int, current_user: Dict[str, Any]) -> Any:
    row = db.execute(
        text(f"""
            SELECT {CASE_EDITOR_COLUMNS}
            FROM case_studies
            WHERE id = :case_id AND created_by = :faculty_id
        """),
        {"case_id": case_id, "faculty_id": current_user["id"]},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Case study not found")
    return row


def validate_sections(sections: List[str]) -> List[str]:
    invalid_sections = [section for section in sections if section not in CASE_SECTIONS]
    if invalid_sections:
        raise HTTPException(status_code=400, detail="Invalid case section")
    return sections


def build_case_generation_schema(requested_sections: List[str]) -> Dict[str, Any]:
    properties: Dict[str, Any] = {}
    for section in requested_sections:
        if section in ARRAY_SECTIONS:
            properties[section] = {
                "type": "array",
                "items": {"type": "string"},
            }
        else:
            properties[section] = {"type": "string"}
    return {
        "type": "object",
        "additionalProperties": False,
        "properties": properties,
        "required": requested_sections,
    }


def build_case_generation_prompt(
    row: Any,
    capabilities: List[str],
    expected_outcomes: str,
    existing_sections: Dict[str, Any],
    requested_sections: List[str],
) -> str:
    prompt = {
        "core_fields": {
            "title": row.title,
            "industry": row.domain,
            "difficulty": row.difficulty,
            "duration_minutes": row.estimated_minutes,
            "capabilities_targeted": capabilities,
            "expected_outcomes": expected_outcomes,
        },
        "existing_sections_for_consistency": existing_sections,
        "requested_sections": requested_sections,
        "section_contract": {
            "reflection_questions": "array of analysis-focused question strings",
            "learning_outcomes": "array of learning outcome strings",
            "all_other_sections": "polished faculty-editable text strings",
        },
    }
    return json.dumps(prompt)


def validate_generated_sections(
    generated: Any,
    requested_sections: List[str],
) -> Dict[str, Any]:
    if not isinstance(generated, dict):
        raise ValueError("AI returned a non-object response")
    normalized: Dict[str, Any] = {}
    for section in requested_sections:
        value = normalize_section_value(section, generated.get(section))
        if not section_has_content(value):
            raise ValueError(f"AI response omitted {section}")
        normalized[section] = value
    return normalized


def call_openai_case_generation(
    row: Any,
    capabilities: List[str],
    expected_outcomes: str,
    existing_sections: Dict[str, Any],
    requested_sections: List[str],
) -> Dict[str, Any]:
    client = get_llm_client()
    response = client.chat.completions.create(
        model=get_llm_model(CASE_GENERATION_MODEL),
        messages=[
            {"role": "system", "content": CASE_GENERATION_PROMPT},
            {
                "role": "user",
                "content": build_case_generation_prompt(
                    row,
                    capabilities,
                    expected_outcomes,
                    existing_sections,
                    requested_sections,
                ),
            },
        ],
        response_format=json_response_format(
            build_case_generation_schema(requested_sections), "faculty_case_generation"
        ),
        timeout=60,
    )
    content = response.choices[0].message.content
    return validate_generated_sections(parse_json_content(content), requested_sections)


def build_generate_questions_schema() -> Dict[str, Any]:
    return {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "questions": {
                "type": "array",
                "minItems": 3,
                "maxItems": 3,
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "question_text": {"type": "string"},
                        "blooms_level": {"type": "string"},
                        "word_limit_min": {"type": "integer"},
                        "word_limit_max": {"type": "integer"},
                        "instructions": {"type": "string"},
                        "model_answer": {"type": "string"},
                        "alternative_answers": {"type": "array", "items": {"type": "string"}},
                        "marking_scheme": {"type": "string"},
                    },
                    "required": [
                        "question_text",
                        "blooms_level",
                        "word_limit_min",
                        "word_limit_max",
                        "instructions",
                        "model_answer",
                        "alternative_answers",
                        "marking_scheme",
                    ],
                },
            },
        },
        "required": ["questions"],
    }


def build_generate_questions_prompt(
    row: Any,
    capabilities: List[str],
    difficulty_label: str,
    summary: str,
) -> str:
    prompt = {
        "case_title": row.title,
        "difficulty_level": row.difficulty,
        "difficulty_label": difficulty_label,
        "capabilities_targeted": capabilities,
        "case_summary": summary,
        "fixed_marks_per_question": FIXED_QUESTION_MARKS,
    }
    return json.dumps(prompt)


def call_openai_generate_questions(
    row: Any,
    capabilities: List[str],
    difficulty_label: str,
    summary: str,
) -> List[Dict[str, Any]]:
    client = get_llm_client()
    response = client.chat.completions.create(
        model=get_llm_model(CASE_GENERATION_MODEL),
        messages=[
            {"role": "system", "content": GENERATE_QUESTIONS_PROMPT},
            {
                "role": "user",
                "content": build_generate_questions_prompt(
                    row, capabilities, difficulty_label, summary
                ),
            },
        ],
        response_format=json_response_format(
            build_generate_questions_schema(), "faculty_generate_questions"
        ),
        timeout=60,
    )
    content = response.choices[0].message.content
    questions = parse_json_content(content).get("questions")
    if not isinstance(questions, list) or len(questions) != 3:
        raise ValueError("AI did not return exactly 3 questions")

    return [
        {
            "question_number": index + 1,
            "question_text": str(question.get("question_text", "")).strip(),
            "marks": FIXED_QUESTION_MARKS[index],
            "blooms_level": text_value(question.get("blooms_level")),
            "word_limit_min": int_value(question.get("word_limit_min")),
            "word_limit_max": int_value(question.get("word_limit_max")),
            "instructions": text_value(question.get("instructions")),
            "model_answer": text_value(question.get("model_answer")),
            "alternative_answers": [
                str(answer).strip()
                for answer in question.get("alternative_answers", [])
                if str(answer).strip()
            ],
            "marking_scheme": text_value(question.get("marking_scheme")),
        }
        for index, question in enumerate(questions)
    ]


def build_generate_rapid_fire_schema() -> Dict[str, Any]:
    return {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "questions": {
                "type": "array",
                "minItems": RAPID_FIRE_GENERATION_COUNT,
                "maxItems": RAPID_FIRE_GENERATION_COUNT,
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "question_text": {"type": "string"},
                        "answer_text": {"type": "string"},
                    },
                    "required": ["question_text", "answer_text"],
                },
            },
        },
        "required": ["questions"],
    }


def build_generate_rapid_fire_prompt(
    row: Any,
    capabilities: List[str],
    difficulty_label: str,
    summary: str,
) -> str:
    prompt = {
        "case_title": row.title,
        "difficulty_level": row.difficulty,
        "difficulty_label": difficulty_label,
        "capabilities_targeted": capabilities,
        "case_summary": summary,
    }
    return json.dumps(prompt)


def call_openai_generate_rapid_fire(
    row: Any,
    capabilities: List[str],
    difficulty_label: str,
    summary: str,
) -> List[Dict[str, Any]]:
    client = get_llm_client()
    response = client.chat.completions.create(
        model=get_llm_model(CASE_GENERATION_MODEL),
        messages=[
            {"role": "system", "content": GENERATE_RAPID_FIRE_PROMPT},
            {
                "role": "user",
                "content": build_generate_rapid_fire_prompt(
                    row, capabilities, difficulty_label, summary
                ),
            },
        ],
        response_format=json_response_format(
            build_generate_rapid_fire_schema(), "faculty_generate_rapid_fire"
        ),
        timeout=60,
    )
    content = response.choices[0].message.content
    questions = parse_json_content(content).get("questions")
    if not isinstance(questions, list) or len(questions) != RAPID_FIRE_GENERATION_COUNT:
        raise ValueError(
            f"AI did not return exactly {RAPID_FIRE_GENERATION_COUNT} rapid fire questions"
        )

    return [
        {
            "sequence": index + 1,
            "question_text": str(question.get("question_text", "")).strip(),
            "answer_text": text_value(question.get("answer_text")),
        }
        for index, question in enumerate(questions)
    ]


def set_generation_job(job_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    with CASE_GENERATION_JOBS_LOCK:
        job = CASE_GENERATION_JOBS.get(job_id)
        if not job:
            return {}
        job.update(updates)
        job["updated_at"] = datetime.utcnow().isoformat()
        return dict(job)


def generation_job_response(job: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "job_id": job["job_id"],
        "case_id": job["case_id"],
        "status": job["status"],
        "scope": job["scope"],
        "sections": job["sections"],
        "message": job.get("message", ""),
        "error": job.get("error"),
        "case": job.get("case"),
        "created_at": job["created_at"],
        "updated_at": job["updated_at"],
    }


def run_case_generation_job(
    job_id: str,
    case_id: int,
    faculty_id: int,
    requested_sections: List[str],
) -> None:
    set_generation_job(job_id, {"status": "in_progress", "message": "Generating case content"})
    db = SessionLocal()
    try:
        row = db.execute(
            text("""
                SELECT id, title, description, content, domain, difficulty,
                       estimated_minutes, status, evaluation_rubric,
                       reflection_questions, learning_outcomes, created_at, updated_at
                FROM case_studies
                WHERE id = :case_id AND created_by = :faculty_id
            """),
            {"case_id": case_id, "faculty_id": faculty_id},
        ).fetchone()
        if not row:
            raise RuntimeError("Case study not found")

        parsed_content = parse_case_content(row.content)
        sections = parsed_content["sections"]
        section_meta = parsed_content["section_meta"]
        generated = call_openai_case_generation(
            row,
            get_capability_tags(db, case_id),
            parsed_content["expected_outcomes"],
            sections,
            requested_sections,
        )

        for section, value in generated.items():
            sections[section] = value
            section_meta[section] = "ai_generated"

        result = db.execute(
            text("""
                UPDATE case_studies
                SET content = :content,
                    reflection_questions = :reflection_questions,
                    learning_outcomes = :learning_outcomes,
                    updated_at = NOW()
                WHERE id = :case_id AND created_by = :faculty_id
                RETURNING id, title, description, content, domain, difficulty,
                          estimated_minutes, status, evaluation_rubric,
                          reflection_questions, learning_outcomes, created_at, updated_at
            """),
            {
                "case_id": case_id,
                "faculty_id": faculty_id,
                "content": serialize_case_content(
                    parsed_content["expected_outcomes"], sections, section_meta
                ),
                "reflection_questions": section_to_text(sections.get("reflection_questions")),
                "learning_outcomes": section_to_text(sections.get("learning_outcomes")),
            },
        )
        updated_row = result.fetchone()
        db.commit()
        set_generation_job(
            job_id,
            {
                "status": "succeeded",
                "message": "Generation complete",
                "case": case_editor_response(db, updated_row),
            },
        )
    except Exception as exc:
        db.rollback()
        set_generation_job(
            job_id,
            {
                "status": "failed",
                "message": "AI generation failed. Existing content was preserved.",
                "error": str(exc),
            },
        )
    finally:
        db.close()


@faculty_router.get("/dashboard/summary")
def dashboard_summary(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, int]:
    require_faculty(current_user)
    faculty_id = current_user["id"]
    cache_key = f"faculty_dashboard_summary:{faculty_id}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    active_students = db.execute(
        text("""
            SELECT COUNT(DISTINCT csa.student_id)
            FROM case_study_attempts csa
            JOIN case_studies cs ON cs.id = csa.case_study_id
            WHERE cs.created_by = :faculty_id
        """),
        {"faculty_id": faculty_id},
    ).scalar() or 0

    simulations_running = db.execute(
        text("""
            SELECT COUNT(*)
            FROM case_study_attempts csa
            JOIN case_studies cs ON cs.id = csa.case_study_id
            WHERE cs.created_by = :faculty_id
              AND csa.status IN ('analysis_submitted', 'ai_discussion', 'solution_submitted')
        """),
        {"faculty_id": faculty_id},
    ).scalar() or 0

    pending_reviews = db.execute(
        text("""
            SELECT COUNT(*)
            FROM case_study_attempts csa
            JOIN case_studies cs ON cs.id = csa.case_study_id
            WHERE cs.created_by = :faculty_id
              AND csa.status IN ('solution_submitted', 'defense_complete')
        """),
        {"faculty_id": faculty_id},
    ).scalar() or 0

    capability_alerts = db.execute(
        text("""
            SELECT COUNT(DISTINCT s.user_id)
            FROM students s
            JOIN student_capabilities sc ON sc.student_id = s.id
            JOIN case_study_attempts csa ON csa.student_id = s.user_id
            JOIN case_studies cs ON cs.id = csa.case_study_id
            WHERE cs.created_by = :faculty_id
              AND sc.current_score < 60
        """),
        {"faculty_id": faculty_id},
    ).scalar() or 0

    return cache_set(cache_key, {
        "active_students": int(active_students),
        "simulations_running": int(simulations_running),
        "pending_reviews": int(pending_reviews),
        "capability_alerts": int(capability_alerts),
    })


@faculty_router.get("/cases")
def faculty_cases(
    domain: Optional[str] = None,
    difficulty: Optional[int] = None,
    status: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    require_faculty(current_user)

    where_clauses = ["cs.created_by = :faculty_id"]
    params: Dict[str, Any] = {"faculty_id": current_user["id"]}

    if domain:
        where_clauses.append("cs.domain = :domain")
        params["domain"] = domain
    if difficulty:
        where_clauses.append("cs.difficulty = :difficulty")
        params["difficulty"] = difficulty
    if status:
        where_clauses.append("cs.status = :status")
        params["status"] = status

    rows = db.execute(
        text(f"""
            SELECT
                cs.id,
                cs.title,
                cs.description,
                cs.domain,
                cs.difficulty,
                cs.estimated_minutes,
                cs.status,
                cs.evaluation_rubric,
                cs.created_at,
                cs.updated_at,
                COUNT(csa.id) AS attempts_count
            FROM case_studies cs
            LEFT JOIN case_study_attempts csa ON csa.case_study_id = cs.id
            WHERE {" AND ".join(where_clauses)}
            GROUP BY cs.id
            ORDER BY cs.updated_at DESC, cs.created_at DESC
        """),
        params,
    ).fetchall()

    return [
        {
            "id": row.id,
            "title": row.title,
            "description": row.description,
            "domain": row.domain,
            "difficulty": row.difficulty,
            "estimated_minutes": row.estimated_minutes,
            "status": row.status,
            "attempts_count": row.attempts_count,
            "rubric_exists": bool(row.evaluation_rubric),
            "created_at": str(row.created_at),
            "updated_at": str(row.updated_at),
        }
        for row in rows
    ]


@faculty_router.get("/analytics/summary")
def faculty_analytics_summary(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_faculty(current_user)
    faculty_id = current_user["id"]
    rows = db.execute(
        text("""
            SELECT
                cs.id AS section_id,
                cs.name AS section_name,
                co.name AS course_name,
                se.name AS semester_name,
                (
                    SELECT COUNT(*) FROM student_sections ss
                    WHERE ss.section_id = cs.id AND ss.status = 'active'
                ) AS student_count,
                (
                    SELECT COALESCE(AVG(ev.total_score), 0)
                    FROM student_sections ss
                    JOIN students s ON s.id = ss.student_id
                    JOIN case_study_attempts csa ON csa.student_id = s.user_id
                    JOIN cs_evaluations ev ON ev.attempt_id = csa.id
                    WHERE ss.section_id = cs.id AND ss.status = 'active'
                ) AS average_score,
                (
                    SELECT COUNT(*) FROM case_section_assignments seca
                    WHERE seca.section_id = cs.id AND seca.assigned_by = :faculty_id
                ) AS cases_assigned,
                (
                    SELECT COUNT(*) FROM assigned_cases ac
                    JOIN case_section_assignments seca ON seca.id = ac.section_assignment_id
                    WHERE seca.section_id = cs.id AND seca.assigned_by = :faculty_id
                ) AS total_assigned,
                (
                    SELECT COUNT(*) FROM assigned_cases ac
                    JOIN case_section_assignments seca ON seca.id = ac.section_assignment_id
                    WHERE seca.section_id = cs.id AND seca.assigned_by = :faculty_id
                          AND ac.status = 'completed'
                ) AS completed_count
            FROM faculty_sections fs
            JOIN class_sections cs ON cs.id = fs.section_id
            JOIN courses co ON co.id = cs.course_id
            JOIN semesters se ON se.id = cs.semester_id
            WHERE fs.faculty_id = :faculty_id
            GROUP BY cs.id, cs.name, co.name, se.name
            ORDER BY cs.name
        """),
        {"faculty_id": faculty_id},
    ).fetchall()

    sections = []
    total_students = 0
    total_assigned_all = 0
    total_completed_all = 0
    weighted_score_sum = 0.0
    for row in rows:
        student_count = int(row.student_count)
        total_assigned = int(row.total_assigned)
        completed_count = int(row.completed_count)
        average_score = round(float(row.average_score), 1)
        sections.append({
            "section_id": row.section_id,
            "section_name": row.section_name,
            "course_name": row.course_name,
            "semester_name": row.semester_name,
            "student_count": student_count,
            "average_score": average_score,
            "cases_assigned": int(row.cases_assigned),
            "total_assigned": total_assigned,
            "completed_count": completed_count,
            "completion_rate": (
                round((completed_count / total_assigned) * 100, 1) if total_assigned > 0 else 0
            ),
        })
        total_students += student_count
        total_assigned_all += total_assigned
        total_completed_all += completed_count
        weighted_score_sum += average_score * student_count

    return {
        "sections": sections,
        "totals": {
            "section_count": len(sections),
            "student_count": total_students,
            "average_score": (
                round(weighted_score_sum / total_students, 1) if total_students > 0 else 0
            ),
            "completion_rate": (
                round((total_completed_all / total_assigned_all) * 100, 1)
                if total_assigned_all > 0
                else 0
            ),
        },
    }


@faculty_router.get("/courses")
def faculty_courses(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_faculty(current_user)
    rows = db.execute(
        text("""
            SELECT id, name, code, total_semesters
            FROM courses
            WHERE status = 'active'
            ORDER BY name
        """)
    ).fetchall()
    return {
        "items": [
            {
                "id": row.id,
                "name": row.name,
                "code": row.code,
                "total_semesters": row.total_semesters,
            }
            for row in rows
        ]
    }


@faculty_router.get("/capabilities")
def faculty_capabilities(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    require_faculty(current_user)
    count = db.execute(
        text("SELECT COUNT(*) FROM capabilities WHERE engagement_type = 'case_study'")
    ).scalar() or 0
    if count == 0:
        for capability in DEFAULT_CAPABILITIES:
            db.execute(
                text("""
                    INSERT INTO capabilities (name, weightage, engagement_type)
                    VALUES (:name, 1, 'case_study')
                """),
                {"name": capability},
            )
        db.commit()

    rows = db.execute(
        text("""
            SELECT id, name
            FROM capabilities
            WHERE engagement_type = 'case_study'
            ORDER BY name
        """)
    ).fetchall()
    return [{"id": row.id, "name": row.name} for row in rows]


@faculty_router.post("/cases", status_code=201)
def create_faculty_case(
    data: CaseCoreFields,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_faculty(current_user)
    validate_core_fields(data)
    domain = normalize_domain(data.industry)
    sections = empty_sections()
    section_meta = empty_section_meta()
    expected_outcomes = data.expected_outcomes or ""
    content = serialize_case_content(expected_outcomes, sections, section_meta)
    metadata = normalize_case_metadata(data.metadata)
    timing = normalize_case_timing(data.timing)
    marks = normalize_case_marks(data.marks)
    instructions = normalize_case_instructions(data.instructions)
    recommendation = normalize_case_recommendation(data.recommendation)

    result = db.execute(
        text("""
            INSERT INTO case_studies (
                title, description, content, domain, difficulty,
                estimated_minutes, source, status, created_by,
                learning_outcomes, reflection_questions, case_code, volume,
                subject, functional_area, capability_category, blooms_levels,
                target_learners, difficulty_label, reading_time_minutes,
                answer_writing_time_minutes, rapid_fire_time_minutes,
                total_marks, written_marks, rapid_fire_marks,
                student_instructions_before, student_instructions_during,
                student_instructions_submission, company_background,
                industry_background, faculty_common_mistakes,
                faculty_discussion_points, key_learning_points,
                recommended_semesters, recommended_course_ids
            )
            VALUES (
                :title, :description, :content, :domain, :difficulty,
                :estimated_minutes, 'faculty', 'draft', :created_by,
                '', '', :case_code, :volume, :subject, :functional_area,
                :capability_category, :blooms_levels, :target_learners,
                :difficulty_label, :reading_time_minutes,
                :answer_writing_time_minutes, :rapid_fire_time_minutes,
                :total_marks, :written_marks, :rapid_fire_marks,
                :student_instructions_before, :student_instructions_during,
                :student_instructions_submission, :company_background,
                :industry_background, :faculty_common_mistakes,
                :faculty_discussion_points, :key_learning_points,
                :recommended_semesters, :recommended_course_ids
            )
            RETURNING """ + CASE_EDITOR_COLUMNS + """
        """),
        {
            "title": data.title.strip(),
            "description": expected_outcomes.strip(),
            "content": content,
            "domain": domain,
            "difficulty": data.difficulty,
            "estimated_minutes": data.duration_minutes,
            "created_by": current_user["id"],
            **metadata,
            **timing,
            **marks,
            **instructions,
            **recommendation,
        },
    )
    row = result.fetchone()
    replace_capability_tags(db, row.id, data.capabilities)
    db.commit()
    return case_editor_response(db, row)


@faculty_router.get("/cases/assigned")
def faculty_assigned_cases(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_faculty(current_user)
    rows = db.execute(
        text("""
            SELECT seca.id AS assignment_id, cse.id AS case_id, cse.title AS case_title,
                   sec.id AS section_id, sec.name AS section_name, seca.due_date, seca.status,
                   seca.instructions, seca.assigned_at,
                   COUNT(ac.id) AS total_assigned,
                   COUNT(ac.id) FILTER (WHERE ac.status = 'completed') AS completed_count
            FROM case_section_assignments seca
            JOIN case_studies cse ON cse.id = seca.case_study_id
            JOIN class_sections sec ON sec.id = seca.section_id
            LEFT JOIN assigned_cases ac ON ac.section_assignment_id = seca.id
            WHERE seca.assigned_by = :faculty_id
            GROUP BY seca.id, cse.id, cse.title, sec.id, sec.name
            ORDER BY seca.assigned_at DESC
        """),
        {"faculty_id": current_user["id"]},
    ).fetchall()
    return {
        "items": [
            {
                "assignment_id": row.assignment_id,
                "case_id": row.case_id,
                "case_title": row.case_title,
                "section_id": row.section_id,
                "section_name": row.section_name,
                "due_date": str(row.due_date) if row.due_date else None,
                "status": row.status,
                "instructions": row.instructions,
                "assigned_at": str(row.assigned_at),
                "total_assigned": int(row.total_assigned),
                "completed_count": int(row.completed_count),
            }
            for row in rows
        ],
        "total": len(rows),
    }


@faculty_router.get("/cases/{case_id}")
def get_faculty_case(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_faculty(current_user)
    row = get_owned_case_row(db, case_id, current_user)
    return case_editor_response(db, row)


@faculty_router.delete("/cases/{case_id}")
def delete_faculty_case(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_faculty(current_user)
    owned = db.execute(
        text("SELECT id, title FROM case_studies WHERE id = :cid AND created_by = :faculty_id"),
        {"cid": case_id, "faculty_id": current_user["id"]},
    ).fetchone()
    if not owned:
        raise HTTPException(status_code=404, detail="Case study not found")

    params = {"cid": case_id}
    attempt_filter = (
        "attempt_id IN (SELECT id FROM case_study_attempts WHERE case_study_id = :cid)"
    )
    statements = [
        f"DELETE FROM cs_ai_conversations WHERE {attempt_filter}",
        f"DELETE FROM cs_evaluations WHERE {attempt_filter}",
        f"DELETE FROM case_question_responses WHERE {attempt_filter}",
        f"DELETE FROM rapid_fire_responses WHERE {attempt_filter}",
        f"DELETE FROM mentor_attempt_comments WHERE {attempt_filter}",
        "DELETE FROM assigned_cases WHERE case_study_id = :cid",
        "DELETE FROM case_study_attempts WHERE case_study_id = :cid",
        "DELETE FROM case_section_assignments WHERE case_study_id = :cid",
        "DELETE FROM case_questions WHERE case_study_id = :cid",
        "DELETE FROM rapid_fire_questions WHERE case_study_id = :cid",
        "DELETE FROM case_study_tags WHERE case_study_id = :cid",
        "UPDATE case_imports SET approved_case_id = NULL WHERE approved_case_id = :cid",
    ]
    for stmt in statements:
        db.execute(text(stmt), params)
    db.execute(
        text("DELETE FROM case_studies WHERE id = :cid AND created_by = :faculty_id"),
        {"cid": case_id, "faculty_id": current_user["id"]},
    )
    db.commit()
    return {"status": "deleted", "id": case_id, "title": owned.title}


def attempt_marks_summary(evaluation: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not evaluation:
        return None
    question_scores = evaluation.get("question_scores") or []
    written_awarded = sum(
        float(q.get("marks_awarded") or 0) for q in question_scores if isinstance(q, dict)
    )
    written_total = sum(
        float(q.get("marks_total") or 0) for q in question_scores if isinstance(q, dict)
    )
    written_total = round(written_total, 1) or float(WRITTEN_MARKS)
    rapid_score = float(evaluation.get("rapid_fire_score") or 0)
    rapid_awarded = round(rapid_score / 100 * RAPID_FIRE_MARKS, 1)
    return {
        "written_awarded": round(written_awarded, 1),
        "written_total": written_total,
        "rapid_awarded": rapid_awarded,
        "rapid_total": float(RAPID_FIRE_MARKS),
        "total_awarded": round(written_awarded + rapid_awarded, 1),
        "total_max": round(written_total + RAPID_FIRE_MARKS, 1),
    }


def attempt_list_item(db: Session, row: Any) -> Dict[str, Any]:
    from services.simulation.service import get_evaluation

    evaluation = get_evaluation(db, row.attempt_id)
    return {
        "attempt_id": row.attempt_id,
        "student_id": row.student_user_id,
        "student_name": row.name,
        "student_email": row.email,
        "case_id": row.case_id,
        "case_title": row.case_title,
        "status": row.status,
        "attempted_at": str(row.attempted_at) if row.attempted_at else None,
        "total_score": evaluation.get("total_score") if evaluation else None,
        "grade": evaluation.get("overall_grade") if evaluation else None,
        "marks": attempt_marks_summary(evaluation),
    }


_ATTEMPT_LIST_SQL = """
    SELECT csa.id AS attempt_id, csa.student_id AS student_user_id,
           u.name, u.email, csa.case_study_id AS case_id,
           cs.title AS case_title, csa.status,
           COALESCE(csa.end_time, csa.start_time) AS attempted_at
    FROM case_study_attempts csa
    JOIN users u ON u.id = csa.student_id
    JOIN case_studies cs ON cs.id = csa.case_study_id
    WHERE {filter}
    ORDER BY {order}
"""


@faculty_router.get("/cases/{case_id}/attempts")
def faculty_case_attempts(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_faculty(current_user)
    owned = db.execute(
        text("SELECT id, title FROM case_studies WHERE id = :cid AND created_by = :fid"),
        {"cid": case_id, "fid": current_user["id"]},
    ).fetchone()
    if not owned:
        raise HTTPException(status_code=404, detail="Case study not found")
    rows = db.execute(
        text(_ATTEMPT_LIST_SQL.format(filter="csa.case_study_id = :cid", order="u.name ASC")),
        {"cid": case_id},
    ).fetchall()
    return {
        "context": "case",
        "context_id": case_id,
        "title": owned.title,
        "items": [attempt_list_item(db, row) for row in rows],
        "total": len(rows),
    }


@faculty_router.get("/students/{student_user_id}/attempts")
def faculty_student_attempts(
    student_user_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_faculty(current_user)
    student = db.execute(
        text("SELECT name FROM users WHERE id = :uid AND role = 'student'"),
        {"uid": student_user_id},
    ).fetchone()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    rows = db.execute(
        text(
            _ATTEMPT_LIST_SQL.format(
                filter="csa.student_id = :uid AND cs.created_by = :fid",
                order="COALESCE(csa.end_time, csa.start_time) DESC NULLS LAST",
            )
        ),
        {"uid": student_user_id, "fid": current_user["id"]},
    ).fetchall()
    return {
        "context": "student",
        "context_id": student_user_id,
        "title": student.name,
        "items": [attempt_list_item(db, row) for row in rows],
        "total": len(rows),
    }


@faculty_router.get("/attempts/{attempt_id}")
def faculty_attempt_detail(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_faculty(current_user)
    from services.simulation.service import get_evaluation

    row = db.execute(
        text("""
            SELECT csa.id, csa.status, csa.initial_analysis, csa.initial_summary,
                   csa.defense_responses,
                   u.name, u.email, cs.title, cs.created_by
            FROM case_study_attempts csa
            JOIN users u ON u.id = csa.student_id
            JOIN case_studies cs ON cs.id = csa.case_study_id
            WHERE csa.id = :aid
        """),
        {"aid": attempt_id},
    ).fetchone()
    if not row or row.created_by != current_user["id"]:
        raise HTTPException(status_code=404, detail="Attempt not found")
    evaluation = get_evaluation(db, attempt_id)
    return {
        "attempt_id": row.id,
        "student_name": row.name,
        "student_email": row.email,
        "case_title": row.title,
        "status": row.status,
        "initial_summary": row.initial_summary,
        "initial_analysis": row.initial_analysis,
        "rapid_fire_answers": row.defense_responses,
        "evaluation": evaluation,
        "marks": attempt_marks_summary(evaluation),
    }


@faculty_router.get("/cases/{case_id}/rubric")
def get_faculty_case_rubric(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_faculty(current_user)
    row = get_owned_case_row(db, case_id, current_user)
    return rubric_response(db, row, normalize_rubric(row.evaluation_rubric))


@faculty_router.put("/cases/{case_id}/rubric")
def save_faculty_case_rubric(
    case_id: int,
    data: RubricRequest,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_faculty(current_user)
    get_owned_case_row(db, case_id, current_user)
    rubric = validate_rubric(data)
    result = db.execute(
        text("""
            UPDATE case_studies
            SET evaluation_rubric = :evaluation_rubric,
                updated_at = NOW()
            WHERE id = :case_id AND created_by = :faculty_id
            RETURNING id, title, description, content, domain, difficulty,
                      estimated_minutes, status, evaluation_rubric,
                      reflection_questions, learning_outcomes, created_at, updated_at
        """),
        {
            "case_id": case_id,
            "faculty_id": current_user["id"],
            "evaluation_rubric": json.dumps(rubric),
        },
    )
    updated_row = result.fetchone()
    db.commit()
    return rubric_response(db, updated_row, rubric)


@faculty_router.put("/cases/{case_id}")
def update_faculty_case(
    case_id: int,
    data: CaseUpdateRequest,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_faculty(current_user)
    existing = get_owned_case_row(db, case_id, current_user)
    parsed_content = parse_case_content(existing.content)

    title = data.title.strip() if data.title is not None else existing.title
    domain = normalize_domain(data.industry) if data.industry is not None else existing.domain
    difficulty = data.difficulty if data.difficulty is not None else existing.difficulty
    duration = (
        data.duration_minutes
        if data.duration_minutes is not None
        else existing.estimated_minutes
    )
    expected_outcomes = (
        data.expected_outcomes.strip()
        if data.expected_outcomes is not None
        else parsed_content["expected_outcomes"]
    )
    sections = parsed_content["sections"]
    section_meta = parsed_content["section_meta"]

    if data.sections is not None:
        validate_sections(list(data.sections.keys()))
        for section, value in data.sections.items():
            previous_value = sections.get(section, "")
            normalized_value = normalize_section_value(section, value)
            sections[section] = normalized_value
            if normalized_value != previous_value and section_meta.get(section) == "ai_generated":
                section_meta[section] = "edited"
            elif section_has_content(normalized_value) and not section_has_content(previous_value):
                section_meta[section] = "manual"
    if data.section_meta is not None:
        validate_sections(list(data.section_meta.keys()))
        section_meta.update(data.section_meta)

    if not title:
        raise HTTPException(status_code=400, detail="Title is required")
    if difficulty < 1 or difficulty > 7:
        raise HTTPException(status_code=400, detail="Difficulty must be between 1 and 7")
    if duration < 1:
        raise HTTPException(status_code=400, detail="Duration must be at least 1 minute")
    existing_values = safe_mapping(existing)
    metadata = (
        normalize_case_metadata(data.metadata)
        if data.metadata is not None
        else {
            key: existing_values.get(key)
            for key in [
                "case_code",
                "volume",
                "subject",
                "functional_area",
                "capability_category",
                "blooms_levels",
                "target_learners",
                "difficulty_label",
            ]
        }
    )
    timing = (
        normalize_case_timing(data.timing)
        if data.timing is not None
        else {
            "reading_time_minutes": existing_values.get("reading_time_minutes"),
            "answer_writing_time_minutes": existing_values.get("answer_writing_time_minutes"),
            "rapid_fire_time_minutes": RAPID_FIRE_TIME_MINUTES,
        }
    )
    marks = normalize_case_marks(data.marks)
    instructions = (
        normalize_case_instructions(data.instructions)
        if data.instructions is not None
        else {
            key: existing_values.get(key)
            for key in [
                "student_instructions_before",
                "student_instructions_during",
                "student_instructions_submission",
                "company_background",
                "industry_background",
                "faculty_common_mistakes",
                "faculty_discussion_points",
                "key_learning_points",
            ]
        }
    )
    recommendation = (
        normalize_case_recommendation(data.recommendation)
        if data.recommendation is not None
        else {
            "recommended_semesters": existing_values.get("recommended_semesters") or "[]",
            "recommended_course_ids": existing_values.get("recommended_course_ids") or "[]",
        }
    )

    result = db.execute(
        text("""
            UPDATE case_studies
            SET title = :title,
                description = :description,
                content = :content,
                domain = :domain,
                difficulty = :difficulty,
                estimated_minutes = :estimated_minutes,
                reflection_questions = :reflection_questions,
                learning_outcomes = :learning_outcomes,
                case_code = :case_code,
                volume = :volume,
                subject = :subject,
                functional_area = :functional_area,
                capability_category = :capability_category,
                blooms_levels = :blooms_levels,
                target_learners = :target_learners,
                difficulty_label = :difficulty_label,
                reading_time_minutes = :reading_time_minutes,
                answer_writing_time_minutes = :answer_writing_time_minutes,
                rapid_fire_time_minutes = :rapid_fire_time_minutes,
                total_marks = :total_marks,
                written_marks = :written_marks,
                rapid_fire_marks = :rapid_fire_marks,
                student_instructions_before = :student_instructions_before,
                student_instructions_during = :student_instructions_during,
                student_instructions_submission = :student_instructions_submission,
                company_background = :company_background,
                industry_background = :industry_background,
                faculty_common_mistakes = :faculty_common_mistakes,
                faculty_discussion_points = :faculty_discussion_points,
                key_learning_points = :key_learning_points,
                recommended_semesters = :recommended_semesters,
                recommended_course_ids = :recommended_course_ids,
                updated_at = NOW()
            WHERE id = :case_id AND created_by = :faculty_id
            RETURNING """ + CASE_EDITOR_COLUMNS + """
        """),
        {
            "case_id": case_id,
            "faculty_id": current_user["id"],
            "title": title,
            "description": expected_outcomes,
            "content": serialize_case_content(expected_outcomes, sections, section_meta),
            "domain": domain,
            "difficulty": difficulty,
            "estimated_minutes": duration,
            "reflection_questions": section_to_text(sections.get("reflection_questions")),
            "learning_outcomes": section_to_text(sections.get("learning_outcomes")),
            **metadata,
            **timing,
            **marks,
            **instructions,
            **recommendation,
        },
    )
    row = result.fetchone()
    if data.capabilities is not None:
        if not data.capabilities:
            raise HTTPException(status_code=400, detail="At least one capability is required")
        replace_capability_tags(db, case_id, data.capabilities)
    replace_case_questions(db, case_id, data.questions)
    replace_rapid_fire_questions(db, case_id, data.rapid_fire_questions)
    db.commit()
    return case_editor_response(db, row)


@faculty_router.post("/cases/{case_id}/generate")
def generate_faculty_case_sections(
    case_id: int,
    data: GenerateCaseRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_faculty(current_user)
    row = get_owned_case_row(db, case_id, current_user)
    parsed_content = parse_case_content(row.content)
    sections = parsed_content["sections"]
    section_meta = parsed_content["section_meta"]

    if data.scope not in ["full", "section"]:
        raise HTTPException(status_code=400, detail="Scope must be full or section")
    requested_sections = data.sections or CASE_SECTIONS
    requested_sections = validate_sections(requested_sections)
    if data.scope == "section" and len(requested_sections) != 1:
        raise HTTPException(status_code=400, detail="Section generation requires one section")

    eligible_sections = [
        section
        for section in requested_sections
        if data.overwrite_manual
        or section_meta.get(section) != "manual"
        or not section_has_content(sections.get(section))
    ]
    if not eligible_sections:
        raise HTTPException(status_code=400, detail="No eligible sections to generate")

    job_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    job = {
        "job_id": job_id,
        "case_id": case_id,
        "faculty_id": current_user["id"],
        "status": "queued",
        "scope": data.scope,
        "sections": eligible_sections,
        "message": "Generation queued",
        "created_at": now,
        "updated_at": now,
    }
    with CASE_GENERATION_JOBS_LOCK:
        CASE_GENERATION_JOBS[job_id] = job

    background_tasks.add_task(
        run_case_generation_job,
        job_id,
        case_id,
        current_user["id"],
        eligible_sections,
    )
    return generation_job_response(job)


@faculty_router.get("/cases/{case_id}/generate/{job_id}")
def get_faculty_case_generation_job(
    case_id: int,
    job_id: str,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_faculty(current_user)
    get_owned_case_row(db, case_id, current_user)
    with CASE_GENERATION_JOBS_LOCK:
        job = CASE_GENERATION_JOBS.get(job_id)
        if not job or job["case_id"] != case_id or job["faculty_id"] != current_user["id"]:
            raise HTTPException(status_code=404, detail="Generation job not found")
        return generation_job_response(dict(job))


@faculty_router.post("/cases/{case_id}/generate-questions")
def generate_faculty_case_questions(
    case_id: int,
    data: GenerateQuestionsRequest,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_faculty(current_user)
    row = get_owned_case_row(db, case_id, current_user)
    if not data.summary.strip():
        raise HTTPException(status_code=400, detail="A case summary is required")
    capabilities = get_capability_tags(db, case_id)
    try:
        questions = call_openai_generate_questions(
            row, capabilities, difficulty_label_for(row.difficulty), data.summary.strip()
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI question generation failed: {exc}")
    return {"questions": questions}


@faculty_router.post("/cases/{case_id}/generate-rapid-fire")
def generate_faculty_case_rapid_fire(
    case_id: int,
    data: GenerateRapidFireRequest,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_faculty(current_user)
    row = get_owned_case_row(db, case_id, current_user)
    if not data.summary.strip():
        raise HTTPException(status_code=400, detail="A case summary is required")
    capabilities = get_capability_tags(db, case_id)
    try:
        questions = call_openai_generate_rapid_fire(
            row, capabilities, difficulty_label_for(row.difficulty), data.summary.strip()
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI rapid fire generation failed: {exc}")
    return {"questions": questions}


@faculty_router.post("/cases/{case_id}/publish")
def publish_faculty_case(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_faculty(current_user)
    row = get_owned_case_row(db, case_id, current_user)
    parsed_content = parse_case_content(row.content)
    sections = parsed_content["sections"]
    missing_fields: List[str] = []

    if not row.title:
        missing_fields.append("title")
    if not row.domain:
        missing_fields.append("industry")
    if not row.difficulty:
        missing_fields.append("difficulty")
    if not row.estimated_minutes:
        missing_fields.append("duration")
    if not get_capability_tags(db, case_id):
        missing_fields.append("capabilities")
    for section in ["situation", "objectives", "timeline", "reflection_questions"]:
        if not section_has_content(sections.get(section)):
            missing_fields.append(section)
    if not row.evaluation_rubric:
        missing_fields.append("rubric")

    if missing_fields:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Case study is missing required publishing fields",
                "missing_fields": missing_fields,
            },
        )

    result = db.execute(
        text("""
            UPDATE case_studies
            SET status = 'published', updated_at = NOW()
            WHERE id = :case_id AND created_by = :faculty_id
            RETURNING id, title, description, content, domain, difficulty,
                      estimated_minutes, status, evaluation_rubric,
                      reflection_questions, learning_outcomes, created_at, updated_at
        """),
        {"case_id": case_id, "faculty_id": current_user["id"]},
    )
    updated_row = result.fetchone()
    db.commit()
    return case_editor_response(db, updated_row)


@faculty_router.get("/sections")
def faculty_sections(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_faculty(current_user)
    rows = db.execute(
        text("""
            SELECT cs.id, cs.name, cs.academic_year, se.semester_number, se.name AS semester_name,
                   b.name AS batch_name, c.name AS course_name,
                   string_agg(DISTINCT fs.subject, ', ') AS subjects,
                   COUNT(DISTINCT ss.student_id) FILTER (WHERE ss.status = 'active') AS student_count
            FROM faculty_sections fs
            JOIN class_sections cs ON cs.id = fs.section_id
            JOIN semesters se ON se.id = cs.semester_id
            JOIN batches b ON b.id = cs.batch_id
            JOIN courses c ON c.id = cs.course_id
            LEFT JOIN student_sections ss ON ss.section_id = cs.id
            WHERE fs.faculty_id = :faculty_id
            GROUP BY cs.id, se.semester_number, se.name, b.name, c.name
            ORDER BY se.semester_number, cs.name
        """),
        {"faculty_id": current_user["id"]},
    ).fetchall()
    return {
        "items": [
            {
                "id": row.id,
                "name": row.name,
                "academic_year": row.academic_year,
                "semester_number": row.semester_number,
                "semester_name": row.semester_name,
                "batch_name": row.batch_name,
                "course_name": row.course_name,
                "subjects": row.subjects,
                "student_count": int(row.student_count),
            }
            for row in rows
        ],
        "total": len(rows),
    }


def student_roster_status(
    average_score: Optional[float], last_activity_at: Any, assigned_count: int
) -> str:
    # A student who has never started anything is "not started" — not "at risk".
    if last_activity_at is None:
        return "not_started"
    # Once they have a graded attempt, flag genuinely low performance.
    if average_score is not None and average_score < 60:
        return "at_risk"
    return "on_track"


@faculty_router.get("/students")
def faculty_students_roster(
    section_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_faculty(current_user)
    where_extra = "AND cs.id = :section_id" if section_id else ""
    params: Dict[str, Any] = {"faculty_id": current_user["id"]}
    if section_id:
        params["section_id"] = section_id

    rows = db.execute(
        text(f"""
            SELECT DISTINCT s.id AS student_id, u.id AS user_id, u.name, u.email,
                   cs.id AS section_id, cs.name AS section_name,
                   avg_scores.average_score,
                   last_activity.last_activity_at,
                   COALESCE(assignment_counts.assigned_count, 0) AS assigned_count,
                   COALESCE(assignment_counts.completed_count, 0) AS completed_count
            FROM faculty_sections fs
            JOIN class_sections cs ON cs.id = fs.section_id
            JOIN student_sections ss ON ss.section_id = cs.id AND ss.status = 'active'
            JOIN students s ON s.id = ss.student_id
            JOIN users u ON u.id = s.user_id
            LEFT JOIN LATERAL (
                SELECT AVG(ev.total_score) AS average_score
                FROM case_study_attempts csa
                JOIN cs_evaluations ev ON ev.attempt_id = csa.id
                WHERE csa.student_id = u.id
            ) avg_scores ON true
            LEFT JOIN LATERAL (
                SELECT MAX(start_time) AS last_activity_at
                FROM case_study_attempts WHERE student_id = u.id
            ) last_activity ON true
            LEFT JOIN LATERAL (
                SELECT COUNT(*) AS assigned_count,
                       COUNT(*) FILTER (WHERE ac.status = 'completed') AS completed_count
                FROM assigned_cases ac
                JOIN case_section_assignments seca ON seca.id = ac.section_assignment_id
                WHERE ac.student_id = s.id AND seca.assigned_by = :faculty_id AND seca.section_id = cs.id
            ) assignment_counts ON true
            WHERE fs.faculty_id = :faculty_id {where_extra}
            ORDER BY cs.name, u.name
        """),
        params,
    ).fetchall()
    return {
        "items": [
            {
                "student_id": row.student_id,
                "user_id": row.user_id,
                "name": row.name,
                "email": row.email,
                "section_id": row.section_id,
                "section_name": row.section_name,
                "average_score": round(float(row.average_score), 1) if row.average_score is not None else 0,
                "last_activity_at": str(row.last_activity_at) if row.last_activity_at else None,
                "assigned_count": int(row.assigned_count),
                "completed_count": int(row.completed_count),
                "status": student_roster_status(
                    row.average_score, row.last_activity_at, row.assigned_count
                ),
            }
            for row in rows
        ],
        "total": len(rows),
    }


class FacultyTeachingSelect(BaseModel):
    section_id: int
    subject: str


def _faculty_approval_required(db: Session) -> bool:
    row = db.execute(
        text("SELECT config FROM platform_settings WHERE section = 'teaching_approvals'")
    ).fetchone()
    if not row:
        return True
    try:
        return bool(json.loads(row.config).get("require_approval", True))
    except (json.JSONDecodeError, TypeError):
        return True


@faculty_router.get("/teaching")
def get_faculty_teaching(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """The faculty's own teaching selections plus the admin-configured structure
    they can pick from (courses -> semesters -> sections + subjects)."""
    require_faculty(current_user)
    fid = current_user["id"]

    sel_rows = db.execute(
        text("""
            SELECT fs.id, fs.section_id, fs.subject, fs.status,
                   cs.name AS section_name, c.name AS course_name,
                   sem.name AS semester_name, b.name AS batch_name
            FROM faculty_sections fs
            JOIN class_sections cs ON cs.id = fs.section_id
            JOIN courses c ON c.id = cs.course_id
            JOIN semesters sem ON sem.id = cs.semester_id
            JOIN batches b ON b.id = cs.batch_id
            WHERE fs.faculty_id = :fid
            ORDER BY c.name, sem.semester_number, cs.name, fs.subject
        """),
        {"fid": fid},
    ).fetchall()
    selections = [
        {
            "id": r.id,
            "section_id": r.section_id,
            "subject": r.subject,
            "status": r.status,
            "section_name": r.section_name,
            "course_name": r.course_name,
            "semester_name": r.semester_name,
            "batch_name": r.batch_name,
        }
        for r in sel_rows
    ]

    def semesters_for(course_id: int) -> List[Dict[str, Any]]:
        result = []
        for sem in db.execute(
            text(
                "SELECT id, semester_number, name FROM semesters "
                "WHERE course_id = :cid ORDER BY semester_number"
            ),
            {"cid": course_id},
        ).fetchall():
            sections = db.execute(
                text(
                    "SELECT cs.id, cs.name, b.name AS batch_name "
                    "FROM class_sections cs JOIN batches b ON b.id = cs.batch_id "
                    "WHERE cs.semester_id = :sid ORDER BY cs.name"
                ),
                {"sid": sem.id},
            ).fetchall()
            subjects = db.execute(
                text("SELECT DISTINCT name FROM subjects WHERE semester_id = :sid ORDER BY name"),
                {"sid": sem.id},
            ).fetchall()
            result.append(
                {
                    "id": sem.id,
                    "number": sem.semester_number,
                    "name": sem.name,
                    "sections": [
                        {"id": s.id, "name": s.name, "batch_name": s.batch_name} for s in sections
                    ],
                    "subjects": [s.name for s in subjects],
                }
            )
        return result

    # Full admin-configured hierarchy: institution -> department -> course ->
    # semester -> (sections + subjects). Empty branches are omitted.
    options = []
    for inst in db.execute(
        text("SELECT id, name, code FROM institutions ORDER BY name")
    ).fetchall():
        departments = []
        for dept in db.execute(
            text("SELECT id, name, code FROM departments WHERE institution_id = :iid ORDER BY name"),
            {"iid": inst.id},
        ).fetchall():
            courses = []
            for course in db.execute(
                text(
                    "SELECT id, name, code FROM courses "
                    "WHERE department_id = :did AND status = 'active' ORDER BY name"
                ),
                {"did": dept.id},
            ).fetchall():
                courses.append(
                    {
                        "id": course.id,
                        "name": course.name,
                        "code": course.code,
                        "semesters": semesters_for(course.id),
                    }
                )
            if courses:
                departments.append(
                    {"id": dept.id, "name": dept.name, "code": dept.code, "courses": courses}
                )
        if departments:
            options.append(
                {"id": inst.id, "name": inst.name, "code": inst.code, "departments": departments}
            )

    return {
        "require_approval": _faculty_approval_required(db),
        "selections": selections,
        "options": options,
    }


@faculty_router.post("/teaching")
def add_faculty_teaching(
    data: FacultyTeachingSelect,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_faculty(current_user)
    fid = current_user["id"]
    if not data.subject.strip():
        raise HTTPException(status_code=400, detail="Subject is required")
    section = db.execute(
        text("SELECT id FROM class_sections WHERE id = :sid"), {"sid": data.section_id}
    ).fetchone()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    existing = db.execute(
        text(
            "SELECT id FROM faculty_sections "
            "WHERE faculty_id = :f AND section_id = :s AND subject = :sub"
        ),
        {"f": fid, "s": data.section_id, "sub": data.subject.strip()},
    ).fetchone()
    if existing:
        raise HTTPException(status_code=409, detail="You already selected this section and subject")
    status = "pending" if _faculty_approval_required(db) else "active"
    db.execute(
        text("""
            INSERT INTO faculty_sections (faculty_id, section_id, subject, assigned_by, status)
            VALUES (:f, :s, :sub, :f, :status)
        """),
        {"f": fid, "s": data.section_id, "sub": data.subject.strip(), "status": status},
    )
    db.commit()
    return {"status": status}


class FacultyTeachingItem(BaseModel):
    section_id: int
    subject: str


class FacultyTeachingBulk(BaseModel):
    items: List[FacultyTeachingItem]


@faculty_router.post("/teaching/bulk")
def add_faculty_teaching_bulk(
    data: FacultyTeachingBulk,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Claim many (section, subject) pairs at once, across sections."""
    require_faculty(current_user)
    fid = current_user["id"]
    status = "pending" if _faculty_approval_required(db) else "active"
    added = 0
    skipped = 0
    for item in data.items:
        subject = (item.subject or "").strip()
        if not subject:
            continue
        section = db.execute(
            text("SELECT id FROM class_sections WHERE id = :sid"), {"sid": item.section_id}
        ).fetchone()
        if not section:
            continue
        existing = db.execute(
            text(
                "SELECT id FROM faculty_sections "
                "WHERE faculty_id = :f AND section_id = :s AND subject = :sub"
            ),
            {"f": fid, "s": item.section_id, "sub": subject},
        ).fetchone()
        if existing:
            skipped += 1
            continue
        db.execute(
            text("""
                INSERT INTO faculty_sections (faculty_id, section_id, subject, assigned_by, status)
                VALUES (:f, :s, :sub, :f, :status)
            """),
            {"f": fid, "s": item.section_id, "sub": subject, "status": status},
        )
        added += 1
    db.commit()
    return {"status": status, "added": added, "skipped": skipped}


class FacultyAddStudent(BaseModel):
    section_id: int
    name: str
    scholar_number: str
    email: Optional[str] = None


@faculty_router.post("/students/add")
def faculty_add_student(
    data: FacultyAddStudent,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Create a student login and enroll them into one of the faculty's own
    approved sections. Returns a one-time credential slip."""
    require_faculty(current_user)
    fid = current_user["id"]
    name = data.name.strip()
    scholar = data.scholar_number.strip()
    if not name or not scholar:
        raise HTTPException(status_code=400, detail="Name and scholar number are required")

    section = db.execute(
        text("""
            SELECT cs.id FROM faculty_sections fs
            JOIN class_sections cs ON cs.id = fs.section_id
            WHERE fs.faculty_id = :f AND fs.section_id = :s AND fs.status = 'active'
            LIMIT 1
        """),
        {"f": fid, "s": data.section_id},
    ).fetchone()
    if not section:
        raise HTTPException(status_code=403, detail="That isn't one of your approved sections")

    result = _create_and_enroll_student(db, fid, data.section_id, name, scholar, data.email)
    db.commit()
    return result


def _faculty_active_section(db: Session, fid: int, section_id: int) -> bool:
    return (
        db.execute(
            text("""
                SELECT 1 FROM faculty_sections
                WHERE faculty_id = :f AND section_id = :s AND status = 'active' LIMIT 1
            """),
            {"f": fid, "s": section_id},
        ).fetchone()
        is not None
    )


def _create_and_enroll_student(
    db: Session, fid: int, section_id: int, name: str, scholar: str, email: Optional[str]
) -> Dict[str, Any]:
    """Create a student login + enroll into a section. Does NOT commit.
    Raises ValueError with a human message on a recoverable problem."""
    name = name.strip()
    scholar = scholar.strip()
    if not name or not scholar:
        raise ValueError("Name and scholar number are required")
    resolved_email = (email or f"{scholar}@pcdc.local").strip().lower()
    if db.execute(
        text("SELECT id FROM users WHERE LOWER(email) = :e"), {"e": resolved_email}
    ).fetchone():
        raise ValueError(f"Email {resolved_email} already exists")
    # First-time password IS the scholar number; the student is forced to set a
    # new one on first login (must_change_password = TRUE).
    password = scholar
    user = db.execute(
        text("""
            INSERT INTO users (name, email, password_hash, role, college_id, status,
                               must_change_password)
            VALUES (:n, :e, :ph, 'student', :cid, 'active', TRUE)
            RETURNING id
        """),
        {"n": name, "e": resolved_email, "ph": hash_password(password), "cid": scholar},
    ).fetchone()
    student = db.execute(
        text("INSERT INTO students (user_id, current_level) VALUES (:u, 1) RETURNING id"),
        {"u": user.id},
    ).fetchone()
    for cap in db.execute(text("SELECT id FROM capabilities")).fetchall():
        db.execute(
            text("""
                INSERT INTO student_capabilities (student_id, capability_id, current_score)
                VALUES (:sid, :cid, 0) ON CONFLICT DO NOTHING
            """),
            {"sid": student.id, "cid": cap.id},
        )
    db.execute(
        text("""
            INSERT INTO student_sections (student_id, section_id, enrolled_by, status)
            VALUES (:sid, :sec, :by, 'active')
        """),
        {"sid": student.id, "sec": section_id, "by": fid},
    )
    return {"name": name, "email": resolved_email, "password": password, "scholar_number": scholar}


@faculty_router.post("/students/bulk-import")
def faculty_bulk_import_students(
    section_id: int = Query(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Import many students into an approved section from a CSV
    (columns: name, scholar_number, email — email optional)."""
    require_faculty(current_user)
    fid = current_user["id"]
    if not _faculty_active_section(db, fid, section_id):
        raise HTTPException(status_code=403, detail="That isn't one of your approved sections")

    raw = file.file.read().decode("utf-8-sig", errors="ignore")
    reader = csv.DictReader(io.StringIO(raw))
    normalized = {}
    for field in reader.fieldnames or []:
        normalized[field] = field.strip().lower().replace(" ", "_")

    created: List[Dict[str, Any]] = []
    skipped: List[Dict[str, Any]] = []
    for i, row in enumerate(reader, start=2):  # row 1 is the header
        data = {normalized.get(k, k): (v or "").strip() for k, v in row.items()}
        name = data.get("name", "")
        scholar = data.get("scholar_number") or data.get("scholar") or data.get("roll_number", "")
        email = data.get("email") or None
        if not name and not scholar:
            continue  # blank line
        try:
            created.append(_create_and_enroll_student(db, fid, section_id, name, scholar, email))
            db.commit()
        except (ValueError, Exception) as error:  # noqa: BLE001
            db.rollback()
            reason = str(error) if isinstance(error, ValueError) else "Could not create this row"
            skipped.append({"row": i, "name": name or scholar, "reason": reason})

    return {
        "created": created,
        "skipped": skipped,
        "created_count": len(created),
        "skipped_count": len(skipped),
    }


@faculty_router.delete("/teaching/{selection_id}")
def remove_faculty_teaching(
    selection_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_faculty(current_user)
    db.execute(
        text("DELETE FROM faculty_sections WHERE id = :id AND faculty_id = :f"),
        {"id": selection_id, "f": current_user["id"]},
    )
    db.commit()
    return {"status": "deleted", "id": selection_id}


@faculty_router.post("/cases/{case_id}/assign-section")
def assign_case_to_sections(
    case_id: int,
    data: AssignCaseToSectionsRequest,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_faculty(current_user)
    if not data.section_ids:
        raise HTTPException(status_code=400, detail="At least one section is required")
    case_row = db.execute(
        text("SELECT id, title FROM case_studies WHERE id = :case_id AND status = 'published'"),
        {"case_id": case_id},
    ).fetchone()
    if not case_row:
        raise HTTPException(status_code=404, detail="Published case not found")

    results = []
    for section_id in data.section_ids:
        section_row = db.execute(
            text("SELECT id, name FROM class_sections WHERE id = :section_id"),
            {"section_id": section_id},
        ).fetchone()
        if not section_row:
            raise HTTPException(status_code=404, detail=f"Section {section_id} not found")

        existing_assignment = db.execute(
            text("""
                SELECT id FROM case_section_assignments
                WHERE case_study_id = :case_id AND section_id = :section_id
            """),
            {"case_id": case_id, "section_id": section_id},
        ).fetchone()
        if existing_assignment:
            assignment_id = existing_assignment.id
            db.execute(
                text("""
                    UPDATE case_section_assignments
                    SET due_date = :due_date, instructions = :instructions, status = 'active'
                    WHERE id = :assignment_id
                """),
                {
                    "due_date": data.due_date,
                    "instructions": data.instructions,
                    "assignment_id": assignment_id,
                },
            )
        else:
            assignment_row = db.execute(
                text("""
                    INSERT INTO case_section_assignments
                        (case_study_id, section_id, assigned_by, due_date, instructions)
                    VALUES (:case_id, :section_id, :assigned_by, :due_date, :instructions)
                    RETURNING id
                """),
                {
                    "case_id": case_id,
                    "section_id": section_id,
                    "assigned_by": current_user["id"],
                    "due_date": data.due_date,
                    "instructions": data.instructions,
                },
            ).fetchone()
            assignment_id = assignment_row.id

        students = db.execute(
            text("""
                SELECT s.id AS student_id, s.user_id
                FROM student_sections ss
                JOIN students s ON s.id = ss.student_id
                WHERE ss.section_id = :section_id AND ss.status = 'active'
            """),
            {"section_id": section_id},
        ).fetchall()

        newly_assigned = 0
        for student in students:
            attempted = db.execute(
                text("""
                    SELECT id FROM case_study_attempts
                    WHERE case_study_id = :case_id AND student_id = :student_user_id
                """),
                {"case_id": case_id, "student_user_id": student.user_id},
            ).fetchone()
            if attempted:
                continue
            existing_case = db.execute(
                text("""
                    SELECT id FROM assigned_cases
                    WHERE student_id = :student_id AND case_study_id = :case_id
                """),
                {"student_id": student.student_id, "case_id": case_id},
            ).fetchone()
            if existing_case:
                continue
            db.execute(
                text("""
                    INSERT INTO assigned_cases (
                        student_id, case_study_id, assigned_by, status,
                        assignment_source, section_assignment_id, due_date
                    )
                    VALUES (
                        :student_id, :case_id, :assigned_by, 'pending',
                        'faculty', :section_assignment_id, :due_date
                    )
                """),
                {
                    "student_id": student.student_id,
                    "case_id": case_id,
                    "assigned_by": current_user["id"],
                    "section_assignment_id": assignment_id,
                    "due_date": data.due_date,
                },
            )
            db.execute(
                text("""
                    INSERT INTO notification_log (
                        recipient_user_id, event_type, channel, status, subject, body
                    )
                    VALUES (
                        :recipient_user_id, 'case_assigned', 'email', 'pending',
                        'New case study assigned', :body
                    )
                """),
                {
                    "recipient_user_id": student.user_id,
                    "body": f'"{case_row.title}" has been assigned to your class.',
                },
            )
            newly_assigned += 1

        results.append(
            {
                "section_id": section_id,
                "section_name": section_row.name,
                "matched_students": len(students),
                "newly_assigned": newly_assigned,
            }
        )

    db.commit()
    return {"case_id": case_id, "assignments": results}


@faculty_router.post("/cases/{case_id}/assign-students")
def assign_case_to_students(
    case_id: int,
    data: AssignCaseToStudentsRequest,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Assign a published case to specific students (one or many) from the
    faculty's own roster — the individual/group counterpart to whole-section
    assignment."""
    require_faculty(current_user)
    if not data.student_ids:
        raise HTTPException(status_code=400, detail="At least one student is required")
    case_row = db.execute(
        text("SELECT id, title FROM case_studies WHERE id = :case_id AND status = 'published'"),
        {"case_id": case_id},
    ).fetchone()
    if not case_row:
        raise HTTPException(status_code=404, detail="Published case not found")

    # Only students in sections this faculty teaches can be targeted.
    valid = db.execute(
        text("""
            SELECT DISTINCT s.id AS student_id, s.user_id, u.name
            FROM students s
            JOIN users u ON u.id = s.user_id
            JOIN student_sections ss ON ss.student_id = s.id AND ss.status = 'active'
            JOIN faculty_sections fs ON fs.section_id = ss.section_id
            WHERE fs.faculty_id = :faculty_id AND s.id = ANY(:student_ids)
        """),
        {"faculty_id": current_user["id"], "student_ids": data.student_ids},
    ).fetchall()

    newly_assigned = 0
    skipped = 0
    for student in valid:
        attempted = db.execute(
            text("""
                SELECT id FROM case_study_attempts
                WHERE case_study_id = :case_id AND student_id = :student_user_id
            """),
            {"case_id": case_id, "student_user_id": student.user_id},
        ).fetchone()
        existing_case = db.execute(
            text("""
                SELECT id FROM assigned_cases
                WHERE student_id = :student_id AND case_study_id = :case_id
            """),
            {"student_id": student.student_id, "case_id": case_id},
        ).fetchone()
        if attempted or existing_case:
            skipped += 1
            continue
        db.execute(
            text("""
                INSERT INTO assigned_cases (
                    student_id, case_study_id, assigned_by, status,
                    assignment_source, due_date
                )
                VALUES (
                    :student_id, :case_id, :assigned_by, 'pending', 'faculty', :due_date
                )
            """),
            {
                "student_id": student.student_id,
                "case_id": case_id,
                "assigned_by": current_user["id"],
                "due_date": data.due_date,
            },
        )
        db.execute(
            text("""
                INSERT INTO notification_log (
                    recipient_user_id, event_type, channel, status, subject, body
                )
                VALUES (
                    :recipient_user_id, 'case_assigned', 'email', 'pending',
                    'New case study assigned', :body
                )
            """),
            {
                "recipient_user_id": student.user_id,
                "body": f'"{case_row.title}" has been assigned to you.',
            },
        )
        newly_assigned += 1

    db.commit()
    requested = len(data.student_ids)
    return {
        "case_id": case_id,
        "requested": requested,
        "matched": len(valid),
        "newly_assigned": newly_assigned,
        "skipped": skipped,
    }


@faculty_router.patch("/case-assignments/{assignment_id}/close")
def close_faculty_case_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_faculty(current_user)
    row = db.execute(
        text("""
            UPDATE case_section_assignments
            SET status = 'closed'
            WHERE id = :assignment_id AND assigned_by = :faculty_id
            RETURNING id, status
        """),
        {"assignment_id": assignment_id, "faculty_id": current_user["id"]},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Assignment not found")
    db.commit()
    return {"id": row.id, "status": row.status}
