from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .service import register_user, login_user, login_with_google, get_current_user
from .models import UserRegister, UserLogin, GoogleAuthRequest, UserResponse, Token
from shared.database import get_db

auth_router = APIRouter(prefix="/auth")

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

@auth_router.post("/google", response_model=Token)
async def google_login(payload: GoogleAuthRequest, db: Session = Depends(get_db)):
    return login_with_google(db, payload.credential)

@auth_router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: UserResponse = Depends(get_current_user)):
    return current_user
