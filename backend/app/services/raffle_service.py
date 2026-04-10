"""
app/services/raffle_service.py
───────────────────────────────
Core raffle business logic:
  - Create raffle with bulk-inserted number rows
  - Sell a number (atomic check-and-update)
  - Run a draw (random selection from sold numbers)
  - Compute stats for the grid response
"""

import random
import uuid

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import (
    BadRequestException,
    ConflictException,
    NotFoundException,
)
from app.models.raffle import NumberStatus, Raffle, RaffleNumber, RafflePurchase
from app.models.draw import Draw
from app.models.event import Event, EventType
from app.models.member_sales import MemberSales
from app.schemas.draw import DrawResponse
from app.schemas.raffle import (
    BulkSellRequest,
    RaffleCreate,
    RaffleNumberResponse,
    RaffleResponse,
    SellNumberRequest,
    SellNumberResponse,
)


class RaffleService:

    @staticmethod
    async def create_raffle(
        db: AsyncSession, event_id: uuid.UUID, data: RaffleCreate
    ) -> RaffleResponse:
        event = await db.get(Event, event_id)
        if not event:
            raise NotFoundException("Event not found")
        if event.event_type != EventType.RAFFLE:
            raise BadRequestException(
                "Only RAFFLE events can have a raffle configuration"
            )

        existing = await db.execute(select(Raffle).where(Raffle.event_id == event_id))
        if existing.scalar_one_or_none():
            raise ConflictException("This event already has a raffle")

        raffle = Raffle(
            event_id=event_id,
            total_numbers=data.total_numbers,
            ticket_price=data.ticket_price,
        )
        db.add(raffle)
        await db.flush()

        numbers = [
            RaffleNumber(raffle_id=raffle.id, number=n)
            for n in range(1, data.total_numbers + 1)
        ]
        db.add_all(numbers)
        await db.flush()

        return RaffleResponse(
            id=raffle.id,
            event_id=raffle.event_id,
            total_numbers=raffle.total_numbers,
            ticket_price=raffle.ticket_price,
            is_drawn=raffle.is_drawn,
            sold_count=0,
            available_count=data.total_numbers,
            created_at=raffle.created_at,
        )

    @staticmethod
    async def get_raffle_grid(
        db: AsyncSession, event_id: uuid.UUID
    ) -> tuple[RaffleResponse, list[RaffleNumberResponse]]:
        result = await db.execute(
            select(Raffle)
            .where(Raffle.event_id == event_id)
            .options(selectinload(Raffle.numbers).selectinload(RaffleNumber.purchase))
        )
        raffle = result.scalar_one_or_none()
        if not raffle:
            raise NotFoundException("No raffle found for this event")

        sold_count = sum(1 for n in raffle.numbers if n.status == NumberStatus.SOLD)

        raffle_resp = RaffleResponse(
            id=raffle.id,
            event_id=raffle.event_id,
            total_numbers=raffle.total_numbers,
            ticket_price=raffle.ticket_price,
            is_drawn=raffle.is_drawn,
            sold_count=sold_count,
            available_count=raffle.total_numbers - sold_count,
            created_at=raffle.created_at,
        )

        numbers_resp = [
            RaffleNumberResponse(
                id=n.id,
                number=n.number,
                status=n.status,
                buyer_name=n.purchase.buyer_name if n.purchase else None,
                buyer_phone=n.purchase.buyer_phone if n.purchase else None,
                amount_paid=n.purchase.amount_paid if n.purchase else None,
                sold_by_id=n.purchase.sold_by_id if n.purchase else None,
            )
            for n in raffle.numbers
        ]

        return raffle_resp, numbers_resp

    @staticmethod
    async def sell_number(
        db: AsyncSession,
        event_id: uuid.UUID,
        data: SellNumberRequest,
        seller_id: uuid.UUID,
    ) -> SellNumberResponse:
        result = await db.execute(
            select(RaffleNumber)
            .join(Raffle)
            .where(
                RaffleNumber.id == data.raffle_number_id,
                Raffle.event_id == event_id,
            )
            .options(selectinload(RaffleNumber.purchase))
        )
        raffle_number = result.scalar_one_or_none()

        if not raffle_number:
            raise NotFoundException("Raffle number not found in this event")
        if raffle_number.status != NumberStatus.AVAILABLE:
            raise ConflictException(f"Number #{raffle_number.number} is already sold")

        raffle_number.status = NumberStatus.SOLD

        purchase = RafflePurchase(
            raffle_number_id=raffle_number.id,
            sold_by_id=seller_id,
            buyer_name=data.buyer_name,
            buyer_phone=data.buyer_phone,
            amount_paid=data.amount_paid,
        )
        db.add(purchase)

        await RaffleService._increment_member_sales(
            db, event_id, seller_id, data.amount_paid
        )

        await db.flush()
        await db.refresh(purchase)

        return SellNumberResponse(
            purchase_id=purchase.id,
            raffle_number_id=raffle_number.id,
            number=raffle_number.number,
            buyer_name=purchase.buyer_name,
            buyer_phone=purchase.buyer_phone,
            amount_paid=purchase.amount_paid,
            created_at=purchase.created_at,
        )

    @staticmethod
    async def _increment_member_sales(
        db: AsyncSession,
        event_id: uuid.UUID,
        user_id: uuid.UUID,
        amount: int,
    ) -> None:
        result = await db.execute(
            select(MemberSales).where(
                MemberSales.event_id == event_id,
                MemberSales.user_id == user_id,
            )
        )
        record = result.scalar_one_or_none()

        if record:
            record.quantity_sold += 1
        else:
            record = MemberSales(
                event_id=event_id,
                user_id=user_id,
                quantity_sold=1,
                amount_paid=0,
            )
            db.add(record)

    @staticmethod
    async def run_draw(
        db: AsyncSession,
        event_id: uuid.UUID,
        drawn_by_id: uuid.UUID,
    ) -> DrawResponse:
        raffle_result = await db.execute(
            select(Raffle).where(Raffle.event_id == event_id)
        )
        raffle = raffle_result.scalar_one_or_none()
        if not raffle:
            raise NotFoundException("No raffle configured for this event")

        sold_result = await db.execute(
            select(RaffleNumber)
            .join(RafflePurchase, RaffleNumber.id == RafflePurchase.raffle_number_id)
            .options(selectinload(RaffleNumber.purchase))
            .where(
                RaffleNumber.raffle_id == raffle.id,
                RaffleNumber.status == NumberStatus.SOLD,
            )
        )
        sold_numbers = sold_result.scalars().all()

        if not sold_numbers:
            raise BadRequestException("No sold numbers to draw from")

        winner = random.choice(sold_numbers)

        draw = Draw(
            event_id=event_id,
            raffle_number_id=winner.id,
            winning_number=winner.number,
            winner_name=winner.purchase.buyer_name if winner.purchase else None,
            winner_phone=winner.purchase.buyer_phone if winner.purchase else None,
            drawn_by_id=drawn_by_id,
        )
        db.add(draw)

        raffle.is_drawn = True

        await db.flush()
        await db.refresh(draw)

        return DrawResponse.model_validate(draw)

    @staticmethod
    async def set_winner(
        db: AsyncSession,
        event_id: uuid.UUID,
        winning_number: int,
        drawn_by_id: uuid.UUID,
    ):
        """
        Asigna manualmente un número vendido como ganador.
        """
        from app.schemas.raffle import WinnerResponse

        # 1. Obtener rifa
        raffle_result = await db.execute(
            select(Raffle).where(Raffle.event_id == event_id)
        )
        raffle = raffle_result.scalar_one_or_none()
        if not raffle:
            raise NotFoundException("No hay rifa configurada para este evento")
        if raffle.is_drawn:
            raise ConflictException("Esta rifa ya tiene un ganador asignado")

        # 2. Buscar número
        number_result = await db.execute(
            select(RaffleNumber)
            .options(selectinload(RaffleNumber.purchase))
            .where(
                RaffleNumber.raffle_id == raffle.id,
                RaffleNumber.number == winning_number,
            )
        )
        raffle_number = number_result.scalar_one_or_none()

        if not raffle_number:
            raise NotFoundException(
                f"El número #{winning_number} no existe en esta rifa"
            )
        if raffle_number.status != NumberStatus.SOLD:
            raise BadRequestException(
                f"El número #{winning_number} no está vendido. "
                "Solo se puede declarar ganador un número vendido."
            )

        # 3. Obtener compra
        purchase = raffle_number.purchase

        # 4. Crear draw
        draw = Draw(
            event_id=event_id,
            raffle_number_id=raffle_number.id,
            winning_number=raffle_number.number,
            winner_name=purchase.buyer_name if purchase else None,
            winner_phone=purchase.buyer_phone if purchase else None,
            drawn_by_id=drawn_by_id,
        )
        db.add(draw)

        # 5. Marcar rifa como sorteada
        raffle.is_drawn = True

        await db.flush()
        await db.refresh(draw)

        return WinnerResponse(
            draw_id=draw.id,
            event_id=draw.event_id,
            raffle_number_id=draw.raffle_number_id,
            winning_number=draw.winning_number,
            winner_name=draw.winner_name,
            winner_phone=draw.winner_phone,
            drawn_by_id=draw.drawn_by_id,
            created_at=draw.created_at,
        )
