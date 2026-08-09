from datetime import datetime, timedelta
from typing import Optional
import hashlib
import os
import secrets
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
    row = result.fetchone()
    if role == "student":
        student_row = db.execute(
            text("""
                INSERT INTO students (user_id, current_level)
                VALUES (:user_id, 1)
                RETURNING id
            """),
            {"user_id": row[0]},
        ).fetchone()
        capability_rows = db.execute(text("SELECT id FROM capabilities")).fetchall()
        for capability in capability_rows:
            db.execute(
                text("""
                    INSERT INTO student_capabilities (student_id, capability_id, current_score)
                    VALUES (:student_id, :capability_id, 0)
                    ON CONFLICT DO NOTHING
                """),
                {"student_id": student_row.id, "capability_id": capability.id},
            )
    elif role == "mentor":
        db.execute(
            text("""
                INSERT INTO mentors (user_id, max_students)
                VALUES (:user_id, 25)
            """),
            {"user_id": row[0]},
        )
    db.commit()
    return {"id": row[0], "name": row[1], "email": row[2], "role": row[3], "created_at": str(row[4])}

def login_user(db: Session, email: str, password: str):
    # Accept either an email address or a scholar number (stored on
    # users.college_id for students). Email match is preferred when both hit.
    identifier = (email or "").strip()
    user = db.execute(
        text("""
            SELECT id, name, email, password_hash, role, COALESCE(status, 'active') AS status,
                   COALESCE(must_change_password, FALSE) AS must_change_password
            FROM users
            WHERE LOWER(email) = LOWER(:ident) OR college_id = :ident
            ORDER BY (LOWER(email) = LOWER(:ident)) DESC
            LIMIT 1
        """),
        {"ident": identifier},
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
        {
            "sub": str(user[0]),
            "name": user[1],
            "email": user[2],
            "role": user[4],
            "must_change": bool(user[6]),
        }
    )
    return {"access_token": token, "token_type": "bearer"}

def login_with_google(db: Session, credential: str):
    """Login-only Google Sign-In: verify the Google ID token, then match an
    existing (admin-created) user by verified email. Unknown emails are
    rejected — there is no self-signup."""
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    if not client_id:
        raise HTTPException(status_code=500, detail="Google login is not configured")

    # Imported lazily so the app still boots if the dependency is absent.
    from google.auth.transport import requests as google_requests
    from google.oauth2 import id_token as google_id_token

    try:
        info = google_id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            client_id,
            clock_skew_in_seconds=10,  # tolerate minor server clock drift
        )
    except ValueError as error:
        print(f"GOOGLE VERIFY FAILED: {error}")
        raise HTTPException(status_code=401, detail=f"Google sign-in failed: {error}")

    if not info.get("email_verified"):
        raise HTTPException(status_code=401, detail="Your Google email is not verified.")

    email = (info.get("email") or "").lower()
    google_sub = info.get("sub")
    if not email:
        raise HTTPException(status_code=401, detail="Google account has no email.")

    user = db.execute(
        text("""
            SELECT id, name, email, role, COALESCE(status, 'active') AS status
            FROM users
            WHERE LOWER(email) = :email
        """),
        {"email": email},
    ).fetchone()
    if not user:
        raise HTTPException(
            status_code=403,
            detail="No PCDC account found for this email. Ask your admin to add you.",
        )
    if user[4] != "active":
        raise HTTPException(status_code=403, detail="Account is inactive")

    db.execute(
        text("""
            UPDATE users
            SET google_sub = :google_sub, last_login_at = NOW(), updated_at = NOW()
            WHERE id = :id
        """),
        {"google_sub": google_sub, "id": user[0]},
    )
    db.execute(text("INSERT INTO login_events (user_id) VALUES (:id)"), {"id": user[0]})
    db.commit()

    token = create_access_token(
        {"sub": str(user[0]), "name": user[1], "email": user[2], "role": user[3]}
    )
    return {"access_token": token, "token_type": "bearer"}


SETUP_TOKEN_TTL_HOURS = int(os.getenv("SETUP_TOKEN_TTL_HOURS", "72"))


def _hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def create_setup_token(db: Session, user_id: int, purpose: str = "invite") -> str:
    """Create a single-use set-password token for a user. Invalidates any
    prior unused tokens for the same user + purpose. Returns the RAW token
    (only the hash is stored). Caller is responsible for committing."""
    db.execute(
        text(
            """
            UPDATE password_setup_tokens
            SET used_at = NOW()
            WHERE user_id = :user_id AND purpose = :purpose AND used_at IS NULL
            """
        ),
        {"user_id": user_id, "purpose": purpose},
    )
    raw = secrets.token_urlsafe(32)
    db.execute(
        text(
            """
            INSERT INTO password_setup_tokens (user_id, token_hash, purpose, expires_at)
            VALUES (:user_id, :token_hash, :purpose,
                    NOW() + (:ttl || ' hours')::interval)
            """
        ),
        {
            "user_id": user_id,
            "token_hash": _hash_token(raw),
            "purpose": purpose,
            "ttl": str(SETUP_TOKEN_TTL_HOURS),
        },
    )
    return raw


def _lookup_valid_token(db: Session, raw_token: str):
    row = db.execute(
        text(
            """
            SELECT t.id, t.user_id, t.expires_at, t.used_at,
                   u.name, u.email, u.role
            FROM password_setup_tokens t
            JOIN users u ON u.id = t.user_id
            WHERE t.token_hash = :hash
            """
        ),
        {"hash": _hash_token(raw_token)},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=400, detail="This link is invalid.")
    if row.used_at is not None:
        raise HTTPException(status_code=400, detail="This link has already been used.")
    expires_at = row.expires_at
    now = datetime.now(expires_at.tzinfo) if expires_at.tzinfo else datetime.utcnow()
    if expires_at < now:
        raise HTTPException(status_code=400, detail="This link has expired. Ask your admin to resend it.")
    return row


def validate_setup_token(db: Session, raw_token: str) -> dict:
    """Return {name, email} for a valid token, else raise 400."""
    row = _lookup_valid_token(db, raw_token)
    return {"name": row.name, "email": row.email}


def set_password_with_token(db: Session, raw_token: str, password: str) -> dict:
    """Consume a valid token, set the user's password, and return a login token."""
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")
    row = _lookup_valid_token(db, raw_token)
    hashed = hash_password(password)
    db.execute(
        text(
            """
            UPDATE users
            SET password_hash = :hash, status = 'active', updated_at = NOW()
            WHERE id = :id
            """
        ),
        {"hash": hashed, "id": row.user_id},
    )
    db.execute(
        text("UPDATE password_setup_tokens SET used_at = NOW() WHERE id = :id"),
        {"id": row.id},
    )
    db.execute(
        text("UPDATE users SET last_login_at = NOW() WHERE id = :id"),
        {"id": row.user_id},
    )
    db.execute(text("INSERT INTO login_events (user_id) VALUES (:id)"), {"id": row.user_id})
    db.commit()
    token = create_access_token(
        {"sub": str(row.user_id), "name": row.name, "email": row.email, "role": row.role}
    )
    return {"access_token": token, "token_type": "bearer"}


def change_password(db: Session, user_id: int, new_password: str) -> dict:
    """Set a new password for an authenticated user, clear the
    must_change_password flag, and return a fresh (flag-free) login token."""
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")
    user = db.execute(
        text("SELECT id, name, email, role FROM users WHERE id = :id"),
        {"id": user_id},
    ).fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.execute(
        text(
            """
            UPDATE users
            SET password_hash = :hash, must_change_password = FALSE, updated_at = NOW()
            WHERE id = :id
            """
        ),
        {"hash": hash_password(new_password), "id": user_id},
    )
    db.commit()
    token = create_access_token(
        {
            "sub": str(user.id),
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "must_change": False,
        }
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
