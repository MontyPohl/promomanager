"""
app/schemas/event.py
"""

import uuid
from datetime import date, datetime

from pydantic import Field

from app.models.event import EventStatus, EventType
from app.schemas.base import AppSchema


class EventCreate(AppSchema):
    name: str = Field(..., min_length=2, max_length=200)
    description: str | None = None
    event_type: EventType
    event_date: date | None = None


class EventUpdate(AppSchema):
    name: str | None = Field(None, min_length=2, max_length=200)
    description: str | None = None
    status: EventStatus | None = None
    event_date: date | None = None


class EventResponse(AppSchema):
    id: uuid.UUID
    organization_id: uuid.UUID
    name: str
    description: str | None
    event_type: EventType
    status: EventStatus
    event_date: date | None
    created_at: datetime
