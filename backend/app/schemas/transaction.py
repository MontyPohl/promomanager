"""
app/schemas/transaction.py
───────────────────────────
Amounts are always in minor units (integer).
The frontend divides by 100 for display.
"""

import uuid
from datetime import datetime

from pydantic import Field, field_validator

from app.models.transaction import TransactionType
from app.schemas.base import AppSchema


class TransactionCreate(AppSchema):
    transaction_type: TransactionType
    amount: int = Field(..., gt=0, description="Amount in minor currency units (e.g. cents)")
    description: str = Field(..., min_length=2, max_length=300)
    notes: str | None = None


class TransactionUpdate(AppSchema):
    amount: int | None = Field(None, gt=0)
    description: str | None = Field(None, min_length=2, max_length=300)
    notes: str | None = None


class TransactionResponse(AppSchema):
    id: uuid.UUID
    event_id: uuid.UUID
    transaction_type: TransactionType
    amount: int
    description: str
    notes: str | None
    registered_by_id: uuid.UUID | None
    created_at: datetime


class EventBalanceResponse(AppSchema):
    """Financial summary for an event."""
    event_id: uuid.UUID
    total_income: int
    total_expenses: int
    balance: int   # income - expenses
    transaction_count: int
