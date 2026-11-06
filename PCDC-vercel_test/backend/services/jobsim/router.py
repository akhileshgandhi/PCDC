"""Job simulation API (handover section 9.3), mounted under /api/v1.

Separate from the case study engine (services/simulation, /api/v1/cases/*).
Student routes take the student from the login token, never from the URL.
"""

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from services.auth.service import get_current_user
from shared.database import get_db

from . import designer, publishing, questions, review, service
from .formula import FORMAT_LABELS, SUPPORTED_FUNCTIONS

logger = logging.getLogger(__name__)

jobsim_router = APIRouter(tags=["jobsim"])


def require_student(current_user: Dict[str, Any]) -> None:
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Student access required")


def require_author(current_user: Dict[str, Any]) -> None:
    if current_user["role"] not in ("faculty", "admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Faculty access required")


class ScoreChange(BaseModel):
    score: float
    note: Optional[str] = None


class SimulationTask(BaseModel):
    type: str
    prompt: str
    stage: Optional[str] = None
    hint: Optional[str] = None
    config: Dict[str, Any] = Field(default_factory=dict)
    rubric: Optional[Any] = None
    max_score: Optional[float] = 1
    answer_formula: Optional[str] = None
    expected_format: Optional[str] = None


class SimulationDataset(BaseModel):
    columns: List[str]
    rows: List[List[Any]]


class SimulationPayload(BaseModel):
    title: str
    description: Optional[str] = None
    role: Optional[str] = None
    level: Optional[str] = None
    duration_minutes: int = 60
    course_id: Optional[int] = None
    subject: Optional[str] = None
    semester: Optional[int] = None
    dataset: SimulationDataset
    tasks: List[SimulationTask]
    capability_ids: Optional[List[int]] = None
    # True when faculty uploaded the data (it then can't be regenerated).
    dataset_uploaded: bool = False


def _payload_dict(payload: SimulationPayload) -> Dict[str, Any]:
    return {
        "title": payload.title,
        "description": payload.description,
        "role": payload.role,
        "level": payload.level,
        "duration_minutes": payload.duration_minutes,
        "course_id": payload.course_id,
        "subject": payload.subject,
        "semester": payload.semester,
        "dataset": {"columns": payload.dataset.columns, "rows": payload.dataset.rows},
        "dataset_uploaded": payload.dataset_uploaded,
        "tasks": [
            {
                "type": t.type,
                "prompt": t.prompt,
                "stage": t.stage,
                "hint": t.hint,
                "config": t.config,
                "rubric": t.rubric,
                "max_score": t.max_score,
                "answer_formula": t.answer_formula,
                "expected_format": t.expected_format,
            }
            for t in payload.tasks
        ],
    }


class AttemptState(BaseModel):
    cells: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    memo: Optional[Any] = None
    slides: Optional[Any] = None
    last_task_id: Optional[int] = None


class CellInput(BaseModel):
    input: str = ""
    format: str = "general"


# --- shared --------------------------------------------------------------


@jobsim_router.get("/jobsim/spreadsheet/meta")
def spreadsheet_meta(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """Functions and formats the answer cells support (for help text and the
    format picker)."""
    return {
        "functions": SUPPORTED_FUNCTIONS,
        "formats": [{"value": key, "label": label} for key, label in FORMAT_LABELS.items()],
    }


# --- faculty / admin -----------------------------------------------------


@jobsim_router.get("/faculty/jobsim")
def list_simulations(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_author(current_user)
    items = service.list_simulations_for_author(db, current_user)
    return {"items": items, "total": len(items)}


@jobsim_router.post("/faculty/jobsim", status_code=201)
def create_simulation(
    payload: SimulationPayload,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_author(current_user)
    simulation_id = service.create_simulation(db, current_user, _payload_dict(payload))
    if payload.capability_ids is not None:
        service.set_capability_tags(db, simulation_id, payload.capability_ids)
    return service.load_simulation_for_author(db, current_user, simulation_id)


@jobsim_router.get("/faculty/jobsim/{simulation_id}")
def get_simulation(
    simulation_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_author(current_user)
    return service.load_simulation_for_author(db, current_user, simulation_id)


@jobsim_router.put("/faculty/jobsim/{simulation_id}")
def update_simulation(
    simulation_id: int,
    payload: SimulationPayload,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_author(current_user)
    service.update_simulation(db, current_user, simulation_id, _payload_dict(payload))
    if payload.capability_ids is not None:
        service.set_capability_tags(db, simulation_id, payload.capability_ids)
    return service.load_simulation_for_author(db, current_user, simulation_id)


@jobsim_router.post("/faculty/jobsim/{simulation_id}/approve")
def approve_simulation(
    simulation_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Re-check every answer, then mark the draft approved for an admin to publish."""
    require_author(current_user)
    service.approve_simulation(db, current_user, simulation_id)
    return service.load_simulation_for_author(db, current_user, simulation_id)


@jobsim_router.post("/faculty/jobsim/{simulation_id}/dataset/regenerate")
def regenerate_dataset(
    simulation_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Fresh numbers for an AI-designed draft (same columns and tasks)."""
    require_author(current_user)
    designer.regenerate_dataset(db, current_user, simulation_id)
    return service.load_simulation_for_author(db, current_user, simulation_id)


class FormulaTest(BaseModel):
    dataset: SimulationDataset
    input: str = ""
    format: str = "general"


@jobsim_router.post("/faculty/jobsim/evaluate")
def test_formula(
    data: FormulaTest,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Test an answer formula on the data being edited."""
    require_author(current_user)
    return service.evaluate_for_author(
        {"columns": data.dataset.columns, "rows": data.dataset.rows}, data.input, data.format
    )


class QuestionRequest(BaseModel):
    dataset: SimulationDataset
    count: int = 5
    title: Optional[str] = None
    description: Optional[str] = None
    role: Optional[str] = None
    subject: Optional[str] = None
    level: Optional[str] = None
    focus: Optional[str] = None
    existing: List[Dict[str, Any]] = Field(default_factory=list)


@jobsim_router.post("/faculty/jobsim/questions/generate")
def generate_questions(
    data: QuestionRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """AI questions for uploaded data. Nothing is saved: faculty review them in
    the editor first."""
    require_author(current_user)
    if not data.dataset.columns or not data.dataset.rows:
        raise HTTPException(status_code=400, detail="Upload the data first.")
    if len(data.dataset.rows) > service.MAX_DATASET_ROWS or len(data.dataset.columns) > service.MAX_DATASET_COLUMNS:
        raise HTTPException(status_code=400, detail="The data is too large.")
    room = questions.MAX_TASKS - sum(1 for t in data.existing if t.get("type") == "spreadsheet")
    if not 1 <= data.count <= room:
        raise HTTPException(status_code=400, detail=f"You can add between 1 and {max(room, 0)} more questions.")
    brief = data.model_dump(include={"title", "description", "role", "subject", "level", "focus"})
    try:
        return questions.generate_questions(
            brief, {"columns": data.dataset.columns, "rows": data.dataset.rows}, data.count, data.existing
        )
    except Exception as exc:  # noqa: BLE001 - any AI failure gets the same message
        logger.warning("Question generation failed: %s", exc)
        raise HTTPException(status_code=502, detail="The AI couldn't write questions right now. Please try again.")


class DraftBrief(BaseModel):
    role: str
    subject: Optional[str] = None
    semester: Optional[int] = None
    course_id: Optional[int] = None
    level: Optional[str] = "Intermediate"
    duration_minutes: int = 60
    task_count: int = 10
    capability_ids: List[int] = Field(default_factory=list)
    notes: Optional[str] = None


@jobsim_router.post("/faculty/jobsim/drafts", status_code=202)
def create_draft(
    brief: DraftBrief,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """AI Simulation Designer: queue a draft from a brief. Poll the draft for
    its status; when done it points at the new draft simulation."""
    require_author(current_user)
    if not brief.role.strip():
        raise HTTPException(status_code=400, detail="Job role is required.")
    if not 1 <= brief.task_count <= 50:
        raise HTTPException(status_code=400, detail="Number of tasks must be between 1 and 50.")
    if not 10 <= brief.duration_minutes <= 300:
        raise HTTPException(status_code=400, detail="Duration must be between 10 and 300 minutes.")
    capability_names = [
        r.name
        for r in db.execute(
            text("SELECT name FROM capabilities WHERE id = ANY(:ids)"), {"ids": brief.capability_ids or [0]}
        ).fetchall()
    ]
    job_id = designer.queue_draft(
        db,
        current_user,
        {
            "role": brief.role.strip()[:150],
            "subject": (brief.subject or "").strip() or None,
            "semester": brief.semester,
            "course_id": brief.course_id,
            "level": brief.level,
            "duration_minutes": brief.duration_minutes,
            "task_count": brief.task_count,
            "capability_ids": brief.capability_ids,
            "capabilities": capability_names,
            "notes": (brief.notes or "").strip() or None,
        },
    )
    background_tasks.add_task(designer.run_draft_job, job_id)
    return {"job_id": job_id, "status": "queued"}


@jobsim_router.get("/faculty/jobsim/drafts/{job_id}")
def get_draft(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_author(current_user)
    return designer.draft_status(db, current_user, job_id)


class AssignSectionsRequest(BaseModel):
    section_ids: List[int]
    due_date: Optional[str] = None


class AssignStudentsRequest(BaseModel):
    student_ids: List[int]
    due_date: Optional[str] = None


@jobsim_router.post("/faculty/jobsim/{simulation_id}/assign-sections")
def assign_sections(
    simulation_id: int,
    data: AssignSectionsRequest,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Assign a published simulation to whole sections the faculty teaches."""
    require_author(current_user)
    return publishing.assign_to_sections(db, current_user, simulation_id, data.section_ids, data.due_date)


@jobsim_router.post("/faculty/jobsim/{simulation_id}/assign-students")
def assign_students(
    simulation_id: int,
    data: AssignStudentsRequest,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Assign a published simulation to specific students from the faculty's roster."""
    require_author(current_user)
    return publishing.assign_to_students(db, current_user, simulation_id, data.student_ids, data.due_date)


@jobsim_router.get("/faculty/jobsim/{simulation_id}/assignments")
def simulation_assignments(
    simulation_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_author(current_user)
    return publishing.list_assignments(db, current_user, simulation_id)


@jobsim_router.get("/faculty/jobsim/{simulation_id}/results")
def simulation_results(
    simulation_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_author(current_user)
    return review.simulation_results(db, current_user, simulation_id)


@jobsim_router.get("/faculty/jobsim/{simulation_id}/results.csv")
def simulation_results_csv(
    simulation_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Response:
    require_author(current_user)
    return Response(
        content=review.results_csv(db, current_user, simulation_id),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename=simulation-{simulation_id}-results.csv"},
    )


@jobsim_router.get("/faculty/jobsim/attempts/{attempt_id}")
def attempt_review(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_author(current_user)
    return review.attempt_review(db, current_user, attempt_id)


@jobsim_router.put("/faculty/jobsim/task-results/{task_result_id}/score")
def change_task_score(
    task_result_id: int,
    payload: ScoreChange,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_author(current_user)
    return review.change_score(db, current_user, task_result_id, payload.score, payload.note)


@jobsim_router.patch("/faculty/jobsim/assignments/{assignment_id}/close")
def close_simulation_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_author(current_user)
    return publishing.close_assignment(db, current_user, assignment_id)


# --- admin: publish queue ------------------------------------------------


class SendBackRequest(BaseModel):
    note: Optional[str] = None


@jobsim_router.get("/admin/jobsim")
def admin_simulations(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Approved, published and withdrawn simulations (drafts stay with their author)."""
    return publishing.list_for_admin(db, current_user, status)


@jobsim_router.post("/admin/jobsim/{simulation_id}/publish")
def admin_publish(
    simulation_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    publishing.publish(db, current_user, simulation_id)
    return service.load_simulation_for_author(db, current_user, simulation_id)


@jobsim_router.post("/admin/jobsim/{simulation_id}/withdraw")
def admin_withdraw(
    simulation_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    publishing.withdraw(db, current_user, simulation_id)
    return service.load_simulation_for_author(db, current_user, simulation_id)


@jobsim_router.post("/admin/jobsim/{simulation_id}/send-back")
def admin_send_back(
    simulation_id: int,
    data: SendBackRequest,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    publishing.send_back(db, current_user, simulation_id, data.note)
    return service.load_simulation_for_author(db, current_user, simulation_id)


# --- student -------------------------------------------------------------


@jobsim_router.get("/jobsim/assigned")
def assigned_simulations(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """My Simulations: published simulations assigned to the student, with
    their attempt status and progress."""
    require_student(current_user)
    items = service.list_assigned_simulations(db, current_user)
    return {"items": items, "total": len(items)}


@jobsim_router.get("/jobsim/{simulation_id}")
def simulation_detail(
    simulation_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_student(current_user)
    return service.simulation_detail_for_student(db, current_user, simulation_id)


@jobsim_router.post("/jobsim/{simulation_id}/attempt")
def start_attempt(
    simulation_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Start, or resume, the student's attempt. Returns tasks (no answers),
    the dataset, saved work and the server deadline."""
    require_student(current_user)
    return service.start_or_resume_attempt(db, current_user, simulation_id)


@jobsim_router.get("/jobsim/attempts/{attempt_id}")
def get_attempt(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_student(current_user)
    return service.load_attempt_for_student(db, current_user, attempt_id)


@jobsim_router.put("/jobsim/attempts/{attempt_id}/state")
def save_state(
    attempt_id: int,
    state: AttemptState,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_student(current_user)
    data: Dict[str, Any] = {"cells": state.cells, "last_task_id": state.last_task_id}
    fields_set = getattr(state, "model_fields_set", None) or getattr(state, "__fields_set__", set())
    if "memo" in fields_set:
        data["memo"] = state.memo
    if "slides" in fields_set:
        data["slides"] = state.slides
    return service.save_attempt_state(db, current_user, attempt_id, data)


@jobsim_router.post("/jobsim/attempts/{attempt_id}/evaluate")
def evaluate_cell(
    attempt_id: int,
    cell: CellInput,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """The value of the student's own formula, formatted for the answer cell."""
    require_student(current_user)
    return service.evaluate_for_student(db, current_user, attempt_id, cell.input, cell.format)


@jobsim_router.post("/jobsim/attempts/{attempt_id}/tasks/{task_id}/check")
def check_cell(
    attempt_id: int,
    task_id: int,
    cell: CellInput,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Mark one spreadsheet task: correct or incorrect with a message. The
    expected value is never returned."""
    require_student(current_user)
    return service.check_task(db, current_user, attempt_id, task_id, cell.input, cell.format)


@jobsim_router.post("/jobsim/attempts/{attempt_id}/finish")
def finish_attempt(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_student(current_user)
    return service.finish_attempt(db, current_user, attempt_id)


@jobsim_router.get("/jobsim/attempts/{attempt_id}/results")
def attempt_results(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    require_student(current_user)
    return review.student_results(db, current_user, attempt_id)


@jobsim_router.post("/jobsim/attempts/{attempt_id}/tasks/{task_id}/hint")
def task_hint(
    attempt_id: int,
    task_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Show a task's hint; its use is recorded."""
    require_student(current_user)
    return service.hint_for_task(db, current_user, attempt_id, task_id)
