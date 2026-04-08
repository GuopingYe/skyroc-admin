"""Tests for TFL and Shell Library API endpoints."""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import TestDataFactory


# ============================================================
# TFL Shells Tests (router prefix /mdr/tfl)
# ============================================================

@pytest.mark.asyncio
async def test_get_tfl_shells_empty(authenticated_client: AsyncClient, db_session: AsyncSession):
    """GET /mdr/tfl/shells returns wrapped response when no shells exist."""
    ta = await TestDataFactory.create_scope_node(db_session, "TA", "Oncology")
    study = await TestDataFactory.create_scope_node(db_session, "STUDY", "STUDY-001", ta.id)
    await db_session.commit()

    resp = await authenticated_client.get(
        f"/api/v1/mdr/tfl/shells?scope_node_id={study.id}"
    )
    assert resp.status_code == 200
    data = resp.json()
    # TFL router wraps in _ok() → {code: "0000", data: {items: [], total: 0}}
    assert data["code"] == "0000"
    assert data["data"]["total"] == 0


@pytest.mark.asyncio
async def test_create_tfl_shell(authenticated_client: AsyncClient, db_session: AsyncSession):
    """POST /mdr/tfl/shell creates a TFL shell."""
    ta = await TestDataFactory.create_scope_node(db_session, "TA", "Oncology")
    study = await TestDataFactory.create_scope_node(db_session, "STUDY", "STUDY-001", ta.id)
    await db_session.commit()

    resp = await authenticated_client.post(
        "/api/v1/mdr/tfl/shell",
        json={
            "scope_node_id": study.id,
            "display_id": "14.1.1",
            "title": "Adverse Events Summary",
            "display_type": "Table",
        }
    )
    assert resp.status_code == 201
    data = resp.json()
    # Response wrapped in _ok()
    assert data["code"] == "0000"
    assert data["data"]["shell"]["title"] == "Adverse Events Summary"
    assert data["data"]["shell"]["display_id"] == "14.1.1"


# ============================================================
# Shell Library Template Tests (router prefix /shell-library)
# ============================================================

@pytest.mark.asyncio
async def test_get_shell_templates(admin_authenticated_client: AsyncClient):
    """GET /shell-library/templates returns template list."""
    resp = await admin_authenticated_client.get("/api/v1/shell-library/templates")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_create_shell_template(admin_authenticated_client: AsyncClient, db_session: AsyncSession):
    """POST /shell-library/templates creates a template."""
    global_node = await TestDataFactory.create_scope_node(db_session, "GLOBAL", "Global")
    await db_session.commit()

    resp = await admin_authenticated_client.post(
        "/api/v1/shell-library/templates",
        json={
            "scope_level": "global",
            "scope_node_id": global_node.id,
            "category": "Table",
            "template_name": "Test RTF Template",
            "display_type": "Table",
            "shell_schema": {"columns": []},
            "description": "A test RTF shell template",
        }
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["template_name"] == "Test RTF Template"


# ============================================================
# TFL Shell CRUD (update, delete, get detail)
# ============================================================

@pytest.mark.asyncio
async def test_get_tfl_shell_detail(authenticated_client: AsyncClient, db_session: AsyncSession):
    """GET /mdr/tfl/shell/{id} returns shell detail."""
    ta = await TestDataFactory.create_scope_node(db_session, "TA", "Oncology")
    study = await TestDataFactory.create_scope_node(db_session, "STUDY", "STUDY-001", ta.id)
    await db_session.commit()

    # Create shell first
    create_resp = await authenticated_client.post(
        "/api/v1/mdr/tfl/shell",
        json={
            "scope_node_id": study.id,
            "display_id": "14.1.2",
            "title": "Disposition Table",
            "display_type": "Table",
        }
    )
    shell_id = create_resp.json()["data"]["shell"]["id"]

    resp = await authenticated_client.get(f"/api/v1/mdr/tfl/shell/{shell_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["code"] == "0000"
    assert data["data"]["title"] == "Disposition Table"


@pytest.mark.asyncio
async def test_update_tfl_shell(authenticated_client: AsyncClient, db_session: AsyncSession):
    """PUT /mdr/tfl/shell/{id} updates shell."""
    ta = await TestDataFactory.create_scope_node(db_session, "TA", "Oncology")
    study = await TestDataFactory.create_scope_node(db_session, "STUDY", "STUDY-001", ta.id)
    await db_session.commit()

    create_resp = await authenticated_client.post(
        "/api/v1/mdr/tfl/shell",
        json={
            "scope_node_id": study.id,
            "display_id": "14.1.3",
            "title": "Original Title",
            "display_type": "Listing",
        }
    )
    shell_id = create_resp.json()["data"]["shell"]["id"]

    resp = await authenticated_client.put(
        f"/api/v1/mdr/tfl/shell/{shell_id}",
        json={"title": "Updated Title", "updated_by": "testuser"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["data"]["shell"]["title"] == "Updated Title"


@pytest.mark.asyncio
async def test_delete_tfl_shell(authenticated_client: AsyncClient, db_session: AsyncSession):
    """DELETE /mdr/tfl/shell/{id} soft-deletes shell."""
    ta = await TestDataFactory.create_scope_node(db_session, "TA", "Oncology")
    study = await TestDataFactory.create_scope_node(db_session, "STUDY", "STUDY-001", ta.id)
    await db_session.commit()

    create_resp = await authenticated_client.post(
        "/api/v1/mdr/tfl/shell",
        json={
            "scope_node_id": study.id,
            "display_id": "14.1.4",
            "title": "To Delete",
            "display_type": "Figure",
        }
    )
    shell_id = create_resp.json()["data"]["shell"]["id"]

    resp = await authenticated_client.delete(f"/api/v1/mdr/tfl/shell/{shell_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["data"]["success"] is True


# ============================================================
# Shell Library: get template detail
# ============================================================

@pytest.mark.asyncio
async def test_get_shell_template_detail(admin_authenticated_client: AsyncClient, db_session: AsyncSession):
    """GET /shell-library/templates/{id} returns template detail."""
    global_node = await TestDataFactory.create_scope_node(db_session, "GLOBAL", "Global")
    await db_session.commit()

    create_resp = await admin_authenticated_client.post(
        "/api/v1/shell-library/templates",
        json={
            "scope_level": "global",
            "scope_node_id": global_node.id,
            "category": "Table",
            "template_name": "Detail Test Template",
            "display_type": "Table",
            "shell_schema": {"columns": []},
        }
    )
    template_id = create_resp.json()["id"]

    resp = await admin_authenticated_client.get(f"/api/v1/shell-library/templates/{template_id}")
    assert resp.status_code == 200
    assert resp.json()["template_name"] == "Detail Test Template"
