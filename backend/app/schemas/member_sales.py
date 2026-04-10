"""
app/schemas/member_sales.py
"""

import uuid
from datetime import datetime

from pydantic import Field

from app.schemas.base import AppSchema


class MemberSalesUpdate(AppSchema):
    """Admins can manually adjust amount_paid (cash handover)."""
    amount_paid: int = Field(..., ge=0)


class MemberSalesResponse(AppSchema):
    id: uuid.UUID
    event_id: uuid.UUID
    user_id: uuid.UUID
    full_name: str         # denormalized from User
    email: str             # denormalized from User
    quantity_sold: int
    amount_paid: int
    expected_amount: int   # computed: quantity_sold * ticket_price
    pending_balance: int   # computed: expected_amount - amount_paid
    updated_at: datetime


class EventMemberSalesReport(AppSchema):
    """Full accountability report for an event."""
    event_id: uuid.UUID
    ticket_price: int
    total_sold: int
    total_expected: int
    total_paid: int
    total_pending: int
    members: list[MemberSalesResponse]
