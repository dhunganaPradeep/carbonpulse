"""API v1 router aggregation."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1 import (
    admin,
    auth,
    emissions,
    forecast,
    health,
    regulatory,
    simulator,
    tasks,
    ws,
)

api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(health.router)
api_v1_router.include_router(auth.router)
api_v1_router.include_router(emissions.router)
api_v1_router.include_router(forecast.router)
api_v1_router.include_router(simulator.router)
api_v1_router.include_router(regulatory.router)
api_v1_router.include_router(admin.router)
api_v1_router.include_router(tasks.router)
api_v1_router.include_router(ws.router)
