"""
app/models/__init__.py
───────────────────────
Re-exports all models so importing this package
is sufficient to register every table with SQLAlchemy metadata.

Used by:
  - app/db/__init__.py  → Alembic migration discovery
  - Any service that needs to query across models
"""

from app.models.user import User
from app.models.organization import Organization, OrganizationUser, UserRole
from app.models.event import Event, EventType, EventStatus
from app.models.transaction import Transaction, TransactionType
from app.models.raffle import Raffle, RaffleNumber, RafflePurchase, NumberStatus
from app.models.member_sales import MemberSales
from app.models.draw import Draw

__all__ = [
    "User",
    "Organization",
    "OrganizationUser",
    "UserRole",
    "Event",
    "EventType",
    "EventStatus",
    "Transaction",
    "TransactionType",
    "Raffle",
    "RaffleNumber",
    "RafflePurchase",
    "NumberStatus",
    "MemberSales",
    "Draw",
]
