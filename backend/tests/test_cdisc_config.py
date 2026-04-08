"""Tests for CDISC Config & Sync Control API endpoints."""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


# ============================================================
# Config Endpoints (router prefix /admin in cdisc_config.py)
# ============================================================

@pytest.mark.asyncio
async def test_get_cdisc_config(admin_authenticated_client: AsyncClient):
    """GET /admin/cdisc-config returns current config."""
    resp = await admin_authenticated_client.get("/api/v1/admin/cdisc-config")
    assert resp.status_code == 200
    data = resp.json()
    assert "api_base_url" in data
    assert "sync_enabled" in data


@pytest.mark.asyncio
async def test_update_cdisc_config(admin_authenticated_client: AsyncClient):
    """PUT /admin/cdisc-config updates config."""
    resp = await admin_authenticated_client.put(
        "/api/v1/admin/cdisc-config",
        json={"api_base_url": "https://library.cdisc.org/api", "sync_enabled": False}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "api_base_url" in data


@pytest.mark.asyncio
async def test_test_connection(admin_authenticated_client: AsyncClient):
    """POST /admin/cdisc-config/test-connection tests API connectivity."""
    resp = await admin_authenticated_client.post("/api/v1/admin/cdisc-config/test-connection")
    assert resp.status_code == 200
    data = resp.json()
    # Without a real API key, expect error status
    assert "status" in data


# ============================================================
# Sync Endpoints (router prefix /admin in admin_sync.py)
# ============================================================

@pytest.mark.asyncio
async def test_get_sync_status(admin_authenticated_client: AsyncClient):
    """GET /admin/sync/cdisc/status returns sync status."""
    resp = await admin_authenticated_client.get("/api/v1/admin/sync/cdisc/status")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_trigger_sync(admin_authenticated_client: AsyncClient):
    """POST /admin/sync/cdisc starts a sync job (uses query params, not JSON body)."""
    resp = await admin_authenticated_client.post(
        "/api/v1/admin/sync/cdisc?standard_type=sdtm&version=latest"
    )
    # May succeed or fail depending on external API availability
    assert resp.status_code in (200, 201)


@pytest.mark.asyncio
async def test_get_available_standards(admin_authenticated_client: AsyncClient):
    """GET /admin/sync/cdisc/available returns standards list."""
    resp = await admin_authenticated_client.get("/api/v1/admin/sync/cdisc/available")
    assert resp.status_code == 200
