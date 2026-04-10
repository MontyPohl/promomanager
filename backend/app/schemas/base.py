"""
app/schemas/base.py
────────────────────
Shared Pydantic config and reusable building blocks.
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AppSchema(BaseModel):
    """
    Base for all schemas.
    - from_attributes=True  → allows creating schemas from ORM model instances
    - populate_by_name=True → allows using field names in addition to aliases
    """

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class IDSchema(AppSchema):
    """Mixin for responses that include a UUID id."""
    id: uuid.UUID


class TimestampSchema(AppSchema):
    """Mixin for responses that include timestamps."""
    created_at: datetime
    updated_at: datetime


class PaginatedResponse(AppSchema):
    """Generic paginated list wrapper."""
    total: int
    page: int
    page_size: int
    items: list  # override with specific type in each module


class MessageResponse(AppSchema):
    """Simple success message response."""
    message: str
