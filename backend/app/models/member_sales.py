"""
app/models/member_sales.py
───────────────────────────
MemberSales — tracks each member's sales accountability per event.

Key design decision:
  - quantity_sold and amount_paid are mutable (updated as sales happen).
  - expected_amount = quantity_sold * raffle.ticket_price (computed in service).
  - pending_balance = expected_amount - amount_paid (computed in service).

Storing computed values (expected_amount, pending_balance) would cause
sync issues — they're always derived in the API response, never persisted.

This is the "DIFFERENTIATOR" feature: admins can see at a glance who
owes money, without relying on manual spreadsheets.
"""

import uuid

from sqlalchemy import ForeignKey, Integer, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_model import BaseModel


class MemberSales(BaseModel):
    __tablename__ = "member_sales"

    # One record per (event, member) pair
    __table_args__ = (
        UniqueConstraint("event_id", "user_id", name="uq_member_sales_event_user"),
    )

    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # How many tickets this member has sold
    quantity_sold: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # How much cash this member has actually handed over (minor units)
    amount_paid: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Computed on read (not stored):
    #   expected_amount = quantity_sold * ticket_price
    #   pending_balance = expected_amount - amount_paid

    # ── Relationships ──────────────────────────────────────────────────────────
    event: Mapped["Event"] = relationship("Event", back_populates="member_sales")  # noqa: F821
    user: Mapped["User"] = relationship("User")  # noqa: F821

    def __repr__(self) -> str:
        return (
            f"<MemberSales event={self.event_id} user={self.user_id} "
            f"sold={self.quantity_sold} paid={self.amount_paid}>"
        )
