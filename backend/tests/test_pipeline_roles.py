"""Tests for Pipeline Role Assignment endpoints."""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import TestDataFactory


# ============================================================
# User Search
# ============================================================

@pytest.mark.asyncio
async def test_search_users_empty(authenticated_client: AsyncClient):
    """GET /pipeline/users/search returns empty when no users match."""
    resp = await authenticated_client.get(
        "/api/v1/pipeline/users/search",
        params={"q": "nonexistent"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["code"] == "0000"
    assert data["data"] == []


@pytest.mark.asyncio
async def test_search_users_by_username(
    authenticated_client: AsyncClient,
    db_session: AsyncSession,
    test_user,
):
    """GET /pipeline/users/search finds user by username."""
    resp = await authenticated_client.get(
        "/api/v1/pipeline/users/search",
        params={"q": "testuser"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["code"] == "0000"
    assert len(data["data"]) >= 1
    assert data["data"][0]["username"] == "testuser"


@pytest.mark.asyncio
async def test_search_users_min_length(authenticated_client: AsyncClient):
    """GET /pipeline/users/search returns 422 when q is too short."""
    resp = await authenticated_client.get(
        "/api/v1/pipeline/users/search",
        params={"q": "a"},
    )
    assert resp.status_code == 422


# ============================================================
# Batch Role Assignment
# ============================================================

@pytest.mark.asyncio
async def test_assign_role_to_node(
    authenticated_client: AsyncClient,
    db_session: AsyncSession,
    test_user,
):
    """POST /pipeline/nodes/{id}/roles assigns a role."""
    ta = await TestDataFactory.create_scope_node(db_session, "TA", "Oncology")
    role = await TestDataFactory.create_role(db_session, "TA_HEAD", "TA Head")
    await db_session.commit()

    resp = await authenticated_client.post(
        f"/api/v1/pipeline/nodes/{ta.id}/roles",
        json={"assignments": [
            {"role_code": "TA_HEAD", "user_id": test_user.id, "action": "assign"},
        ]},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["code"] == "0000"
    assert data["data"]["applied"] == 1


@pytest.mark.asyncio
async def test_assign_role_tree_includes_roles(
    authenticated_client: AsyncClient,
    db_session: AsyncSession,
    test_user,
):
    """GET /pipeline/tree includes assigned_roles in node data."""
    ta = await TestDataFactory.create_scope_node(db_session, "TA", "Oncology")
    role = await TestDataFactory.create_role(db_session, "TA_HEAD", "TA Head")
    await db_session.commit()

    # Assign role
    await authenticated_client.post(
        f"/api/v1/pipeline/nodes/{ta.id}/roles",
        json={"assignments": [
            {"role_code": "TA_HEAD", "user_id": test_user.id, "action": "assign"},
        ]},
    )

    # Check tree
    resp = await authenticated_client.get("/api/v1/pipeline/tree")
    data = resp.json()
    assert data["code"] == "0000"
    ta_node = next(n for n in data["data"] if n["id"] == str(ta.id))
    assert "assigned_roles" in ta_node
    assert "TA_HEAD" in ta_node["assigned_roles"]
    assert ta_node["assigned_roles"]["TA_HEAD"][0]["user_id"] == test_user.id


@pytest.mark.asyncio
async def test_revoke_role_from_node(
    authenticated_client: AsyncClient,
    db_session: AsyncSession,
    test_user,
):
    """POST /pipeline/nodes/{id}/roles revokes a role (soft delete)."""
    ta = await TestDataFactory.create_scope_node(db_session, "TA", "Oncology")
    role = await TestDataFactory.create_role(db_session, "TA_HEAD", "TA Head")
    await db_session.commit()

    # Assign first
    await authenticated_client.post(
        f"/api/v1/pipeline/nodes/{ta.id}/roles",
        json={"assignments": [
            {"role_code": "TA_HEAD", "user_id": test_user.id, "action": "assign"},
        ]},
    )

    # Revoke
    resp = await authenticated_client.post(
        f"/api/v1/pipeline/nodes/{ta.id}/roles",
        json={"assignments": [
            {"role_code": "TA_HEAD", "user_id": test_user.id, "action": "revoke"},
        ]},
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["applied"] == 1

    # Verify tree no longer shows the role
    tree_resp = await authenticated_client.get("/api/v1/pipeline/tree")
    ta_node = next(n for n in tree_resp.json()["data"] if n["id"] == str(ta.id))
    assert "TA_HEAD" not in ta_node["assigned_roles"] or len(ta_node["assigned_roles"]["TA_HEAD"]) == 0


@pytest.mark.asyncio
async def test_assign_invalid_role_code(
    authenticated_client: AsyncClient,
    db_session: AsyncSession,
    test_user,
):
    """POST /pipeline/nodes/{id}/roles returns 400 for invalid role code."""
    ta = await TestDataFactory.create_scope_node(db_session, "TA", "Oncology")
    await db_session.commit()

    resp = await authenticated_client.post(
        f"/api/v1/pipeline/nodes/{ta.id}/roles",
        json={"assignments": [
            {"role_code": "NONEXISTENT_ROLE", "user_id": test_user.id, "action": "assign"},
        ]},
    )
    body = resp.json()
    # Global exception handler wraps HTTPException(400) as 200 with code='400'
    assert resp.status_code == 200
    assert body["code"] == "400"
    assert "NONEXISTENT_ROLE" in body["msg"]
