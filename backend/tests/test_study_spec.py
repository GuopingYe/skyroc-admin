"""Tests for study spec creation via pipeline and new study_spec endpoints."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_study_node_with_spec_build_flag(authenticated_client: AsyncClient):
    """POST /pipeline/nodes with create_spec=True and method=build returns spec_status=pending_setup."""
    # First create a TA
    ta_resp = await authenticated_client.post("/api/v1/pipeline/therapeutic-areas", json={
        "name": "Oncology", "code": "ONC", "description": ""
    })
    assert ta_resp.status_code == 200
    ta_id = ta_resp.json()["data"]["id"]

    # Create compound under TA
    compound_resp = await authenticated_client.post("/api/v1/pipeline/nodes", json={
        "title": "Compound-A", "node_type": "COMPOUND", "parent_id": str(ta_id)
    })
    assert compound_resp.status_code == 200
    compound_id = compound_resp.json()["data"]["id"]

    # Create study with spec build flag
    resp = await authenticated_client.post("/api/v1/pipeline/nodes", json={
        "title": "Study-001",
        "node_type": "STUDY",
        "parent_id": str(compound_id),
        "create_spec": True,
        "spec_init_method": "build",
    })
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["spec_status"] == "pending_setup"


@pytest.mark.asyncio
async def test_get_study_spec_sources_returns_structure(authenticated_client: AsyncClient, db_session):
    """GET /study-specs/sources returns cdisc_domains, ta_domains, product_domains."""
    from app.models import ScopeNode, NodeType, LifecycleStatus
    from app.models.specification import Specification
    from app.models.mapping_enums import SpecType, SpecStatus

    import uuid
    suffix = uuid.uuid4().hex[:8]

    # Create scope node hierarchy: TA -> Compound -> Study
    ta = ScopeNode(node_type=NodeType.TA, name="Oncology", code=f"TA-SRC-{suffix}",
                   lifecycle_status=LifecycleStatus.ONGOING, created_by="test")
    db_session.add(ta)
    await db_session.flush()

    compound = ScopeNode(node_type=NodeType.COMPOUND, name="Compound-A", code=f"CMP-SRC-{suffix}",
                         lifecycle_status=LifecycleStatus.ONGOING, parent_id=ta.id, created_by="test")
    db_session.add(compound)
    await db_session.flush()

    study = ScopeNode(node_type=NodeType.STUDY, name="Study-001", code=f"STD-SRC-{suffix}",
                      lifecycle_status=LifecycleStatus.ONGOING, parent_id=compound.id, created_by="test")
    db_session.add(study)
    await db_session.flush()

    resp = await authenticated_client.get(f"/api/v1/study-specs/sources?scope_node_id={study.id}")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert "cdisc_domains" in data
    assert "ta_domains" in data
    assert "product_domains" in data
    assert isinstance(data["cdisc_domains"], list)
