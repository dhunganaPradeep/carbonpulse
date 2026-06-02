"""Forecast orchestration: history loading, run persistence, background work."""

from __future__ import annotations

import uuid
from datetime import date, datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.db.models import EmissionRecord, ForecastPoint, ForecastRun
from app.db.models.enums import ForecastModel, ForecastStatus
from app.db.session import AsyncSessionLocal
from app.services.forecast_engine import run_forecast, serialize_metrics

logger = get_logger(__name__)


async def create_run(
    session: AsyncSession,
    org_id: uuid.UUID,
    horizon_months: int,
    model: ForecastModel,
) -> ForecastRun:
    run = ForecastRun(
        org_id=org_id,
        horizon_months=horizon_months,
        model=model,
        status=ForecastStatus.PENDING,
    )
    session.add(run)
    await session.commit()
    await session.refresh(run)
    return run


async def _load_monthly_history(
    session: AsyncSession, org_id: uuid.UUID
) -> list[tuple[date, float]]:
    """Total emissions aggregated to month-start for the org."""
    period = func.date_trunc("month", EmissionRecord.recorded_on).label("period")
    rows = await session.execute(
        select(period, func.sum(EmissionRecord.co2e_tonnes))
        .where(EmissionRecord.org_id == org_id)
        .group_by(period)
        .order_by(period)
    )
    return [(p.date() if hasattr(p, "date") else p, float(total)) for p, total in rows.all()]


async def execute_run(run_id: uuid.UUID) -> None:
    """Background entrypoint: run forecast and persist points.

    Uses its own session because it runs outside the request lifecycle.
    """
    async with AsyncSessionLocal() as session:
        run = await session.get(ForecastRun, run_id)
        if run is None:
            logger.error("Forecast run %s not found", run_id)
            return
        run.status = ForecastStatus.RUNNING
        run.started_at = datetime.now(timezone.utc)
        await session.commit()

        try:
            history = await _load_monthly_history(session, run.org_id)
            result = run_forecast(history, run.horizon_months, run.model.value)
            for p in result.points:
                session.add(
                    ForecastPoint(
                        run_id=run.id,
                        forecast_date=p["forecast_date"],
                        yhat=p["yhat"],
                        yhat_lower=p["yhat_lower"],
                        yhat_upper=p["yhat_upper"],
                        scope="total",
                    )
                )
            run.metrics = serialize_metrics(result.metrics)
            run.status = ForecastStatus.COMPLETED
            run.completed_at = datetime.now(timezone.utc)
            await session.commit()
            logger.info("Forecast run %s completed (%d points)", run_id, len(result.points))
            
            from app.core.ws_manager import manager
            await manager.broadcast_to_org(run.org_id, {"type": "FORECAST_COMPLETE", "run_id": str(run_id), "status": "COMPLETED"})
        except Exception as exc:  # noqa: BLE001 - record failure on the run
            await session.rollback()
            run = await session.get(ForecastRun, run_id)
            if run is not None:
                run.status = ForecastStatus.FAILED
                run.error = str(exc)
                run.completed_at = datetime.now(timezone.utc)
                await session.commit()
                from app.core.ws_manager import manager
                await manager.broadcast_to_org(run.org_id, {"type": "FORECAST_COMPLETE", "run_id": str(run_id), "status": "FAILED"})
            logger.exception("Forecast run %s failed", run_id)


async def get_run(
    session: AsyncSession, org_id: uuid.UUID, run_id: uuid.UUID
) -> ForecastRun | None:
    return await session.scalar(
        select(ForecastRun).where(
            ForecastRun.id == run_id, ForecastRun.org_id == org_id
        )
    )


async def latest_run(session: AsyncSession, org_id: uuid.UUID) -> ForecastRun | None:
    return await session.scalar(
        select(ForecastRun)
        .where(
            ForecastRun.org_id == org_id,
            ForecastRun.status == ForecastStatus.COMPLETED,
        )
        .order_by(ForecastRun.created_at.desc())
        .limit(1)
    )


async def get_run_points(
    session: AsyncSession, run_id: uuid.UUID
) -> list[ForecastPoint]:
    rows = await session.scalars(
        select(ForecastPoint)
        .where(ForecastPoint.run_id == run_id)
        .order_by(ForecastPoint.forecast_date)
    )
    return list(rows)
