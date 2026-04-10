"""
app/db/session.py
─────────────────
Async SQLAlchemy engine + session factory.
Uses asyncpg under the hood for non-blocking DB calls.
"""

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

# ─── Engine ────────────────────────────────────────────────────────────────────
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,       # logs SQL in development
    pool_pre_ping=True,        # reconnect on stale connections
    pool_size=10,
    max_overflow=20,
)

# ─── Session factory ───────────────────────────────────────────────────────────
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,    # avoids lazy-load errors after commit
    autocommit=False,
    autoflush=False,
)


# ─── Base model ────────────────────────────────────────────────────────────────
class Base(DeclarativeBase):
    """
    Shared declarative base for all ORM models.
    Import this in every model file.
    """
    pass


# ─── Dependency ────────────────────────────────────────────────────────────────
async def get_db() -> AsyncSession:  # type: ignore[override]
    """
    FastAPI dependency that yields a DB session per request.
    Automatically closes the session after the response.

    Usage:
        async def my_route(db: AsyncSession = Depends(get_db)):
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
