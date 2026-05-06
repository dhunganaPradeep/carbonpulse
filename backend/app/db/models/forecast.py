"""Forecast run and forecast point models."""

from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Index, Numeric, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, new_uuid
from app.db.models.enums import ForecastModel, ForecastStatus


class ForecastRun(Base, TimestampMixin):
    __tablename__ = "forecast_runs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=new_uuid
    )
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organisations.id", ondelete="CASCADE"),
        nullable=False,
    )
    model: Mapped[ForecastModel] = mapped_column(
        SAEnum(
            ForecastModel,
            native_enum=False,
            length=50,
            values_callable=lambda enum: [e.value for e in enum],
        ),
        default=ForecastModel.PROPHET,
        nullable=False,
    )

    status: Mapped[ForecastStatus] = mapped_column(
        SAEnum(
            ForecastStatus,
            native_enum=False,
            length=50,
            values_callable=lambda enum: [e.value for e in enum],
        ),
        default=ForecastStatus.PENDING,
        nullable=False,
    )
    horizon_months: Mapped[int] = mapped_column(default=12, nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    # JSON-encoded cross-validation metrics (e.g. MAPE, RMSE)
    metrics: Mapped[str | None] = mapped_column(Text, nullable=True)

    points: Mapped[list["ForecastPoint"]] = relationship(
        back_populates="run", cascade="all, delete-orphan"
    )

    __table_args__ = (Index("ix_forecast_run_org_created", "org_id", "created_at"),)


class ForecastPoint(Base):
    __tablename__ = "forecast_points"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=new_uuid
    )
    run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("forecast_runs.id", ondelete="CASCADE"),
        nullable=False,
    )
    forecast_date: Mapped[date] = mapped_column(Date, nullable=False)
    yhat: Mapped[float] = mapped_column(Numeric(14, 4), nullable=False)
    yhat_lower: Mapped[float] = mapped_column(Numeric(14, 4), nullable=False)
    yhat_upper: Mapped[float] = mapped_column(Numeric(14, 4), nullable=False)
    scope: Mapped[str | None] = mapped_column(String(20), nullable=True)

    run: Mapped["ForecastRun"] = relationship(back_populates="points")

    __table_args__ = (Index("ix_forecast_point_run_date", "run_id", "forecast_date"),)
