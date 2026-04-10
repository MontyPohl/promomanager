"""
app/schemas/organization.py
"""

import uuid
from datetime import datetime

from pydantic import EmailStr, Field

from app.models.organization import UserRole
from app.schemas.base import AppSchema


class OrganizationCreate(AppSchema):
    name: str = Field(..., min_length=2, max_length=120)
    description: str | None = Field(None, max_length=500)


class OrganizationUpdate(AppSchema):
    name: str | None = Field(None, min_length=2, max_length=120)
    description: str | None = None


class OrganizationResponse(AppSchema):
    id: uuid.UUID
    name: str
    description: str | None
    invite_token: str | None
    is_active: bool
    created_at: datetime


class InviteByEmailRequest(AppSchema):
    email: EmailStr
    role: UserRole = UserRole.MEMBER


class InviteByTokenRequest(AppSchema):
    """Used when a user joins via shareable link."""
    token: str


class MemberResponse(AppSchema):
    """Member as seen in the org members list."""
    id: uuid.UUID
    user_id: uuid.UUID
    full_name: str
    email: str
    role: UserRole
    is_active: bool
    joined_at: datetime  # maps to created_at of OrganizationUser


class UpdateMemberRoleRequest(AppSchema):
    role: UserRole
