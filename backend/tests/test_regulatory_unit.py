"""Unit tests for regulatory framework scoring."""

from __future__ import annotations

from app.schemas.regulatory import RegulatoryScoreRequest
from app.services.regulatory_service import _csrd_score, _sec_score


def test_csrd_low_when_not_eu() -> None:
    req = RegulatoryScoreRequest(is_eu_operating=False)
    assert _csrd_score(req).score < 20


def test_csrd_high_when_eu_large() -> None:
    req = RegulatoryScoreRequest(
        is_eu_operating=True, annual_revenue_eur=60_000_000, employee_count=300
    )
    assert _csrd_score(req).score >= 80


def test_sec_high_when_us_listed() -> None:
    req = RegulatoryScoreRequest(is_us_listed=True)
    assert _sec_score(req).score >= 50
