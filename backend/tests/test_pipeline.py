"""Tests for Pipeline Management API endpoints."""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import TestDataFactory


# ============================================================
# Tree & TA Tests
# ============================================================

@pytest.mark.asyncio
async def test_get_empty_tree(authenticated_client: AsyncClient):
    """GET /pipeline/tree returns empty list when no nodes exist."""
    resp = await authenticated_client.get("/api/v1/pipeline/tree")
    assert resp.status_code == 200
    data = resp.json()
    assert data["code"] == "0000"
    assert data["data"] == []


@pytest.mark.asyncio
async def test_get_tree_with_nodes(authenticated_client: AsyncClient, db_session: AsyncSession):
    """GET /pipeline/tree returns TA hierarchy."""
    ta = await TestDataFactory.create_scope_node(db_session, "TA", "Oncology")
    await TestDataFactory.create_scope_node(db_session, "COMPOUND", "Test Compound", ta.id)
    await db_session.commit()

    resp = await authenticated_client.get("/api/v1/pipeline/tree")
    assert resp.status_code == 200
    data = resp.json()
    assert data["code"] == "0000"
    assert len(data["data"]) >= 1


@pytest.mark.asyncio
async def test_list_empty_tas(authenticated_client: AsyncClient):
    """GET /pipeline/therapeutic-areas returns empty list."""
    resp = await authenticated_client.get("/api/v1/pipeline/therapeutic-areas")
    assert resp.status_code == 200
    data = resp.json()
    assert data["code"] == "0000"
    assert data["data"] == []


@pytest.mark.asyncio
async def test_create_ta(authenticated_client: AsyncClient):
    """POST /pipeline/therapeutic-areas creates a TA."""
    resp = await authenticated_client.post(
        "/api/v1/pipeline/therapeutic-areas",
        json={"code": "ONC", "name": "Oncology", "description": "Oncology TA"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["code"] == "0000"
    assert data["data"]["name"] == "Oncology"
    assert data["data"]["nodeType"] == "TA"


@pytest.mark.asyncio
async def test_update_ta(authenticated_client: AsyncClient, db_session: AsyncSession):
    """PUT /pipeline/therapeutic-areas/{id} updates a TA."""
    ta = await TestDataFactory.create_scope_node(db_session, "TA", "Old Name")
    await db_session.commit()

    resp = await authenticated_client.put(
        f"/api/v1/pipeline/therapeutic-areas/{ta.id}",
        json={"name": "New Name"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["data"]["name"] == "New Name"


# ============================================================
# Node Creation Tests
# ============================================================

@pytest.mark.asyncio
async def test_create_compound(authenticated_client: AsyncClient, db_session: AsyncSession):
    """POST /pipeline/nodes creates a compound under a TA."""
    ta = await TestDataFactory.create_scope_node(db_session, "TA", "Oncology")
    await db_session.commit()

    resp = await authenticated_client.post(
        "/api/v1/pipeline/nodes",
        json={"node_type": "COMPOUND", "title": "Test Compound", "parent_id": str(ta.id)}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["code"] == "0000"
    assert data["data"]["nodeType"] == "COMPOUND"


@pytest.mark.asyncio
async def test_create_study(authenticated_client: AsyncClient, db_session: AsyncSession):
    """POST /pipeline/nodes creates a study under a compound."""
    ta = await TestDataFactory.create_scope_node(db_session, "TA", "Oncology")
    compound = await TestDataFactory.create_scope_node(db_session, "COMPOUND", "Test Compound", ta.id)
    await db_session.commit()

    resp = await authenticated_client.post(
        "/api/v1/pipeline/nodes",
        json={"node_type": "STUDY", "title": "STUDY-001", "parent_id": str(compound.id), "phase": "Phase II"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["code"] == "0000"
    assert data["data"]["nodeType"] == "STUDY"


@pytest.mark.asyncio
async def test_create_analysis_inherits_specs(authenticated_client: AsyncClient, db_session: AsyncSession):
    """POST /pipeline/nodes creates an analysis that auto-inherits study specs."""
    ta = await TestDataFactory.create_scope_node(db_session, "TA", "Oncology")
    compound = await TestDataFactory.create_scope_node(db_session, "COMPOUND", "Test Compound", ta.id)
    study = await TestDataFactory.create_scope_node(db_session, "STUDY", "STUDY-001", compound.id)
    await db_session.commit()

    resp = await authenticated_client.post(
        "/api/v1/pipeline/nodes",
        json={"node_type": "ANALYSIS", "title": "Interim Analysis", "parent_id": str(study.id)}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["code"] == "0000"
    assert data["data"]["nodeType"] == "ANALYSIS"
    assert data["data"]["spec_status"] == "inherited"


@pytest.mark.asyncio
async def test_create_duplicate_node_rejected(authenticated_client: AsyncClient, db_session: AsyncSession):
    """POST /pipeline/nodes rejects duplicate name at same parent level."""
    ta = await TestDataFactory.create_scope_node(db_session, "TA", "Oncology")
    await db_session.commit()

    resp1 = await authenticated_client.post(
        "/api/v1/pipeline/nodes",
        json={"node_type": "COMPOUND", "title": "Duplicate Name", "parent_id": str(ta.id)}
    )
    assert resp1.status_code == 200

    resp2 = await authenticated_client.post(
        "/api/v1/pipeline/nodes",
        json={"node_type": "COMPOUND", "title": "Duplicate Name", "parent_id": str(ta.id)}
    )
    # App wraps errors in 200 with error code in body
    assert resp2.status_code == 200
    assert resp2.json()["code"] == "400"


# ============================================================
# Study Config Tests
# ============================================================

@pytest.mark.asyncio
async def test_get_study_config(authenticated_client: AsyncClient, db_session: AsyncSession):
    """GET /pipeline/studies/{id}/config returns study configuration."""
    ta = await TestDataFactory.create_scope_node(db_session, "TA", "Oncology")
    compound = await TestDataFactory.create_scope_node(db_session, "COMPOUND", "Test Compound", ta.id)
    study = await TestDataFactory.create_scope_node(db_session, "STUDY", "STUDY-001", compound.id)
    await TestDataFactory.create_study_config(db_session, study)
    await db_session.commit()

    resp = await authenticated_client.get(f"/api/v1/pipeline/studies/{study.id}/config")
    assert resp.status_code == 200
    data = resp.json()
    assert data["code"] == "0000"
    assert "config" in data["data"]


@pytest.mark.asyncio
async def test_update_study_config(authenticated_client: AsyncClient, db_session: AsyncSession):
    """PUT /pipeline/studies/{id}/config updates study configuration."""
    ta = await TestDataFactory.create_scope_node(db_session, "TA", "Oncology")
    compound = await TestDataFactory.create_scope_node(db_session, "COMPOUND", "Test Compound", ta.id)
    study = await TestDataFactory.create_scope_node(db_session, "STUDY", "STUDY-001", compound.id)
    await db_session.commit()

    resp = await authenticated_client.put(
        f"/api/v1/pipeline/studies/{study.id}/config",
        json={"protocol_title": "Updated Protocol", "phase": "Phase III", "sdtm_model_version": "CDISC SDTM v3.4"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["code"] == "0000"


# ============================================================
# Milestone Tests
# ============================================================

@pytest.mark.asyncio
async def test_create_milestone(authenticated_client: AsyncClient, db_session: AsyncSession):
    """POST /pipeline/milestones creates a milestone."""
    ta = await TestDataFactory.create_scope_node(db_session, "TA", "Oncology")
    compound = await TestDataFactory.create_scope_node(db_session, "COMPOUND", "Test Compound", ta.id)
    study = await TestDataFactory.create_scope_node(db_session, "STUDY", "STUDY-001", compound.id)
    await db_session.commit()

    resp = await authenticated_client.post(
        "/api/v1/pipeline/milestones",
        json={"name": "Database Lock", "study_id": str(study.id), "level": "Study", "planned_date": "2024-12-31", "status": "Planned"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["code"] == "0000"
    assert data["data"]["name"] == "Database Lock"


@pytest.mark.asyncio
async def test_list_milestones(authenticated_client: AsyncClient, db_session: AsyncSession):
    """GET /pipeline/milestones returns milestones for a study."""
    ta = await TestDataFactory.create_scope_node(db_session, "TA", "Oncology")
    compound = await TestDataFactory.create_scope_node(db_session, "COMPOUND", "Test Compound", ta.id)
    study = await TestDataFactory.create_scope_node(db_session, "STUDY", "STUDY-001", compound.id)
    await TestDataFactory.create_milestone(db_session, study)
    await db_session.commit()

    resp = await authenticated_client.get(f"/api/v1/pipeline/milestones?study_id={study.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["code"] == "0000"
    assert len(data["data"]) == 1


@pytest.mark.asyncio
async def test_update_milestone(authenticated_client: AsyncClient, db_session: AsyncSession):
    """PUT /pipeline/milestones/{id} updates a milestone."""
    ta = await TestDataFactory.create_scope_node(db_session, "TA", "Oncology")
    compound = await TestDataFactory.create_scope_node(db_session, "COMPOUND", "Test Compound", ta.id)
    study = await TestDataFactory.create_scope_node(db_session, "STUDY", "STUDY-001", compound.id)
    ms = await TestDataFactory.create_milestone(db_session, study)
    await db_session.commit()

    resp = await authenticated_client.put(
        f"/api/v1/pipeline/milestones/{ms['id']}",
        json={"status": "Completed"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["data"]["status"] == "Completed"


@pytest.mark.asyncio
async def test_delete_milestone(authenticated_client: AsyncClient, db_session: AsyncSession):
    """DELETE /pipeline/milestones/{id} removes a milestone."""
    ta = await TestDataFactory.create_scope_node(db_session, "TA", "Oncology")
    compound = await TestDataFactory.create_scope_node(db_session, "COMPOUND", "Test Compound", ta.id)
    study = await TestDataFactory.create_scope_node(db_session, "STUDY", "STUDY-001", compound.id)
    ms = await TestDataFactory.create_milestone(db_session, study)
    await db_session.commit()

    resp = await authenticated_client.delete(f"/api/v1/pipeline/milestones/{ms['id']}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["code"] == "0000"


# ============================================================
# Archive Tests
# ============================================================

@pytest.mark.asyncio
async def test_archive_node(authenticated_client: AsyncClient, db_session: AsyncSession):
    """PUT /pipeline/nodes/{id}/archive archives a node."""
    ta = await TestDataFactory.create_scope_node(db_session, "TA", "Oncology")
    await db_session.commit()

    resp = await authenticated_client.put(
        f"/api/v1/pipeline/nodes/{ta.id}/archive",
        json={"status": "Archived"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["code"] == "0000"
    assert data["data"]["status"] == "Archived"


@pytest.mark.asyncio
async def test_unarchive_node(authenticated_client: AsyncClient, db_session: AsyncSession):
    """PUT /pipeline/nodes/{id}/archive unarchives a node."""
    ta = await TestDataFactory.create_scope_node(db_session, "TA", "Oncology")
    await db_session.commit()

    await authenticated_client.put(f"/api/v1/pipeline/nodes/{ta.id}/archive", json={"status": "Archived"})

    resp = await authenticated_client.put(
        f"/api/v1/pipeline/nodes/{ta.id}/archive",
        json={"status": "Active"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["data"]["status"] == "Active"
