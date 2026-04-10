"""
app/api/v1/endpoints/transactions.py
"""

import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user, get_org_membership, require_admin
from app.core.exceptions import NotFoundException
from app.db.session import get_db
from app.models.event import Event
from app.models.organization import OrganizationUser
from app.models.transaction import Transaction, TransactionType
from app.models.user import User
from app.schemas.base import MessageResponse
from app.schemas.transaction import (
    EventBalanceResponse,
    TransactionCreate,
    TransactionResponse,
    TransactionUpdate,
)

router = APIRouter()


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    data: TransactionCreate,
    event_id: uuid.UUID = Query(...),
    org_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    membership: OrganizationUser = Depends(get_org_membership),
):
    # Verify event belongs to org
    event = await db.get(Event, event_id)
    if not event or event.organization_id != org_id:
        raise NotFoundException("Event not found")

    tx = Transaction(
        event_id=event_id,
        registered_by_id=current_user.id,
        transaction_type=data.transaction_type,
        amount=data.amount,
        description=data.description,
        notes=data.notes,
    )
    db.add(tx)
    await db.flush()
    await db.refresh(tx)
    return TransactionResponse.model_validate(tx)


@router.get("", response_model=list[TransactionResponse])
async def list_transactions(
    event_id: uuid.UUID = Query(...),
    org_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    membership: OrganizationUser = Depends(get_org_membership),
):
    event = await db.get(Event, event_id)
    if not event or event.organization_id != org_id:
        raise NotFoundException("Event not found")

    result = await db.execute(
        select(Transaction)
        .where(Transaction.event_id == event_id)
        .order_by(Transaction.created_at.desc())
    )
    return [TransactionResponse.model_validate(t) for t in result.scalars().all()]


@router.get("/balance", response_model=EventBalanceResponse)
async def get_event_balance(
    event_id: uuid.UUID = Query(...),
    org_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    membership: OrganizationUser = Depends(get_org_membership),
):
    """Compute income, expenses, and net balance for an event."""
    event = await db.get(Event, event_id)
    if not event or event.organization_id != org_id:
        raise NotFoundException("Event not found")

    # Single query to compute aggregates
    result = await db.execute(
        select(
            func.count(Transaction.id).label("count"),
            func.coalesce(
                func.sum(Transaction.amount).filter(
                    Transaction.transaction_type == TransactionType.INCOME
                ), 0
            ).label("income"),
            func.coalesce(
                func.sum(Transaction.amount).filter(
                    Transaction.transaction_type == TransactionType.EXPENSE
                ), 0
            ).label("expenses"),
        ).where(Transaction.event_id == event_id)
    )
    row = result.one()

    return EventBalanceResponse(
        event_id=event_id,
        total_income=row.income,
        total_expenses=row.expenses,
        balance=row.income - row.expenses,
        transaction_count=row.count,
    )


@router.patch("/{tx_id}", response_model=TransactionResponse)
async def update_transaction(
    tx_id: uuid.UUID,
    data: TransactionUpdate,
    org_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    membership: OrganizationUser = Depends(require_admin),
):
    tx = await db.get(Transaction, tx_id)
    if not tx:
        raise NotFoundException("Transaction not found")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(tx, field, value)

    await db.flush()
    await db.refresh(tx)
    return TransactionResponse.model_validate(tx)


@router.delete("/{tx_id}", response_model=MessageResponse)
async def delete_transaction(
    tx_id: uuid.UUID,
    org_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    membership: OrganizationUser = Depends(require_admin),
):
    tx = await db.get(Transaction, tx_id)
    if not tx:
        raise NotFoundException("Transaction not found")
    await db.delete(tx)
    return MessageResponse(message="Transaction deleted")
