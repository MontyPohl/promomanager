"""
app/schemas/auth.py
────────────────────
Request/response schemas for authentication endpoints.
"""

from pydantic import EmailStr, Field, field_validator

from app.schemas.base import AppSchema


class RegisterRequest(AppSchema):
    full_name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class LoginRequest(AppSchema):
    email: EmailStr
    password: str


class TokenResponse(AppSchema):
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class UserPublic(AppSchema):
    """Safe user data — never expose hashed_password."""
    from uuid import UUID
    from datetime import datetime

    id: UUID
    full_name: str
    email: EmailStr
    is_active: bool
    created_at: datetime
