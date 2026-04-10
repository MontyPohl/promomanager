"""
app/api/v1/endpoints/draws.py
"""

import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user, get_org_membership, require_admin
from app.db.session import get_db
from app.models.draw import Draw
from app.models.organization import OrganizationUser
from app.models.user import User
from app.schemas.draw import DrawResponse
from app.services.raffle_service import RaffleService

router = APIRouter()


@router.post("/{event_id}", response_model=DrawResponse, status_code=status.HTTP_201_CREATED)
async def run_draw(
    event_id: uuid.UUID,
    org_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    membership: OrganizationUser = Depends(require_admin),
):
    """
    Randomly select a winning ticket from all sold numbers.
    Stores the result in draw history.
    Only admins can trigger a draw.
    """
    return await RaffleService.run_draw(db, event_id, current_user.id)


@router.get("/{event_id}", response_model=list[DrawResponse])
async def get_draw_history(
    event_id: uuid.UUID,
    org_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    membership: OrganizationUser = Depends(get_org_membership),
):
    """Return all draws for an event (supports multiple prizes)."""
    result = await db.execute(
        select(Draw)
        .where(Draw.event_id == event_id)
        .order_by(Draw.created_at.desc())
    )
    return [DrawResponse.model_validate(d) for d in result.scalars().all()]
