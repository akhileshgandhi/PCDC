from datetime import datetime, timedelta
from typing import Optional
import os
import bcrypt
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from shared.database import get_db

SECRET_KEY = os.getenv("SECRET_KEY", "fallback_secret")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def hash_password(password: str) -> str:
    password_bytes = password.encode("utf-8")
    if len(password_bytes) > 72:
        raise HTTPException(status_code=400, detail="Password must be 72 bytes or fewer")
    return bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    plain_bytes = plain.encode("utf-8")
    if len(plain_bytes) > 72:
        return False
    return bcrypt.checkpw(plain_bytes, hashed.encode("utf-8"))

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def register_user(db: Session, name: str, email: str, password: str, role: str = "student", program: str = None, specialization: str = None):
    existing = db.execute(text("SELECT id FROM users WHERE email = :email"), {"email": email}).fetchone()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed = hash_password(password)
    result = db.execute(text("""
        INSERT INTO users (name, email, password_hash, role, program, specialization)
        VALUES (:name, :email, :password_hash, :role, :program, :specialization)
        RETURNING id, name, email, role, created_at
    """), {"name": name, "email": email, "password_hash": hashed, "role": role, "program": program, "specialization": specialization})
    db.commit()
    row = result.fetchone()
    return {"id": row[0], "name": row[1], "email": row[2], "role": row[3], "created_at": str(row[4])}

def login_user(db: Session, email: str, password: str):
    user = db.execute(
        text("""
            SELECT id, name, email, password_hash, role, COALESCE(status, 'active') AS status
            FROM users
            WHERE email = :email
        """),
        {"email": email},
    ).fetchone()
    if not user or not verify_password(password, user[3]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if user[5] != "active":
        raise HTTPException(status_code=403, detail="Account is inactive")
    db.execute(
        text("""
            UPDATE users
            SET last_login_at = NOW(), updated_at = NOW()
            WHERE id = :id
        """),
        {"id": user[0]},
    )
    db.execute(
        text("""
            INSERT INTO login_events (user_id)
            VALUES (:id)
        """),
        {"id": user[0]},
    )
    db.commit()
    token = create_access_token(
        {"sub": str(user[0]), "name": user[1], "email": user[2], "role": user[4]}
    )
    return {"access_token": token, "token_type": "bearer"}

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.execute(text("SELECT id, name, email, role, created_at FROM users WHERE id = :id"), {"id": user_id}).fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"id": user[0], "name": user[1], "email": user[2], "role": user[3], "created_at": str(user[4])}
