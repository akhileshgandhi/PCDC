from pydantic import BaseModel, EmailStr
from typing import Any, Dict, List, Optional

# Pydantic schema for user registration
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Optional[str] = "student"

# Pydantic schema for user login
# `email` accepts an email address OR a scholar number, so it is a plain str.
class UserLogin(BaseModel):
    email: str
    password: str

# Pydantic schema for Google sign-in (login-only: matches an existing user)
class GoogleAuthRequest(BaseModel):
    credential: str  # Google ID token returned by the "Sign in with Google" button

# Pydantic schema for user response
class UserResponse(BaseModel):
    id: int
    name: str
    email: Optional[str] = None  # students added by scholar number may have no email
    role: str
    created_at: str
    # Admin/superadmin only (None for other roles): whether the admin has
    # platform-wide access, and the institutes they own.
    admin_unrestricted: Optional[bool] = None
    institutions: Optional[List[Dict[str, Any]]] = None

# Pydantic schema for token
class Token(BaseModel):
    access_token: str
    token_type: str
