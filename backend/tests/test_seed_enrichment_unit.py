"""Unit tests for seed enrichment helpers (forecast + regulatory + records)."""

from __future__ import annotations

import uuid

from app.db import seed as seed_module
from app.db.models.enums import EmissionScope


def test_build_records_enriches_fields() -> None:
    import random

    class _Supplier:
        def __init__(self, share: float) -> None:
            self.id = uuid.uuid4()
            self.emission_share = share

    suppliers = [_Supplier(0.5), _Supplier(0.5)]
    org_id = uuid.uuid4()
    records = seed_module._build_records(org_id, suppliers, random.Random(7))

    assert records
    assert all(r.category and r.facility and r.energy_source for r in records)
    # Every Scope 3 record must be attributed to a seeded supplier.
    s3 = [r for r in records if r.scope == EmissionScope.SCOPE_3]
    assert s3
    supplier_ids = {s.id for s in suppliers}
    assert all(r.supplier_id in supplier_ids for r in s3)


def test_monthly_history_aggregates_by_month() -> None:
    import random

    class _Supplier:
        def __init__(self, share: float) -> None:
            self.id = uuid.uuid4()
            self.emission_share = share

    records = seed_module._build_records(
        uuid.uuid4(), [_Supplier(1.0)], random.Random(1)
    )
    history = seed_module._monthly_history(records)
    assert history
    # Months are unique and sorted ascending.
    months = [m for m, _ in history]
    assert months == sorted(months)
    assert len(months) == len(set(months))
    assert all(total > 0 for _, total in history)
