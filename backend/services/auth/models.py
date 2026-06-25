from pydantic import BaseModel, EmailStr
from typing import Optional

# Pydantic schema for user registration
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Optional[str] = "student"
    program: Optional[str] = None
    specialization: Optional[str] = None

# Pydantic schema for user login
class UserLogin(BaseModel):
    email: EmailStr
    password: str

# Pydantic schema for user response
class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str
    created_at: str

# Pydantic schema for token
class Token(BaseModel):
    access_token: str
    token_type: str
