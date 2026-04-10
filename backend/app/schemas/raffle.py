"""
app/api/v1/endpoints/raffles.py
───────────────────────────────
Raffle endpoints
"""

import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, get_current_user, require_admin
from app.models.user import User
from app.models.organization_user import OrganizationUser
from app.services.raffle_service import RaffleService

from app.schemas.raffle import (
    BulkSellRequest,
    RaffleCreate,
    SellNumberRequest,
    SellNumberResponse,
    SetWinnerRequest,  # ← nuevo
    WinnerResponse,  # ← nuevo
)

router = APIRouter(prefix="/raffles", tags=["Raffles"])


# ─── CREATE RAFFLE ─────────────────────────────────────────────────────────────


@router.post(
    "/{event_id}",
    status_code=status.HTTP_201_CREATED,
)
async def create_raffle(
    event_id: uuid.UUID,
    data: RaffleCreate,
    db: AsyncSession = Depends(get_db),
):
    return await RaffleService.create_raffle(db, event_id, data)


# ─── SELL NUMBER ───────────────────────────────────────────────────────────────


@router.post(
    "/{event_id}/sell",
    response_model=SellNumberResponse,
    status_code=status.HTTP_201_CREATED,
)
async def sell_number(
    event_id: uuid.UUID,
    data: SellNumberRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await RaffleService.sell_number(db, event_id, data, current_user.id)


# ─── SET WINNER MANUALLY ───────────────────────────────────────────────────────


@router.post(
    "/{event_id}/set-winner",
    response_model=WinnerResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Asignar ganador manualmente",
)
async def set_winner(
    event_id: uuid.UUID,
    data: SetWinnerRequest,
    org_id: uuid.UUID = Query(..., description="ID de la organización"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    membership: OrganizationUser = Depends(require_admin),
):
    """
    Declara un número específico como ganador de la rifa.

    - El número **debe estar vendido** (`status = sold`)
    - Si la rifa ya tiene ganador → **409 Conflict**
    - Devuelve nombre y teléfono del comprador
    - Solo admins pueden ejecutar esto
    """
    return await RaffleService.set_winner(
        db,
        event_id,
        data.winning_number,
        current_user.id,
    )
