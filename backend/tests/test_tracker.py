"""Tests for Programming Tracker API endpoints."""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import TestDataFactory


# ============================================================
# Helpers
# ============================================================

async def _create_analysis_hierarchy(db_session: AsyncSession):
    """Create TA -> Compound -> Study -> Analysis hierarchy."""
    ta = await TestDataFactory.create_scope_node(db_session, "TA", "Oncology")
    compound = await TestDataFactory.create_scope_node(db_session, "COMPOUND", "Test Compound", ta.id)
    study = await TestDataFactory.create_scope_node(db_session, "STUDY", "STUDY-001", compound.id)
    analysis = await TestDataFactory.create_scope_node(db_session, "ANALYSIS", "Interim Analysis", study.id)
    await db_session.commit()
    return ta, compound, study, analysis


async def _create_task(authenticated_client: AsyncClient, analysis_id: int):
    """Create a tracker task and return the response."""
    return await authenticated_client.post(
        "/api/v1/mdr/tracker/task",
        json={
            "analysis_id": analysis_id,
            "deliverable_type": "SDTM",
            "deliverable_name": "dm",
            "task_name": "Create DM dataset",
            "priority": "High",
            "created_by": "testuser",
        }
    )


# ============================================================
# Task CRUD Tests
# ============================================================

@pytest.mark.asyncio
async def test_get_tasks_empty(authenticated_client: AsyncClient, db_session: AsyncSession):
    """GET /mdr/tracker/tasks returns empty list when no tasks exist."""
    _, _, _, analysis = await _create_analysis_hierarchy(db_session)

    resp = await authenticated_client.get(f"/api/v1/mdr/tracker/tasks?analysisId={analysis.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["code"] == "0000"
    assert data["data"]["total"] == 0


@pytest.mark.asyncio
async def test_create_task(authenticated_client: AsyncClient, db_session: AsyncSession):
    """POST /mdr/tracker/task creates a task."""
    _, _, _, analysis = await _create_analysis_hierarchy(db_session)

    resp = await _create_task(authenticated_client, analysis.id)
    assert resp.status_code == 201
    data = resp.json()
    assert data["code"] == "0000"
    assert "id" in data["data"]


@pytest.mark.asyncio
async def test_get_task(authenticated_client: AsyncClient, db_session: AsyncSession):
    """GET /mdr/tracker/task/{id} returns task detail."""
    _, _, _, analysis = await _create_analysis_hierarchy(db_session)
    create_resp = await _create_task(authenticated_client, analysis.id)
    task_id = create_resp.json()["data"]["id"]

    resp = await authenticated_client.get(f"/api/v1/mdr/tracker/task/{task_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["data"]["task_name"] == "Create DM dataset"


@pytest.mark.asyncio
async def test_update_task(authenticated_client: AsyncClient, db_session: AsyncSession):
    """PUT /mdr/tracker/task/{id} updates a task."""
    _, _, _, analysis = await _create_analysis_hierarchy(db_session)
    create_resp = await _create_task(authenticated_client, analysis.id)
    task_id = create_resp.json()["data"]["id"]

    resp = await authenticated_client.put(
        f"/api/v1/mdr/tracker/task/{task_id}",
        json={"task_name": "Updated Task Name", "updated_by": "testuser"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["data"]["success"] is True


@pytest.mark.asyncio
async def test_delete_task(authenticated_client: AsyncClient, db_session: AsyncSession):
    """DELETE /mdr/tracker/task/{id} soft-deletes a task."""
    _, _, _, analysis = await _create_analysis_hierarchy(db_session)
    create_resp = await _create_task(authenticated_client, analysis.id)
    task_id = create_resp.json()["data"]["id"]

    resp = await authenticated_client.delete(f"/api/v1/mdr/tracker/task/{task_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["data"]["success"] is True


# ============================================================
# Status Transition Tests
# ============================================================

@pytest.mark.asyncio
async def test_start_programming(authenticated_client: AsyncClient, db_session: AsyncSession):
    """POST /mdr/tracker/task/{id}/transition starts programming."""
    _, _, _, analysis = await _create_analysis_hierarchy(db_session)
    create_resp = await _create_task(authenticated_client, analysis.id)
    task_id = create_resp.json()["data"]["id"]

    resp = await authenticated_client.post(
        f"/api/v1/mdr/tracker/task/{task_id}/transition",
        json={"action": "start_programming", "user_id": "testuser"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["data"]["prod_status"] == "Programming"


@pytest.mark.asyncio
async def test_invalid_transition_rejected(authenticated_client: AsyncClient, db_session: AsyncSession):
    """POST /mdr/tracker/task/{id}/transition rejects invalid action."""
    _, _, _, analysis = await _create_analysis_hierarchy(db_session)
    create_resp = await _create_task(authenticated_client, analysis.id)
    task_id = create_resp.json()["data"]["id"]

    resp = await authenticated_client.post(
        f"/api/v1/mdr/tracker/task/{task_id}/transition",
        json={"action": "invalid_action", "user_id": "testuser"}
    )
    # App wraps errors in 200 with error code in body
    assert resp.status_code == 200
    assert resp.json()["code"] == "400"


# ============================================================
# QC Issue Tests
# ============================================================

@pytest.mark.asyncio
async def test_create_issue(authenticated_client: AsyncClient, db_session: AsyncSession):
    """POST /mdr/tracker/task/{id}/issues creates a QC issue."""
    _, _, _, analysis = await _create_analysis_hierarchy(db_session)
    create_resp = await _create_task(authenticated_client, analysis.id)
    task_id = create_resp.json()["data"]["id"]

    resp = await authenticated_client.post(
        f"/api/v1/mdr/tracker/task/{task_id}/issues",
        json={
            "qc_cycle": "Dry Run 1",
            "finding_description": "Variable label missing",
            "finding_category": "Structure",
            "severity": "Major",
            "raised_by": "qc_user",
        }
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["code"] == "0000"
    assert data["data"]["finding_description"] == "Variable label missing"


@pytest.mark.asyncio
async def test_respond_to_issue(authenticated_client: AsyncClient, db_session: AsyncSession):
    """PUT /mdr/tracker/issue/{id}/response responds to an issue."""
    _, _, _, analysis = await _create_analysis_hierarchy(db_session)
    create_resp = await _create_task(authenticated_client, analysis.id)
    task_id = create_resp.json()["data"]["id"]

    issue_resp = await authenticated_client.post(
        f"/api/v1/mdr/tracker/task/{task_id}/issues",
        json={
            "qc_cycle": "Dry Run 1",
            "finding_description": "Variable label missing",
            "finding_category": "Structure",
            "severity": "Major",
            "raised_by": "qc_user",
        }
    )
    issue_id = issue_resp.json()["data"]["id"]

    resp = await authenticated_client.put(
        f"/api/v1/mdr/tracker/issue/{issue_id}/response",
        json={"developer_response": "Fixed - added label", "responded_by": "testuser"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["data"]["developer_response"] == "Fixed - added label"


# ============================================================
# Issue List Tests
# ============================================================

@pytest.mark.asyncio
async def test_get_issues(authenticated_client: AsyncClient, db_session: AsyncSession):
    """GET /mdr/tracker/task/{id}/issues returns issue list."""
    _, _, _, analysis = await _create_analysis_hierarchy(db_session)
    create_resp = await _create_task(authenticated_client, analysis.id)
    task_id = create_resp.json()["data"]["id"]

    # Create an issue first
    await authenticated_client.post(
        f"/api/v1/mdr/tracker/task/{task_id}/issues",
        json={
            "qc_cycle": "Dry Run 1",
            "finding_description": "Missing variable",
            "finding_category": "Structure",
            "severity": "Major",
            "raised_by": "qc_user",
        }
    )

    resp = await authenticated_client.get(f"/api/v1/mdr/tracker/task/{task_id}/issues")
    assert resp.status_code == 200
    data = resp.json()
    assert data["code"] == "0000"
    assert data["data"]["total"] >= 1


# ============================================================
# Full Lifecycle Tests
# ============================================================

@pytest.mark.asyncio
async def test_task_full_lifecycle(authenticated_client: AsyncClient, db_session: AsyncSession):
    """Tracker: create → start → submit_qc → start_qc → pass_qc → sign_off."""
    _, _, _, analysis = await _create_analysis_hierarchy(db_session)
    create_resp = await _create_task(authenticated_client, analysis.id)
    task_id = create_resp.json()["data"]["id"]

    # Start programming
    r = await authenticated_client.post(
        f"/api/v1/mdr/tracker/task/{task_id}/transition",
        json={"action": "start_programming", "user_id": "dev1"}
    )
    assert r.json()["data"]["prod_status"] == "Programming"

    # Submit for QC
    r = await authenticated_client.post(
        f"/api/v1/mdr/tracker/task/{task_id}/transition",
        json={"action": "submit_for_qc", "user_id": "dev1"}
    )
    assert r.json()["data"]["prod_status"] == "Ready_for_QC"

    # Start QC
    r = await authenticated_client.post(
        f"/api/v1/mdr/tracker/task/{task_id}/transition",
        json={"action": "start_qc", "user_id": "qc1"}
    )
    assert r.json()["data"]["qc_status"] == "In_Progress"

    # Pass QC
    r = await authenticated_client.post(
        f"/api/v1/mdr/tracker/task/{task_id}/transition",
        json={"action": "pass_qc", "user_id": "qc1"}
    )
    assert r.json()["data"]["qc_status"] == "Passed"

    # Sign off
    r = await authenticated_client.post(
        f"/api/v1/mdr/tracker/task/{task_id}/transition",
        json={"action": "sign_off", "user_id": "pm1"}
    )
    assert r.json()["data"]["status"] == "Signed_Off"
