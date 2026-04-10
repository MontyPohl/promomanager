"""
app/api/v1/endpoints/raffles.py
"""

import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user, get_org_membership, require_admin
from app.db.session import get_db
from app.models.organization import OrganizationUser
from app.models.user import User
from app.schemas.raffle import (
    BulkSellRequest,
    RaffleCreate,
    RaffleNumberResponse,
    RaffleResponse,
    SellNumberRequest,
    SellNumberResponse,
)
from app.services.raffle_service import RaffleService

router = APIRouter()


@router.post("/{event_id}", response_model=RaffleResponse, status_code=status.HTTP_201_CREATED)
async def create_raffle(
    event_id: uuid.UUID,
    data: RaffleCreate,
    org_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    membership: OrganizationUser = Depends(require_admin),
):
    """Set up a raffle for an event. Generates all ticket numbers automatically."""
    return await RaffleService.create_raffle(db, event_id, data)


@router.get("/{event_id}", response_model=dict)
async def get_raffle_grid(
    event_id: uuid.UUID,
    org_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    membership: OrganizationUser = Depends(get_org_membership),
):
    """
    Returns raffle config + complete ticket grid.
    Frontend uses this to render the visual number grid.
    """
    raffle, numbers = await RaffleService.get_raffle_grid(db, event_id)
    return {
        "raffle": raffle.model_dump(),
        "numbers": [n.model_dump() for n in numbers],
    }


@router.post("/{event_id}/sell", response_model=SellNumberResponse, status_code=status.HTTP_201_CREATED)
async def sell_number(
    event_id: uuid.UUID,
    data: SellNumberRequest,
    org_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    membership: OrganizationUser = Depends(get_org_membership),
):
    """Mark a ticket as sold and register the buyer's information."""
    return await RaffleService.sell_number(db, event_id, data, current_user.id)


@router.post("/{event_id}/bulk-sell", response_model=list[SellNumberResponse], status_code=status.HTTP_201_CREATED)
async def bulk_sell(
    event_id: uuid.UUID,
    data: BulkSellRequest,
    org_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    membership: OrganizationUser = Depends(get_org_membership),
):
    """Sell multiple numbers to the same buyer in one request."""
    from app.core.exceptions import NotFoundException
    from sqlalchemy import select
    from app.models.raffle import Raffle, RaffleNumber
    from app.schemas.raffle import SellNumberRequest

    results = []
    for number_int in data.numbers:
        # Look up the RaffleNumber row by its integer value
        raffle_result = await db.execute(
            select(Raffle).where(Raffle.event_id == event_id)
        )
        raffle = raffle_result.scalar_one_or_none()
        if not raffle:
            raise NotFoundException("Raffle not found")

        num_result = await db.execute(
            select(RaffleNumber).where(
                RaffleNumber.raffle_id == raffle.id,
                RaffleNumber.number == number_int,
            )
        )
        raffle_number = num_result.scalar_one_or_none()
        if not raffle_number:
            raise NotFoundException(f"Number {number_int} not found")

        sell_req = SellNumberRequest(
            raffle_number_id=raffle_number.id,
            buyer_name=data.buyer_name,
            buyer_phone=data.buyer_phone,
            amount_paid=data.amount_paid_per_number,
        )
        result = await RaffleService.sell_number(db, event_id, sell_req, current_user.id)
        results.append(result)

    return results
