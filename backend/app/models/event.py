"""
app/models/event.py
────────────────────
Events belong to an organization.
Each event has a type (raffle, party, etc.) and a lifecycle status.

Design note: a single event can have both a raffle AND financial transactions.
The raffle-specific tables reference this event's id.
"""

import enum
import uuid
from datetime import date

from sqlalchemy import Date, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_model import BaseModel


class EventType(str, enum.Enum):
    RAFFLE = "raffle"
    PARTY = "party"
    FOOD_SALE = "food_sale"
    TOURNAMENT = "tournament"
    BINGO = "bingo"


class EventStatus(str, enum.Enum):
    ACTIVE = "active"
    FINISHED = "finished"
    CANCELLED = "cancelled"


class Event(BaseModel):
    __tablename__ = "events"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    event_type: Mapped[EventType] = mapped_column(
        Enum(EventType, name="eventtype"), nullable=False
    )
    status: Mapped[EventStatus] = mapped_column(
        Enum(EventStatus, name="eventstatus"),
        default=EventStatus.ACTIVE,
        nullable=False,
    )
    event_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # ── Relationships ──────────────────────────────────────────────────────────
    organization: Mapped["Organization"] = relationship(  # noqa: F821
        "Organization", back_populates="events"
    )
    transactions: Mapped[list["Transaction"]] = relationship(  # noqa: F821
        "Transaction",
        back_populates="event",
        cascade="all, delete-orphan",
    )
    raffle: Mapped["Raffle | None"] = relationship(  # noqa: F821
        "Raffle",
        back_populates="event",
        uselist=False,
        cascade="all, delete-orphan",
    )
    member_sales: Mapped[list["MemberSales"]] = relationship(  # noqa: F821
        "MemberSales",
        back_populates="event",
        cascade="all, delete-orphan",
    )
    draws: Mapped[list["Draw"]] = relationship(  # noqa: F821
        "Draw",
        back_populates="event",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Event id={self.id} name={self.name} type={self.event_type}>"
