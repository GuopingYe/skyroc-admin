"""Tests for Mapping Studio API endpoints."""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import TestDataFactory


# ============================================================
# Source Items Tests
# ============================================================

@pytest.mark.asyncio
async def test_get_source_items_empty(authenticated_client: AsyncClient, db_session: AsyncSession):
    """GET /mapping-studio/source-items returns empty for scope with no items."""
    ta = await TestDataFactory.create_scope_node(db_session, "TA", "Oncology")
    await db_session.commit()

    resp = await authenticated_client.get(
        f"/api/v1/mapping-studio/source-items?scope_node_id={ta.id}"
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 0
    assert data["items"] == []


@pytest.mark.asyncio
async def test_get_source_items_scope_not_found(authenticated_client: AsyncClient):
    """GET /mapping-studio/source-items returns error for non-existent scope."""
    resp = await authenticated_client.get(
        "/api/v1/mapping-studio/source-items?scope_node_id=99999"
    )
    assert resp.status_code == 200
    assert resp.json()["code"] == "4040"


# ============================================================
# Target Datasets Tests
# ============================================================

@pytest.mark.asyncio
async def test_get_target_datasets_missing_spec(authenticated_client: AsyncClient, db_session: AsyncSession):
    """GET /mapping-studio/target-datasets returns error for non-existent spec."""
    resp = await authenticated_client.get(
        "/api/v1/mapping-studio/target-datasets?specification_id=99999"
    )
    assert resp.status_code == 200
    assert resp.json()["code"] == "4040"


# ============================================================
# Target Variables Tests
# ============================================================

@pytest.mark.asyncio
async def test_get_target_variables_missing_dataset(authenticated_client: AsyncClient, db_session: AsyncSession):
    """GET /mapping-studio/target-variables returns empty for non-existent dataset."""
    ta = await TestDataFactory.create_scope_node(db_session, "TA", "Oncology")
    await db_session.commit()

    resp = await authenticated_client.get(
        f"/api/v1/mapping-studio/target-variables?scope_node_id={ta.id}&dataset_id=99999"
    )
    assert resp.status_code == 200
