# Pipeline ↔ Study Spec Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect Pipeline Management (study/analysis creation) to Study Spec lifecycle — spec initialization on study creation, auto-inheritance on analysis creation, multi-source domain picker, and push-upstream PR flow.

**Architecture:** New spec fields are added to the `NodeCreate` pipeline schema. Study spec initialization and copy endpoints are added to `study_spec.py`. The Study Spec page gains a scope-switcher (study vs. analysis view), extended variable table, domain-picker wizard, and push-upstream modal. All spec inheritance uses the existing `base_specification_id` / `base_id` / `override_type` chain — no schema migrations required.

**Tech Stack:** FastAPI/SQLAlchemy 2.0 async (backend), React 18/TypeScript/Ant Design/React Query/Zustand (frontend), pytest/httpx (backend tests), Vitest/React Testing Library (frontend tests).

---

## File Map

### Backend — New / Modified

| File | Change |
|------|--------|
| `backend/app/schemas/pipeline_schemas.py` | Extend `NodeCreate` with spec init fields |
| `backend/app/api/routers/pipeline.py` | Handle spec fields in `POST /pipeline/nodes` |
| `backend/app/api/routers/study_spec.py` | Add 5 new endpoints |
| `backend/tests/test_study_spec.py` | New test file for new endpoints |

### Frontend — New

| File | Purpose |
|------|---------|
| `frontend/src/pages/(base)/mdr/pipeline-management/components/StudySpecStepModal.tsx` | Steps 3-4 of study creation (spec decision + init method) |
| `frontend/src/pages/(base)/mdr/pipeline-management/components/AnalysisSpecStepModal.tsx` | Steps 2-3 of analysis creation (inherit summary + domain exclusion) |
| `frontend/src/pages/(base)/mdr/study-spec/components/ScopeSwitcher.tsx` | Study / Analysis view toggle dropdown |
| `frontend/src/pages/(base)/mdr/study-spec/components/VariableTable.tsx` | Extended 13-column variable table with source links |
| `frontend/src/pages/(base)/mdr/study-spec/components/DomainPickerWizard.tsx` | Multi-source domain picker wizard |
| `frontend/src/pages/(base)/mdr/study-spec/components/PushUpstreamModal.tsx` | Diff preview + PR creation modal |
| `frontend/src/service/hooks/useStudySpec.ts` | React Query hooks for study spec data |

### Frontend — Modified

| File | Change |
|------|--------|
| `frontend/src/service/api/study-spec.ts` | Add API functions for 5 new endpoints (extends existing file) |
| `frontend/src/service/urls/study-spec.ts` | Add URL constants for new endpoints |
| `frontend/src/pages/(base)/mdr/pipeline-management/index.tsx` | Spec badge on nodes, wire spec steps into create modals |
| `frontend/src/pages/(base)/mdr/study-spec/index.tsx` | Add scope switcher, wire new variable table, push-upstream button |

---

## Phase 1: Backend API

---

### Task 1: Extend NodeCreate schema for spec initialization

**Files:**
- Modify: `backend/app/schemas/pipeline_schemas.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_study_spec.py`:

```python
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
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd backend && python -m pytest tests/test_study_spec.py::test_create_study_node_with_spec_build_flag -v
```

Expected: `FAILED` — `spec_init_method` not in `NodeCreate`.

- [ ] **Step 3: Extend NodeCreate schema**

In `backend/app/schemas/pipeline_schemas.py`, replace the `NodeCreate` class:

```python
class NodeCreate(BaseModel):
    title: str
    node_type: str  # "TA", "COMPOUND", "STUDY", "ANALYSIS"
    parent_id: str | None = None
    phase: str | None = None
    protocol_title: str | None = None
    description: str | None = None
    # Spec initialization (study nodes only)
    create_spec: bool = False
    spec_init_method: str | None = None  # "build" | "copy_study" | "copy_analysis"
    copy_from_spec_id: int | None = None  # spec id to copy from (copy_study/copy_analysis)
    # Analysis node: domain exclusions on creation
    excluded_dataset_names: list[str] = []
```

- [ ] **Step 4: In pipeline.py, return spec_status in the node creation response**

Find the `POST /pipeline/nodes` handler. After creating the `ScopeNode` and calling `await db.commit()`, add:

```python
# Determine spec_status for the response
spec_status = "none"
if data.node_type.upper() == "STUDY" and data.create_spec:
    if data.spec_init_method == "build":
        spec_status = "pending_setup"
    elif data.spec_init_method in ("copy_study", "copy_analysis") and data.copy_from_spec_id:
        spec_status = "ready"  # copy happens in Task 2
    # Store spec_status in extra_attrs for persistence
    node.extra_attrs = {**(node.extra_attrs or {}), "spec_status": spec_status}
    await db.commit()
elif data.node_type.upper() == "ANALYSIS":
    spec_status = "inherited"
```

Then include `spec_status` in the response dict returned by the endpoint.

- [ ] **Step 5: Run test to confirm it passes**

```bash
cd backend && python -m pytest tests/test_study_spec.py::test_create_study_node_with_spec_build_flag -v
```

Expected: `PASSED`

- [ ] **Step 6: Commit**

```bash
cd backend && git add app/schemas/pipeline_schemas.py app/api/routers/pipeline.py tests/test_study_spec.py
git commit -m "feat(backend): extend NodeCreate schema with spec init fields"
```

---

### Task 2: GET /study-specs/sources endpoint

**Files:**
- Modify: `backend/app/api/routers/study_spec.py`
- Modify: `backend/tests/test_study_spec.py`

- [ ] **Step 1: Write the failing test**

Append to `backend/tests/test_study_spec.py`:

```python
@pytest.mark.asyncio
async def test_get_study_spec_sources_returns_structure(authenticated_client: AsyncClient, db_session):
    """GET /study-specs/sources returns cdisc_domains, ta_domains, product_domains."""
    from app.models import ScopeNode, NodeType, LifecycleStatus
    from app.models.specification import Specification
    from app.models.mapping_enums import SpecType, SpecStatus

    # Create scope node hierarchy: TA -> Compound -> Study
    ta = ScopeNode(node_type=NodeType.TA, name="Oncology", lifecycle_status=LifecycleStatus.ONGOING,
                   created_by="test")
    db_session.add(ta)
    await db_session.flush()

    compound = ScopeNode(node_type=NodeType.COMPOUND, name="Compound-A",
                         lifecycle_status=LifecycleStatus.ONGOING, parent_id=ta.id, created_by="test")
    db_session.add(compound)
    await db_session.flush()

    study = ScopeNode(node_type=NodeType.STUDY, name="Study-001",
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
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd backend && python -m pytest tests/test_study_spec.py::test_get_study_spec_sources_returns_structure -v
```

Expected: `FAILED` — 404 (endpoint doesn't exist).

- [ ] **Step 3: Add the endpoint to study_spec.py**

Add before the last endpoint in `backend/app/api/routers/study_spec.py`:

```python
# ============================================================
# NEW: GET /study-specs/sources
# ============================================================

class DomainSourceItem(BaseModel):
    id: int
    dataset_name: str
    description: str | None = None
    class_type: str
    variable_count: int
    spec_id: int
    spec_name: str
    origin: str  # "cdisc" | "ta" | "product"


class SpecSourcesResponse(BaseModel):
    cdisc_domains: list[DomainSourceItem]
    ta_domains: list[DomainSourceItem]
    product_domains: list[DomainSourceItem]


@router.get("/sources", summary="Get available domain sources for spec initialization")
async def get_spec_sources(
    scope_node_id: int = Query(..., description="Study ScopeNode ID"),
    spec_type: str = Query("SDTM", description="SDTM or ADaM"),
    user: CurrentUser,
    db: AsyncSession = Depends(get_db_session),
) -> dict:
    """Return available domains from CDISC Library, TA Spec, and Product Spec for the given study."""

    # Resolve ancestor ScopeNodes for this study
    study_q = select(ScopeNode).where(ScopeNode.id == scope_node_id)
    study_res = await db.execute(study_q)
    study_node = study_res.scalar_one_or_none()
    if not study_node:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ScopeNode not found")

    # Walk up the tree to find TA and Compound ancestors
    ta_node_id: int | None = None
    product_node_id: int | None = None
    current = study_node
    while current.parent_id:
        parent_q = select(ScopeNode).where(ScopeNode.id == current.parent_id)
        parent_res = await db.execute(parent_q)
        parent = parent_res.scalar_one_or_none()
        if not parent:
            break
        if parent.node_type == NodeType.TA:
            ta_node_id = parent.id
        elif parent.node_type == NodeType.COMPOUND:
            product_node_id = parent.id
        current = parent

    try:
        target_spec_type = SpecType(spec_type.upper())
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid spec_type: {spec_type}")

    async def _get_domains(node_id: int | None, origin: str) -> list[DomainSourceItem]:
        if node_id is None:
            return []
        specs_q = select(Specification).where(
            Specification.scope_node_id == node_id,
            Specification.spec_type == target_spec_type,
            Specification.is_deleted == False,  # noqa: E712
        )
        specs_res = await db.execute(specs_q)
        specs = specs_res.scalars().all()
        items = []
        for spec in specs:
            datasets_q = select(TargetDataset).where(
                TargetDataset.specification_id == spec.id,
                TargetDataset.is_deleted == False,  # noqa: E712
                TargetDataset.override_type != OverrideType.DELETED,
            )
            ds_res = await db.execute(datasets_q)
            datasets = ds_res.scalars().all()
            for ds in datasets:
                var_count_q = select(func.count()).where(
                    TargetVariable.dataset_id == ds.id,
                    TargetVariable.is_deleted == False,  # noqa: E712
                )
                vc_res = await db.execute(var_count_q)
                vc = vc_res.scalar() or 0
                items.append(DomainSourceItem(
                    id=ds.id, dataset_name=ds.dataset_name, description=ds.description,
                    class_type=ds.class_type.value, variable_count=vc,
                    spec_id=spec.id, spec_name=spec.name, origin=origin,
                ))
        return items

    # CDISC domains: specs attached to CDISC/GLOBAL scope nodes
    cdisc_q = select(ScopeNode).where(ScopeNode.node_type.in_([NodeType.CDISC, NodeType.GLOBAL]))
    cdisc_res = await db.execute(cdisc_q)
    cdisc_nodes = cdisc_res.scalars().all()
    cdisc_domains: list[DomainSourceItem] = []
    for cn in cdisc_nodes:
        cdisc_domains.extend(await _get_domains(cn.id, "cdisc"))

    ta_domains = await _get_domains(ta_node_id, "ta")
    product_domains = await _get_domains(product_node_id, "product")

    return _ok(SpecSourcesResponse(
        cdisc_domains=cdisc_domains,
        ta_domains=ta_domains,
        product_domains=product_domains,
    ).model_dump())
```

- [ ] **Step 4: Run test**

```bash
cd backend && python -m pytest tests/test_study_spec.py::test_get_study_spec_sources_returns_structure -v
```

Expected: `PASSED`

- [ ] **Step 5: Commit**

```bash
cd backend && git add app/api/routers/study_spec.py tests/test_study_spec.py
git commit -m "feat(backend): add GET /study-specs/sources endpoint"
```

---

### Task 3: POST /study-specs/copy — clone spec from existing

**Files:**
- Modify: `backend/app/api/routers/study_spec.py`
- Modify: `backend/tests/test_study_spec.py`

- [ ] **Step 1: Write the failing test**

Append to `backend/tests/test_study_spec.py`:

```python
@pytest.mark.asyncio
async def test_copy_spec_creates_new_spec_with_all_datasets(authenticated_client: AsyncClient, db_session):
    """POST /study-specs/copy creates a full clone of source spec under a new scope_node_id."""
    from app.models import ScopeNode, NodeType, LifecycleStatus
    from app.models.specification import Specification
    from app.models.target_dataset import TargetDataset
    from app.models.mapping_enums import SpecType, SpecStatus, OverrideType, DatasetClass

    # Set up source study + spec
    study_a = ScopeNode(node_type=NodeType.STUDY, name="Study-A",
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

    # Target study
    study_b = ScopeNode(node_type=NodeType.STUDY, name="Study-B",
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
    assert data["source_spec_id"] == source_spec.id
```

- [ ] **Step 2: Run to confirm it fails**

```bash
cd backend && python -m pytest tests/test_study_spec.py::test_copy_spec_creates_new_spec_with_all_datasets -v
```

Expected: `FAILED` — 404.

- [ ] **Step 3: Add the endpoint**

In `backend/app/api/routers/study_spec.py`, add:

```python
# ============================================================
# NEW: POST /study-specs/copy
# ============================================================

class CopySpecRequest(BaseModel):
    source_spec_id: int = Field(..., description="Specification ID to clone from")
    target_scope_node_id: int = Field(..., description="ScopeNode ID for the new spec")
    name: str | None = Field(None, description="Name for the new spec; defaults to source name + (copy)")


class CopySpecResponse(BaseModel):
    id: int
    name: str
    spec_type: str
    source_spec_id: int
    dataset_count: int
    variable_count: int


@router.post("/copy", summary="Clone a spec from an existing Specification")
async def copy_spec(
    request: CopySpecRequest,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db_session),
) -> dict:
    """Deep-clone a Specification (all datasets + variables) to a new scope node.

    Used when initializing a study spec by copying from another study or analysis.
    Sets base_specification_id to the source so the inheritance chain is preserved.
    """
    # Load source spec with datasets
    src_q = (
        select(Specification)
        .options(selectinload(Specification.datasets))
        .where(Specification.id == request.source_spec_id, Specification.is_deleted == False)  # noqa: E712
    )
    src_res = await db.execute(src_q)
    source = src_res.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Source spec {request.source_spec_id} not found")

    # Verify target scope node exists
    target_q = select(ScopeNode).where(ScopeNode.id == request.target_scope_node_id)
    target_res = await db.execute(target_q)
    if not target_res.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Target ScopeNode {request.target_scope_node_id} not found")

    new_name = request.name or f"{source.name} (copy)"
    new_spec = Specification(
        scope_node_id=request.target_scope_node_id,
        name=new_name,
        spec_type=source.spec_type,
        version="1.0",
        status=SpecStatus.DRAFT,
        base_specification_id=source.id,
        standard_name=source.standard_name,
        standard_version=source.standard_version,
        created_by=user.username,
    )
    db.add(new_spec)
    await db.flush()

    dataset_count = 0
    variable_count = 0
    for src_ds in source.datasets:
        if src_ds.is_deleted:
            continue
        new_ds = TargetDataset(
            specification_id=new_spec.id,
            dataset_name=src_ds.dataset_name,
            description=src_ds.description,
            class_type=src_ds.class_type,
            sort_order=src_ds.sort_order,
            base_id=src_ds.id,
            override_type=OverrideType.NONE,
            created_by=user.username,
        )
        db.add(new_ds)
        await db.flush()
        dataset_count += 1

        var_q = select(TargetVariable).where(
            TargetVariable.dataset_id == src_ds.id,
            TargetVariable.is_deleted == False,  # noqa: E712
        ).order_by(TargetVariable.sort_order)
        var_res = await db.execute(var_q)
        for src_var in var_res.scalars().all():
            new_var = TargetVariable(
                dataset_id=new_ds.id,
                variable_name=src_var.variable_name,
                variable_label=src_var.variable_label,
                description=src_var.description,
                data_type=src_var.data_type,
                length=src_var.length,
                core=src_var.core,
                sort_order=src_var.sort_order,
                base_id=src_var.id,
                override_type=OverrideType.NONE,
                origin_type=src_var.origin_type,
                standard_metadata=src_var.standard_metadata,
                created_by=user.username,
            )
            db.add(new_var)
            variable_count += 1

    await db.commit()
    return _ok(CopySpecResponse(
        id=new_spec.id, name=new_spec.name, spec_type=new_spec.spec_type.value,
        source_spec_id=source.id, dataset_count=dataset_count, variable_count=variable_count,
    ).model_dump())
```

- [ ] **Step 4: Run test**

```bash
cd backend && python -m pytest tests/test_study_spec.py::test_copy_spec_creates_new_spec_with_all_datasets -v
```

Expected: `PASSED`

- [ ] **Step 5: Commit**

```bash
cd backend && git add app/api/routers/study_spec.py tests/test_study_spec.py
git commit -m "feat(backend): add POST /study-specs/copy endpoint"
```

---

### Task 3b: POST /study-specs/initialize — batch init from multi-source domain selection

**Files:**
- Modify: `backend/app/api/routers/study_spec.py`
- Modify: `backend/tests/test_study_spec.py`

- [ ] **Step 1: Write the failing test**

Append to `backend/tests/test_study_spec.py`:

```python
@pytest.mark.asyncio
async def test_initialize_spec_from_selected_datasets(authenticated_client: AsyncClient, db_session):
    """POST /study-specs/initialize creates a new spec with selected datasets cloned from sources."""
    from app.models import ScopeNode, NodeType, LifecycleStatus
    from app.models.specification import Specification
    from app.models.target_dataset import TargetDataset
    from app.models.mapping_enums import SpecType, SpecStatus, OverrideType, DatasetClass

    # Source spec (e.g., CDISC or TA spec)
    source_node = ScopeNode(node_type=NodeType.TA, name="Oncology",
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
```

- [ ] **Step 2: Run to confirm it fails**

```bash
cd backend && python -m pytest tests/test_study_spec.py::test_initialize_spec_from_selected_datasets -v
```

Expected: `FAILED`

- [ ] **Step 3: Add the endpoint**

In `backend/app/api/routers/study_spec.py`, add:

```python
# ============================================================
# NEW: POST /study-specs/initialize
# ============================================================

class InitializeSpecRequest(BaseModel):
    scope_node_id: int = Field(..., description="Study ScopeNode ID to attach the new spec to")
    spec_type: str = Field(..., description="SDTM or ADaM")
    name: str | None = Field(None, description="Spec name; defaults to '<study> <type> Spec'")
    selected_dataset_ids: list[int] = Field(..., description="List of TargetDataset IDs to clone from source specs")


class InitializeSpecResponse(BaseModel):
    id: int
    name: str
    spec_type: str
    dataset_count: int
    variable_count: int


@router.post("/initialize", summary="Initialize a study spec from multi-source domain selection")
async def initialize_spec(
    request: InitializeSpecRequest,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db_session),
) -> dict:
    """Create a new Specification for a study by cloning selected datasets from any source specs.

    Each selected dataset (and its variables) is cloned into the new spec with
    base_id pointing to the source dataset, preserving the inheritance chain.
    """
    # Validate scope node
    sn_q = select(ScopeNode).where(ScopeNode.id == request.scope_node_id)
    sn_res = await db.execute(sn_q)
    scope_node = sn_res.scalar_one_or_none()
    if not scope_node:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"ScopeNode {request.scope_node_id} not found")

    try:
        target_spec_type = SpecType(request.spec_type.upper())
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid spec_type: {request.spec_type}")

    # Check for existing spec of same type
    existing_q = select(Specification).where(
        Specification.scope_node_id == request.scope_node_id,
        Specification.spec_type == target_spec_type,
        Specification.is_deleted == False,  # noqa: E712
    )
    existing_res = await db.execute(existing_q)
    if existing_res.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail=f"{request.spec_type} spec already exists for this scope node")

    spec_name = request.name or f"{scope_node.name} {request.spec_type} Spec"
    new_spec = Specification(
        scope_node_id=request.scope_node_id,
        name=spec_name,
        spec_type=target_spec_type,
        version="1.0",
        status=SpecStatus.DRAFT,
        created_by=user.username,
    )
    db.add(new_spec)
    await db.flush()

    dataset_count = 0
    variable_count = 0

    # Load all selected source datasets
    src_ds_q = (
        select(TargetDataset)
        .options(selectinload(TargetDataset.variables))
        .where(TargetDataset.id.in_(request.selected_dataset_ids), TargetDataset.is_deleted == False)  # noqa: E712
    )
    src_ds_res = await db.execute(src_ds_q)
    source_datasets = src_ds_res.scalars().all()

    for src_ds in source_datasets:
        new_ds = TargetDataset(
            specification_id=new_spec.id,
            dataset_name=src_ds.dataset_name,
            description=src_ds.description,
            class_type=src_ds.class_type,
            sort_order=src_ds.sort_order,
            base_id=src_ds.id,
            override_type=OverrideType.NONE,
            created_by=user.username,
        )
        db.add(new_ds)
        await db.flush()
        dataset_count += 1

        for src_var in src_ds.variables:
            if src_var.is_deleted:
                continue
            new_var = TargetVariable(
                dataset_id=new_ds.id,
                variable_name=src_var.variable_name,
                variable_label=src_var.variable_label,
                description=src_var.description,
                data_type=src_var.data_type,
                length=src_var.length,
                core=src_var.core,
                sort_order=src_var.sort_order,
                base_id=src_var.id,
                override_type=OverrideType.NONE,
                origin_type=src_var.origin_type,
                standard_metadata=src_var.standard_metadata,
                created_by=user.username,
            )
            db.add(new_var)
            variable_count += 1

    await db.commit()
    return _ok(InitializeSpecResponse(
        id=new_spec.id, name=new_spec.name, spec_type=new_spec.spec_type.value,
        dataset_count=dataset_count, variable_count=variable_count,
    ).model_dump())
```

- [ ] **Step 4: Run test**

```bash
cd backend && python -m pytest tests/test_study_spec.py::test_initialize_spec_from_selected_datasets -v
```

Expected: `PASSED`

- [ ] **Step 5: Commit**

```bash
cd backend && git add app/api/routers/study_spec.py tests/test_study_spec.py
git commit -m "feat(backend): add POST /study-specs/initialize for multi-source domain selection"
```

---

### Task 4: PUT /study-specs/{id}/datasets/{dataset_id}/toggle — include/exclude domain

**Files:**
- Modify: `backend/app/api/routers/study_spec.py`
- Modify: `backend/tests/test_study_spec.py`

- [ ] **Step 1: Write the failing test**

```python
@pytest.mark.asyncio
async def test_toggle_dataset_sets_override_type(authenticated_client: AsyncClient, db_session):
    """PUT /study-specs/{id}/datasets/{ds_id}/toggle flips override_type between NONE and DELETED."""
    from app.models.specification import Specification
    from app.models.target_dataset import TargetDataset
    from app.models import ScopeNode, NodeType, LifecycleStatus
    from app.models.mapping_enums import SpecType, SpecStatus, OverrideType, DatasetClass

    study = ScopeNode(node_type=NodeType.STUDY, name="Study-T",
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
```

- [ ] **Step 2: Run to confirm it fails**

```bash
cd backend && python -m pytest tests/test_study_spec.py::test_toggle_dataset_sets_override_type -v
```

Expected: `FAILED`

- [ ] **Step 3: Add the endpoint**

```python
# ============================================================
# NEW: PUT /study-specs/{spec_id}/datasets/{dataset_id}/toggle
# ============================================================

class ToggleDatasetRequest(BaseModel):
    exclude: bool = Field(..., description="True to exclude (DELETED), False to include (NONE)")


@router.put("/{spec_id}/datasets/{dataset_id}/toggle",
            summary="Include or exclude a domain at the current spec level")
async def toggle_dataset(
    spec_id: int,
    dataset_id: int,
    request: ToggleDatasetRequest,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db_session),
) -> dict:
    """Set override_type=DELETED to exclude a domain, or NONE to include it.

    Used for analysis-level domain customization. Excluded domains remain in
    the database for audit trail (21 CFR Part 11) but are excluded from outputs.
    """
    ds_q = select(TargetDataset).where(
        TargetDataset.id == dataset_id,
        TargetDataset.specification_id == spec_id,
        TargetDataset.is_deleted == False,  # noqa: E712
    )
    ds_res = await db.execute(ds_q)
    ds = ds_res.scalar_one_or_none()
    if not ds:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Dataset {dataset_id} not found in spec {spec_id}")

    ds.override_type = OverrideType.DELETED if request.exclude else OverrideType.NONE
    ds.updated_by = user.username
    await db.commit()

    return _ok({"id": ds.id, "dataset_name": ds.dataset_name,
                "override_type": ds.override_type.value})
```

- [ ] **Step 4: Run test**

```bash
cd backend && python -m pytest tests/test_study_spec.py::test_toggle_dataset_sets_override_type -v
```

Expected: `PASSED`

- [ ] **Step 5: Commit**

```bash
cd backend && git add app/api/routers/study_spec.py tests/test_study_spec.py
git commit -m "feat(backend): add PUT /study-specs/{id}/datasets/{id}/toggle endpoint"
```

---

### Task 5: POST /study-specs/{id}/push-upstream — create PR proposing changes to parent spec

**Files:**
- Modify: `backend/app/api/routers/study_spec.py`
- Modify: `backend/tests/test_study_spec.py`

- [ ] **Step 1: Write the failing test**

```python
@pytest.mark.asyncio
async def test_push_upstream_returns_diff_summary(authenticated_client: AsyncClient, db_session):
    """POST /study-specs/{id}/push-upstream returns a diff of local overrides vs parent."""
    from app.models.specification import Specification
    from app.models.target_dataset import TargetDataset
    from app.models.target_variable import TargetVariable
    from app.models import ScopeNode, NodeType, LifecycleStatus
    from app.models.mapping_enums import (
        SpecType, SpecStatus, OverrideType, DatasetClass, DataType, VariableCore, OriginType
    )

    study = ScopeNode(node_type=NodeType.STUDY, name="Study-Push",
                      lifecycle_status=LifecycleStatus.ONGOING, created_by="test")
    db_session.add(study)
    await db_session.flush()

    parent_spec = Specification(scope_node_id=study.id, name="Parent SDTM",
                                spec_type=SpecType.SDTM, version="1.0",
                                status=SpecStatus.ACTIVE, created_by="test")
    db_session.add(parent_spec)
    await db_session.flush()

    analysis = ScopeNode(node_type=NodeType.ANALYSIS, name="ANA-001",
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
    assert data["status"] == "pr_created"
```

- [ ] **Step 2: Run to confirm it fails**

```bash
cd backend && python -m pytest tests/test_study_spec.py::test_push_upstream_returns_diff_summary -v
```

Expected: `FAILED`

- [ ] **Step 3: Add the endpoint**

```python
# ============================================================
# NEW: POST /study-specs/{spec_id}/push-upstream
# ============================================================

class PushUpstreamResponse(BaseModel):
    child_spec_id: int
    parent_spec_id: int
    added_datasets: list[str]
    modified_datasets: list[str]
    deleted_datasets: list[str]
    added_variables: int
    modified_variables: int
    status: str  # "pr_created" | "no_changes"
    pr_reference: str | None = None  # placeholder for PR system integration


@router.post("/{spec_id}/push-upstream", summary="Create PR proposing local overrides to parent spec")
async def push_upstream(
    spec_id: int,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db_session),
) -> dict:
    """Compute diff of override_type != NONE records against parent spec and create a PR.

    The PR creation is recorded in spec metadata. Integration with the full PR
    approval workflow (pr-workflow) is handled by the PR router — this endpoint
    computes the diff and triggers it.
    """
    child_q = (
        select(Specification)
        .options(selectinload(Specification.datasets))
        .where(Specification.id == spec_id, Specification.is_deleted == False)  # noqa: E712
    )
    child_res = await db.execute(child_q)
    child = child_res.scalar_one_or_none()
    if not child:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Spec {spec_id} not found")
    if not child.base_specification_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Spec has no parent — cannot push upstream")

    # Collect overridden datasets
    added_datasets, modified_datasets, deleted_datasets = [], [], []
    added_variables = modified_variables = 0

    for ds in child.datasets:
        if ds.is_deleted:
            continue
        if ds.override_type == OverrideType.ADDED:
            added_datasets.append(ds.dataset_name)
        elif ds.override_type == OverrideType.MODIFIED:
            modified_datasets.append(ds.dataset_name)
        elif ds.override_type == OverrideType.DELETED:
            deleted_datasets.append(ds.dataset_name)

        # Count variable overrides within non-deleted datasets
        if ds.override_type != OverrideType.DELETED:
            var_q = select(TargetVariable).where(
                TargetVariable.dataset_id == ds.id,
                TargetVariable.is_deleted == False,  # noqa: E712
                TargetVariable.override_type != OverrideType.NONE,
            )
            var_res = await db.execute(var_q)
            for v in var_res.scalars().all():
                if v.override_type == OverrideType.ADDED:
                    added_variables += 1
                elif v.override_type == OverrideType.MODIFIED:
                    modified_variables += 1

    has_changes = bool(added_datasets or modified_datasets or deleted_datasets
                       or added_variables or modified_variables)

    pr_reference = None
    if has_changes:
        # Record PR intent in spec metadata (full PR workflow integration is in pr-workflow skill)
        import uuid as _uuid
        pr_reference = f"PR-{_uuid.uuid4().hex[:8].upper()}"
        child.metadata_config = {
            **(child.metadata_config or {}),
            "pending_pr": {
                "reference": pr_reference,
                "created_by": user.username,
                "target_spec_id": child.base_specification_id,
            },
        }
        child.updated_by = user.username
        await db.commit()

    return _ok(PushUpstreamResponse(
        child_spec_id=spec_id,
        parent_spec_id=child.base_specification_id,
        added_datasets=added_datasets,
        modified_datasets=modified_datasets,
        deleted_datasets=deleted_datasets,
        added_variables=added_variables,
        modified_variables=modified_variables,
        status="pr_created" if has_changes else "no_changes",
        pr_reference=pr_reference,
    ).model_dump())
```

- [ ] **Step 4: Run test**

```bash
cd backend && python -m pytest tests/test_study_spec.py::test_push_upstream_returns_diff_summary -v
```

Expected: `PASSED`

- [ ] **Step 5: Run all backend tests to ensure no regressions**

```bash
cd backend && python -m pytest tests/ -v
```

Expected: All `PASSED`

- [ ] **Step 6: Commit**

```bash
cd backend && git add app/api/routers/study_spec.py tests/test_study_spec.py
git commit -m "feat(backend): add POST /study-specs/{id}/push-upstream endpoint"
```

---

### Task 6: Auto-inherit study specs when creating ANALYSIS node

**Files:**
- Modify: `backend/app/api/routers/pipeline.py`
- Modify: `backend/tests/test_study_spec.py`

- [ ] **Step 1: Write the failing test**

```python
@pytest.mark.asyncio
async def test_create_analysis_auto_inherits_study_specs(authenticated_client: AsyncClient, db_session):
    """Creating an ANALYSIS node auto-creates inherited Specification records for each study spec."""
    from app.models import ScopeNode, NodeType, LifecycleStatus
    from app.models.specification import Specification
    from app.models.mapping_enums import SpecType, SpecStatus

    study = ScopeNode(node_type=NodeType.STUDY, name="Study-Inherit",
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
    assert {s.base_specification_id for s in inherited} != {None}
```

- [ ] **Step 2: Run to confirm it fails**

```bash
cd backend && python -m pytest tests/test_study_spec.py::test_create_analysis_auto_inherits_study_specs -v
```

Expected: `FAILED`

- [ ] **Step 3: Add auto-inherit logic in pipeline.py**

In the `POST /pipeline/nodes` handler in `backend/app/api/routers/pipeline.py`, after the new `ScopeNode` is created and flushed, add this block for ANALYSIS nodes:

```python
# Auto-inherit all parent study specs when creating an ANALYSIS node
if data.node_type.upper() == "ANALYSIS" and parent_id:
    parent_study_q = select(ScopeNode).where(ScopeNode.id == parent_id)
    parent_study_res = await db.execute(parent_study_q)
    parent_study = parent_study_res.scalar_one_or_none()

    if parent_study and parent_study.node_type == NodeType.STUDY:
        study_specs_q = select(Specification).where(
            Specification.scope_node_id == parent_study.id,
            Specification.is_deleted == False,  # noqa: E712
        )
        study_specs_res = await db.execute(study_specs_q)
        study_specs = study_specs_res.scalars().all()

        for parent_spec in study_specs:
            inherited_spec = Specification(
                scope_node_id=node.id,
                name=f"{node.name} {parent_spec.spec_type.value} Spec",
                spec_type=parent_spec.spec_type,
                version="1.0",
                status=SpecStatus.DRAFT,
                base_specification_id=parent_spec.id,
                standard_name=parent_spec.standard_name,
                standard_version=parent_spec.standard_version,
                created_by=user.username,
            )
            db.add(inherited_spec)

    await db.flush()
```

Add this import at the top of `pipeline.py` (if not present):

```python
from app.models.specification import Specification
from app.models.mapping_enums import SpecStatus
```

- [ ] **Step 4: Run test**

```bash
cd backend && python -m pytest tests/test_study_spec.py::test_create_analysis_auto_inherits_study_specs -v
```

Expected: `PASSED`

- [ ] **Step 5: Run all tests**

```bash
cd backend && python -m pytest tests/ -v
```

Expected: All `PASSED`

- [ ] **Step 6: Commit**

```bash
cd backend && git add app/api/routers/pipeline.py tests/test_study_spec.py
git commit -m "feat(backend): auto-inherit study specs when creating analysis node"
```

---

## Phase 2: Frontend Service Layer

---

### Task 7: Extend study-spec API service and add React Query hooks

**Files:**
- Modify: `frontend/src/service/urls/study-spec.ts`
- Modify: `frontend/src/service/api/study-spec.ts`
- Create: `frontend/src/service/hooks/useStudySpec.ts`

- [ ] **Step 1: Add URL constants for new endpoints**

In `frontend/src/service/urls/study-spec.ts`, add to `STUDY_SPEC_URLS`:

```typescript
// New endpoints for spec integration
SPEC_SOURCES: '/api/v1/study-specs/sources',
SPEC_COPY: '/api/v1/study-specs/copy',
SPEC_INITIALIZE: '/api/v1/study-specs/initialize',
SPEC_TOGGLE_DATASET: '/api/v1/study-specs/:specId/datasets/:datasetId/toggle',
SPEC_PUSH_UPSTREAM: '/api/v1/study-specs/:specId/push-upstream',
```

- [ ] **Step 2: Add API functions to the existing study-spec.ts**

Append to `frontend/src/service/api/study-spec.ts`:

```typescript
import { request } from '../request'

export interface SpecSource {
  id: number
  dataset_name: string
  description: string | null
  class_type: string
  variable_count: number
  spec_id: number
  spec_name: string
  origin: 'cdisc' | 'ta' | 'product'
}

export interface SpecSourcesResponse {
  cdisc_domains: SpecSource[]
  ta_domains: SpecSource[]
  product_domains: SpecSource[]
}

export interface CopySpecRequest {
  source_spec_id: number
  target_scope_node_id: number
  name?: string
}

export interface CopySpecResponse {
  id: number
  name: string
  spec_type: string
  source_spec_id: number
  dataset_count: number
  variable_count: number
}

export interface PushUpstreamResponse {
  child_spec_id: number
  parent_spec_id: number
  added_datasets: string[]
  modified_datasets: string[]
  deleted_datasets: string[]
  added_variables: number
  modified_variables: number
  status: 'pr_created' | 'no_changes'
  pr_reference: string | null
}

export interface StudyVariable {
  id: number
  dataset_id: number
  variable_name: string
  variable_label: string | null
  description: string | null
  data_type: string
  length: number | null
  core: string
  sort_order: number
  base_id: number | null
  override_type: string
  origin_type: string
  role: string | null
  codelist_name: string | null
  codelist_ref: string | null
  standard_metadata?: {
    source_derivation?: string
    implementation_notes?: string
    comment?: string
    global_library_ref?: string
  }
  created_by: string
  created_at: string
}

export const studySpecApi = {
  getSources: (scopeNodeId: number, specType = 'SDTM') =>
    request<SpecSourcesResponse>('get', `/study-specs/sources`, {
      params: { scope_node_id: scopeNodeId, spec_type: specType },
    }),

  copySpec: (data: CopySpecRequest) =>
    request<CopySpecResponse>('post', `/study-specs/copy`, { data }),

  toggleDataset: (specId: number, datasetId: number, exclude: boolean) =>
    request<{ id: number; dataset_name: string; override_type: string }>(
      'put',
      `/study-specs/${specId}/datasets/${datasetId}/toggle`,
      { data: { exclude } }
    ),

  pushUpstream: (specId: number) =>
    request<PushUpstreamResponse>('post', `/study-specs/${specId}/push-upstream`),

  getVariables: (datasetId: number, params?: { search?: string; core?: string }) =>
    request<{ total: number; items: StudyVariable[] }>(
      'get',
      `/study-specs/datasets/${datasetId}/variables`,
      { params }
    ),
}
```

- [ ] **Step 2: Create the React Query hooks**

Create `frontend/src/service/hooks/useStudySpec.ts`:

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { studySpecApi, CopySpecRequest } from '@/service/api/studySpec'

export const STUDY_SPEC_KEYS = {
  sources: (scopeNodeId: number, specType: string) =>
    ['study-spec', 'sources', scopeNodeId, specType] as const,
  variables: (datasetId: number) =>
    ['study-spec', 'variables', datasetId] as const,
}

export function useSpecSources(scopeNodeId: number | undefined, specType = 'SDTM') {
  return useQuery({
    queryKey: STUDY_SPEC_KEYS.sources(scopeNodeId!, specType),
    queryFn: () => studySpecApi.getSources(scopeNodeId!, specType),
    enabled: !!scopeNodeId,
    select: (res) => res.data,
  })
}

export function useDatasetVariables(datasetId: number | undefined) {
  return useQuery({
    queryKey: STUDY_SPEC_KEYS.variables(datasetId!),
    queryFn: () => studySpecApi.getVariables(datasetId!),
    enabled: !!datasetId,
    select: (res) => res.data.items,
  })
}

export function useCopySpec() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CopySpecRequest) => studySpecApi.copySpec(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['study-spec'] }),
  })
}

export function useToggleDataset(specId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ datasetId, exclude }: { datasetId: number; exclude: boolean }) =>
      studySpecApi.toggleDataset(specId, datasetId, exclude),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['study-spec'] }),
  })
}

export function usePushUpstream() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (specId: number) => studySpecApi.pushUpstream(specId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['study-spec'] }),
  })
}
```

- [ ] **Step 3: Type-check**

```bash
cd frontend && npx tsc --noEmit --skipLibCheck
```

Expected: No errors related to new files.

- [ ] **Step 4: Commit**

```bash
cd frontend && git add src/service/api/studySpec.ts src/service/hooks/useStudySpec.ts
git commit -m "feat(frontend): add studySpec API service and React Query hooks"
```

---

## Phase 3: Pipeline Modal Changes

---

### Task 8: StudySpecStepModal component

**Files:**
- Create: `frontend/src/pages/(base)/mdr/pipeline-management/components/StudySpecStepModal.tsx`

- [ ] **Step 1: Create the component**

Create `frontend/src/pages/(base)/mdr/pipeline-management/components/StudySpecStepModal.tsx`:

```tsx
import { useState } from 'react'
import { Alert, Form, Radio, Select, Space, Typography } from 'antd'
import type { FormInstance } from 'antd'

const { Text } = Typography

export interface StudySpecFormValues {
  createSpec: 'yes' | 'no' | 'later'
  specInitMethod?: 'build' | 'copy_study' | 'copy_analysis'
  copyFromSpecId?: number
}

interface Props {
  form: FormInstance
  cdiscVersionConfigured: boolean
}

/**
 * Steps 3-4 of study creation modal:
 * - Step 3: Create spec? (yes / no / later)
 * - Step 4: If yes, how? (build from sources / copy from study / copy from analysis)
 */
export function StudySpecStepModal({ form, cdiscVersionConfigured }: Props) {
  const [createSpec, setCreateSpec] = useState<string>('later')
  const [initMethod, setInitMethod] = useState<string>('build')

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      {!cdiscVersionConfigured && (
        <Alert
          type="warning"
          showIcon
          message="CDISC versions not configured for this study. Please configure them in the Study Configuration tab before or after creation."
        />
      )}

      <Form.Item
        label="Create Study Spec now?"
        name="createSpec"
        initialValue="later"
      >
        <Radio.Group onChange={(e) => setCreateSpec(e.target.value)}>
          <Space direction="vertical">
            <Radio value="yes">Yes — set up spec now</Radio>
            <Radio value="later">Later — I'll set it up after creation</Radio>
            <Radio value="no">No — this study won't have a spec</Radio>
          </Space>
        </Radio.Group>
      </Form.Item>

      {createSpec === 'yes' && (
        <Form.Item
          label="Initialization method"
          name="specInitMethod"
          initialValue="build"
        >
          <Radio.Group onChange={(e) => setInitMethod(e.target.value)}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Radio value="build">
                <Text strong>Build from sources</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Open the domain picker after creation — select domains from CDISC Library, TA Spec, or Product Spec.
                </Text>
              </Radio>
              <Radio value="copy_study">
                <Text strong>Copy from existing study</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Clone all domains and variables from another study's spec.
                </Text>
              </Radio>
              <Radio value="copy_analysis">
                <Text strong>Copy from existing analysis</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Clone from a specific analysis spec snapshot.
                </Text>
              </Radio>
            </Space>
          </Radio.Group>
        </Form.Item>
      )}

      {createSpec === 'yes' && initMethod === 'copy_study' && (
        <Form.Item
          label="Select study to copy from"
          name="copyFromSpecId"
          rules={[{ required: true, message: 'Please select a study' }]}
        >
          {/* Populated by parent via API call to GET /study-specs */}
          <Select placeholder="Search and select a study..." showSearch optionFilterProp="label" />
        </Form.Item>
      )}

      {createSpec === 'yes' && initMethod === 'copy_analysis' && (
        <Form.Item
          label="Select analysis to copy from"
          name="copyFromSpecId"
          rules={[{ required: true, message: 'Please select an analysis' }]}
        >
          <Select placeholder="Search and select an analysis..." showSearch optionFilterProp="label" />
        </Form.Item>
      )}
    </Space>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd frontend && npx tsc --noEmit --skipLibCheck
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd frontend && git add "src/pages/(base)/mdr/pipeline-management/components/StudySpecStepModal.tsx"
git commit -m "feat(frontend): add StudySpecStepModal for study creation"
```

---

### Task 9: AnalysisSpecStepModal component

**Files:**
- Create: `frontend/src/pages/(base)/mdr/pipeline-management/components/AnalysisSpecStepModal.tsx`

- [ ] **Step 1: Create the component**

Create `frontend/src/pages/(base)/mdr/pipeline-management/components/AnalysisSpecStepModal.tsx`:

```tsx
import { Alert, Checkbox, Space, Table, Tag, Typography } from 'antd'

const { Text } = Typography

interface ParentSpec {
  id: number
  name: string
  spec_type: string
  dataset_count: number
}

interface Dataset {
  id: number
  dataset_name: string
  class_type: string
}

interface Props {
  parentSpecs: ParentSpec[]       // Study's specs to inherit
  allDatasets: Dataset[]          // All domains across all parent specs
  excludedDatasetIds: number[]    // Currently excluded domains
  parentSpecReady: boolean        // Whether parent study has a spec
  onToggleExclude: (datasetId: number, exclude: boolean) => void
}

/**
 * Steps 2-3 of analysis creation modal:
 * - Step 2: Read-only inheritance summary
 * - Step 3: Optional domain exclusions
 */
export function AnalysisSpecStepModal({
  parentSpecs,
  allDatasets,
  excludedDatasetIds,
  parentSpecReady,
  onToggleExclude,
}: Props) {
  if (!parentSpecReady) {
    return (
      <Alert
        type="warning"
        showIcon
        message="Parent study has no spec configured yet."
        description="This analysis will automatically inherit the study spec once it is set up. You can configure domain exclusions later on the Study Spec page."
      />
    )
  }

  const specColumns = [
    { title: 'Spec Name', dataIndex: 'name', key: 'name' },
    { title: 'Type', dataIndex: 'spec_type', key: 'spec_type',
      render: (v: string) => <Tag color={v === 'SDTM' ? 'blue' : 'green'}>{v}</Tag> },
    { title: 'Domains', dataIndex: 'dataset_count', key: 'dataset_count' },
    { title: 'Status', key: 'status', render: () => <Tag color="success">Will be inherited</Tag> },
  ]

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <div>
        <Text strong>Study specs to inherit (auto)</Text>
        <Table
          dataSource={parentSpecs}
          columns={specColumns}
          rowKey="id"
          size="small"
          pagination={false}
          style={{ marginTop: 8 }}
        />
      </div>

      {allDatasets.length > 0 && (
        <div>
          <Text strong>Domain customization </Text>
          <Text type="secondary">(optional — can be done later on Study Spec page)</Text>
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {allDatasets.map((ds) => {
              const excluded = excludedDatasetIds.includes(ds.id)
              return (
                <Checkbox
                  key={ds.id}
                  checked={!excluded}
                  onChange={(e) => onToggleExclude(ds.id, !e.target.checked)}
                >
                  <Tag color={excluded ? 'default' : 'blue'}>{ds.dataset_name}</Tag>
                </Checkbox>
              )
            })}
          </div>
          {excludedDatasetIds.length > 0 && (
            <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
              {excludedDatasetIds.length} domain(s) will be excluded for this analysis.
            </Text>
          )}
        </div>
      )}
    </Space>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd frontend && npx tsc --noEmit --skipLibCheck
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd frontend && git add "src/pages/(base)/mdr/pipeline-management/components/AnalysisSpecStepModal.tsx"
git commit -m "feat(frontend): add AnalysisSpecStepModal for analysis creation"
```

---

### Task 10: Wire spec badge and modal steps into pipeline-management/index.tsx

**Files:**
- Modify: `frontend/src/pages/(base)/mdr/pipeline-management/index.tsx`

- [ ] **Step 1: Read the current node rendering code**

Open `frontend/src/pages/(base)/mdr/pipeline-management/index.tsx` and find:
1. The section where Study and Analysis nodes are rendered in the tree (search for `nodeType === 'STUDY'` or the tree item rendering)
2. The modal where Study nodes are created (search for `node_type: 'STUDY'` or the create modal form submit)
3. The modal where Analysis nodes are created

- [ ] **Step 2: Add spec badge to study/analysis tree nodes**

Find the tree node rendering function (renders `<TreeNode>` or `<div>` per node). Add this badge after the node title:

```tsx
import { Badge } from 'antd'

// Inside tree node render, after the title:
{node.nodeType === 'STUDY' && (
  <Badge
    count={
      node.extra_attrs?.spec_status === 'ready' ? '✓ Spec Ready' :
      node.extra_attrs?.spec_status === 'pending_setup' ? '⚙ Spec Pending' :
      node.extra_attrs?.spec_status === 'pr_open' ? '⟳ PR Open' : ''
    }
    style={{
      backgroundColor:
        node.extra_attrs?.spec_status === 'ready' ? '#52c41a' :
        node.extra_attrs?.spec_status === 'pending_setup' ? '#1677ff' :
        node.extra_attrs?.spec_status === 'pr_open' ? '#722ed1' : '#d9d9d9',
      fontSize: 10,
      marginLeft: 8,
    }}
  />
)}
{node.nodeType === 'ANALYSIS' && node.extra_attrs?.spec_status === 'inherited' && (
  <Tag color="success" style={{ fontSize: 10, marginLeft: 8 }}>Spec Inherited</Tag>
)}
```

- [ ] **Step 3: Add StudySpecStepModal to the study creation modal**

In the study node creation handler, find the `Modal` or `Form` used when `node_type === 'STUDY'`. Import and add `StudySpecStepModal` as an additional form section:

```tsx
import { StudySpecStepModal } from './components/StudySpecStepModal'

// Inside the study creation modal, after existing form fields:
<StudySpecStepModal
  form={form}
  cdiscVersionConfigured={!!selectedStudy?.config?.sdtmModelVersion}
/>
```

In the form submit handler, after creating the node via `POST /pipeline/nodes`, handle the copy path:

```tsx
const specValues = form.getFieldsValue(['createSpec', 'specInitMethod', 'copyFromSpecId'])
if (specValues.createSpec === 'yes' &&
    specValues.specInitMethod !== 'build' &&
    specValues.copyFromSpecId) {
  // Trigger copy immediately
  await studySpecApi.copySpec({
    source_spec_id: specValues.copyFromSpecId,
    target_scope_node_id: newNode.id,
  })
}
```

- [ ] **Step 4: Add AnalysisSpecStepModal to analysis creation modal**

In the analysis creation handler, import and add `AnalysisSpecStepModal`:

```tsx
import { AnalysisSpecStepModal } from './components/AnalysisSpecStepModal'
import { useStudySpecs } from '@/service/api/studySpec'  // fetch parent study specs

// Add state for excluded datasets
const [excludedDatasetIds, setExcludedDatasetIds] = useState<number[]>([])

// Inside the analysis creation modal:
<AnalysisSpecStepModal
  parentSpecs={parentStudySpecs}
  allDatasets={allParentDatasets}
  excludedDatasetIds={excludedDatasetIds}
  parentSpecReady={parentStudySpecs.length > 0}
  onToggleExclude={(id, exclude) => {
    setExcludedDatasetIds(prev =>
      exclude ? [...prev, id] : prev.filter(x => x !== id)
    )
  }}
/>
```

After creating the analysis node, apply the excluded domains:

```tsx
for (const datasetId of excludedDatasetIds) {
  // Find the inherited analysis spec and toggle the dataset
  await studySpecApi.toggleDataset(inheritedSpecId, datasetId, true)
}
```

- [ ] **Step 5: Type-check**

```bash
cd frontend && npx tsc --noEmit --skipLibCheck
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
cd frontend && git add "src/pages/(base)/mdr/pipeline-management/"
git commit -m "feat(frontend): add spec badge and spec steps to pipeline creation modals"
```

---

## Phase 4: Study Spec Page

---

### Task 11: ScopeSwitcher component

**Files:**
- Create: `frontend/src/pages/(base)/mdr/study-spec/components/ScopeSwitcher.tsx`

- [ ] **Step 1: Create the component**

Create `frontend/src/pages/(base)/mdr/study-spec/components/ScopeSwitcher.tsx`:

```tsx
import { Select } from 'antd'

interface AnalysisOption {
  id: number
  name: string
  specStatus?: string
}

interface Props {
  analyses: AnalysisOption[]
  /** null = study level; number = analysis scope node id */
  selectedAnalysisId: number | null
  onChange: (analysisId: number | null) => void
}

/**
 * Dropdown to switch the Study Spec page view between:
 * - Study level (full edit mode)
 * - A specific analysis (override view, shows analysis-level exclusions/edits)
 */
export function ScopeSwitcher({ analyses, selectedAnalysisId, onChange }: Props) {
  const options = [
    { label: 'Study Level', value: '__study__' },
    ...analyses.map((a) => ({
      label: a.name,
      value: String(a.id),
    })),
  ]

  return (
    <Select
      style={{ minWidth: 220 }}
      value={selectedAnalysisId === null ? '__study__' : String(selectedAnalysisId)}
      options={options}
      onChange={(val) => onChange(val === '__study__' ? null : Number(val))}
      placeholder="Viewing as..."
    />
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd frontend && npx tsc --noEmit --skipLibCheck
```

- [ ] **Step 3: Commit**

```bash
cd frontend && git add "src/pages/(base)/mdr/study-spec/components/ScopeSwitcher.tsx"
git commit -m "feat(frontend): add ScopeSwitcher component for study/analysis view toggle"
```

---

### Task 12: VariableTable component — extended 13-column table with source links

**Files:**
- Create: `frontend/src/pages/(base)/mdr/study-spec/components/VariableTable.tsx`

- [ ] **Step 1: Create the component**

Create `frontend/src/pages/(base)/mdr/study-spec/components/VariableTable.tsx`:

```tsx
import { Button, Table, Tag, Tooltip } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { LinkOutlined } from '@ant-design/icons'
import type { StudyVariable } from '@/service/api/studySpec'

const ORIGIN_COLORS: Record<string, string> = {
  CDISC: 'blue',
  SPONSOR_STANDARD: 'green',
  TA_STANDARD: 'cyan',
  STUDY_CUSTOM: 'orange',
}

const OVERRIDE_COLORS: Record<string, string> = {
  None: 'default',
  Added: 'success',
  Modified: 'warning',
  Deleted: 'error',
}

interface Props {
  variables: StudyVariable[]
  loading?: boolean
  readOnly?: boolean
  onEdit?: (variable: StudyVariable) => void
  onSourceLink?: (variable: StudyVariable) => void
}

/**
 * Extended variable table with all 13 columns from the spec:
 * Name, Label, Type, Length, Core, Role, Origin (with source link),
 * Codelist, Source/Derivation, Implementation Notes, Comment,
 * Global Library Ref, Override status.
 */
export function VariableTable({ variables, loading, readOnly, onEdit, onSourceLink }: Props) {
  const columns: ColumnsType<StudyVariable> = [
    {
      title: 'Variable',
      dataIndex: 'variable_name',
      key: 'variable_name',
      fixed: 'left',
      width: 120,
      sorter: (a, b) => a.variable_name.localeCompare(b.variable_name),
    },
    {
      title: 'Label',
      dataIndex: 'variable_label',
      key: 'variable_label',
      width: 180,
    },
    {
      title: 'Type',
      dataIndex: 'data_type',
      key: 'data_type',
      width: 80,
    },
    {
      title: 'Length',
      dataIndex: 'length',
      key: 'length',
      width: 70,
      align: 'right',
    },
    {
      title: 'Core',
      dataIndex: 'core',
      key: 'core',
      width: 70,
      render: (v: string) => (
        <Tag color={v === 'Req' ? 'red' : v === 'Exp' ? 'orange' : 'default'}>{v}</Tag>
      ),
    },
    {
      title: 'Role',
      key: 'role',
      width: 120,
      render: (_: unknown, r: StudyVariable) => r.role ?? '—',
    },
    {
      title: 'Origin',
      dataIndex: 'origin_type',
      key: 'origin_type',
      width: 140,
      render: (v: string, record: StudyVariable) => (
        <span>
          <Tag color={ORIGIN_COLORS[v] ?? 'default'}>{v.replace(/_/g, ' ')}</Tag>
          {record.base_id && onSourceLink && (
            <Tooltip title="Go to source">
              <Button
                type="link"
                size="small"
                icon={<LinkOutlined />}
                onClick={() => onSourceLink(record)}
                style={{ padding: '0 2px' }}
              />
            </Tooltip>
          )}
        </span>
      ),
    },
    {
      title: 'Codelist',
      key: 'codelist',
      width: 120,
      render: (_: unknown, r: StudyVariable) => r.codelist_name ?? '—',
    },
    {
      title: 'Source / Derivation',
      key: 'source_derivation',
      width: 160,
      render: (_: unknown, r: StudyVariable) =>
        r.standard_metadata?.source_derivation ?? '—',
    },
    {
      title: 'Implementation Notes',
      key: 'impl_notes',
      width: 180,
      render: (_: unknown, r: StudyVariable) =>
        r.standard_metadata?.implementation_notes ?? '—',
    },
    {
      title: 'Comment',
      key: 'comment',
      width: 160,
      render: (_: unknown, r: StudyVariable) =>
        r.standard_metadata?.comment ?? '—',
    },
    {
      title: 'Library Ref',
      key: 'library_ref',
      width: 100,
      render: (_: unknown, r: StudyVariable) => {
        const ref = r.standard_metadata?.global_library_ref
        return ref ? (
          <a href={ref} target="_blank" rel="noreferrer">
            <LinkOutlined /> CDISC
          </a>
        ) : '—'
      },
    },
    {
      title: 'Override',
      dataIndex: 'override_type',
      key: 'override_type',
      fixed: 'right',
      width: 90,
      render: (v: string) =>
        v !== 'None' ? <Tag color={OVERRIDE_COLORS[v] ?? 'default'}>{v}</Tag> : null,
    },
    ...(!readOnly
      ? [{
          title: '',
          key: 'actions',
          fixed: 'right' as const,
          width: 50,
          render: (_: unknown, record: StudyVariable) => (
            <Button size="small" type="text" onClick={() => onEdit?.(record)}>✏️</Button>
          ),
        }]
      : []),
  ]

  const rowClassName = (record: StudyVariable) => {
    if (record.override_type === 'Added') return 'row-added'
    if (record.override_type === 'Modified') return 'row-modified'
    if (record.override_type === 'Deleted') return 'row-deleted'
    return ''
  }

  return (
    <>
      <style>{`
        .row-added td { background: #f6ffed !important; }
        .row-modified td { background: #fffbe6 !important; }
        .row-deleted td { background: #fff1f0 !important; opacity: 0.5; text-decoration: line-through; }
      `}</style>
      <Table<StudyVariable>
        dataSource={variables}
        columns={columns}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1600 }}
        size="small"
        pagination={{ pageSize: 50, showSizeChanger: true }}
        rowClassName={rowClassName}
      />
    </>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd frontend && npx tsc --noEmit --skipLibCheck
```

- [ ] **Step 3: Commit**

```bash
cd frontend && git add "src/pages/(base)/mdr/study-spec/components/VariableTable.tsx"
git commit -m "feat(frontend): add extended 13-column VariableTable with source links"
```

---

### Task 13: DomainPickerWizard component

**Files:**
- Create: `frontend/src/pages/(base)/mdr/study-spec/components/DomainPickerWizard.tsx`

- [ ] **Step 1: Create the component**

Create `frontend/src/pages/(base)/mdr/study-spec/components/DomainPickerWizard.tsx`:

```tsx
import { useState } from 'react'
import { Button, Checkbox, Col, Modal, Row, Spin, Steps, Table, Tag, Typography } from 'antd'
import { useSpecSources } from '@/service/hooks/useStudySpec'
import type { SpecSource } from '@/service/api/studySpec'

const { Text } = Typography

interface Props {
  open: boolean
  scopeNodeId: number
  onConfirm: (selectedDatasetIds: number[]) => void
  onCancel: () => void
}

type SpecType = 'SDTM' | 'ADaM'

/**
 * Multi-step wizard for initializing a study spec from multiple sources.
 * Step 0: Select spec type (SDTM, ADaM, or both).
 * Step 1: Browse and select domains from CDISC / TA / Product sources.
 * Step 2: Review and confirm.
 */
export function DomainPickerWizard({ open, scopeNodeId, onConfirm, onCancel }: Props) {
  const [step, setStep] = useState(0)
  const [specTypes, setSpecTypes] = useState<SpecType[]>(['SDTM'])
  const [activeSpecType, setActiveSpecType] = useState<SpecType>('SDTM')
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const { data: sources, isLoading } = useSpecSources(scopeNodeId, activeSpecType)

  const allDomains: SpecSource[] = [
    ...(sources?.cdisc_domains ?? []),
    ...(sources?.ta_domains ?? []),
    ...(sources?.product_domains ?? []),
  ]

  const columns = [
    {
      title: 'Domain',
      dataIndex: 'dataset_name',
      key: 'dataset_name',
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Class',
      dataIndex: 'class_type',
      key: 'class_type',
    },
    {
      title: 'Source',
      dataIndex: 'origin',
      key: 'origin',
      render: (v: string) => (
        <Tag color={v === 'cdisc' ? 'blue' : v === 'ta' ? 'cyan' : 'green'}>
          {v === 'cdisc' ? 'CDISC Library' : v === 'ta' ? 'TA Spec' : 'Product Spec'}
        </Tag>
      ),
    },
    {
      title: 'Variables',
      dataIndex: 'variable_count',
      key: 'variable_count',
      align: 'right' as const,
    },
  ]

  const steps = [
    { title: 'Spec Type' },
    { title: 'Select Domains' },
    { title: 'Review' },
  ]

  return (
    <Modal
      open={open}
      title="Initialize Study Spec — Domain Picker"
      width={900}
      onCancel={onCancel}
      footer={
        <Row justify="space-between">
          <Col>
            {step > 0 && <Button onClick={() => setStep(s => s - 1)}>Back</Button>}
          </Col>
          <Col>
            {step < 2
              ? <Button type="primary" onClick={() => setStep(s => s + 1)} disabled={selectedIds.length === 0 && step === 1}>
                  Next
                </Button>
              : <Button type="primary" onClick={() => onConfirm(selectedIds)}>
                  Create Spec ({selectedIds.length} domains)
                </Button>
            }
          </Col>
        </Row>
      }
    >
      <Steps current={step} items={steps} style={{ marginBottom: 24 }} />

      {step === 0 && (
        <div>
          <Text>Which spec type(s) do you want to initialize?</Text>
          <div style={{ marginTop: 16 }}>
            <Checkbox.Group
              value={specTypes}
              onChange={(vals) => setSpecTypes(vals as SpecType[])}
            >
              <Checkbox value="SDTM">SDTM</Checkbox>
              <Checkbox value="ADaM">ADaM</Checkbox>
            </Checkbox.Group>
          </div>
        </div>
      )}

      {step === 1 && (
        <Spin spinning={isLoading}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
            Select domains from any source. You can mix CDISC Library, TA Spec, and Product Spec domains.
          </Text>
          <Table
            dataSource={allDomains}
            columns={columns}
            rowKey="id"
            size="small"
            rowSelection={{
              selectedRowKeys: selectedIds,
              onChange: (keys) => setSelectedIds(keys as number[]),
            }}
            pagination={false}
            scroll={{ y: 400 }}
          />
        </Spin>
      )}

      {step === 2 && (
        <div>
          <Text strong>{selectedIds.length} domains selected:</Text>
          <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {allDomains
              .filter(d => selectedIds.includes(d.id))
              .map(d => (
                <Tag key={d.id} color={d.origin === 'cdisc' ? 'blue' : d.origin === 'ta' ? 'cyan' : 'green'}>
                  {d.dataset_name} ({d.origin})
                </Tag>
              ))}
          </div>
        </div>
      )}
    </Modal>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd frontend && npx tsc --noEmit --skipLibCheck
```

- [ ] **Step 3: Commit**

```bash
cd frontend && git add "src/pages/(base)/mdr/study-spec/components/DomainPickerWizard.tsx"
git commit -m "feat(frontend): add DomainPickerWizard multi-source domain selection"
```

---

### Task 14: PushUpstreamModal component

**Files:**
- Create: `frontend/src/pages/(base)/mdr/study-spec/components/PushUpstreamModal.tsx`

- [ ] **Step 1: Create the component**

Create `frontend/src/pages/(base)/mdr/study-spec/components/PushUpstreamModal.tsx`:

```tsx
import { Alert, Descriptions, Modal, Spin, Tag } from 'antd'
import { usePushUpstream } from '@/service/hooks/useStudySpec'
import type { PushUpstreamResponse } from '@/service/api/studySpec'

interface Props {
  open: boolean
  specId: number
  parentLabel: string   // e.g., "Product Spec" or "Study Spec"
  onClose: () => void
  onSuccess: (result: PushUpstreamResponse) => void
}

/**
 * Confirm dialog for pushing local spec overrides upstream.
 * Shows a diff summary (added/modified/deleted domains and variable counts)
 * before creating the PR.
 */
export function PushUpstreamModal({ open, specId, parentLabel, onClose, onSuccess }: Props) {
  const { mutate: push, isPending, data, reset } = usePushUpstream()

  const handleConfirm = () => {
    push(specId, {
      onSuccess: (res) => {
        onSuccess(res.data)
      },
    })
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <Modal
      open={open}
      title={`Push Changes to ${parentLabel}`}
      onOk={handleConfirm}
      onCancel={handleClose}
      okText="Create PR"
      okButtonProps={{ loading: isPending }}
      width={560}
    >
      {!data ? (
        <Spin spinning={isPending}>
          <Alert
            type="info"
            showIcon
            message={`This will create a PR proposing your local changes to the ${parentLabel}. A ${parentLabel} owner must approve before changes are merged.`}
            style={{ marginBottom: 16 }}
          />
          <p>Click <strong>Create PR</strong> to compute the diff and submit for review.</p>
        </Spin>
      ) : (
        <>
          {data.status === 'no_changes' ? (
            <Alert type="warning" showIcon message="No overrides found — nothing to push upstream." />
          ) : (
            <>
              <Alert
                type="success"
                showIcon
                message={`PR created: ${data.pr_reference}`}
                style={{ marginBottom: 16 }}
              />
              <Descriptions size="small" column={1} bordered>
                <Descriptions.Item label="Added domains">
                  {data.added_datasets.length > 0
                    ? data.added_datasets.map(d => <Tag key={d} color="success">{d}</Tag>)
                    : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Modified domains">
                  {data.modified_datasets.length > 0
                    ? data.modified_datasets.map(d => <Tag key={d} color="warning">{d}</Tag>)
                    : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Excluded domains">
                  {data.deleted_datasets.length > 0
                    ? data.deleted_datasets.map(d => <Tag key={d} color="error">{d}</Tag>)
                    : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Variable changes">
                  {data.added_variables} added, {data.modified_variables} modified
                </Descriptions.Item>
              </Descriptions>
            </>
          )}
        </>
      )}
    </Modal>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd frontend && npx tsc --noEmit --skipLibCheck
```

- [ ] **Step 3: Commit**

```bash
cd frontend && git add "src/pages/(base)/mdr/study-spec/components/PushUpstreamModal.tsx"
git commit -m "feat(frontend): add PushUpstreamModal with diff preview"
```

---

### Task 15: Wire all new components into study-spec/index.tsx

**Files:**
- Modify: `frontend/src/pages/(base)/mdr/study-spec/index.tsx`

- [ ] **Step 1: Read the current index.tsx structure**

Open `frontend/src/pages/(base)/mdr/study-spec/index.tsx` and identify:
1. The page header / toolbar area (where to add `ScopeSwitcher` and `↑ Push` button)
2. The variable table render (where to swap in `VariableTable`)
3. Any existing state for selected scope / selected dataset
4. How the current clinical context (study scope node id) is read

- [ ] **Step 2: Add imports and state**

At the top of the file, add:

```tsx
import { useState } from 'react'
import { ScopeSwitcher } from './components/ScopeSwitcher'
import { VariableTable } from './components/VariableTable'
import { DomainPickerWizard } from './components/DomainPickerWizard'
import { PushUpstreamModal } from './components/PushUpstreamModal'
import { useDatasetVariables } from '@/service/hooks/useStudySpec'
import { useNavigate } from '@tanstack/react-router'  // or whatever router is used
```

Add to component state:

```tsx
const [selectedAnalysisId, setSelectedAnalysisId] = useState<number | null>(null)
const [domainPickerOpen, setDomainPickerOpen] = useState(false)
const [pushUpstreamOpen, setPushUpstreamOpen] = useState(false)
```

- [ ] **Step 3: Replace the page header toolbar**

Find the existing toolbar/header section. Replace or extend it with:

```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
  <ScopeSwitcher
    analyses={analyses}  {/* array from the pipeline tree for this study */}
    selectedAnalysisId={selectedAnalysisId}
    onChange={setSelectedAnalysisId}
  />
  <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
    {selectedAnalysisId === null && (
      <Button onClick={() => setDomainPickerOpen(true)}>+ Add Domain</Button>
    )}
    {selectedAnalysisId !== null && (
      <Button danger onClick={() => handleExcludeDomain()}>Exclude Domain</Button>
    )}
    <Button
      type="primary"
      style={{ background: '#7c3aed', borderColor: '#7c3aed' }}
      onClick={() => setPushUpstreamOpen(true)}
    >
      ↑ Push to {selectedAnalysisId === null ? 'Product Spec' : 'Study Spec'}
    </Button>
  </div>
</div>

{/* Info bar when viewing analysis level */}
{selectedAnalysisId !== null && (
  <Alert
    type="info"
    showIcon={false}
    style={{ marginBottom: 12, background: '#f0f9ff', border: '1px solid #bae6fd' }}
    message={
      <span>
        📋 Viewing analysis override — inherited from Study Spec.
        Excluded domains are struck through. Click ✏️ to add variable overrides.
      </span>
    }
  />
)}
```

- [ ] **Step 4: Replace the variable table with VariableTable component**

Find where variables are currently rendered (likely a `<Table>` in the right panel). Replace with:

```tsx
const { data: variables = [], isLoading: varsLoading } = useDatasetVariables(selectedDatasetId)

<VariableTable
  variables={variables}
  loading={varsLoading}
  readOnly={selectedAnalysisId !== null}
  onEdit={(variable) => openVariableDrawer(variable)}
  onSourceLink={(variable) => handleSourceLink(variable)}
/>
```

Where `handleSourceLink` navigates based on origin:

```tsx
function handleSourceLink(variable: StudyVariable) {
  if (variable.origin_type === 'CDISC' && variable.standard_metadata?.global_library_ref) {
    window.open(variable.standard_metadata.global_library_ref, '_blank')
  } else if (variable.origin_type === 'TA_STANDARD') {
    navigate({ to: '/mdr/study-spec', search: { scope: 'ta', datasetName: variable.variable_name } })
  } else if (variable.origin_type === 'SPONSOR_STANDARD') {
    navigate({ to: '/mdr/study-spec', search: { scope: 'product', datasetName: variable.variable_name } })
  }
}
```

- [ ] **Step 5: Mount DomainPickerWizard and PushUpstreamModal**

At the bottom of the JSX return:

```tsx
<DomainPickerWizard
  open={domainPickerOpen}
  scopeNodeId={currentStudyScopeNodeId}
  onConfirm={async (datasetIds) => {
    // Call POST /study-specs/initialize with the user-selected dataset IDs
    await initializeSpec({
      scope_node_id: currentStudyScopeNodeId,
      spec_type: 'SDTM',  // repeat for ADaM if both selected in wizard
      selected_dataset_ids: datasetIds,
    })
    setDomainPickerOpen(false)
    await refetchDatasets()
    message.success('Study spec initialized successfully')
  }}
  onCancel={() => setDomainPickerOpen(false)}
/>

<PushUpstreamModal
  open={pushUpstreamOpen}
  specId={currentSpecId}
  parentLabel={selectedAnalysisId === null ? 'Product Spec' : 'Study Spec'}
  onClose={() => setPushUpstreamOpen(false)}
  onSuccess={(result) => {
    setPushUpstreamOpen(false)
    message.success(`PR ${result.pr_reference} created successfully`)
  }}
/>
```

- [ ] **Step 6: Final type-check and lint**

```bash
cd frontend && npx tsc --noEmit --skipLibCheck
```

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
cd frontend && git add "src/pages/(base)/mdr/study-spec/"
git commit -m "feat(frontend): wire ScopeSwitcher, VariableTable, DomainPickerWizard, PushUpstreamModal into study-spec page"
```

---

## Final: Backend + Frontend Integration Check

- [ ] **Verify backend is running**

```bash
cd backend && uvicorn app.main:app --port 8080 --reload
```

- [ ] **Verify frontend starts without errors**

```bash
cd frontend && pnpm dev
```

Open http://localhost:5173 — navigate to a study in pipeline, create a study node with `create_spec = yes / build`, confirm badge shows `Spec: Pending Setup`. Navigate to Study Spec page, confirm domain picker opens. Create an analysis, confirm it auto-inherits study spec.

- [ ] **Run all backend tests one final time**

```bash
cd backend && python -m pytest tests/ -v
```

Expected: All PASSED.

- [ ] **Final commit for any integration fixes**

```bash
git add -A
git commit -m "fix: integration cleanup for pipeline-study-spec feature"
```
