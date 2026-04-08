"""Tests for ARS Study API endpoints."""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import TestDataFactory


# ============================================================
# Study Defaults
# ============================================================

@pytest.mark.asyncio
async def test_get_study_defaults_creates_blank(authenticated_client: AsyncClient, db_session: AsyncSession):
    """GET /ars/study-defaults/{scope_node_id} creates blank defaults if not present."""
    study = await TestDataFactory.create_scope_node(db_session, "STUDY", "STUDY-001")
    await db_session.commit()

    resp = await authenticated_client.get(f"/api/v1/ars/study-defaults/{study.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["scope_node_id"] == study.id
    assert "decimal_rules" in data


@pytest.mark.asyncio
async def test_upsert_study_defaults(authenticated_client: AsyncClient, db_session: AsyncSession):
    """PUT /ars/study-defaults/{scope_node_id} updates defaults."""
    study = await TestDataFactory.create_scope_node(db_session, "STUDY", "STUDY-002")
    await db_session.commit()

    resp = await authenticated_client.put(
        f"/api/v1/ars/study-defaults/{study.id}",
        json={
            "decimal_rules": {"n": 0, "mean": 2},
            "updated_by": "testuser",
        }
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["decimal_rules"]["n"] == 0
    assert data["decimal_rules"]["mean"] == 2


# ============================================================
# Statistics Sets
# ============================================================

@pytest.mark.asyncio
async def test_list_statistics_sets_empty(authenticated_client: AsyncClient, db_session: AsyncSession):
    """GET /ars/statistics-sets/{scope_node_id} returns empty list."""
    study = await TestDataFactory.create_scope_node(db_session, "STUDY", "STUDY-003")
    await db_session.commit()

    resp = await authenticated_client.get(f"/api/v1/ars/statistics-sets/{study.id}")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
    assert len(resp.json()) == 0


@pytest.mark.asyncio
async def test_create_statistics_set(authenticated_client: AsyncClient, db_session: AsyncSession):
    """POST /ars/statistics-sets/{scope_node_id} creates a statistics set."""
    study = await TestDataFactory.create_scope_node(db_session, "STUDY", "STUDY-004")
    await db_session.commit()

    resp = await authenticated_client.post(
        f"/api/v1/ars/statistics-sets/{study.id}",
        json={
            "name": "Primary Analysis Stats",
            "stats": [
                {"stat_type": "n", "label": "N"},
                {"stat_type": "mean", "label": "Mean"},
            ],
            "created_by": "testuser",
        }
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Primary Analysis Stats"
    assert len(data["stats"]) == 2


@pytest.mark.asyncio
async def test_create_statistics_set_scope_not_found(authenticated_client: AsyncClient):
    """POST /ars/statistics-sets/{scope_node_id} returns 404 for missing scope."""
    resp = await authenticated_client.post(
        "/api/v1/ars/statistics-sets/99999",
        json={
            "name": "Test",
            "created_by": "testuser",
        }
    )
    # Wrapped by global handler
    body = resp.json()
    assert body.get("code") == "4040" or resp.status_code == 404


# ============================================================
# Study Templates
# ============================================================

@pytest.mark.asyncio
async def test_list_study_templates_empty(authenticated_client: AsyncClient, db_session: AsyncSession):
    """GET /ars/study-templates/{scope_node_id} returns empty list."""
    study = await TestDataFactory.create_scope_node(db_session, "STUDY", "STUDY-005")
    await db_session.commit()

    resp = await authenticated_client.get(f"/api/v1/ars/study-templates/{study.id}")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_create_study_template(authenticated_client: AsyncClient, db_session: AsyncSession):
    """POST /ars/study-templates/{scope_node_id} creates a template."""
    study = await TestDataFactory.create_scope_node(db_session, "STUDY", "STUDY-006")
    await db_session.commit()

    resp = await authenticated_client.post(
        f"/api/v1/ars/study-templates/{study.id}",
        json={
            "category": "Demographics",
            "template_name": "DM Summary Table",
            "display_type": "Table",
            "shell_schema": {"columns": [{"label": "Treatment", "span": 1}]},
            "created_by": "testuser",
        }
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["template_name"] == "DM Summary Table"
    assert data["category"] == "Demographics"
