"""Regulatory risk scoring schemas."""

from __future__ import annotations

from pydantic import BaseModel, Field


class RegulatoryScoreRequest(BaseModel):
    annual_revenue_eur: float = Field(default=0, ge=0)
    employee_count: int = Field(default=0, ge=0)
    is_eu_operating: bool = False
    is_us_listed: bool = False
    carbon_tax_rate: float = Field(default=0, ge=0)


class FrameworkScore(BaseModel):
    framework: str
    score: float  # 0-100 (higher = higher risk/exposure)
    rationale: str


class RegulatoryScoreResponse(BaseModel):
    overall_risk_score: float
    frameworks: list[FrameworkScore]
