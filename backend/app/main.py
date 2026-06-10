"""CarbonPulse FastAPI application entrypoint."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import api_v1_router
from app.core.config import settings
from app.core.logging import configure_logging, get_logger
from app.core.middleware import SecurityHeadersMiddleware
from app.core.redis_client import close_redis

configure_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup/shutdown hooks."""
    logger.info("Starting CarbonPulse backend (env=%s)", settings.ENVIRONMENT)
    yield
    await close_redis()
    logger.info("Shutting down CarbonPulse backend")


def create_app() -> FastAPI:
    app = FastAPI(
        title="CarbonPulse API",
        version="0.1.0",
        description="Carbon footprint intelligence platform API.",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(SecurityHeadersMiddleware)

    app.include_router(api_v1_router)
    return app


app = create_app()
