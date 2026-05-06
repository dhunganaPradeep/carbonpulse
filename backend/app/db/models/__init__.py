"""ORM models.

Importing this package registers all models on the declarative ``Base``
metadata so Alembic autogenerate and ``create_all`` can see them.
"""

from app.db.models.organisation import Organisation
from app.db.models.user import User
from app.db.models.emission_record import EmissionRecord
from app.db.models.supplier import Supplier
from app.db.models.forecast import ForecastRun, ForecastPoint
from app.db.models.simulation import SimulationScenario
from app.db.models.regulatory import RegulatorySnapshot
from app.db.models.audit import AuditLog
from app.db.models.task import Task

__all__ = [
    "Organisation",
    "User",
    "EmissionRecord",
    "Supplier",
    "ForecastRun",
    "ForecastPoint",
    "SimulationScenario",
    "RegulatorySnapshot",
    "AuditLog",
    "Task",
]
