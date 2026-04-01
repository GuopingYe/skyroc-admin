"""Tests for Reference Data CRUD endpoints and model."""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ReferenceData, ReferenceDataCategory


# ============================================================
# Model Tests
# ============================================================


@pytest.mark.asyncio
async def test_model_creation(db_session: AsyncSession):
    """ReferenceData can be created with all required fields."""
    item = ReferenceData(
        category=ReferenceDataCategory.POPULATION.value,
        code="ITT",
        label="Intent-to-Treat",
    )
    db_session.add(item)
    await db_session.flush()
    await db_session.refresh(item)

    assert item.id is not None
    assert item.category == ReferenceDataCategory.POPULATION.value
    assert item.code == "ITT"
    assert item.label == "Intent-to-Treat"
    assert item.is_active is True
    assert item.is_deleted is False
    assert item.sort_order == 0


@pytest.mark.asyncio
async def test_model_soft_delete(db_session: AsyncSession):
    """ReferenceData supports soft delete via SoftDeleteMixin."""
    item = ReferenceData(
        category=ReferenceDataCategory.POPULATION.value,
        code="Safety",
        label="Safety Population",
    )
    db_session.add(item)
    await db_session.flush()
    await db_session.refresh(item)

    item.soft_delete(deleted_by="testuser")
    await db_session.flush()
    await db_session.refresh(item)

    assert item.is_deleted is True
    assert item.deleted_by == "testuser"
    assert item.deleted_at is not None
