"""
app/api/v1/deps.py
──────────────────
Reusable FastAPI dependencies injected into route handlers.
Keeps routes thin — auth logic lives here, not in endpoints.
"""

import uuid

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenException, UnauthorizedException
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.organization import OrganizationUser, UserRole
from app.models.user import User

# Uses Bearer token scheme (Authorization: Bearer <token>)
bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Validates the JWT and returns the authenticated User.
    Raises 401 if token is invalid or user not found.
    """
    try:
        payload = decode_access_token(credentials.credentials)
        user_id: str = payload.get("sub")
        if not user_id:
            raise UnauthorizedException()
    except JWTError:
        raise UnauthorizedException(detail="Token invalid or expired")

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise UnauthorizedException(detail="User not found or inactive")

    return user


async def get_org_membership(
    org_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OrganizationUser:
    """
    Validates that the current user belongs to the given organization.
    Returns the OrganizationUser record (includes role).
    Raises 403 if not a member.
    """
    result = await db.execute(
        select(OrganizationUser).where(
            OrganizationUser.organization_id == org_id,
            OrganizationUser.user_id == current_user.id,
            OrganizationUser.is_active == True,  # noqa: E712
        )
    )
    membership = result.scalar_one_or_none()

    if not membership:
        raise ForbiddenException(detail="You are not a member of this organization")

    return membership


def require_admin(membership: OrganizationUser = Depends(get_org_membership)) -> OrganizationUser:
    """
    Extends get_org_membership — additionally requires Admin role.
    Raises 403 if member is not an admin.
    """
    if membership.role != UserRole.ADMIN:
        raise ForbiddenException(detail="Admin role required for this action")
    return membership
