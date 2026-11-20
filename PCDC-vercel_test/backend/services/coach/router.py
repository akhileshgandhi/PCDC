import json
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from services.auth.service import get_current_user
from shared.database import get_db

from .service import COACHES, MAX_MESSAGE_CHARS, coach_reply

logger = logging.getLogger(__name__)

coach_router = APIRouter(prefix="/coach", tags=["coach"])

ALLOWED_ROLES = ("student", "faculty", "admin", "superadmin")
SESSION_LIST_LIMIT = 50


class CoachTurn(BaseModel):
    role: str
    text: str


class CoachChatRequest(BaseModel):
    coach_id: str
    message: str
    history: List[CoachTurn] = Field(default_factory=list)
    # The saved session this message continues; None starts a new one.
    session_id: Optional[int] = None


def require_coach_user(current_user: Dict[str, Any]) -> None:
    if current_user.get("role") not in ALLOWED_ROLES:
        raise HTTPException(status_code=403, detail="Not allowed")


def save_session(
    db: Session, user_id: int, coach_id: str, session_id: Optional[int], turns: List[Dict[str, str]]
) -> Optional[int]:
    """Store the conversation so far; returns the session id. Saving is best
    effort: a failure is logged and never costs the student their reply."""
    payload = json.dumps(turns)
    try:
        if session_id is not None:
            row = db.execute(
                text("""
                    UPDATE coach_sessions
                    SET messages = CAST(:messages AS JSONB), updated_at = NOW()
                    WHERE id = :sid AND user_id = :uid AND coach_id = :coach
                    RETURNING id
                """),
                {"messages": payload, "sid": session_id, "uid": user_id, "coach": coach_id},
            ).fetchone()
            if row:
                db.commit()
                return row.id
        row = db.execute(
            text("""
                INSERT INTO coach_sessions (user_id, coach_id, messages)
                VALUES (:uid, :coach, CAST(:messages AS JSONB))
                RETURNING id
            """),
            {"uid": user_id, "coach": coach_id, "messages": payload},
        ).fetchone()
        db.commit()
        return row.id
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        logger.warning("Saving Aish coach session failed (coach=%s): %s", coach_id, exc)
        return session_id


@coach_router.post("/chat")
def coach_chat(
    data: CoachChatRequest,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """One Aish Coach reply, personalised to the logged-in user's role and data."""
    require_coach_user(current_user)
    if data.coach_id not in COACHES:
        raise HTTPException(status_code=400, detail="Unknown coach")
    message = data.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message is empty")
    if len(message) > MAX_MESSAGE_CHARS:
        raise HTTPException(
            status_code=400, detail=f"Please keep your message under {MAX_MESSAGE_CHARS} characters."
        )
    history = [{"role": turn.role, "text": turn.text} for turn in data.history]
    try:
        reply = coach_reply(db, current_user, data.coach_id, history, message)
    except Exception as exc:  # noqa: BLE001 - surface a friendly message, log the cause
        logger.warning("Aish coach reply failed (coach=%s): %s", data.coach_id, exc)
        raise HTTPException(
            status_code=503,
            detail="Aish couldn't reply just now. Please try again in a moment.",
        )
    turns = history + [{"role": "student", "text": message}, {"role": "ai", "text": reply}]
    session_id = save_session(db, current_user["id"], data.coach_id, data.session_id, turns)
    return {"coach_id": data.coach_id, "reply": reply, "session_id": session_id}


@coach_router.get("/sessions")
def list_coach_sessions(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    """The logged-in user's own saved sessions, most recent first."""
    require_coach_user(current_user)
    rows = db.execute(
        text("""
            SELECT id, coach_id, created_at, updated_at, jsonb_array_length(messages) AS message_count
            FROM coach_sessions
            WHERE user_id = :uid
            ORDER BY updated_at DESC
            LIMIT :limit
        """),
        {"uid": current_user["id"], "limit": SESSION_LIST_LIMIT},
    ).fetchall()
    return [
        {
            "id": row.id,
            "coach_id": row.coach_id,
            "created_at": row.created_at.isoformat(),
            "updated_at": row.updated_at.isoformat(),
            "message_count": int(row.message_count or 0),
        }
        for row in rows
    ]


@coach_router.get("/sessions/{session_id}")
def get_coach_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """One of the user's own sessions, with its messages."""
    require_coach_user(current_user)
    row = db.execute(
        text("""
            SELECT id, coach_id, messages, created_at, updated_at
            FROM coach_sessions
            WHERE id = :sid AND user_id = :uid
        """),
        {"sid": session_id, "uid": current_user["id"]},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")
    messages = row.messages if isinstance(row.messages, list) else json.loads(row.messages or "[]")
    return {
        "id": row.id,
        "coach_id": row.coach_id,
        "messages": messages,
        "created_at": row.created_at.isoformat(),
        "updated_at": row.updated_at.isoformat(),
    }
