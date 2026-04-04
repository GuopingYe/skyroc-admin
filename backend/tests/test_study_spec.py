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


@pytest.mark.asyncio
async def test_copy_spec_creates_new_spec_with_all_datasets(authenticated_client: AsyncClient, db_session):
    """POST /study-specs/copy creates a full clone of source spec under a new scope_node_id."""
    import uuid
    from app.models import ScopeNode, NodeType, LifecycleStatus
    from app.models.specification import Specification
    from app.models.target_dataset import TargetDataset
    from app.models.mapping_enums import SpecType, SpecStatus, OverrideType, DatasetClass, DataType, VariableCore, OriginType
    from app.models.target_variable import TargetVariable

    suffix = uuid.uuid4().hex[:8]

    # Set up source study + spec
    study_a = ScopeNode(node_type=NodeType.STUDY, name="Study-A", code=f"COPY-A-{suffix}",
                        lifecycle_status=LifecycleStatus.ONGOING, created_by="test")
    db_session.add(study_a)
    await db_session.flush()

    source_spec = Specification(
        scope_node_id=study_a.id, name="Study-A SDTM", spec_type=SpecType.SDTM,
        version="1.0", status=SpecStatus.DRAFT, created_by="test"
    )
    db_session.add(source_spec)
    await db_session.flush()

    ds = TargetDataset(
        specification_id=source_spec.id, dataset_name="AE",
        description="Adverse Events", class_type=DatasetClass.EVENTS,
        override_type=OverrideType.NONE, created_by="test"
    )
    db_session.add(ds)
    await db_session.flush()

    var = TargetVariable(
        dataset_id=ds.id,
        variable_name="AETERM",
        variable_label="Reported Term for the Adverse Event",
        data_type=DataType.CHAR,
        core=VariableCore.REQ,
        override_type=OverrideType.NONE,
        origin_type=OriginType.CDISC,
        created_by="test",
    )
    db_session.add(var)
    await db_session.flush()

    # Target study
    study_b = ScopeNode(node_type=NodeType.STUDY, name="Study-B", code=f"COPY-B-{suffix}",
                        lifecycle_status=LifecycleStatus.ONGOING, created_by="test")
    db_session.add(study_b)
    await db_session.flush()

    resp = await authenticated_client.post("/api/v1/study-specs/copy", json={
        "source_spec_id": source_spec.id,
        "target_scope_node_id": study_b.id,
        "name": "Study-B SDTM (copied)"
    })
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["dataset_count"] == 1
    assert data["variable_count"] == 1
    assert data["source_spec_id"] == source_spec.id


@pytest.mark.asyncio
async def test_initialize_spec_from_selected_datasets(authenticated_client: AsyncClient, db_session):
    """POST /study-specs/initialize creates a new spec with selected datasets cloned from sources."""
    import uuid
    from app.models import ScopeNode, NodeType, LifecycleStatus
    from app.models.specification import Specification
    from app.models.target_dataset import TargetDataset
    from app.models.mapping_enums import SpecType, SpecStatus, OverrideType, DatasetClass

    suffix = uuid.uuid4().hex[:8]

    # Source spec (e.g., CDISC or TA spec)
    source_node = ScopeNode(node_type=NodeType.TA, name="Oncology",
                            code=f"ONC-{suffix}",
                            lifecycle_status=LifecycleStatus.ONGOING, created_by="test")
    db_session.add(source_node)
    await db_session.flush()

    source_spec = Specification(scope_node_id=source_node.id, name="CDISC SDTM 3.4",
                                spec_type=SpecType.SDTM, version="3.4",
                                status=SpecStatus.ACTIVE, created_by="test")
    db_session.add(source_spec)
    await db_session.flush()

    ds_ae = TargetDataset(specification_id=source_spec.id, dataset_name="AE",
                          class_type=DatasetClass.EVENTS,
                          override_type=OverrideType.NONE, created_by="test")
    ds_dm = TargetDataset(specification_id=source_spec.id, dataset_name="DM",
                          class_type=DatasetClass.SPECIAL_PURPOSE,
                          override_type=OverrideType.NONE, created_by="test")
    db_session.add_all([ds_ae, ds_dm])
    await db_session.flush()

    # Target study
    study = ScopeNode(node_type=NodeType.STUDY, name="Study-Init",
                      code=f"STD-INIT-{suffix}",
                      lifecycle_status=LifecycleStatus.ONGOING, created_by="test")
    db_session.add(study)
    await db_session.flush()

    resp = await authenticated_client.post("/api/v1/study-specs/initialize", json={
        "scope_node_id": study.id,
        "spec_type": "SDTM",
        "name": "Study-Init SDTM",
        "selected_dataset_ids": [ds_ae.id, ds_dm.id]
    })
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["dataset_count"] == 2
