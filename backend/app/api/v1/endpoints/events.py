"""
app/api/v1/endpoints/events.py
"""

import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user, get_org_membership, require_admin
from app.core.exceptions import NotFoundException
from app.db.session import get_db
from app.models.event import Event
from app.models.organization import OrganizationUser
from app.models.user import User
from app.schemas.base import MessageResponse
from app.schemas.event import EventCreate, EventResponse, EventUpdate

router = APIRouter()


@router.post("", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(
    data: EventCreate,
    org_id: uuid.UUID = Query(..., description="Organization ID"),
    db: AsyncSession = Depends(get_db),
    membership: OrganizationUser = Depends(require_admin),
):
    event = Event(
        organization_id=org_id,
        name=data.name,
        description=data.description,
        event_type=data.event_type,
        event_date=data.event_date,
    )
    db.add(event)
    await db.flush()
    await db.refresh(event)
    return EventResponse.model_validate(event)


@router.get("", response_model=list[EventResponse])
async def list_events(
    org_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    membership: OrganizationUser = Depends(get_org_membership),
):
    result = await db.execute(
        select(Event)
        .where(Event.organization_id == org_id)
        .order_by(Event.created_at.desc())
    )
    return [EventResponse.model_validate(e) for e in result.scalars().all()]


@router.get("/{event_id}", response_model=EventResponse)
async def get_event(
    event_id: uuid.UUID,
    org_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    membership: OrganizationUser = Depends(get_org_membership),
):
    event = await db.get(Event, event_id)
    if not event or event.organization_id != org_id:
        raise NotFoundException("Event not found")
    return EventResponse.model_validate(event)


@router.patch("/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: uuid.UUID,
    data: EventUpdate,
    org_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    membership: OrganizationUser = Depends(require_admin),
):
    event = await db.get(Event, event_id)
    if not event or event.organization_id != org_id:
        raise NotFoundException("Event not found")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(event, field, value)

    await db.flush()
    await db.refresh(event)
    return EventResponse.model_validate(event)


@router.delete("/{event_id}", response_model=MessageResponse)
async def delete_event(
    event_id: uuid.UUID,
    org_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    membership: OrganizationUser = Depends(require_admin),
):
    event = await db.get(Event, event_id)
    if not event or event.organization_id != org_id:
        raise NotFoundException("Event not found")
    await db.delete(event)
    return MessageResponse(message="Event deleted")
