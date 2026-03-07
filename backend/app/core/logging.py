"""Structured logging configuration."""

from __future__ import annotations

import logging
import sys
from logging.config import dictConfig

from app.core.config import settings


def configure_logging() -> None:
    """Configure root logging for the application."""
    level = "DEBUG" if not settings.is_production else "INFO"
    dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "default": {
                    "format": "%(asctime)s %(levelname)s [%(name)s] %(message)s",
                }
            },
            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "stream": sys.stdout,
                    "formatter": "default",
                }
            },
            "root": {"handlers": ["console"], "level": level},
        }
    )


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
