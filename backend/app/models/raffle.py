"""
app/models/raffle.py
─────────────────────
Raffle — one raffle per event (1:1 relationship).
RaffleNumber — each individual ticket number in the raffle.
RafflePurchase — recorded when a number is sold to a buyer.

Design note:
  - Numbers are pre-generated as rows when the raffle is created.
  - Status transitions: available → sold (no going back via normal flow).
  - Buyer info lives on RafflePurchase, keeping RaffleNumber lean.
  - Amounts in minor currency units (integers).
"""

import enum
import uuid

from sqlalchemy import Boolean, Enum, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_model import BaseModel


class NumberStatus(str, enum.Enum):
    AVAILABLE = "available"
    SOLD = "sold"
    RESERVED = "reserved"  # optional: hold while payment is confirmed


class Raffle(BaseModel):
    """Configuration for a raffle attached to an event."""

    __tablename__ = "raffles"

    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,   # one raffle per event
        index=True,
    )
    total_numbers: Mapped[int] = mapped_column(Integer, nullable=False)  # e.g. 100
    ticket_price: Mapped[int] = mapped_column(Integer, nullable=False)   # minor units
    is_drawn: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # ── Relationships ──────────────────────────────────────────────────────────
    event: Mapped["Event"] = relationship("Event", back_populates="raffle")  # noqa: F821
    numbers: Mapped[list["RaffleNumber"]] = relationship(
        "RaffleNumber",
        back_populates="raffle",
        cascade="all, delete-orphan",
        order_by="RaffleNumber.number",
    )

    def __repr__(self) -> str:
        return f"<Raffle event={self.event_id} total={self.total_numbers}>"


class RaffleNumber(BaseModel):
    """
    A single ticket number within a raffle.
    One row per ticket — allows granular status tracking.
    """

    __tablename__ = "raffle_numbers"

    raffle_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("raffles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[NumberStatus] = mapped_column(
        Enum(NumberStatus, name="numberstatus"),
        default=NumberStatus.AVAILABLE,
        nullable=False,
    )

    # ── Relationships ──────────────────────────────────────────────────────────
    raffle: Mapped["Raffle"] = relationship("Raffle", back_populates="numbers")
    purchase: Mapped["RafflePurchase | None"] = relationship(
        "RafflePurchase",
        back_populates="raffle_number",
        uselist=False,
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<RaffleNumber #{self.number} status={self.status}>"


class RafflePurchase(BaseModel):
    """
    Buyer information for a sold raffle number.
    Separated from RaffleNumber to keep the ticket table lean
    and allow rich buyer metadata.
    """

    __tablename__ = "raffle_purchases"

    raffle_number_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("raffle_numbers.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,   # one purchase per number
        index=True,
    )
    # Optional: which member made this sale (for accountability tracking)
    sold_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    buyer_name: Mapped[str] = mapped_column(String(120), nullable=False)
    buyer_phone: Mapped[str] = mapped_column(String(30), nullable=False)
    amount_paid: Mapped[int] = mapped_column(Integer, nullable=False)  # minor units

    # ── Relationships ──────────────────────────────────────────────────────────
    raffle_number: Mapped["RaffleNumber"] = relationship(
        "RaffleNumber", back_populates="purchase"
    )
    sold_by: Mapped["User | None"] = relationship("User")  # noqa: F821

    def __repr__(self) -> str:
        return f"<RafflePurchase buyer={self.buyer_name} number_id={self.raffle_number_id}>"
