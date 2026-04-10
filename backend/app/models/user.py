"""
app/models/user.py
──────────────────
User account model. Passwords are always stored hashed (never plaintext).
One user can belong to multiple organizations with different roles in each.
"""

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_model import BaseModel


class User(BaseModel):
    __tablename__ = "users"

    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # ── Relationships ──────────────────────────────────────────────────────────
    # back_populates matches the attribute name in OrganizationUser
    organization_memberships: Mapped[list["OrganizationUser"]] = relationship(  # noqa: F821
        "OrganizationUser",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email}>"
