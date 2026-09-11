"""Case Study Bank — shared library of case studies for all faculty and admins.

Entries are either uploaded (mapped to subject / semester / difficulty) or
AI-generated (stored automatically when faculty AI-generate a case, or
generated straight into the bank here). Any faculty can publish any entry
into their own Case Library:

- published AS-IS  → the entry is hidden from the bank (status='used') while
  that unmodified copy exists; editing or deleting the copy brings it back
- published WITH EDITS → the entry stays visible in the bank for others
"""

import json
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from services.auth.service import get_current_user
from services.bank.service import parse_snapshot
from services.faculty.router import (
    AI_FILL_SYSTEM_PROMPT,
    ANSWER_WORD_RANGE_BY_DIFFICULTY,
    CASE_GENERATION_MODEL,
    CASE_SECTIONS,
    DEFAULT_RUBRIC_WEIGHTS,
    DESCRIPTION_WORD_RANGE_BY_DIFFICULTY,
    _ai_fill_schema,
    blooms_levels_for_difficulty,
    delete_case_and_dependents,
    difficulty_label_for,
    expand_description_if_short,
    normalize_domain,
    require_faculty,
    semester_focus_for,
    serialize_case_content,
)
from shared.database import get_db
from shared.llm import (
    create_with_retry,
    get_llm_client,
    get_llm_model,
    json_response_format,
    parse_json_content,
)

bank_router = APIRouter(prefix="/bank", tags=["case-study-bank"])

SEMESTER_NUMBERS = list(range(1, 9))
FIXED_QUESTION_MARKS = [2, 2, 3]


class BankUploadRequest(BaseModel):
    title: str
    brief: Optional[str] = None
    content_text: Optional[str] = None          # the case body / extracted document text
    subject: Optional[str] = None
    semester_number: Optional[int] = None       # 1..8
    difficulty: int = 1                         # 1..5
    attachment_name: Optional[str] = None
    attachment_data: Optional[str] = None       # base64 of the uploaded document


class BankGenerateRequest(BaseModel):
    topic: Optional[str] = None
    subject: Optional[str] = None
    semester_number: Optional[int] = None
    difficulty: int = 2


class BankPublishRequest(BaseModel):
    # content overrides — any change here counts as an edit, so the entry
    # stays visible in the bank; leaving them unset publishes as-is.
    # Mirrors the case-creation form: core fields, sections, timing,
    # capabilities, questions and instructions can all be adjusted.
    title: Optional[str] = None
    brief: Optional[str] = None
    content_text: Optional[str] = None          # legacy alias for sections.situation
    subject: Optional[str] = None
    semester_number: Optional[int] = None
    difficulty: Optional[int] = None
    industry: Optional[str] = None
    functional_area: Optional[str] = None
    capabilities: Optional[List[str]] = None
    outcome_statement: Optional[str] = None
    decision_options: Optional[List[str]] = None
    learning_takeaways: Optional[List[str]] = None
    sections: Optional[Dict[str, Any]] = None   # full sections dict (data, objectives)
    reading_time_minutes: Optional[int] = None
    answer_writing_time_minutes: Optional[int] = None
    questions: Optional[List[Dict[str, Any]]] = None
    instructions: Optional[Dict[str, Any]] = None
    # if true, attempt to go straight to status='published' (falls back to
    # draft with missing_fields when the case is incomplete)
    publish_now: bool = False


def _norm_str(value: Any) -> str:
    return str(value or "").strip()


def _norm_list(value: Any) -> List[str]:
    if not isinstance(value, list):
        return []
    return [str(item).strip() for item in value if str(item).strip()]


def _norm_section(key: str, value: Any) -> Any:
    return _norm_str(value)


def _norm_questions(value: Any) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    if not isinstance(value, list):
        return out
    for q in value:
        if not isinstance(q, dict) or not _norm_str(q.get("question_text")):
            continue
        out.append({
            "question_text": _norm_str(q.get("question_text")),
            "word_limit_min": q.get("word_limit_min"),
            "word_limit_max": q.get("word_limit_max"),
            "instructions": _norm_str(q.get("instructions")),
            "model_answer": _norm_str(q.get("model_answer")),
            "alternative_answers": _norm_list(q.get("alternative_answers")),
            "marking_scheme": _norm_str(q.get("marking_scheme")),
        })
    return out[:3]


INSTRUCTION_KEYS = [
    "student_instructions_before", "student_instructions_during",
    "student_instructions_submission",
]


def validate_mapping(semester_number: Optional[int], difficulty: int) -> None:
    if semester_number is not None and semester_number not in SEMESTER_NUMBERS:
        raise HTTPException(status_code=400, detail="Semester must be between 1 and 8")
    if not 1 <= difficulty <= 5:
        raise HTTPException(status_code=400, detail="Difficulty must be between 1 and 5")


def _origin_semesters(raw: Optional[str], fallback: Optional[int]) -> List[int]:
    """A case created via the Case Builder can have several recommended
    semesters (case_studies.recommended_semesters), but the bank's own
    semester_number is single-valued (matches the manual upload flow, which
    only ever has one). Show all of the origin case's semesters when we have
    them, rather than silently collapsing to whichever one landed first."""
    try:
        parsed = json.loads(raw or "[]")
        semesters = [int(item) for item in parsed] if isinstance(parsed, list) else []
    except (json.JSONDecodeError, TypeError, ValueError):
        semesters = []
    if semesters:
        return semesters
    return [fallback] if fallback else []


def _linked_case(row: Any) -> tuple:
    """Resolve the one real case (if any) this entry is tied to — either the
    case it was mirrored FROM (origin_case_id, set at creation for
    case_builder/AI-fill/bulk-upload cases) or the case it was published TO
    (used_case_id, set when a faculty publishes this entry into their own
    library). An entry can have at most one of these meaningfully set.
    Returns (case_id_or_None, is_published_bool)."""
    if row.origin_case_id is not None:
        return row.origin_case_id, row.origin_status == "published"
    if row.used_case_id is not None:
        return row.used_case_id, getattr(row, "used_status", None) == "published"
    return None, False


def entry_list_item(row: Any) -> Dict[str, Any]:
    snapshot = parse_snapshot(row.case_snapshot)
    linked_case_id, linked_case_published = _linked_case(row)
    return {
        "id": row.id,
        "title": row.title,
        "brief": row.brief,
        "subject": row.subject,
        "semester_number": row.semester_number,
        "semesters": _origin_semesters(getattr(row, "origin_semesters", None), row.semester_number),
        "difficulty": row.difficulty,
        "difficulty_label": difficulty_label_for(row.difficulty or 1),
        "source": row.source,
        "created_by": row.created_by,
        "creator_name": row.creator_name,
        "creator_role": row.creator_role,
        "linked_case_id": linked_case_id,
        "linked_case_published": linked_case_published,
        "has_attachment": bool(row.attachment_name),
        "attachment_name": row.attachment_name,
        "has_full_case": bool(snapshot.get("questions")),
        "created_at": str(row.created_at),
    }


ENTRY_COLUMNS = """
    b.id, b.title, b.brief, b.case_snapshot, b.subject, b.semester_number,
    b.difficulty, b.source, b.created_by, b.creator_name, b.status,
    b.used_case_id, b.origin_case_id, b.attachment_name, b.created_at,
    b.updated_at, u.role AS creator_role,
    cs2.recommended_semesters AS origin_semesters, cs2.status AS origin_status,
    cs3.status AS used_status
"""

ENTRY_JOINS = """
    LEFT JOIN users u ON u.id = b.created_by
    LEFT JOIN case_studies cs2 ON cs2.id = b.origin_case_id
    LEFT JOIN case_studies cs3 ON cs3.id = b.used_case_id
"""

# The bank listing only ever shows entries tied to an already-published case
# — never a standalone template (no case at all) and never one still stuck
# in draft/admin-review. Mirrors _linked_case()'s resolution: prefer
# origin_case_id (set at creation for case_builder/AI-fill/bulk-upload
# cases), else used_case_id (set when this entry was previously published
# into someone's library).
PUBLISHED_ONLY_CLAUSE = """
    (
        (b.origin_case_id IS NOT NULL AND cs2.status = 'published')
        OR (b.origin_case_id IS NULL AND b.used_case_id IS NOT NULL AND cs3.status = 'published')
    )
"""


@bank_router.get("")
def list_bank_entries(
    q: Optional[str] = Query(None),
    subject: Optional[str] = Query(None),
    semester: Optional[int] = Query(None),
    difficulty: Optional[int] = Query(None),
    source: Optional[str] = Query(None),
    creator: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Faculty see only entries tied to an already-published case, ready to
    assign straight to a class — a case still in draft/admin-review doesn't
    appear for them. Admin sees everything, published or not, since they're
    the ones who need to find and review pending drafts (bulk-uploaded or
    AI-generated cases land here before anyone can publish them)."""
    require_faculty(current_user)
    clauses = ["b.status = 'available'"]
    if current_user["role"] != "admin":
        clauses.append(PUBLISHED_ONLY_CLAUSE)
    params: Dict[str, Any] = {}
    if q and q.strip():
        clauses.append("LOWER(b.title) LIKE :q")
        params["q"] = f"%{q.strip().lower()}%"
    if subject and subject.strip():
        clauses.append("LOWER(b.subject) = :subject")
        params["subject"] = subject.strip().lower()
    if semester:
        clauses.append("b.semester_number = :semester")
        params["semester"] = semester
    if difficulty:
        clauses.append("b.difficulty = :difficulty")
        params["difficulty"] = difficulty
    if source in ("uploaded", "ai_generated", "case_builder"):
        clauses.append("b.source = :source")
        params["source"] = source
    if creator and creator.strip():
        clauses.append("LOWER(b.creator_name) = :creator")
        params["creator"] = creator.strip().lower()

    rows = db.execute(
        text(f"""
            SELECT {ENTRY_COLUMNS}
            FROM case_study_bank b
            {ENTRY_JOINS}
            WHERE {' AND '.join(clauses)}
            ORDER BY b.created_at DESC
        """),
        params,
    ).fetchall()
    return {"items": [entry_list_item(row) for row in rows], "total": len(rows)}


@bank_router.get("/meta")
def bank_meta(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_faculty(current_user)
    subject_rows = db.execute(
        text("""
            SELECT DISTINCT name FROM subjects WHERE status = 'active'
            UNION
            SELECT DISTINCT subject FROM case_study_bank WHERE subject IS NOT NULL AND subject <> ''
            ORDER BY 1
        """)
    ).fetchall()
    creator_filter_clause = "TRUE" if current_user["role"] == "admin" else PUBLISHED_ONLY_CLAUSE
    creator_rows = db.execute(
        text(f"""
            SELECT DISTINCT b.creator_name
            FROM case_study_bank b
            {ENTRY_JOINS}
            WHERE b.status = 'available' AND {creator_filter_clause}
                  AND b.creator_name IS NOT NULL AND b.creator_name <> ''
            ORDER BY 1
        """)
    ).fetchall()
    return {
        "subjects": [r[0] for r in subject_rows],
        "semesters": SEMESTER_NUMBERS,
        "difficulties": [
            {"value": level, "label": f"L{level} — {difficulty_label_for(level)}"}
            for level in range(1, 6)
        ],
        "creators": [r[0] for r in creator_rows],
    }


@bank_router.post("/upload", status_code=201)
def upload_to_bank(
    data: BankUploadRequest,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_faculty(current_user)
    if not data.title.strip():
        raise HTTPException(status_code=400, detail="Title is required")
    validate_mapping(data.semester_number, data.difficulty)
    if data.attachment_data and len(data.attachment_data) > 6_000_000:
        raise HTTPException(status_code=400, detail="Attachment too large (max ~4 MB)")

    # content_text (the uploaded document's extracted text) used to be aliased
    # as sections.situation; situation no longer exists as a separate section,
    # so it folds into the one narrative field instead.
    description = "\n\n".join(
        part for part in [(data.brief or "").strip(), (data.content_text or "").strip()] if part
    )
    snapshot = {
        "description": description,
        "sections": {},
        "metadata": {"subject": (data.subject or "").strip() or None},
        "questions": [],
        "capabilities": [],
    }
    row = db.execute(
        text("""
            INSERT INTO case_study_bank (
                title, brief, case_snapshot, subject, semester_number, difficulty,
                source, created_by, creator_name, attachment_name, attachment_data, status
            )
            VALUES (
                :title, :brief, :snapshot, :subject, :semester, :difficulty,
                'uploaded', :uid, :uname, :attachment_name, :attachment_data, 'available'
            )
            RETURNING id, created_at
        """),
        {
            "title": data.title.strip(),
            "brief": (data.brief or "").strip(),
            "snapshot": json.dumps(snapshot),
            "subject": (data.subject or "").strip() or None,
            "semester": data.semester_number,
            "difficulty": data.difficulty,
            "uid": current_user["id"],
            "uname": current_user.get("name"),
            "attachment_name": data.attachment_name,
            "attachment_data": data.attachment_data,
        },
    ).fetchone()
    db.commit()
    return {"id": row.id, "status": "available", "created_at": str(row.created_at)}


@bank_router.post("/generate", status_code=201)
def generate_into_bank(
    data: BankGenerateRequest,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """AI-generate a complete case study directly into the shared bank."""
    require_faculty(current_user)
    validate_mapping(data.semester_number, data.difficulty)

    desc_words = DESCRIPTION_WORD_RANGE_BY_DIFFICULTY.get(data.difficulty, (250, 275))
    answer_words = ANSWER_WORD_RANGE_BY_DIFFICULTY.get(data.difficulty, (100, 140))
    user_prompt = (
        f"Brief: {(data.topic or '').strip() or 'Author a compelling business case study.'}\n"
        f"Target capability(ies): choose the complementary triad for this difficulty level\n"
        f"Difficulty: {difficulty_label_for(data.difficulty)} (level {data.difficulty})\n"
        f"Semester: {data.semester_number or 'not specified'} — {semester_focus_for(data.semester_number)}.\n"
        f"Subject/area (optional hint): {data.subject or 'infer from the brief'}\n"
        f"Case Background length target: {desc_words[0]}-{desc_words[1]} words.\n"
        f"Expected Answer length target per question: {answer_words[0]}-{answer_words[1]} words.\n"
        "Write the full case now as JSON."
    )
    try:
        client = get_llm_client()
        response = create_with_retry(client, {
            "model": get_llm_model(CASE_GENERATION_MODEL),
            "messages": [
                {"role": "system", "content": AI_FILL_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            "response_format": json_response_format(_ai_fill_schema(), "bank_case_generate"),
            "max_tokens": 16000,
            "timeout": 180,
        }, db=db)
        parsed = parse_json_content(response.choices[0].message.content)
    except Exception as exc:  # noqa: BLE001
        status = getattr(exc, "status_code", None)
        if status == 503:
            raise HTTPException(
                status_code=503,
                detail="The AI model is under heavy load right now. Please try again in a minute.",
            )
        raise HTTPException(status_code=502, detail=f"AI case generation failed: {exc}")
    if not isinstance(parsed, dict):
        raise HTTPException(status_code=502, detail="AI returned an unexpected response")

    def _s(key: str) -> str:
        return str(parsed.get(key) or "").strip()

    def _list(key: str) -> List[str]:
        val = parsed.get(key)
        return [str(x).strip() for x in val if str(x).strip()] if isinstance(val, list) else []

    questions = []
    raw_questions = parsed.get("questions")
    for q in (raw_questions if isinstance(raw_questions, list) else [])[:3]:
        if isinstance(q, dict):
            questions.append({
                "question_text": str(q.get("question_text") or "").strip(),
                "word_limit_min": q.get("word_limit_min"),
                "word_limit_max": q.get("word_limit_max"),
                "instructions": str(q.get("instructions") or "").strip(),
                "model_answer": str(q.get("model_answer") or "").strip(),
                "alternative_answers": [str(x).strip() for x in (q.get("alternative_answers") or []) if str(x).strip()],
                "marking_scheme": str(q.get("marking_scheme") or "").strip(),
            })
    try:
        industry = normalize_domain(_s("industry"))
    except HTTPException:
        industry = "business"

    description_out = expand_description_if_short(client, _s("description"), data.difficulty, db)
    snapshot = {
        "description": description_out,
        "industry": industry,
        "capabilities": _list("capabilities"),
        "outcome_statement": _s("outcome_statement"),
        "decision_options": _list("decision_options"),
        "learning_takeaways": _list("learning_takeaways"),
        "sections": {
            "data": _s("data"),
            "objectives": _s("objectives"),
        },
        "metadata": {"subject": _s("subject") or (data.subject or "").strip() or None,
                     "functional_area": _s("functional_area")},
        "timing": {"reading_time_minutes": parsed.get("reading_time_minutes") or 8,
                   "answer_writing_time_minutes": 12},
        "instructions": {
            "student_instructions_before": _s("student_instructions_before"),
            "student_instructions_during": _s("student_instructions_during"),
            "student_instructions_submission": _s("student_instructions_submission"),
        },
        "questions": questions,
        "case_specific_criteria": _list("case_specific_criteria")[:2],
    }
    row = db.execute(
        text("""
            INSERT INTO case_study_bank (
                title, brief, case_snapshot, subject, semester_number, difficulty,
                source, created_by, creator_name, status
            )
            VALUES (
                :title, :brief, :snapshot, :subject, :semester, :difficulty,
                'ai_generated', :uid, :uname, 'available'
            )
            RETURNING id, title, created_at
        """),
        {
            "title": _s("title") or "Untitled case study",
            "brief": _s("description"),
            "snapshot": json.dumps(snapshot),
            "subject": snapshot["metadata"]["subject"],
            "semester": data.semester_number,
            "difficulty": data.difficulty,
            "uid": current_user["id"],
            "uname": current_user.get("name"),
        },
    ).fetchone()
    db.commit()
    return {"id": row.id, "title": row.title, "status": "available", "created_at": str(row.created_at)}


def get_bank_entry_row(db: Session, entry_id: int) -> Any:
    row = db.execute(
        text(f"""
            SELECT {ENTRY_COLUMNS}, b.attachment_data
            FROM case_study_bank b
            {ENTRY_JOINS}
            WHERE b.id = :bid
        """),
        {"bid": entry_id},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Bank entry not found")
    return row


@bank_router.get("/{entry_id}")
def bank_entry_detail(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_faculty(current_user)
    row = get_bank_entry_row(db, entry_id)
    snapshot = parse_snapshot(row.case_snapshot)
    detail = entry_list_item(row)
    detail["snapshot"] = snapshot
    detail["status"] = row.status
    detail["used_case_id"] = row.used_case_id
    return detail


@bank_router.get("/{entry_id}/attachment")
def bank_entry_attachment(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_faculty(current_user)
    row = get_bank_entry_row(db, entry_id)
    if not row.attachment_data:
        raise HTTPException(status_code=404, detail="No attachment on this entry")
    return {"name": row.attachment_name, "data": row.attachment_data}


@bank_router.post("/{entry_id}/publish")
def publish_from_bank(
    entry_id: int,
    data: BankPublishRequest,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Publish a bank entry into the caller's own Case Library.

    As-is → the entry is hidden from the bank while the unmodified copy lives.
    With content edits → the entry stays in the bank for other faculty."""
    require_faculty(current_user)
    row = get_bank_entry_row(db, entry_id)
    if row.status != "available":
        raise HTTPException(status_code=404, detail="Bank entry not found")
    snapshot = parse_snapshot(row.case_snapshot)
    sections_snapshot = snapshot.get("sections") or {}
    metadata_snapshot = snapshot.get("metadata") or {}
    instructions_snapshot = snapshot.get("instructions") or {}
    timing_snapshot = snapshot.get("timing") or {}

    # ---- resolve every content field (override wins, else snapshot/entry) ----
    title = (data.title or row.title).strip()
    brief = _norm_str(data.brief if data.brief is not None else (row.brief or ""))
    subject = _norm_str(data.subject if data.subject is not None else row.subject) or None
    semester = data.semester_number if data.semester_number is not None else row.semester_number
    difficulty = data.difficulty if data.difficulty is not None else (row.difficulty or 1)
    industry = _norm_str(data.industry if data.industry is not None else snapshot.get("industry")) or "business"
    functional_area = _norm_str(
        data.functional_area if data.functional_area is not None
        else metadata_snapshot.get("functional_area")) or None
    capabilities = (_norm_list(data.capabilities) if data.capabilities is not None
                    else _norm_list(snapshot.get("capabilities")))
    outcome_statement = _norm_str(
        data.outcome_statement if data.outcome_statement is not None
        else snapshot.get("outcome_statement"))
    decision_options = (_norm_list(data.decision_options) if data.decision_options is not None
                        else _norm_list(snapshot.get("decision_options")))
    learning_takeaways = (_norm_list(data.learning_takeaways) if data.learning_takeaways is not None
                          else _norm_list(snapshot.get("learning_takeaways")))
    validate_mapping(semester, difficulty)
    try:
        industry = normalize_domain(industry)
    except HTTPException:
        industry = "business"

    sections_in = data.sections if isinstance(data.sections, dict) else {}
    original_sections = {key: _norm_section(key, sections_snapshot.get(key)) for key in CASE_SECTIONS}
    sections = {}
    for key in CASE_SECTIONS:
        if key in sections_in:
            sections[key] = _norm_section(key, sections_in.get(key))
        else:
            sections[key] = original_sections[key]
    # content_text used to be aliased as sections.situation; situation no
    # longer exists as a section, so it folds into the narrative instead.
    if data.content_text is not None:
        content_text = _norm_str(data.content_text)
        if content_text and content_text not in brief:
            brief = "\n\n".join(part for part in [brief, content_text] if part)

    reading = data.reading_time_minutes if data.reading_time_minutes is not None \
        else (timing_snapshot.get("reading_time_minutes") or 8)
    writing = data.answer_writing_time_minutes if data.answer_writing_time_minutes is not None \
        else (timing_snapshot.get("answer_writing_time_minutes") or 12)
    original_questions = _norm_questions(snapshot.get("questions"))
    questions = (_norm_questions(data.questions) if data.questions is not None
                 else original_questions)
    original_instructions = {key: _norm_str(instructions_snapshot.get(key)) for key in INSTRUCTION_KEYS}
    instructions_in = data.instructions if isinstance(data.instructions, dict) else {}
    instructions = {
        key: (_norm_str(instructions_in.get(key)) if key in instructions_in
              else original_instructions[key])
        for key in INSTRUCTION_KEYS
    }

    # ---- edited = any content dimension differs from the original entry ----
    edited = (
        title != row.title.strip()
        or brief != _norm_str(row.brief)
        or (subject or "") != _norm_str(row.subject)
        or semester != row.semester_number
        or difficulty != (row.difficulty or 1)
        or industry != (_norm_str(snapshot.get("industry")) or "business")
        or (functional_area or "") != _norm_str(metadata_snapshot.get("functional_area"))
        or capabilities != _norm_list(snapshot.get("capabilities"))
        or outcome_statement != _norm_str(snapshot.get("outcome_statement"))
        or decision_options != _norm_list(snapshot.get("decision_options"))
        or learning_takeaways != _norm_list(snapshot.get("learning_takeaways"))
        or sections != original_sections
        or int(reading) != int(timing_snapshot.get("reading_time_minutes") or 8)
        or int(writing) != int(timing_snapshot.get("answer_writing_time_minutes") or 12)
        or questions != original_questions
        or instructions != original_instructions
    )

    section_meta = {key: ("ai_generated" if row.source == "ai_generated" else "manual")
                    for key in CASE_SECTIONS}
    content = serialize_case_content(brief, {k: v for k, v in sections.items() if v}, section_meta)
    estimated = int(reading) + int(writing) + 8
    rubric = {"weights": dict(DEFAULT_RUBRIC_WEIGHTS),
              "case_specific_criteria": (snapshot.get("case_specific_criteria") or [])[:2]}

    case_row = db.execute(
        text("""
            INSERT INTO case_studies (
                title, description, content, domain, difficulty, estimated_minutes,
                source, status, created_by, evaluation_rubric,
                subject, functional_area, difficulty_label, blooms_levels,
                reading_time_minutes, answer_writing_time_minutes, rapid_fire_time_minutes,
                total_marks, written_marks, rapid_fire_marks,
                student_instructions_before, student_instructions_during,
                student_instructions_submission,
                recommended_semesters, outcome_statement, decision_options, learning_takeaways
            )
            VALUES (
                :title, :description, :content, :domain, :difficulty, :estimated_minutes,
                :source, 'draft', :created_by, :rubric,
                :subject, :functional_area, :difficulty_label, :blooms_levels,
                :reading, :writing, 8,
                10, 7, 3,
                :ins_before, :ins_during, :ins_submission,
                :recommended_semesters, :outcome_statement, :decision_options, :learning_takeaways
            )
            RETURNING id
        """),
        {
            "title": title,
            "description": brief,
            "content": content,
            "domain": industry,
            "difficulty": difficulty,
            "estimated_minutes": estimated,
            "source": "ai_generated" if row.source == "ai_generated" else "faculty",
            "created_by": current_user["id"],
            "rubric": json.dumps(rubric),
            "outcome_statement": outcome_statement,
            "decision_options": json.dumps(decision_options) if decision_options else None,
            "learning_takeaways": json.dumps(learning_takeaways) if learning_takeaways else None,
            "subject": subject,
            "functional_area": functional_area,
            "difficulty_label": difficulty_label_for(difficulty),
            "blooms_levels": blooms_levels_for_difficulty(difficulty),
            "reading": reading,
            "writing": writing,
            "ins_before": instructions["student_instructions_before"],
            "ins_during": instructions["student_instructions_during"],
            "ins_submission": instructions["student_instructions_submission"],
            "recommended_semesters": json.dumps([semester] if semester else []),
        },
    ).fetchone()
    case_id = case_row.id

    for capability in capabilities:
        db.execute(
            text("""
                INSERT INTO case_study_tags (case_study_id, tag_type, tag_value)
                VALUES (:cid, 'capability', :val)
                ON CONFLICT (case_study_id, tag_type, tag_value) DO NOTHING
            """),
            {"cid": case_id, "val": str(capability).strip()},
        )
    for i, q in enumerate(questions[:3]):
        db.execute(
            text("""
                INSERT INTO case_questions (
                    case_study_id, question_number, question_text, marks,
                    word_limit_min, word_limit_max, instructions, model_answer,
                    alternative_answers, marking_scheme
                )
                VALUES (:cid, :num, :text, :marks, :wmin, :wmax, :ins, :model, :alts, :scheme)
            """),
            {
                "cid": case_id,
                "num": i + 1,
                "text": str(q.get("question_text") or ""),
                "marks": FIXED_QUESTION_MARKS[i] if i < len(FIXED_QUESTION_MARKS) else 2,
                "wmin": q.get("word_limit_min"),
                "wmax": q.get("word_limit_max"),
                "ins": q.get("instructions"),
                "model": q.get("model_answer"),
                "alts": json.dumps(q.get("alternative_answers") or []),
                "scheme": q.get("marking_scheme"),
            },
        )

    # optional immediate publish — same required-field gate as the faculty flow
    status = "draft"
    missing_fields: List[str] = []
    if data.publish_now:
        if not title:
            missing_fields.append("title")
        if not capabilities:
            missing_fields.append("capabilities")
        if not brief.strip():
            missing_fields.append("description")
        for section in ["objectives"]:
            value = sections.get(section)
            if not (value if isinstance(value, list) else str(value or "").strip()):
                missing_fields.append(section)
        if not missing_fields:
            db.execute(
                text("UPDATE case_studies SET status = 'published', updated_at = NOW() WHERE id = :cid"),
                {"cid": case_id},
            )
            status = "published"

    # Always record which case this entry produced, so the bank listing can
    # show "Assign to Class" once it's published instead of "Publish" again —
    # regardless of whether the content was edited. Only an as-is (unedited)
    # publish also hides the entry from the bank; an edited publish keeps the
    # original template available for other faculty to reuse.
    db.execute(
        text("UPDATE case_study_bank SET used_case_id = :cid, updated_at = NOW() WHERE id = :bid"),
        {"cid": case_id, "bid": entry_id},
    )
    if not edited:   # as-is → hide from the bank while this copy is live
        db.execute(
            text("UPDATE case_study_bank SET status = 'used' WHERE id = :bid"),
            {"bid": entry_id},
        )
    db.commit()
    return {
        "case_id": case_id,
        "case_status": status,
        "edited": edited,
        "entry_visible_in_bank": edited,
        "missing_fields": missing_fields,
    }


@bank_router.delete("/{entry_id}")
def delete_bank_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_faculty(current_user)
    row = get_bank_entry_row(db, entry_id)
    if current_user["role"] != "admin" and row.created_by != current_user["id"]:
        raise HTTPException(
            status_code=403,
            detail="Only the person who added an entry (or an admin) can delete it",
        )
    # Same "which case does this entry point at" resolution as _linked_case():
    # origin_case_id (entry mirrored FROM an existing case) if set, else
    # used_case_id (entry published INTO a new case). Checking only
    # origin_case_id here missed every entry linked via used_case_id — the
    # bank row would disappear but the actual published case (and its
    # attempts) stayed behind in the creator's Library, invisible from the
    # Bank but still fully live.
    link_row = db.execute(
        text("SELECT origin_case_id, used_case_id FROM case_study_bank WHERE id = :bid"),
        {"bid": entry_id},
    ).fetchone()
    linked_case_id = (link_row.origin_case_id or link_row.used_case_id) if link_row else None
    db.execute(text("DELETE FROM case_study_bank WHERE id = :bid"), {"bid": entry_id})
    # An admin removing a bank entry is a moderation decision on the case
    # itself, not just its shared listing — take the case out of its
    # creator's Library too. A faculty removing their own listing only
    # removes it from the bank; the case stays in their own Library.
    if current_user["role"] == "admin" and linked_case_id:
        delete_case_and_dependents(db, linked_case_id)
    db.commit()
    return {"status": "deleted", "id": entry_id, "title": row.title}
