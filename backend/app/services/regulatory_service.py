"""Regulatory risk scoring across CSRD, SEC and carbon-tax exposure."""

from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.regulatory import (
    FrameworkScore,
    RegulatoryScoreRequest,
    RegulatoryScoreResponse,
)
from app.services import emission_service

# CSRD large-undertaking thresholds (any two of three).
_CSRD_REVENUE = 50_000_000
_CSRD_EMPLOYEES = 250


def _csrd_score(req: RegulatoryScoreRequest) -> FrameworkScore:
    if not req.is_eu_operating:
        return FrameworkScore(
            framework="CSRD",
            score=10.0,
            rationale="Not operating in the EU; limited direct CSRD applicability.",
        )
    criteria = sum(
        [
            req.annual_revenue_eur >= _CSRD_REVENUE,
            req.employee_count >= _CSRD_EMPLOYEES,
        ]
    )
    if criteria >= 1:
        score = 85.0
        rationale = "EU operating and meets size thresholds; CSRD reporting likely required."
    else:
        score = 45.0
        rationale = "EU operating but below large-undertaking thresholds; phased exposure."
    return FrameworkScore(framework="CSRD", score=score, rationale=rationale)


def _sec_score(req: RegulatoryScoreRequest) -> FrameworkScore:
    if not req.is_us_listed:
        return FrameworkScore(
            framework="SEC",
            score=10.0,
            rationale="Not US-listed; SEC climate disclosure not directly applicable.",
        )
    return FrameworkScore(
        framework="SEC",
        score=70.0,
        rationale="US-listed; subject to SEC climate-related disclosure expectations.",
    )


def _carbon_tax_score(
    req: RegulatoryScoreRequest, annual_emissions: float
) -> FrameworkScore:
    exposure = annual_emissions * req.carbon_tax_rate
    # Normalise exposure relative to revenue to a 0-100 risk score.
    ratio = exposure / req.annual_revenue_eur if req.annual_revenue_eur > 0 else 0
    score = min(100.0, ratio * 1000)
    return FrameworkScore(
        framework="Carbon Tax",
        score=round(score, 2),
        rationale=(
            f"Estimated annual carbon tax exposure ~{exposure:,.0f} "
            f"on {annual_emissions:,.0f} tCO2e at rate {req.carbon_tax_rate}."
        ),
    )


async def score(
    session: AsyncSession, org_id: uuid.UUID, req: RegulatoryScoreRequest
) -> RegulatoryScoreResponse:
    agg = await emission_service.aggregate_by_scope(session, org_id)
    annual_emissions = agg.grand_total_co2e_tonnes

    frameworks = [
        _csrd_score(req),
        _sec_score(req),
        _carbon_tax_score(req, annual_emissions),
    ]
    overall = round(sum(f.score for f in frameworks) / len(frameworks), 2)
    return RegulatoryScoreResponse(overall_risk_score=overall, frameworks=frameworks)
