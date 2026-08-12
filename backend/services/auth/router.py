from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from .service import (
    register_user,
    login_user,
    get_current_user,
    validate_setup_token,
    set_password_with_token,
    change_password,
    send_password_reset,
)
from shared.email import app_base_url
from .models import UserRegister, UserLogin, UserResponse, Token
from shared.database import get_db

auth_router = APIRouter(prefix="/auth")


class SetPasswordRequest(BaseModel):
    token: str
    password: str


class ChangePasswordRequest(BaseModel):
    password: str


class ForgotPasswordRequest(BaseModel):
    identifier: str  # email or scholar number
    email: str | None = None  # students: registered email (verification factor)

@auth_router.post("/register", response_model=UserResponse)
async def register(user_data: UserRegister, db: Session = Depends(get_db)):
    return register_user(
        db,
        user_data.name,
        user_data.email,
        user_data.password,
        user_data.role,
        user_data.program,
        user_data.specialization,
    )

@auth_router.post("/login", response_model=Token)
async def login(user_data: UserLogin, db: Session = Depends(get_db)):
    return login_user(db, user_data.email, user_data.password)

@auth_router.post("/forgot-password")
async def post_forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Public: email a reset link to the matching account. Always returns a
    generic success so account existence is never revealed."""
    base = (request.headers.get("origin") or "").rstrip("/") or app_base_url()
    return send_password_reset(db, payload.identifier, payload.email or "", base)


@auth_router.get("/set-password")
async def get_set_password(token: str = Query(...), db: Session = Depends(get_db)):
    """Validate an invite/set-password link and return whose account it's for."""
    return validate_setup_token(db, token)


@auth_router.post("/set-password", response_model=Token)
async def post_set_password(payload: SetPasswordRequest, db: Session = Depends(get_db)):
    """Set the user's password from a valid link and log them straight in."""
    return set_password_with_token(db, payload.token, payload.password)


@auth_router.post("/change-password", response_model=Token)
async def post_change_password(
    payload: ChangePasswordRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Authenticated password change; clears the force-change flag."""
    return change_password(db, current_user["id"], payload.password)


@auth_router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: UserResponse = Depends(get_current_user)):
    return current_user
