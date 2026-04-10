"""
app/main.py
───────────
FastAPI application factory.
Configures middleware, CORS, exception handlers, and mounts the API router.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.core.config import settings


# ─── Lifespan (startup / shutdown) ─────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Code before 'yield' runs at startup.
    Code after 'yield' runs at shutdown.
    Database tables are managed by Alembic, not here.
    """
    print(f"🚀 {settings.APP_NAME} v{settings.APP_VERSION} starting...")
    yield
    print("👋 Shutting down...")


# ─── App factory ───────────────────────────────────────────────────────────────
def create_application() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="SaaS platform for managing school promotion events",
        docs_url="/api/docs" if settings.DEBUG else None,
        redoc_url="/api/redoc" if settings.DEBUG else None,
        lifespan=lifespan,
    )

    # ── CORS ─────────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── API router ───────────────────────────────────────────────────────────
    app.include_router(api_router, prefix="/api/v1")

    # ── Health check ─────────────────────────────────────────────────────────
    @app.get("/health", tags=["Health"])
    async def health_check():
        return JSONResponse({"status": "ok", "version": settings.APP_VERSION})

    return app


app = create_application()
