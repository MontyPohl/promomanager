"""
app/models/draw.py
───────────────────
Draw — records a winning raffle number selection.

Design note:
  - Multiple draws can be stored per event (e.g. multiple prizes).
  - The winning number is stored as an integer (not a FK) to preserve
    the record even if raffle numbers are deleted.
  - Winner info is denormalized here for display without joins.
"""

import uuid

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_model import BaseModel


class Draw(BaseModel):
    __tablename__ = "draws"

    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # FK to the winning RaffleNumber row (for lookups)
    raffle_number_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("raffle_numbers.id", ondelete="SET NULL"),
        nullable=True,
    )
    # Denormalized for fast display (no join needed)
    winning_number: Mapped[int] = mapped_column(Integer, nullable=False)
    winner_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    winner_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)

    # Who triggered the draw
    drawn_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # ── Relationships ──────────────────────────────────────────────────────────
    event: Mapped["Event"] = relationship("Event", back_populates="draws")  # noqa: F821
    drawn_by: Mapped["User | None"] = relationship("User")  # noqa: F821

    def __repr__(self) -> str:
        return f"<Draw event={self.event_id} winner=#{self.winning_number} ({self.winner_name})>"
