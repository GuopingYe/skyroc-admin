"""Tests for Pull Request API endpoints."""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import TestDataFactory


# ============================================================
# Helpers
# ============================================================

async def _create_pr_hierarchy(db_session: AsyncSession):
    """Create a Global -> TA hierarchy for PR tests.

    PRs flow from lower (deeper) to higher scopes, so we need:
    - source: TA node (deeper, depth=1 under Global)
    - target: GLOBAL node (shallower, depth=0)
    """
    global_node = await TestDataFactory.create_scope_node(db_session, "GLOBAL", "Global Library")
    ta = await TestDataFactory.create_scope_node(db_session, "TA", "Oncology", global_node.id)
    await db_session.commit()
    return ta, global_node


async def _create_pr(authenticated_client: AsyncClient, ta_id: int, global_id: int):
    """Create a PR and return the response."""
    return await authenticated_client.post(
        "/api/v1/pull-requests",
        json={
            "title": "Update DM mapping",
            "description": "Updated variable mappings for DM",
            "requester_id": "testuser",
            "source_scope_id": ta_id,
            "target_scope_id": global_id,
            "item_type": "Mapping",
            "item_id": 1,
            "diff_snapshot": {"changes": []},
        }
    )


# ============================================================
# PR Creation Tests
# ============================================================

@pytest.mark.asyncio
async def test_create_pr(authenticated_client: AsyncClient, db_session: AsyncSession):
    """POST /pull-requests creates a pull request."""
    ta, global_node = await _create_pr_hierarchy(db_session)

    resp = await _create_pr(authenticated_client, ta.id, global_node.id)
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Update DM mapping"
    assert data["status"] == "Pending"


@pytest.mark.asyncio
async def test_create_pr_invalid_direction(authenticated_client: AsyncClient, db_session: AsyncSession):
    """POST /pull-requests rejects when target depth <= source depth (wrong direction)."""
    global_node = await TestDataFactory.create_scope_node(db_session, "GLOBAL", "Global Library")
    # Create two children under global — both at same depth
    ta1 = await TestDataFactory.create_scope_node(db_session, "TA", "Oncology", global_node.id)
    ta2 = await TestDataFactory.create_scope_node(db_session, "TA", "Cardiology", global_node.id)
    await db_session.commit()

    # Trying to PR from ta1 to ta2 — same depth, should be rejected
    resp = await authenticated_client.post(
        "/api/v1/pull-requests",
        json={
            "title": "Invalid PR",
            "description": "This should fail",
            "requester_id": "testuser",
            "source_scope_id": ta1.id,
            "target_scope_id": ta2.id,
            "item_type": "Mapping",
            "item_id": 1,
            "diff_snapshot": {"changes": []},
        }
    )
    # App wraps errors in 200 with error code in body
    assert resp.status_code == 200
    assert resp.json()["code"] == "400"
# ============================================================

@pytest.mark.asyncio
async def test_get_pr_list(authenticated_client: AsyncClient, db_session: AsyncSession):
    """GET /pull-requests returns PR list."""
    ta, global_node = await _create_pr_hierarchy(db_session)

    await _create_pr(authenticated_client, ta.id, global_node.id)

    resp = await authenticated_client.get("/api/v1/pull-requests")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_get_pr_detail(authenticated_client: AsyncClient, db_session: AsyncSession):
    """GET /pull-requests/{id} returns PR detail."""
    ta, global_node = await _create_pr_hierarchy(db_session)

    create_resp = await _create_pr(authenticated_client, ta.id, global_node.id)
    pr_id = create_resp.json()["id"]

    resp = await authenticated_client.get(f"/api/v1/pull-requests/{pr_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "Update DM mapping"


# ============================================================
# PR Approval/Rejection Tests
# ============================================================

@pytest.mark.asyncio
async def test_approve_pr(authenticated_client: AsyncClient, db_session: AsyncSession):
    """PUT /pull-requests/{id}/merge approves a PR."""
    ta, global_node = await _create_pr_hierarchy(db_session)

    create_resp = await _create_pr(authenticated_client, ta.id, global_node.id)
    pr_id = create_resp.json()["id"]

    resp = await authenticated_client.put(
        f"/api/v1/pull-requests/{pr_id}/merge",
        json={"action": "approve", "reviewer_id": "admin", "review_comment": "Looks good"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["action"] == "approve"
    assert data["new_status"] == "Approved"


@pytest.mark.asyncio
async def test_reject_pr_requires_comment(authenticated_client: AsyncClient, db_session: AsyncSession):
    """PUT /pull-requests/{id}/merge rejects without comment returns 400."""
    ta, global_node = await _create_pr_hierarchy(db_session)

    create_resp = await _create_pr(authenticated_client, ta.id, global_node.id)
    pr_id = create_resp.json()["id"]

    resp = await authenticated_client.put(
        f"/api/v1/pull-requests/{pr_id}/merge",
        json={"action": "reject", "reviewer_id": "admin"}
    )
    # App wraps errors in 200 with error code in body
    assert resp.status_code == 200
    assert resp.json()["code"] == "400"
