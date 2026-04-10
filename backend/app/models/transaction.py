"""
app/models/transaction.py
──────────────────────────
Financial transactions (income or expense) scoped to an event.
Balance is NOT stored — it's computed on-the-fly in the service layer
to avoid synchronization bugs (computed = always correct).

Amounts are stored in minor currency units (e.g. cents / centavos)
as integers to avoid floating-point rounding errors.
Example: 1500 = $15.00 (display: amount / 100)
"""

import enum
import uuid

from sqlalchemy import Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_model import BaseModel


class TransactionType(str, enum.Enum):
    INCOME = "income"
    EXPENSE = "expense"


class Transaction(BaseModel):
    __tablename__ = "transactions"

    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Optional: link to the member who registered this transaction
    registered_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    transaction_type: Mapped[TransactionType] = mapped_column(
        Enum(TransactionType, name="transactiontype"), nullable=False
    )
    # Amount in minor units (integer). Frontend displays as amount / 100.
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[str] = mapped_column(String(300), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── Relationships ──────────────────────────────────────────────────────────
    event: Mapped["Event"] = relationship("Event", back_populates="transactions")  # noqa: F821
    registered_by: Mapped["User | None"] = relationship("User")  # noqa: F821

    def __repr__(self) -> str:
        return f"<Transaction type={self.transaction_type} amount={self.amount}>"
