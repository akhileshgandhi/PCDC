from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from services.auth.service import get_current_user
from shared.database import get_db

from .models import (
    AIMessageRequest,
    AIMessageResponse,
    CaseAttemptResponse,
    CaseStudyCreate,
    CaseStudyResponse,
    DefenseQuestionsResponse,
    EvaluationResult,
    FinalEvaluation,
    PhaseStartRequest,
    StartAttemptRequest,
    StartAttemptResponse,
    SubmitAnalysisRequest,
    SubmitAnalysisResponse,
    SubmitDefenseRequest,
    SubmitReflectionRequest,
    SubmitSolutionRequest,
)
from .service import (
    create_case_study,
    get_attempt_detail,
    get_case_detail,
    get_case_study,
    get_student_attempts_for_mentor,
    get_thinking_path_for_mentor,
    list_case_studies,
    send_ai_message,
    start_attempt_phase,
    start_case_attempt,
    start_rapid_fire_round,
    submit_defense,
    submit_initial_analysis,
    submit_rapid_fire,
    submit_reflection,
    submit_solution,
    update_case_status,
)

simulation_router = APIRouter(prefix="/cases", tags=["cases"])


@simulation_router.get("/health")
def health_check() -> Dict[str, str]:
    return {"status": "Case studies service is healthy"}


@simulation_router.post("/create", response_model=CaseStudyResponse, status_code=201)
def create_case(
    data: CaseStudyCreate,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    try:
        return create_case_study(db, data, current_user)
    except HTTPException:
        raise
    except Exception as error:
        print(f"CREATE CASE ERROR: {error}")
        raise HTTPException(status_code=500, detail="Internal server error")


@simulation_router.get("/list", response_model=List[CaseStudyResponse])
def list_cases(
    domain: Optional[str] = None,
    difficulty: Optional[int] = None,
    career_track: Optional[str] = None,
    capability: Optional[str] = None,
    status: str = Query(default="published"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    try:
        return list_case_studies(
            db, current_user, domain, difficulty, career_track, capability, status
        )
    except HTTPException:
        raise
    except Exception as error:
        print(f"LIST CASES ERROR: {error}")
        raise HTTPException(status_code=500, detail="Internal server error")


@simulation_router.get("/{case_id}/detail")
def case_detail(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    try:
        return get_case_detail(db, case_id, current_user)
    except HTTPException:
        raise
    except Exception as error:
        print(f"CASE DETAIL ERROR: {error}")
        raise HTTPException(status_code=500, detail="Internal server error")


@simulation_router.post("/attempt/start", response_model=StartAttemptResponse)
def start_attempt(
    data: StartAttemptRequest,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    try:
        return start_case_attempt(db, data.case_study_id, current_user)
    except HTTPException:
        raise
    except Exception as error:
        print(f"START ATTEMPT ERROR: {error}")
        raise HTTPException(status_code=500, detail="Internal server error")


@simulation_router.post("/attempt/submit-analysis", response_model=SubmitAnalysisResponse)
def submit_analysis(
    data: SubmitAnalysisRequest,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    try:
        return submit_initial_analysis(
            db, data.attempt_id, data.initial_analysis, current_user, data.initial_summary
        )
    except HTTPException:
        raise
    except Exception as error:
        print(f"SUBMIT ANALYSIS ERROR: {error}")
        raise HTTPException(status_code=500, detail="Internal server error")


@simulation_router.post("/attempt/ai-message", response_model=AIMessageResponse)
def ai_message(
    data: AIMessageRequest,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, str]:
    try:
        return send_ai_message(db, data.attempt_id, data.message, current_user)
    except HTTPException:
        raise
    except Exception as error:
        print(f"AI MESSAGE ERROR: {error}")
        raise HTTPException(status_code=500, detail="Internal server error")


@simulation_router.post("/attempt/submit-solution", response_model=DefenseQuestionsResponse)
def submit_case_solution(
    data: SubmitSolutionRequest,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, List[str]]:
    try:
        return submit_solution(db, data.attempt_id, data.final_solution, current_user)
    except HTTPException:
        raise
    except Exception as error:
        print(f"SUBMIT SOLUTION ERROR: {error}")
        raise HTTPException(status_code=500, detail="Internal server error")


@simulation_router.post("/attempt/submit-defense", response_model=EvaluationResult)
def submit_case_defense(
    data: SubmitDefenseRequest,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    try:
        return submit_defense(db, data.attempt_id, data.defense_responses, current_user)
    except HTTPException:
        raise
    except Exception as error:
        print(f"SUBMIT DEFENSE ERROR: {error}")
        raise HTTPException(status_code=500, detail="Internal server error")


@simulation_router.post("/attempt/{attempt_id}/phase-start")
def attempt_phase_start(
    attempt_id: int,
    data: PhaseStartRequest,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    try:
        return start_attempt_phase(db, attempt_id, data.phase, current_user)
    except HTTPException:
        raise
    except Exception as error:
        print(f"PHASE START ERROR: {error}")
        raise HTTPException(status_code=500, detail="Internal server error")


@simulation_router.post("/attempt/{attempt_id}/rapid-fire/start")
def rapid_fire_start(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    try:
        return start_rapid_fire_round(db, attempt_id, current_user)
    except HTTPException:
        raise
    except Exception as error:
        print(f"RAPID FIRE START ERROR: {error}")
        raise HTTPException(status_code=500, detail="Internal server error")


@simulation_router.post("/attempt/submit-rapid-fire", response_model=EvaluationResult)
def submit_case_rapid_fire(
    data: SubmitDefenseRequest,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    try:
        return submit_rapid_fire(db, data.attempt_id, data.defense_responses, current_user)
    except HTTPException:
        raise
    except Exception as error:
        print(f"SUBMIT RAPID FIRE ERROR: {error}")
        raise HTTPException(status_code=500, detail="Internal server error")


@simulation_router.post("/attempt/submit-reflection", response_model=FinalEvaluation)
def submit_case_reflection(
    data: SubmitReflectionRequest,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    try:
        return submit_reflection(db, data.attempt_id, data.reflection_text, current_user)
    except HTTPException:
        raise
    except Exception as error:
        print(f"SUBMIT REFLECTION ERROR: {error}")
        raise HTTPException(status_code=500, detail="Internal server error")


@simulation_router.get("/attempt/{attempt_id}", response_model=CaseAttemptResponse)
def get_attempt(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    try:
        return get_attempt_detail(db, attempt_id, current_user)
    except HTTPException:
        raise
    except Exception as error:
        print(f"GET ATTEMPT ERROR: {error}")
        raise HTTPException(status_code=500, detail="Internal server error")


@simulation_router.get("/mentor/student/{student_id}/attempts")
def mentor_student_attempts(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    try:
        return get_student_attempts_for_mentor(db, student_id, current_user)
    except HTTPException:
        raise
    except Exception as error:
        print(f"MENTOR STUDENT ATTEMPTS ERROR: {error}")
        raise HTTPException(status_code=500, detail="Internal server error")


@simulation_router.get("/mentor/student/{student_id}/thinking-path/{attempt_id}")
def mentor_thinking_path(
    student_id: int,
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    try:
        return get_thinking_path_for_mentor(db, student_id, attempt_id, current_user)
    except HTTPException:
        raise
    except Exception as error:
        print(f"MENTOR THINKING PATH ERROR: {error}")
        raise HTTPException(status_code=500, detail="Internal server error")


@simulation_router.put("/{case_id}/publish", response_model=CaseStudyResponse)
def publish_case(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    try:
        return update_case_status(db, case_id, "published", current_user)
    except HTTPException:
        raise
    except Exception as error:
        print(f"PUBLISH CASE ERROR: {error}")
        raise HTTPException(status_code=500, detail="Internal server error")


@simulation_router.put("/{case_id}/archive", response_model=CaseStudyResponse)
def archive_case(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    try:
        return update_case_status(db, case_id, "archived", current_user)
    except HTTPException:
        raise
    except Exception as error:
        print(f"ARCHIVE CASE ERROR: {error}")
        raise HTTPException(status_code=500, detail="Internal server error")


@simulation_router.get("/{case_id}", response_model=CaseStudyResponse)
def get_case(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    try:
        return get_case_study(db, case_id, current_user)
    except HTTPException:
        raise
    except Exception as error:
        print(f"GET CASE ERROR: {error}")
        raise HTTPException(status_code=500, detail="Internal server error")
