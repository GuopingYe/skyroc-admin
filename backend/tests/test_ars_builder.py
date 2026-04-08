"""Tests for ARS Builder API endpoints."""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import TestDataFactory


# ============================================================
# Display List
# ============================================================

@pytest.mark.asyncio
async def test_get_displays_empty(authenticated_client: AsyncClient, db_session: AsyncSession):
    study = await TestDataFactory.create_scope_node(db_session, "STUDY", "STUDY-001")
    await db_session.commit()

    resp = await authenticated_client.get(
        f"/api/v1/ars/displays?scope_node_id={study.id}"
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 0
    assert data["items"] == []


@pytest.mark.asyncio
async def test_get_displays_with_type_filter(authenticated_client: AsyncClient, db_session: AsyncSession):
    study = await TestDataFactory.create_scope_node(db_session, "STUDY", "STUDY-002")
    await db_session.commit()

    resp = await authenticated_client.get(
        f"/api/v1/ars/displays?scope_node_id={study.id}&display_type=Table"
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 0


# ============================================================
# Display Detail — xfail: selectinload().where() not supported
# ============================================================

@pytest.mark.asyncio
@pytest.mark.xfail(reason="selectinload().where() not supported in SQLAlchemy <2.0.20", strict=False)
async def test_get_display_detail_not_found(authenticated_client: AsyncClient):
    resp = await authenticated_client.get("/api/v1/ars/displays/99999/detail")
    assert resp.status_code == 200
    assert resp.json()["code"] == "4040"


# ============================================================
# Display Layout
# ============================================================

@pytest.mark.asyncio
async def test_save_display_layout_not_found(authenticated_client: AsyncClient):
    resp = await authenticated_client.put(
        "/api/v1/ars/displays/99999/layout",
        json={"title": "test"}
    )
    assert resp.status_code in (200, 422)
