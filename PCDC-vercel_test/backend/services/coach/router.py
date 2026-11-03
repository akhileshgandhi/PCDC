import logging
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from services.auth.service import get_current_user
from shared.database import get_db

from .service import COACHES, MAX_MESSAGE_CHARS, coach_reply

logger = logging.getLogger(__name__)

coach_router = APIRouter(prefix="/coach", tags=["coach"])


class CoachTurn(BaseModel):
    role: str
    text: str


class CoachChatRequest(BaseModel):
    coach_id: str
    message: str
    history: List[CoachTurn] = Field(default_factory=list)


@coach_router.post("/chat")
def coach_chat(
    data: CoachChatRequest,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """One Aish Coach reply, personalised to the logged-in user's role and data."""
    if current_user.get("role") not in ("student", "faculty", "admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Not allowed")
    if data.coach_id not in COACHES:
        raise HTTPException(status_code=400, detail="Unknown coach")
    message = data.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message is empty")
    if len(message) > MAX_MESSAGE_CHARS:
        raise HTTPException(
            status_code=400, detail=f"Please keep your message under {MAX_MESSAGE_CHARS} characters."
        )
    try:
        reply = coach_reply(
            db,
            current_user,
            data.coach_id,
            [{"role": turn.role, "text": turn.text} for turn in data.history],
            message,
        )
    except Exception as exc:  # noqa: BLE001 - surface a friendly message, log the cause
        logger.warning("Aish coach reply failed (coach=%s): %s", data.coach_id, exc)
        raise HTTPException(
            status_code=503,
            detail="Aish couldn't reply just now. Please try again in a moment.",
        )
    return {"coach_id": data.coach_id, "reply": reply}
