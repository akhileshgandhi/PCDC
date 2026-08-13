from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class CaseStudyTagInput(BaseModel):
    tag_type: str
    tag_value: str


class CaseStudyCreate(BaseModel):
    title: str
    description: Optional[str] = None
    content: str
    domain: str
    difficulty: int
    estimated_minutes: int = 45
    source: str = "faculty"
    evaluation_rubric: Optional[str] = None
    learning_outcomes: Optional[str] = None
    reflection_questions: Optional[str] = None
    tags: List[CaseStudyTagInput] = Field(default_factory=list)


class CaseStudyResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    domain: str
    difficulty: int
    case_code: Optional[str] = None
    subject: Optional[str] = None
    difficulty_label: Optional[str] = None
    total_marks: Optional[float] = None
    written_marks: Optional[float] = None
    rapid_fire_marks: Optional[float] = None
    reading_time_minutes: Optional[int] = None
    answer_writing_time_minutes: Optional[int] = None
    rapid_fire_time_minutes: Optional[int] = None
    estimated_minutes: int
    source: str
    status: str
    created_by: Optional[int] = None
    tags: List[Dict[str, Any]] = Field(default_factory=list)
    created_at: str
    assignment_source: Optional[str] = None
    due_date: Optional[str] = None


class StartAttemptRequest(BaseModel):
    case_study_id: int


class StartAttemptResponse(BaseModel):
    attempt_id: int
    case_study_id: int
    title: str
    content: str
    reflection_questions: Optional[str] = None
    status: str


class SubmitAnalysisRequest(BaseModel):
    attempt_id: int
    initial_analysis: str
    # Ungraded free-text pre-analysis written before the structured questions.
    initial_summary: Optional[str] = None


class SaveDraftRequest(BaseModel):
    attempt_id: int
    # JSON-encoded {summary, answers} from the frontend — stored and returned
    # opaquely; the backend never parses it.
    draft: str


class SubmitAnalysisResponse(BaseModel):
    ai_unlocked: bool
    attempt_id: int
    opening_message: Optional[str] = None


class AIMessageRequest(BaseModel):
    attempt_id: int
    message: str


class AIMessageResponse(BaseModel):
    response: str


class SubmitSolutionRequest(BaseModel):
    attempt_id: int
    final_solution: str


class DefenseQuestionsResponse(BaseModel):
    defense_questions: List[str]


class SubmitDefenseRequest(BaseModel):
    attempt_id: int
    defense_responses: str


class SubmitReflectionRequest(BaseModel):
    attempt_id: int
    reflection_text: str


class PhaseStartRequest(BaseModel):
    phase: str  # "reading" | "writing" | "rapid_fire"


class EvaluationResult(BaseModel):
    attempt_id: int
    thinking_depth: int
    logic_score: int
    creativity_score: int
    practicality_score: int
    risk_awareness_score: int
    reflection_score: int
    ai_utilization_score: int
    time_score: int
    total_score: int
    strengths: str
    weaknesses: str
    blind_spots: str
    improvement_areas: str
    next_recommended_case_id: Optional[int] = None
    # These were missing from this response model, which silently stripped
    # them from the JSON sent back right after rapid-fire/defense submission
    # (declaring response_model= on a route makes Pydantic drop any field not
    # listed here, even though the underlying dict has it). The student's very
    # first render of the Evaluation screen therefore had no marks data and
    # fell back to the 0-100 capability score, while faculty's report (a
    # loosely-typed Dict[str, Any] endpoint) and any later reload of this same
    # attempt showed the correct marks-based score — same data, two different
    # numbers depending on which response model happened to touch it.
    question_scores: List[Dict[str, Any]] = Field(default_factory=list)
    rapid_fire_score: int = 0
    rapid_fire_feedback: str = ""
    overall_grade: str = ""
    grade_comment: str = ""


class FinalEvaluation(EvaluationResult):
    status: str


class CaseAttemptResponse(BaseModel):
    id: int
    case_study_id: int
    student_id: int
    status: str
    initial_analysis: Optional[str] = None
    initial_summary: Optional[str] = None
    initial_word_count: int
    analysis_draft: Optional[str] = None
    writing_started_at: Optional[str] = None
    final_solution: Optional[str] = None
    defense_responses: Optional[str] = None
    reflection_text: Optional[str] = None
    time_taken_minutes: Optional[int] = None
    conversations: List[Dict[str, Any]] = Field(default_factory=list)
    evaluation: Optional[Dict[str, Any]] = None
