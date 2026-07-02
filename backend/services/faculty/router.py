import json
import os
import threading
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from openai import OpenAI
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from services.auth.service import get_current_user
from shared.cache import cache_get, cache_set
from shared.database import SessionLocal, get_db

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


class CaseCoreFields(BaseModel):
    title: str
    industry: str
    difficulty: int
    duration_minutes: int
    capabilities: List[str] = Field(default_factory=list)
    expected_outcomes: str
    metadata: Optional[Dict[str, Any]] = None
    timing: Optional[Dict[str, Any]] = None
    marks: Optional[Dict[str, Any]] = None
    instructions: Optional[Dict[str, Any]] = None


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
    if not data.expected_outcomes.strip():
        raise HTTPException(status_code=400, detail="Expected outcomes are required")


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
            return [line.strip() for line in stripped.splitlines() if line.strip()]
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


def normalize_case_timing(data: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    data = data or {}
    return {
        "reading_time_minutes": int_value(data.get("reading_time_minutes")),
        "answer_writing_time_minutes": int_value(data.get("answer_writing_time_minutes")),
        "rapid_fire_time_minutes": int_value(data.get("rapid_fire_time_minutes")),
    }


def normalize_case_marks(data: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    data = data or {}
    return {
        "total_marks": float_value(data.get("total_marks")),
        "written_marks": float_value(data.get("written_marks")),
        "rapid_fire_marks": float_value(data.get("rapid_fire_marks")),
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
    faculty_discussion_points, key_learning_points, created_at, updated_at
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
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OpenAI API key is not configured")

    client = OpenAI(api_key=api_key)
    response = client.chat.completions.create(
        model=CASE_GENERATION_MODEL,
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
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "faculty_case_generation",
                "strict": True,
                "schema": build_case_generation_schema(requested_sections),
            },
        },
        timeout=60,
    )
    content = response.choices[0].message.content
    if not content:
        raise RuntimeError("OpenAI returned an empty response")
    return validate_generated_sections(json.loads(content), requested_sections)


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
            "created_at": str(row.created_at),
            "updated_at": str(row.updated_at),
        }
        for row in rows
    ]


@faculty_router.get("/capabilities")
def faculty_capabilities(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    require_faculty(current_user)
    count = db.execute(text("SELECT COUNT(*) FROM capabilities")).scalar() or 0
    if count == 0:
        for capability in DEFAULT_CAPABILITIES:
            db.execute(
                text("""
                    INSERT INTO capabilities (name, weightage)
                    VALUES (:name, 1)
                """),
                {"name": capability},
            )
        db.commit()

    rows = db.execute(
        text("""
            SELECT id, name
            FROM capabilities
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
    content = serialize_case_content(data.expected_outcomes, sections, section_meta)
    metadata = normalize_case_metadata(data.metadata)
    timing = normalize_case_timing(data.timing)
    marks = normalize_case_marks(data.marks)
    instructions = normalize_case_instructions(data.instructions)

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
                faculty_discussion_points, key_learning_points
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
                :faculty_discussion_points, :key_learning_points
            )
            RETURNING """ + CASE_EDITOR_COLUMNS + """
        """),
        {
            "title": data.title.strip(),
            "description": data.expected_outcomes.strip(),
            "content": content,
            "domain": domain,
            "difficulty": data.difficulty,
            "estimated_minutes": data.duration_minutes,
            "created_by": current_user["id"],
            **metadata,
            **timing,
            "total_marks": marks["total_marks"] if marks["total_marks"] is not None else 10,
            "written_marks": marks["written_marks"] if marks["written_marks"] is not None else 7,
            "rapid_fire_marks": (
                marks["rapid_fire_marks"] if marks["rapid_fire_marks"] is not None else 3
            ),
            **instructions,
        },
    )
    row = result.fetchone()
    replace_capability_tags(db, row.id, data.capabilities)
    db.commit()
    return case_editor_response(db, row)


@faculty_router.get("/cases/{case_id}")
def get_faculty_case(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_faculty(current_user)
    row = get_owned_case_row(db, case_id, current_user)
    return case_editor_response(db, row)


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
            key: existing_values.get(key)
            for key in [
                "reading_time_minutes",
                "answer_writing_time_minutes",
                "rapid_fire_time_minutes",
            ]
        }
    )
    marks = (
        normalize_case_marks(data.marks)
        if data.marks is not None
        else {
            "total_marks": existing_values.get("total_marks"),
            "written_marks": existing_values.get("written_marks"),
            "rapid_fire_marks": existing_values.get("rapid_fire_marks"),
        }
    )
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
            "total_marks": marks["total_marks"] if marks["total_marks"] is not None else 10,
            "written_marks": marks["written_marks"] if marks["written_marks"] is not None else 7,
            "rapid_fire_marks": (
                marks["rapid_fire_marks"] if marks["rapid_fire_marks"] is not None else 3
            ),
            **instructions,
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
    if not parsed_content["expected_outcomes"]:
        missing_fields.append("expected_outcomes")
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
