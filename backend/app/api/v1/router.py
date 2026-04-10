"""
app/api/v1/router.py
────────────────────
Central router that includes all versioned endpoint modules.
Mounted in main.py under /api/v1.
"""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    users,
    organizations,
    events,
    transactions,
    raffles,
    member_sales,
    draws,
)

api_router = APIRouter()

# Each endpoint module registers its own prefix and tags
api_router.include_router(auth.router,          prefix="/auth",          tags=["Auth"])
api_router.include_router(users.router,         prefix="/users",         tags=["Users"])
api_router.include_router(organizations.router, prefix="/organizations",  tags=["Organizations"])
api_router.include_router(events.router,        prefix="/events",        tags=["Events"])
api_router.include_router(transactions.router,  prefix="/transactions",  tags=["Transactions"])
api_router.include_router(raffles.router,       prefix="/raffles",       tags=["Raffles"])
api_router.include_router(member_sales.router,  prefix="/member-sales",  tags=["Member Sales"])
api_router.include_router(draws.router,         prefix="/draws",         tags=["Draws"])
