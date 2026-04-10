"""
app/schemas/draw.py
"""

import uuid
from datetime import datetime

from app.schemas.base import AppSchema


class DrawResponse(AppSchema):
    id: uuid.UUID
    event_id: uuid.UUID
    winning_number: int
    winner_name: str | None
    winner_phone: str | None
    drawn_by_id: uuid.UUID | None
    created_at: datetime
