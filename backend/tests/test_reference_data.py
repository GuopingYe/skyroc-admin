"""Tests for Reference Data CRUD endpoints and model."""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ReferenceData, ReferenceDataCategory


# ============================================================
# Model Tests
# ============================================================


@pytest.mark.asyncio
async def test_model_creation(db_session: AsyncSession):
    """ReferenceData can be created with all required fields."""
    item = ReferenceData(
        category=ReferenceDataCategory.POPULATION.value,
        code="ITT",
        label="Intent-to-Treat",
    )
    db_session.add(item)
    await db_session.flush()
    await db_session.refresh(item)

    assert item.id is not None
    assert item.category == ReferenceDataCategory.POPULATION.value
    assert item.code == "ITT"
    assert item.label == "Intent-to-Treat"
    assert item.is_active is True
    assert item.is_deleted is False
    assert item.sort_order == 0


@pytest.mark.asyncio
async def test_model_soft_delete(db_session: AsyncSession):
    """ReferenceData supports soft delete via SoftDeleteMixin."""
    item = ReferenceData(
        category=ReferenceDataCategory.POPULATION.value,
        code="Safety",
        label="Safety Population",
    )
    db_session.add(item)
    await db_session.flush()
    await db_session.refresh(item)

    item.soft_delete(deleted_by="testuser")
    await db_session.flush()
    await db_session.refresh(item)

    assert item.is_deleted is True
    assert item.deleted_by == "testuser"
    assert item.deleted_at is not None


# ============================================================
# Endpoint Tests
# ============================================================


async def _seed_items(db_session: AsyncSession):
    """Seed test items."""
    items = [
        ReferenceData(category="POPULATION", code="Safety", label="Safety", sort_order=1),
        ReferenceData(category="POPULATION", code="ITT", label="Intent-to-Treat", sort_order=2),
        ReferenceData(category="SDTM_DOMAIN", code="DM", label="Demographics", sort_order=1),
    ]
    db_session.add_all(items)
    await db_session.flush()


@pytest.mark.asyncio
async def test_list_categories(authenticated_client: AsyncClient, db_session: AsyncSession):
    """GET /reference-data returns category summaries."""
    await _seed_items(db_session)
    resp = await authenticated_client.get("/api/v1/reference-data")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    categories = {item["category"]: item for item in data}
    assert "POPULATION" in categories
    assert categories["POPULATION"]["count"] == 2
    assert categories["POPULATION"]["active_count"] == 2


@pytest.mark.asyncio
async def test_list_items(authenticated_client: AsyncClient, db_session: AsyncSession):
    """GET /reference-data/POPULATION returns items in category."""
    await _seed_items(db_session)
    resp = await authenticated_client.get("/api/v1/reference-data/POPULATION")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 2
    codes = {item["code"] for item in data["items"]}
    assert codes == {"Safety", "ITT"}


@pytest.mark.asyncio
async def test_get_item_by_code(authenticated_client: AsyncClient, db_session: AsyncSession):
    """GET /reference-data/POPULATION/Safety returns single item."""
    await _seed_items(db_session)
    resp = await authenticated_client.get("/api/v1/reference-data/POPULATION/Safety")
    assert resp.status_code == 200
    data = resp.json()
    assert data["code"] == "Safety"
    assert data["label"] == "Safety"
    assert data["category"] == "POPULATION"


@pytest.mark.asyncio
async def test_get_item_not_found(authenticated_client: AsyncClient, db_session: AsyncSession):
    """GET /reference-data/POPULATION/MISSING returns 404 (wrapped as 200 with error code)."""
    resp = await authenticated_client.get("/api/v1/reference-data/POPULATION/MISSING")
    # Custom exception handler wraps errors as HTTP 200 with {code, msg, data}
    assert resp.status_code == 200
    body = resp.json()
    assert body["code"] == "4040"
    assert body["data"] is None


@pytest.mark.asyncio
async def test_create_item(admin_authenticated_client: AsyncClient, db_session: AsyncSession):
    """POST /reference-data/POPULATION creates item (superuser only)."""
    resp = await admin_authenticated_client.post(
        "/api/v1/reference-data/POPULATION",
        json={"code": "FAS", "label": "Full Analysis Set", "sort_order": 3},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["code"] == "FAS"
    assert data["label"] == "Full Analysis Set"


@pytest.mark.asyncio
async def test_create_item_non_superuser(authenticated_client: AsyncClient, db_session: AsyncSession):
    """POST /reference-data/POPULATION by non-superuser returns 403 (wrapped)."""
    resp = await authenticated_client.post(
        "/api/v1/reference-data/POPULATION",
        json={"code": "FAS", "label": "Full Analysis Set"},
    )
    # Custom exception handler wraps 403 as HTTP 200 with code "8888"
    assert resp.status_code == 200
    body = resp.json()
    assert body["code"] == "8888"
    assert body["data"] is None


@pytest.mark.asyncio
async def test_create_duplicate_code(admin_authenticated_client: AsyncClient, db_session: AsyncSession):
    """POST with duplicate code in same category returns 409 (wrapped)."""
    await _seed_items(db_session)
    resp = await admin_authenticated_client.post(
        "/api/v1/reference-data/POPULATION",
        json={"code": "Safety", "label": "Safety Duplicate"},
    )
    # Custom exception handler wraps 409 as HTTP 200 with code "409"
    assert resp.status_code == 200
    body = resp.json()
    assert body["code"] == "409"
    assert body["data"] is None


@pytest.mark.asyncio
async def test_update_item(admin_authenticated_client: AsyncClient, db_session: AsyncSession):
    """PUT /reference-data/POPULATION/Safety updates item."""
    await _seed_items(db_session)
    resp = await admin_authenticated_client.put(
        "/api/v1/reference-data/POPULATION/Safety",
        json={"label": "Safety Population", "sort_order": 10},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["label"] == "Safety Population"
    assert data["sort_order"] == 10


@pytest.mark.asyncio
async def test_deactivate_item(admin_authenticated_client: AsyncClient, db_session: AsyncSession):
    """POST /reference-data/POPULATION/Safety/deactivate soft-deletes item."""
    await _seed_items(db_session)
    resp = await admin_authenticated_client.post("/api/v1/reference-data/POPULATION/Safety/deactivate")
    assert resp.status_code == 200

    # Verify item is soft-deleted (GET returns 404 wrapped as 200)
    resp2 = await admin_authenticated_client.get("/api/v1/reference-data/POPULATION/Safety")
    assert resp2.status_code == 200
    body = resp2.json()
    assert body["code"] == "4040"

    # Verify list still shows remaining items
    resp3 = await admin_authenticated_client.get("/api/v1/reference-data/POPULATION")
    assert resp3.status_code == 200
    assert resp3.json()["total"] == 1


@pytest.mark.asyncio
async def test_restore_item(admin_authenticated_client: AsyncClient, db_session: AsyncSession):
    """POST /reference-data/POPULATION/Safety/restore restores soft-deleted item."""
    await _seed_items(db_session)
    await admin_authenticated_client.post("/api/v1/reference-data/POPULATION/Safety/deactivate")
    resp = await admin_authenticated_client.post("/api/v1/reference-data/POPULATION/Safety/restore")
    assert resp.status_code == 200

    resp2 = await admin_authenticated_client.get("/api/v1/reference-data/POPULATION/Safety")
    assert resp2.status_code == 200
    assert resp2.json()["is_deleted"] is False


@pytest.mark.asyncio
async def test_list_deleted_items(admin_authenticated_client: AsyncClient, db_session: AsyncSession):
    """GET with is_deleted=true returns soft-deleted items."""
    await _seed_items(db_session)
    await admin_authenticated_client.post("/api/v1/reference-data/POPULATION/Safety/deactivate")

    resp = await admin_authenticated_client.get("/api/v1/reference-data/POPULATION?is_deleted=true")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["code"] == "Safety"
    assert data["items"][0]["is_deleted"] is True
