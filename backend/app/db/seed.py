"""Seed script: populate a demo organisation, users, suppliers, emissions,
forecasts and regulatory snapshots.

Run (inside backend container or with env set):
    python -m app.db.seed

The script is idempotent: it skips entirely if the demo organisation already
exists.
"""

from __future__ import annotations

import asyncio
import random
from datetime import date, datetime, timezone

from sqlalchemy import select

from app.core.logging import configure_logging, get_logger
from app.core.security import hash_password
from app.data.synthetic_generator import generate_detailed_emissions
from app.db.models import (
    EmissionRecord,
    ForecastPoint,
    ForecastRun,
    Organisation,
    RegulatorySnapshot,
    Supplier,
    User,
)
from app.db.models.enums import (
    EmissionScope,
    ForecastModel,
    ForecastStatus,
    UserRole,
)
from app.db.session import AsyncSessionLocal
from app.schemas.regulatory import RegulatoryScoreRequest
from app.services.forecast_engine import run_forecast, serialize_metrics
from app.services.regulatory_service import _carbon_tax_score, _csrd_score, _sec_score

import json

configure_logging()
logger = get_logger(__name__)

DEMO_ORG_SLUG = "acme-demo"
DEMO_USERS = [
    ("admin@carbonpulse.dev", "admin123", UserRole.ADMIN, "Demo Admin"),
    ("analyst@carbonpulse.dev", "analyst123", UserRole.ANALYST, "Demo Analyst"),
    ("viewer@carbonpulse.dev", "viewer123", UserRole.VIEWER, "Demo Viewer"),
]
DEMO_SUPPLIERS = [
    ("Global Logistics Co", "DE", 0.18),
    ("PolyChem Materials", "US", 0.16),
    ("GreenPack Packaging", "NL", 0.10),
    ("EastWire Components", "CN", 0.18),
    ("Iberia Steelworks", "ES", 0.12),
    ("Nordic Pulp & Paper", "SE", 0.09),
    ("Apex Freight Services", "GB", 0.10),
    ("SunCell Energy", "IN", 0.07),
]
DEMO_REGULATORY_REQUEST = RegulatoryScoreRequest(
    annual_revenue_eur=60_000_000,
    employee_count=300,
    is_eu_operating=True,
    is_us_listed=True,
    carbon_tax_rate=85.0,
)


def _build_records(
    org_id, suppliers: list[Supplier], rng: random.Random
) -> list[EmissionRecord]:
    """Build enriched per-category/facility/energy-source emission records."""
    points = generate_detailed_emissions(years=5.0, seed=42)
    records: list[EmissionRecord] = []
    for p in points:
        # Attribute Scope 3 records to a supplier weighted by share.
        supplier_id = None
        if p.scope == EmissionScope.SCOPE_3:
            supplier = rng.choices(
                suppliers, weights=[float(s.emission_share or 0) for s in suppliers]
            )[0]
            supplier_id = supplier.id
        records.append(
            EmissionRecord(
                org_id=org_id,
                supplier_id=supplier_id,
                recorded_on=p.recorded_on,
                scope=p.scope,
                category=p.category.value,
                facility=p.facility,
                energy_source=p.energy_source.value,
                co2e_tonnes=p.co2e_tonnes,
                source="synthetic",
            )
        )
    return records


def _monthly_history(records: list[EmissionRecord]) -> list[tuple[date, float]]:
    """Aggregate emission records to month-start totals for forecasting."""
    buckets: dict[date, float] = {}
    for r in records:
        period = r.recorded_on.replace(day=1)
        buckets[period] = buckets.get(period, 0.0) + float(r.co2e_tonnes)
    return sorted(buckets.items())


def _seed_forecast(session, org_id, history: list[tuple[date, float]]) -> None:
    """Run a Prophet forecast and persist a COMPLETED run with its points."""
    run = ForecastRun(
        org_id=org_id,
        model=ForecastModel.PROPHET,
        horizon_months=12,
        status=ForecastStatus.RUNNING,
        started_at=datetime.now(timezone.utc),
    )
    session.add(run)
    try:
        result = run_forecast(history, run.horizon_months, run.model.value)
        for p in result.points:
            run.points.append(
                ForecastPoint(
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
        logger.info("Seeded forecast run with %d points", len(result.points))
    except Exception as exc:  # noqa: BLE001 - seeding should not hard-fail
        run.status = ForecastStatus.FAILED
        run.error = str(exc)
        run.completed_at = datetime.now(timezone.utc)
        logger.warning("Forecast seeding failed: %s", exc)


def _seed_regulatory(session, org_id, annual_emissions: float) -> None:
    """Persist a regulatory snapshot from the demo profile."""
    frameworks = [
        _csrd_score(DEMO_REGULATORY_REQUEST),
        _sec_score(DEMO_REGULATORY_REQUEST),
        _carbon_tax_score(DEMO_REGULATORY_REQUEST, annual_emissions),
    ]
    overall = round(sum(f.score for f in frameworks) / len(frameworks), 2)
    breakdown = json.dumps(
        [
            {"framework": f.framework, "score": f.score, "rationale": f.rationale}
            for f in frameworks
        ]
    )
    session.add(
        RegulatorySnapshot(
            org_id=org_id,
            snapshot_on=date.today(),
            risk_score=overall,
            breakdown=breakdown,
        )
    )
    logger.info("Seeded regulatory snapshot risk_score=%.2f", overall)


async def seed() -> None:
    async with AsyncSessionLocal() as session:
        existing = await session.scalar(
            select(Organisation).where(Organisation.slug == DEMO_ORG_SLUG)
        )
        if existing:
            logger.info("Demo organisation already seeded; skipping.")
            return

        org = Organisation(
            name="Acme Manufacturing (Demo)",
            slug=DEMO_ORG_SLUG,
            industry="Manufacturing",
            country="DE",
        )
        session.add(org)
        await session.flush()

        for email, password, role, name in DEMO_USERS:
            session.add(
                User(
                    org_id=org.id,
                    email=email,
                    hashed_password=hash_password(password),
                    full_name=name,
                    role=role,
                )
            )

        suppliers: list[Supplier] = []
        for name, country, share in DEMO_SUPPLIERS:
            supplier = Supplier(
                org_id=org.id, name=name, country=country, emission_share=share
            )
            suppliers.append(supplier)
            session.add(supplier)
        await session.flush()

        rng = random.Random(7)
        records = _build_records(org.id, suppliers, rng)
        session.add_all(records)

        history = _monthly_history(records)
        annual_emissions = sum(float(r.co2e_tonnes) for r in records)
        _seed_forecast(session, org.id, history)
        _seed_regulatory(session, org.id, annual_emissions)

        await session.commit()
        logger.info(
            "Seeded org=%s users=%d suppliers=%d emission_records=%d",
            DEMO_ORG_SLUG,
            len(DEMO_USERS),
            len(suppliers),
            len(records),
        )


if __name__ == "__main__":
    asyncio.run(seed())
