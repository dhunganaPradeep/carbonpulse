"""Forecasting engine.

Prophet is the default and only enabled model. An LSTM path is gated behind a
feature flag and intentionally not implemented for v1.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from datetime import date

import pandas as pd

from app.core.logging import get_logger

logger = get_logger(__name__)

# Feature flag: LSTM is planned but Prophet is the production model.
LSTM_ENABLED = False


@dataclass
class ForecastResult:
    points: list[dict]  # forecast_date, yhat, yhat_lower, yhat_upper
    metrics: dict


def _to_dataframe(history: list[tuple[date, float]]) -> pd.DataFrame:
    df = pd.DataFrame(history, columns=["ds", "y"])
    df["ds"] = pd.to_datetime(df["ds"])
    return df.sort_values("ds").reset_index(drop=True)


def _cross_validate(model, df: pd.DataFrame) -> dict:
    """Run Prophet cross-validation; degrade gracefully on short series."""
    try:
        from prophet.diagnostics import cross_validation, performance_metrics

        span_days = (df["ds"].max() - df["ds"].min()).days
        if span_days < 365:
            return {"note": "series too short for cross-validation"}
        cv = cross_validation(
            model,
            initial=f"{int(span_days * 0.6)} days",
            period="60 days",
            horizon="90 days",
            parallel=None,
        )
        perf = performance_metrics(cv)
        return {
            "mape": float(perf["mape"].mean()),
            "rmse": float(perf["rmse"].mean()),
        }
    except Exception as exc:  # pragma: no cover - diagnostics are best-effort
        logger.warning("Cross-validation skipped: %s", exc)
        return {"note": f"cross-validation failed: {exc}"}


def run_prophet_forecast(
    history: list[tuple[date, float]], horizon_months: int = 12
) -> ForecastResult:
    """Fit Prophet on monthly-aggregated history and forecast horizon_months."""
    import warnings
    from prophet import Prophet

    # Use cmdstanpy backend and suppress verbose logging
    os.environ["STAN_BACKEND"] = "CMDSTANPY"
    warnings.filterwarnings("ignore")
    logger.info("Starting Prophet forecast (horizon=%d months)", horizon_months)

    df = _to_dataframe(history)
    if len(df) < 2:
        raise ValueError("Not enough history to forecast (minimum 2 data points)")
    
    logger.debug("Loaded %d historical data points", len(df))

    try:
        # Initialize Prophet without invalid stan_backend parameter
        model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=False,
            daily_seasonality=False,
            interval_width=0.8,
        )
        
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            logger.debug("Fitting Prophet model...")
            model.fit(df)

            logger.debug("Generating forecast...")
            future = model.make_future_dataframe(periods=horizon_months * 30, freq="D")
            forecast = model.predict(future)

        # Keep only future points, resampled to month-end for compactness.
        last = df["ds"].max()
        future_only = forecast[forecast["ds"] > last]
        monthly = (
            future_only.set_index("ds")[["yhat", "yhat_lower", "yhat_upper"]]
            .resample("ME")
            .mean()
            .reset_index()
            .head(horizon_months)
        )

        points = [
            {
                "forecast_date": row["ds"].date(),
                "yhat": round(float(row["yhat"]), 4),
                "yhat_lower": round(float(row["yhat_lower"]), 4),
                "yhat_upper": round(float(row["yhat_upper"]), 4),
            }
            for _, row in monthly.iterrows()
        ]
        
        logger.debug("Generated %d forecast points", len(points))
        metrics = _cross_validate(model, df)
        logger.info("Prophet forecast completed successfully")
        return ForecastResult(points=points, metrics=metrics)
        
    except Exception as e:
        logger.error("Prophet forecast failed: %s", str(e), exc_info=True)
        raise ValueError(f"Forecast engine error: {str(e)}") from e


def run_forecast(
    history: list[tuple[date, float]],
    horizon_months: int,
    model_name: str,
) -> ForecastResult:
    if model_name == "lstm":
        if not LSTM_ENABLED:
            raise ValueError("LSTM model is not enabled in this release")
        raise NotImplementedError("LSTM forecasting not implemented")
    return run_prophet_forecast(history, horizon_months)


def serialize_metrics(metrics: dict) -> str:
    return json.dumps(metrics)
