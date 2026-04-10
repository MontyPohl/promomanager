"""
app/models/organization.py
───────────────────────────
Organization — the top-level tenant entity.
OrganizationUser — join table that adds role + active flag to the relationship.

Design note: roles are scoped per organization. A user can be admin in one
org and a regular member in another.
"""

import enum
import uuid

from sqlalchemy import Boolean, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_model import BaseModel


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    MEMBER = "member"


class Organization(BaseModel):
    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    invite_token: Mapped[str | None] = mapped_column(
        String(64), unique=True, nullable=True, index=True
    )  # shareable link token
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # ── Relationships ──────────────────────────────────────────────────────────
    members: Mapped[list["OrganizationUser"]] = relationship(
        "OrganizationUser",
        back_populates="organization",
        cascade="all, delete-orphan",
    )
    events: Mapped[list["Event"]] = relationship(  # noqa: F821
        "Event",
        back_populates="organization",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Organization id={self.id} name={self.name}>"


class OrganizationUser(BaseModel):
    """
    Membership join table.
    Tracks role and whether the membership is still active.
    """

    __tablename__ = "organization_users"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="userrole"),
        nullable=False,
        default=UserRole.MEMBER,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # ── Relationships ──────────────────────────────────────────────────────────
    organization: Mapped["Organization"] = relationship(
        "Organization", back_populates="members"
    )
    user: Mapped["User"] = relationship(  # noqa: F821
        "User", back_populates="organization_memberships"
    )

    def __repr__(self) -> str:
        return f"<OrgUser org={self.organization_id} user={self.user_id} role={self.role}>"
