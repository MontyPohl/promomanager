"""
app/db/__init__.py
──────────────────
Import everything here so Alembic's env.py only needs to import
`from app.db import Base` and will see all models automatically.
"""

from app.db.session import Base  # noqa: F401

# Models must be imported BEFORE alembic generates migrations
from app.models import (  # noqa: F401
    user,
    organization,
    event,
    transaction,
    raffle,
    member_sales,
    draw,
)
