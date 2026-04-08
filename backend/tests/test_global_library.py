"""Tests for Global Library API endpoints."""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Specification
from app.models.mapping_enums import SpecType, SpecStatus
from tests.conftest import TestDataFactory


async def _seed_spec(db_session: AsyncSession):
    """Create a global spec for testing."""
    global_node = await TestDataFactory.create_scope_node(db_session, "GLOBAL", "Global Library")
    spec = Specification(
        scope_node_id=global_node.id,
        name="CDISC SDTM v3.4",
        spec_type=SpecType.SDTM,
        version="3.4",
        status=SpecStatus.ACTIVE,
        created_by="test_factory",
    )
    db_session.add(spec)
    await db_session.flush()
    await db_session.refresh(spec)
    await db_session.commit()
    return global_node, spec


# ============================================================
# Tree Endpoint
# ============================================================

@pytest.mark.asyncio
async def test_get_global_library_tree(authenticated_client: AsyncClient, db_session: AsyncSession):
    """GET /global-library/tree returns tree structure."""
    resp = await authenticated_client.get("/api/v1/global-library/tree")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_get_global_library_tree_empty(authenticated_client: AsyncClient, db_session: AsyncSession):
    """GET /global-library/tree returns empty when no specs with datasets exist."""
    resp = await authenticated_client.get("/api/v1/global-library/tree")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    # Tree only shows specs that have datasets, so empty without seeding datasets
    assert len(data) == 0


# ============================================================
# Specification List
# ============================================================

@pytest.mark.asyncio
async def test_get_specifications(authenticated_client: AsyncClient, db_session: AsyncSession):
    """GET /global-library/specifications returns spec list."""
    global_node, spec = await _seed_spec(db_session)
    resp = await authenticated_client.get(
        f"/api/v1/global-library/specifications?scope_node_id={global_node.id}"
    )
    assert resp.status_code == 200


# ============================================================
# Variable List (needs valid dataset_id)
# ============================================================

@pytest.mark.asyncio
async def test_get_variables_for_dataset_not_found(authenticated_client: AsyncClient, db_session: AsyncSession):
    """GET /global-library/datasets/{id}/variables returns error for missing dataset."""
    resp = await authenticated_client.get("/api/v1/global-library/datasets/99999/variables")
    assert resp.status_code == 200
    data = resp.json()
    # Global exception handler wraps 404 → {code: "4040", msg: "...", data: None}
    assert data["code"] == "4040"


# ============================================================
# Codelist Endpoints
# ============================================================

@pytest.mark.asyncio
async def test_get_codelists(authenticated_client: AsyncClient, db_session: AsyncSession):
    """GET /global-library/ct/{scope_node_id}/codelists returns codelist list."""
    global_node, _ = await _seed_spec(db_session)
    resp = await authenticated_client.get(f"/api/v1/global-library/ct/{global_node.id}/codelists")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_get_codelist_terms(authenticated_client: AsyncClient, db_session: AsyncSession):
    """GET /global-library/codelists/{id}/terms returns terms list."""
    resp = await authenticated_client.get("/api/v1/global-library/codelists/99999/terms")
    assert resp.status_code == 200
