"""
app/api/v1/endpoints/organizations.py
───────────────────────────────────────
Full CRUD for organizations + member management.
"""

import secrets
import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.v1.deps import get_current_user, get_org_membership, require_admin
from app.core.exceptions import ConflictException, ForbiddenException, NotFoundException
from app.db.session import get_db
from app.models.organization import Organization, OrganizationUser, UserRole
from app.models.user import User
from app.schemas.base import MessageResponse
from app.schemas.organization import (
    InviteByEmailRequest,
    InviteByTokenRequest,
    MemberResponse,
    OrganizationCreate,
    OrganizationResponse,
    OrganizationUpdate,
    UpdateMemberRoleRequest,
)

router = APIRouter()


# ─── Organizations ─────────────────────────────────────────────────────────────

@router.post("", response_model=OrganizationResponse, status_code=status.HTTP_201_CREATED)
async def create_organization(
    data: OrganizationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new organization. The creator becomes its first Admin."""
    org = Organization(name=data.name, description=data.description)
    db.add(org)
    await db.flush()

    # Auto-assign creator as admin
    membership = OrganizationUser(
        organization_id=org.id,
        user_id=current_user.id,
        role=UserRole.ADMIN,
    )
    db.add(membership)
    await db.flush()
    await db.refresh(org)
    return OrganizationResponse.model_validate(org)


@router.get("", response_model=list[OrganizationResponse])
async def list_my_organizations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all organizations the current user belongs to."""
    result = await db.execute(
        select(Organization)
        .join(OrganizationUser, OrganizationUser.organization_id == Organization.id)
        .where(
            OrganizationUser.user_id == current_user.id,
            OrganizationUser.is_active == True,  # noqa
            Organization.is_active == True,       # noqa
        )
    )
    orgs = result.scalars().all()
    return [OrganizationResponse.model_validate(o) for o in orgs]


@router.get("/{org_id}", response_model=OrganizationResponse)
async def get_organization(
    org_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    membership: OrganizationUser = Depends(get_org_membership),
):
    org = await db.get(Organization, org_id)
    if not org:
        raise NotFoundException("Organization not found")
    return OrganizationResponse.model_validate(org)


@router.patch("/{org_id}", response_model=OrganizationResponse)
async def update_organization(
    org_id: uuid.UUID,
    data: OrganizationUpdate,
    db: AsyncSession = Depends(get_db),
    membership: OrganizationUser = Depends(require_admin),
):
    org = await db.get(Organization, org_id)
    if not org:
        raise NotFoundException("Organization not found")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(org, field, value)

    await db.flush()
    await db.refresh(org)
    return OrganizationResponse.model_validate(org)


# ─── Invite System ─────────────────────────────────────────────────────────────

@router.post("/{org_id}/invite/email", response_model=MessageResponse)
async def invite_by_email(
    org_id: uuid.UUID,
    data: InviteByEmailRequest,
    db: AsyncSession = Depends(get_db),
    membership: OrganizationUser = Depends(require_admin),
):
    """
    Invite a registered user by email.
    In a production system this would send an email —
    here we directly add them if they exist.
    """
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundException(f"No user found with email: {data.email}")

    # Check if already a member
    existing = await db.execute(
        select(OrganizationUser).where(
            OrganizationUser.organization_id == org_id,
            OrganizationUser.user_id == user.id,
        )
    )
    existing_membership = existing.scalar_one_or_none()
    if existing_membership:
        if existing_membership.is_active:
            raise ConflictException("User is already a member")
        # Re-activate if previously removed
        existing_membership.is_active = True
        existing_membership.role = data.role
        return MessageResponse(message="Member re-activated")

    new_membership = OrganizationUser(
        organization_id=org_id,
        user_id=user.id,
        role=data.role,
    )
    db.add(new_membership)
    return MessageResponse(message=f"User {data.email} added as {data.role}")


@router.post("/{org_id}/invite/generate-link", response_model=dict)
async def generate_invite_link(
    org_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    membership: OrganizationUser = Depends(require_admin),
):
    """Generate a shareable invite token for this organization."""
    org = await db.get(Organization, org_id)
    if not org:
        raise NotFoundException("Organization not found")

    org.invite_token = secrets.token_urlsafe(32)
    await db.flush()
    return {"invite_token": org.invite_token}


@router.post("/join", response_model=MessageResponse)
async def join_via_token(
    data: InviteByTokenRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Join an organization using a shareable invite token."""
    result = await db.execute(
        select(Organization).where(Organization.invite_token == data.token)
    )
    org = result.scalar_one_or_none()
    if not org:
        raise NotFoundException("Invalid or expired invite token")

    existing = await db.execute(
        select(OrganizationUser).where(
            OrganizationUser.organization_id == org.id,
            OrganizationUser.user_id == current_user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise ConflictException("You are already a member of this organization")

    db.add(OrganizationUser(
        organization_id=org.id,
        user_id=current_user.id,
        role=UserRole.MEMBER,
    ))
    return MessageResponse(message=f"Joined '{org.name}' successfully")


# ─── Members ───────────────────────────────────────────────────────────────────

@router.get("/{org_id}/members", response_model=list[MemberResponse])
async def list_members(
    org_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    membership: OrganizationUser = Depends(get_org_membership),
):
    result = await db.execute(
        select(OrganizationUser)
        .options(selectinload(OrganizationUser.user))
        .where(
            OrganizationUser.organization_id == org_id,
            OrganizationUser.is_active == True,  # noqa
        )
    )
    memberships = result.scalars().all()
    return [
        MemberResponse(
            id=m.id,
            user_id=m.user_id,
            full_name=m.user.full_name,
            email=m.user.email,
            role=m.role,
            is_active=m.is_active,
            joined_at=m.created_at,
        )
        for m in memberships
    ]


@router.patch("/{org_id}/members/{member_id}/role", response_model=MessageResponse)
async def update_member_role(
    org_id: uuid.UUID,
    member_id: uuid.UUID,
    data: UpdateMemberRoleRequest,
    db: AsyncSession = Depends(get_db),
    admin_membership: OrganizationUser = Depends(require_admin),
):
    result = await db.execute(
        select(OrganizationUser).where(
            OrganizationUser.id == member_id,
            OrganizationUser.organization_id == org_id,
        )
    )
    target = result.scalar_one_or_none()
    if not target:
        raise NotFoundException("Member not found")

    target.role = data.role
    return MessageResponse(message=f"Role updated to {data.role}")


@router.delete("/{org_id}/members/{member_id}", response_model=MessageResponse)
async def remove_member(
    org_id: uuid.UUID,
    member_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin_membership: OrganizationUser = Depends(require_admin),
):
    result = await db.execute(
        select(OrganizationUser).where(
            OrganizationUser.id == member_id,
            OrganizationUser.organization_id == org_id,
        )
    )
    target = result.scalar_one_or_none()
    if not target:
        raise NotFoundException("Member not found")

    # Prevent admin from removing themselves
    if target.user_id == admin_membership.user_id:
        raise ForbiddenException("You cannot remove yourself")

    target.is_active = False
    return MessageResponse(message="Member removed from organization")
