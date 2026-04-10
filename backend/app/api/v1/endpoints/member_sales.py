"""
app/api/v1/endpoints/member_sales.py
──────────────────────────────────────
Member accountability tracking per event.
"""

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.v1.deps import get_org_membership, require_admin
from app.core.exceptions import NotFoundException
from app.db.session import get_db
from app.models.event import Event
from app.models.member_sales import MemberSales
from app.models.organization import OrganizationUser
from app.models.raffle import Raffle
from app.schemas.member_sales import (
    EventMemberSalesReport,
    MemberSalesResponse,
    MemberSalesUpdate,
)

router = APIRouter()


def _build_member_response(record: MemberSales, ticket_price: int) -> MemberSalesResponse:
    expected = record.quantity_sold * ticket_price
    pending = expected - record.amount_paid
    return MemberSalesResponse(
        id=record.id,
        event_id=record.event_id,
        user_id=record.user_id,
        full_name=record.user.full_name,
        email=record.user.email,
        quantity_sold=record.quantity_sold,
        amount_paid=record.amount_paid,
        expected_amount=expected,
        pending_balance=pending,
        updated_at=record.updated_at,
    )


@router.get("/{event_id}", response_model=EventMemberSalesReport)
async def get_member_sales_report(
    event_id: uuid.UUID,
    org_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    membership: OrganizationUser = Depends(get_org_membership),
):
    """
    Full accountability report for an event.
    Shows every member's sales performance and pending balances.
    """
    event = await db.get(Event, event_id)
    if not event or event.organization_id != org_id:
        raise NotFoundException("Event not found")

    # Get ticket price from raffle (0 if no raffle configured)
    raffle_result = await db.execute(
        select(Raffle).where(Raffle.event_id == event_id)
    )
    raffle = raffle_result.scalar_one_or_none()
    ticket_price = raffle.ticket_price if raffle else 0

    # Load all member sales records with user info
    result = await db.execute(
        select(MemberSales)
        .options(selectinload(MemberSales.user))
        .where(MemberSales.event_id == event_id)
    )
    records = result.scalars().all()

    members = [_build_member_response(r, ticket_price) for r in records]

    total_sold = sum(m.quantity_sold for m in members)
    total_expected = sum(m.expected_amount for m in members)
    total_paid = sum(m.amount_paid for m in members)
    total_pending = total_expected - total_paid

    return EventMemberSalesReport(
        event_id=event_id,
        ticket_price=ticket_price,
        total_sold=total_sold,
        total_expected=total_expected,
        total_paid=total_paid,
        total_pending=total_pending,
        members=members,
    )


@router.patch("/{event_id}/members/{member_sales_id}", response_model=MemberSalesResponse)
async def update_member_payment(
    event_id: uuid.UUID,
    member_sales_id: uuid.UUID,
    data: MemberSalesUpdate,
    org_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    membership: OrganizationUser = Depends(require_admin),
):
    """
    Admin records how much cash a member has physically handed over.
    This updates amount_paid, which changes the pending_balance.
    """
    result = await db.execute(
        select(MemberSales)
        .options(selectinload(MemberSales.user))
        .where(
            MemberSales.id == member_sales_id,
            MemberSales.event_id == event_id,
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise NotFoundException("Member sales record not found")

    record.amount_paid = data.amount_paid

    raffle_result = await db.execute(
        select(Raffle).where(Raffle.event_id == event_id)
    )
    raffle = raffle_result.scalar_one_or_none()
    ticket_price = raffle.ticket_price if raffle else 0

    await db.flush()
    await db.refresh(record)
    return _build_member_response(record, ticket_price)
