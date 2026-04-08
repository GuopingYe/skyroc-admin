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
async def test_toggle_dataset_sets_override_type(authenticated_client: AsyncClient, db_session):
    """PUT /study-specs/{id}/datasets/{ds_id}/toggle flips override_type between NONE and DELETED."""
    import uuid
    from app.models.specification import Specification
    from app.models.target_dataset import TargetDataset
    from app.models import ScopeNode, NodeType, LifecycleStatus
    from app.models.mapping_enums import SpecType, SpecStatus, OverrideType, DatasetClass

    suffix = uuid.uuid4().hex[:8]

    study = ScopeNode(node_type=NodeType.STUDY, name="Study-T",
                      code=f"TOGGLE-{suffix}",
                      lifecycle_status=LifecycleStatus.ONGOING, created_by="test")
    db_session.add(study)
    await db_session.flush()

    spec = Specification(scope_node_id=study.id, name="Study-T SDTM",
                         spec_type=SpecType.SDTM, version="1.0",
                         status=SpecStatus.DRAFT, created_by="test")
    db_session.add(spec)
    await db_session.flush()

    ds = TargetDataset(specification_id=spec.id, dataset_name="VS",
                       class_type=DatasetClass.FINDINGS,
                       override_type=OverrideType.NONE, created_by="test")
    db_session.add(ds)
    await db_session.flush()

    # Toggle off (exclude)
    resp = await authenticated_client.put(
        f"/api/v1/study-specs/{spec.id}/datasets/{ds.id}/toggle",
        json={"exclude": True}
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["override_type"] == "Deleted"

    # Toggle on (include)
    resp2 = await authenticated_client.put(
        f"/api/v1/study-specs/{spec.id}/datasets/{ds.id}/toggle",
        json={"exclude": False}
    )
    assert resp2.status_code == 200
    assert resp2.json()["data"]["override_type"] == "None"


@pytest.mark.asyncio
async def test_push_upstream_returns_diff_summary(authenticated_client: AsyncClient, db_session):
    """POST /study-specs/{id}/push-upstream returns a diff of local overrides vs parent."""
    import uuid
    from app.models.specification import Specification
    from app.models.target_dataset import TargetDataset
    from app.models import ScopeNode, NodeType, LifecycleStatus
    from app.models.mapping_enums import SpecType, SpecStatus, OverrideType, DatasetClass

    suffix = uuid.uuid4().hex[:8]

    study = ScopeNode(node_type=NodeType.STUDY, name="Study-Push",
                      code=f"PUSH-STD-{suffix}",
                      lifecycle_status=LifecycleStatus.ONGOING,
                      created_by="test")
    db_session.add(study)
    await db_session.flush()

    parent_spec = Specification(scope_node_id=study.id, name="Parent SDTM",
                                spec_type=SpecType.SDTM, version="1.0",
                                status=SpecStatus.ACTIVE, created_by="test")
    db_session.add(parent_spec)
    await db_session.flush()

    analysis = ScopeNode(node_type=NodeType.ANALYSIS, name="ANA-001",
                         code=f"PUSH-ANA-{suffix}",
                         lifecycle_status=LifecycleStatus.ONGOING,
                         parent_id=study.id, created_by="test")
    db_session.add(analysis)
    await db_session.flush()

    child_spec = Specification(scope_node_id=analysis.id, name="ANA-001 SDTM",
                               spec_type=SpecType.SDTM, version="1.0",
                               status=SpecStatus.DRAFT,
                               base_specification_id=parent_spec.id, created_by="test")
    db_session.add(child_spec)
    await db_session.flush()

    # A dataset added at analysis level (ADDED = new, not in parent)
    new_ds = TargetDataset(specification_id=child_spec.id, dataset_name="CUSTOM",
                           class_type=DatasetClass.EVENTS,
                           override_type=OverrideType.ADDED, created_by="test")
    db_session.add(new_ds)
    await db_session.flush()

    resp = await authenticated_client.post(f"/api/v1/study-specs/{child_spec.id}/push-upstream")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["parent_spec_id"] == parent_spec.id
    assert data["added_datasets"] == ["CUSTOM"]
    assert data["status"] == "diff_computed"


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


@pytest.mark.asyncio
async def test_create_analysis_auto_inherits_study_specs(authenticated_client: AsyncClient, db_session):
    """Creating an ANALYSIS node auto-creates inherited Specification records for each study spec."""
    from app.models import ScopeNode, NodeType, LifecycleStatus
    from app.models.specification import Specification
    from app.models.mapping_enums import SpecType, SpecStatus
    from sqlalchemy import select
    import uuid

    study = ScopeNode(node_type=NodeType.STUDY, name="Study-Inherit",
                      code=f"SINHT-{uuid.uuid4().hex[:6]}",
                      lifecycle_status=LifecycleStatus.ONGOING, created_by="test")
    db_session.add(study)
    await db_session.flush()

    # Study has two specs: SDTM + ADaM
    for stype in (SpecType.SDTM, SpecType.ADAM):
        spec = Specification(scope_node_id=study.id,
                             name=f"Study {stype.value}",
                             spec_type=stype, version="1.0",
                             status=SpecStatus.ACTIVE, created_by="test")
        db_session.add(spec)
    await db_session.flush()

    resp = await authenticated_client.post("/api/v1/pipeline/nodes", json={
        "title": "ANA-001", "node_type": "ANALYSIS",
        "parent_id": str(study.id),
    })
    assert resp.status_code == 200
    analysis_id = resp.json()["data"]["id"]

    # Verify two inherited specs were created for analysis
    inherited_q = select(Specification).where(
        Specification.scope_node_id == analysis_id,
        Specification.is_deleted == False,  # noqa: E712
    )
    inh_res = await db_session.execute(inherited_q)
    inherited = inh_res.scalars().all()
    assert len(inherited) == 2
    assert all(s.base_specification_id is not None for s in inherited)


@pytest.mark.asyncio
async def test_patch_dataset_updates_extended_info(authenticated_client, db_session):
    """PATCH /study-specs/{spec_id}/datasets/{dataset_id} updates standard_metadata fields."""
    import uuid
    from app.models import ScopeNode, NodeType, LifecycleStatus
    from app.models.specification import Specification
    from app.models.target_dataset import TargetDataset
    from app.models.mapping_enums import SpecType, SpecStatus, DatasetClass, OverrideType

    suffix = uuid.uuid4().hex[:8]
    ta = ScopeNode(node_type=NodeType.TA, name="TA-Patch", code=f"TA-P-{suffix}",
                   lifecycle_status=LifecycleStatus.ONGOING, created_by="test")
    db_session.add(ta); await db_session.flush()
    compound = ScopeNode(node_type=NodeType.COMPOUND, name="CMP-P", code=f"CMP-P-{suffix}",
                         lifecycle_status=LifecycleStatus.ONGOING, parent_id=ta.id, created_by="test")
    db_session.add(compound); await db_session.flush()
    study = ScopeNode(node_type=NodeType.STUDY, name="STD-P", code=f"STD-P-{suffix}",
                      lifecycle_status=LifecycleStatus.ONGOING, parent_id=compound.id, created_by="test")
    db_session.add(study); await db_session.flush()
    spec = Specification(scope_node_id=study.id, name=f"SDTM-P-{suffix}", spec_type=SpecType.SDTM,
                         status=SpecStatus.DRAFT, version="1.0", created_by="test")
    db_session.add(spec); await db_session.flush()
    ds = TargetDataset(specification_id=spec.id, dataset_name="AE", class_type=DatasetClass.EVENTS,
                       override_type=OverrideType.ADDED, created_by="test")
    db_session.add(ds); await db_session.flush()

    resp = await authenticated_client.patch(
        f"/api/v1/study-specs/{spec.id}/datasets/{ds.id}",
        json={
            "structure": "One record per subject per adverse event",
            "key_variables": ["STUDYID", "USUBJID", "AESEQ"],
            "sort_variables": ["USUBJID", "AESTDTC"],
            "comments": "Primary safety dataset",
        }
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["standard_metadata"]["structure"] == "One record per subject per adverse event"
    assert data["standard_metadata"]["key_variables"] == ["STUDYID", "USUBJID", "AESEQ"]
    assert data["extra_attrs"]["comments"] == "Primary safety dataset"


@pytest.mark.asyncio
async def test_patch_dataset_custom_allows_name_change(authenticated_client, db_session):
    """PATCH allows domain_name change for custom (base_id=None) datasets."""
    import uuid
    from app.models import ScopeNode, NodeType, LifecycleStatus
    from app.models.specification import Specification
    from app.models.target_dataset import TargetDataset
    from app.models.mapping_enums import SpecType, SpecStatus, DatasetClass, OverrideType

    suffix = uuid.uuid4().hex[:8]
    ta = ScopeNode(node_type=NodeType.TA, name="TA-Name", code=f"TA-N-{suffix}",
                   lifecycle_status=LifecycleStatus.ONGOING, created_by="test")
    db_session.add(ta); await db_session.flush()
    compound = ScopeNode(node_type=NodeType.COMPOUND, name="CMP-N", code=f"CMP-N-{suffix}",
                         lifecycle_status=LifecycleStatus.ONGOING, parent_id=ta.id, created_by="test")
    db_session.add(compound); await db_session.flush()
    study = ScopeNode(node_type=NodeType.STUDY, name="STD-N", code=f"STD-N-{suffix}",
                      lifecycle_status=LifecycleStatus.ONGOING, parent_id=compound.id, created_by="test")
    db_session.add(study); await db_session.flush()
    spec = Specification(scope_node_id=study.id, name=f"SDTM-N-{suffix}", spec_type=SpecType.SDTM,
                         status=SpecStatus.DRAFT, version="1.0", created_by="test")
    db_session.add(spec); await db_session.flush()
    ds = TargetDataset(specification_id=spec.id, dataset_name="MYDOM", class_type=DatasetClass.EVENTS,
                       override_type=OverrideType.ADDED, base_id=None, created_by="test")
    db_session.add(ds); await db_session.flush()

    resp = await authenticated_client.patch(
        f"/api/v1/study-specs/{spec.id}/datasets/{ds.id}",
        json={"domain_name": "NEWDOM", "domain_label": "New Domain Label"}
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["dataset_name"] == "NEWDOM"


@pytest.mark.asyncio
async def test_patch_dataset_global_library_rejects_name_change(authenticated_client, db_session):
    """PATCH rejects domain_name change for global-library (base_id set) datasets."""
    import uuid
    from app.models import ScopeNode, NodeType, LifecycleStatus
    from app.models.specification import Specification
    from app.models.target_dataset import TargetDataset
    from app.models.mapping_enums import SpecType, SpecStatus, DatasetClass, OverrideType

    suffix = uuid.uuid4().hex[:8]
    ta = ScopeNode(node_type=NodeType.TA, name="TA-GL", code=f"TA-GL-{suffix}",
                   lifecycle_status=LifecycleStatus.ONGOING, created_by="test")
    db_session.add(ta); await db_session.flush()
    compound = ScopeNode(node_type=NodeType.COMPOUND, name="CMP-GL", code=f"CMP-GL-{suffix}",
                         lifecycle_status=LifecycleStatus.ONGOING, parent_id=ta.id, created_by="test")
    db_session.add(compound); await db_session.flush()
    study = ScopeNode(node_type=NodeType.STUDY, name="STD-GL", code=f"STD-GL-{suffix}",
                      lifecycle_status=LifecycleStatus.ONGOING, parent_id=compound.id, created_by="test")
    db_session.add(study); await db_session.flush()
    spec = Specification(scope_node_id=study.id, name=f"SDTM-GL-{suffix}", spec_type=SpecType.SDTM,
                         status=SpecStatus.DRAFT, version="1.0", created_by="test")
    db_session.add(spec); await db_session.flush()
    base_ds = TargetDataset(specification_id=spec.id, dataset_name="AE_BASE",
                            class_type=DatasetClass.EVENTS, override_type=OverrideType.NONE, created_by="test")
    db_session.add(base_ds); await db_session.flush()
    ds = TargetDataset(specification_id=spec.id, dataset_name="AE", class_type=DatasetClass.EVENTS,
                       override_type=OverrideType.NONE, base_id=base_ds.id, created_by="test")
    db_session.add(ds); await db_session.flush()

    resp = await authenticated_client.patch(
        f"/api/v1/study-specs/{spec.id}/datasets/{ds.id}",
        json={"domain_name": "NEWAE"}
    )
    # App uses unified error response: HTTP 200 with error code in body
    assert resp.json()["code"] == "422"


@pytest.mark.asyncio
async def test_soft_delete_dataset(authenticated_client, db_session):
    """DELETE /study-specs/{spec_id}/datasets/{dataset_id} soft-deletes, not physical delete."""
    import uuid
    from app.models import ScopeNode, NodeType, LifecycleStatus
    from app.models.specification import Specification
    from app.models.target_dataset import TargetDataset
    from app.models.mapping_enums import SpecType, SpecStatus, DatasetClass, OverrideType

    suffix = uuid.uuid4().hex[:8]
    ta = ScopeNode(node_type=NodeType.TA, name="TA-Del", code=f"TA-D-{suffix}",
                   lifecycle_status=LifecycleStatus.ONGOING, created_by="test")
    db_session.add(ta); await db_session.flush()
    compound = ScopeNode(node_type=NodeType.COMPOUND, name="CMP-D", code=f"CMP-D-{suffix}",
                         lifecycle_status=LifecycleStatus.ONGOING, parent_id=ta.id, created_by="test")
    db_session.add(compound); await db_session.flush()
    study = ScopeNode(node_type=NodeType.STUDY, name="STD-D", code=f"STD-D-{suffix}",
                      lifecycle_status=LifecycleStatus.ONGOING, parent_id=compound.id, created_by="test")
    db_session.add(study); await db_session.flush()
    spec = Specification(scope_node_id=study.id, name=f"SDTM-D-{suffix}", spec_type=SpecType.SDTM,
                         status=SpecStatus.DRAFT, version="1.0", created_by="test")
    db_session.add(spec); await db_session.flush()
    ds = TargetDataset(specification_id=spec.id, dataset_name="DM", class_type=DatasetClass.SPECIAL_PURPOSE,
                       override_type=OverrideType.ADDED, created_by="test")
    db_session.add(ds); await db_session.flush()

    resp = await authenticated_client.delete(f"/api/v1/study-specs/{spec.id}/datasets/{ds.id}")
    assert resp.status_code == 204

    await db_session.refresh(ds)
    assert ds.is_deleted is True


# ============================================================
# Additional List/Detail Endpoint Tests
# ============================================================

@pytest.mark.asyncio
async def test_get_study_specs_list(authenticated_client: AsyncClient):
    """GET /study-specs returns spec list."""
    resp = await authenticated_client.get("/api/v1/study-specs")
    assert resp.status_code == 200
    data = resp.json()
    assert data["code"] == "0000"
    assert isinstance(data["data"]["items"], list)


@pytest.mark.asyncio
async def test_get_study_datasets_missing_spec(authenticated_client: AsyncClient):
    """GET /study-specs/{spec_id}/datasets returns error for missing spec."""
    resp = await authenticated_client.get("/api/v1/study-specs/99999/datasets")
    assert resp.status_code == 200
    assert resp.json()["code"] == "4040"


@pytest.mark.asyncio
async def test_get_dataset_variables_missing_dataset(authenticated_client: AsyncClient):
    """GET /study-specs/datasets/{dataset_id}/variables returns error for missing dataset."""
    resp = await authenticated_client.get("/api/v1/study-specs/datasets/99999/variables")
    assert resp.status_code == 200
    assert resp.json()["code"] == "4040"
