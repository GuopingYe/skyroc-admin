"""
Pipeline Management API Router (PostgreSQL Integration)

Endpoints:
- GET  /pipeline/tree                    - Full pipeline tree
- GET  /pipeline/therapeutic-areas       - List TAs
- POST /pipeline/therapeutic-areas       - Create TA
- GET  /pipeline/products                - List products (filter by ta_id)
- GET  /pipeline/studies                 - List studies (filter by product_id)
- GET  /pipeline/studies/{id}/config     - Get study config
- PUT  /pipeline/studies/{id}/config     - Update study config
- GET  /pipeline/analyses                - List analyses (filter by study_id)
- PUT  /pipeline/nodes/{id}/archive      - Toggle archive status
- POST /pipeline/nodes                   - Create a new node (Compound, Study, Analysis)
- GET  /pipeline/milestones              - List milestones
- POST /pipeline/milestones              - Create milestone
- PUT  /pipeline/milestones/{id}         - Update milestone
- DELETE /pipeline/milestones/{id}       - Delete milestone
- GET  /pipeline/execution-jobs          - List execution jobs
"""
import asyncio
import copy
import re
import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, get_db_session
from app.models import LifecycleStatus, NodeType, ProgrammingTracker, ScopeNode
from app.models.mapping_enums import SpecType
from app.models.specification import Specification
from app.schemas.pipeline_schemas import (
    MilestoneCreate,
    MilestoneUpdate,
    NodeArchiveRequest,
    NodeCreate,
    StudyConfigUpdate,
    TherapeuticAreaCreate,
    TherapeuticAreaUpdate,
)

router = APIRouter(prefix="/pipeline", tags=["Pipeline Management"])

# ============================================================
# Available Versions (static fallback for dictionaries only)
# CDISC standards (SDTM/ADaM) are queried dynamically from database
# ============================================================

_MEDDRA_VERSIONS = [
    {"label": "MedDRA 28.0", "value": "MedDRA 28.0"},
    {"label": "MedDRA 27.1", "value": "MedDRA 27.1"},
    {"label": "MedDRA 27.0", "value": "MedDRA 27.0"},
    {"label": "MedDRA 26.1", "value": "MedDRA 26.1"},
    {"label": "MedDRA 26.0", "value": "MedDRA 26.0"},
    {"label": "MedDRA 25.1", "value": "MedDRA 25.1"},
]

_WHODRUG_VERSIONS = [
    {"label": "WHODrug Global 5.1", "value": "WHODrug Global 5.1"},
    {"label": "WHODrug Global 5.0", "value": "WHODrug Global 5.0"},
    {"label": "WHODrug Global 4.0", "value": "WHODrug Global 4.0"},
]

_STUDY_PHASES = [
    {"label": "Phase I", "value": "Phase I"},
    {"label": "Phase I/II", "value": "Phase I/II"},
    {"label": "Phase II", "value": "Phase II"},
    {"label": "Phase II/III", "value": "Phase II/III"},
    {"label": "Phase III", "value": "Phase III"},
    {"label": "Phase IV", "value": "Phase IV"},
]


@router.get("/available-versions", summary="Get available versions for Study Config dropdowns")
async def get_available_versions(
    user: CurrentUser,
    db: AsyncSession = Depends(get_db_session)
):
    """Return all version options for study configuration dropdowns.

    CDISC standard versions (SDTM/ADaM) are queried dynamically from the
    Global Library's Specification table. MedDRA/WHODrug use static fallbacks
    as they are typically managed separately.
    """
    # Query CDISC versions from Global Library's Specification table
    # Run sequentially to avoid concurrent session access issues
    # Query both "CDISC SDTM%" and "SDTM%" patterns to match all possible specs
    sdtm_model_versions = await _query_spec_versions_multi(db, SpecType.SDTM, ["CDISC SDTM v", "SDTM v"])
    sdtm_ig_versions = await _query_spec_versions_multi(db, SpecType.SDTM, ["CDISC SDTMIG", "SDTMIG"])
    adam_model_versions = await _query_spec_versions_multi(db, SpecType.ADAM, ["CDISC ADaM v", "ADaM v"])
    adam_ig_versions = await _query_spec_versions_multi(db, SpecType.ADAM, ["CDISC ADaMIG", "ADaMIG"])

    return _ok({
        "sdtmModelVersions": sdtm_model_versions,
        "sdtmIgVersions": sdtm_ig_versions,
        "adamModelVersions": adam_model_versions,
        "adamIgVersions": adam_ig_versions,
        "meddraVersions": _MEDDRA_VERSIONS,  # Static fallback for dictionaries
        "whodrugVersions": _WHODRUG_VERSIONS,
        "studyPhases": _STUDY_PHASES,
    })


async def _query_spec_versions_multi(
    db: AsyncSession,
    spec_type: SpecType,
    name_prefixes: list[str]
) -> list[dict]:
    """Query Specification table for available versions with multiple prefix patterns."""
    all_results: list[dict] = []
    seen_names: set[str] = set()

    for prefix in name_prefixes:
        result = await _query_spec_versions(db, spec_type, prefix)
        if result:
            for item in result:
                name = item.get("value", "")
                if name and name not in seen_names:
                    seen_names.add(name)
                    all_results.append(item)

    # Sort by label descending (newest first)
    all_results.sort(key=lambda x: x.get("label", ""), reverse=True)
    return all_results


async def _query_spec_versions(
    db: AsyncSession,
    spec_type: SpecType,
    name_prefix: str
) -> list[dict] | None:
    """Query Specification table for available versions."""
    try:
        result = await db.execute(
            select(Specification.standard_name)
            .where(
                Specification.spec_type == spec_type,
                Specification.is_deleted == False,  # noqa: E712
                Specification.standard_name.ilike(f"{name_prefix}%"),
            )
            .distinct()
            .order_by(Specification.standard_name.desc())
        )
        names = result.scalars().all()

        if not names:
            return None

        return [{"label": name, "value": name} for name in names if name]
    except SQLAlchemyError:
        import logging
        logging.getLogger(__name__).warning("Failed to query spec versions")
        return None


# ============================================================
# Helpers
# ============================================================

def _ok(data: Any = None, msg: str = "success") -> dict:
    return {"code": "0000", "msg": msg, "data": data}

def _now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"

def _gen_uuid(prefix: str = "id") -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


def _format_node(node: ScopeNode) -> dict:
    """Format a single node."""
    meta = node.extra_attrs or {}

    # Map backend lifecycle status to frontend expected values
    lifecycle_map = {
        "Ongoing": "Active",
        "Planning": "Draft",
        "Completed": "Locked",
        "Terminated": "Locked",
        # Keep existing values for compatibility
        "Active": "Active",
        "Draft": "Draft",
        "Locked": "Locked"
    }
    raw_lifecycle = node.lifecycle_status.value if node.lifecycle_status else "Draft"
    lifecycle = lifecycle_map.get(raw_lifecycle, "Draft")

    # Basic mapping
    status = "Active" if not node.is_deleted else "Archived"
    
    base_dict = {
        "id": str(node.id),
        "dbId": node.id,
        "name": node.name,
        "title": node.name,
        "description": node.description,
        "nodeType": node.node_type.value,
        "lifecycleStatus": lifecycle,
        "status": status,
        "createdAt": node.created_at.isoformat() + "Z" if node.created_at else None,
        "updatedAt": node.updated_at.isoformat() + "Z" if node.updated_at else None,
    }

    if node.node_type == NodeType.TA:
        base_dict["code"] = node.code
    elif node.node_type == NodeType.COMPOUND:
        base_dict["code"] = node.code
        base_dict["ta_id"] = str(node.parent_id)
        base_dict["indication"] = meta.get("indication", "")
    elif node.node_type == NodeType.STUDY:
        base_dict["study_code"] = node.code
        base_dict["protocolTitle"] = meta.get("protocol_title")
        base_dict["phase"] = meta.get("phase")
        base_dict["product_id"] = str(node.parent_id)
        # Supply study config
        base_dict["config"] = meta.get("study_config", {})
    elif node.node_type == NodeType.ANALYSIS:
        base_dict["study_id"] = str(node.parent_id)
        base_dict["type"] = meta.get("analysis_type", "Interim")

    return base_dict

async def _build_tree(db: AsyncSession) -> list[dict]:
    """Retrieve full active TA->Compound->Study->Analysis tree."""
    # Query all active nodes
    result = await db.execute(
        select(ScopeNode).where(ScopeNode.is_deleted == False)
    )
    all_nodes = result.scalars().all()
    
    # Organize by parent ID
    children_map = {}
    for n in all_nodes:
        if n.parent_id not in children_map:
            children_map[n.parent_id] = []
        children_map[n.parent_id].append(n)
        
    def build_branch(node: ScopeNode):
        f = _format_node(node)
        # Recursively build children
        kids = children_map.get(node.id, [])
        if kids:
            f["children"] = [build_branch(k) for k in kids]
        return f

    # Root nodes (TAs usually have parent_id=None, but in our DB might be specific)
    tas = [n for n in all_nodes if n.node_type == NodeType.TA]
    return [build_branch(ta) for ta in tas]


# ============================================================
# API Endpoints
# ============================================================

@router.get("/tree", summary="Get full pipeline tree")
async def get_pipeline_tree(
    user: CurrentUser,
    db: AsyncSession = Depends(get_db_session)
):
    tree = await _build_tree(db)
    return _ok(tree)


@router.get("/therapeutic-areas", summary="List therapeutic areas")
async def list_therapeutic_areas(
    user: CurrentUser,
    db: AsyncSession = Depends(get_db_session)
):
    res = await db.execute(
        select(ScopeNode)
        .where(
            ScopeNode.node_type == NodeType.TA,
            ScopeNode.is_deleted == False
        )
    )
    tas = res.scalars().all()
    return _ok([_format_node(t) for t in tas])


@router.post("/therapeutic-areas", summary="Create therapeutic area")
async def create_therapeutic_area(
    data: TherapeuticAreaCreate,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db_session)
):
    node = ScopeNode(
        code=data.code,
        name=data.name,
        description=data.description,
        node_type=NodeType.TA,
        lifecycle_status=LifecycleStatus.ONGOING,
        created_by=user.username,
        extra_attrs={},
    )
    db.add(node)
    await db.commit()
    await db.refresh(node)
    
    # Update path
    node.path = f"/{node.id}/"
    await db.commit()
    
    return _ok(_format_node(node))


@router.put("/therapeutic-areas/{ta_id}", summary="Update therapeutic area")
async def update_therapeutic_area(
    ta_id: str,
    data: TherapeuticAreaUpdate,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db_session)
):
    ta_id_int = _parse_id(ta_id)
    if not ta_id_int:
        raise HTTPException(status_code=400, detail="Invalid ta_id format")

    res = await db.execute(select(ScopeNode).where(ScopeNode.id == ta_id_int))
    ta = res.scalar_one_or_none()
    if not ta:
        raise HTTPException(status_code=404, detail="TA not found")

    if data.name is not None:
        ta.name = data.name
    if data.code is not None:
        ta.code = data.code
    if data.description is not None:
        ta.description = data.description

    ta.updated_by = user.username
    await db.commit()
    return _ok(_format_node(ta))


def _parse_id(id_str: str | None) -> int | None:
    """Parse string ID to integer.

    Handles both pure numeric strings ("123") and prefixed strings ("prod-002", "study-004").
    Returns None if the input is None or cannot be parsed.
    """
    if not id_str:
        return None
    try:
        return int(id_str)
    except ValueError:
        # Try to extract numeric part from prefixed IDs like "prod-002" or "study-004"
        match = re.search(r'(\d+)', id_str)
        if match:
            return int(match.group(1))
        return None


@router.get("/products", summary="List products")
async def list_products(
    user: CurrentUser,
    ta_id: str | None = Query(None),
    db: AsyncSession = Depends(get_db_session)
):
    query = select(ScopeNode).where(
        ScopeNode.node_type == NodeType.COMPOUND,
        ScopeNode.is_deleted == False
    )
    ta_id_int = _parse_id(ta_id)
    if ta_id_int:
        query = query.where(ScopeNode.parent_id == ta_id_int)

    res = await db.execute(query)
    prods = res.scalars().all()
    return _ok([_format_node(p) for p in prods])


@router.get("/studies", summary="List studies")
async def list_studies(
    user: CurrentUser,
    product_id: str | None = Query(None),
    db: AsyncSession = Depends(get_db_session)
):
    query = select(ScopeNode).where(
        ScopeNode.node_type == NodeType.STUDY,
        ScopeNode.is_deleted == False
    )
    product_id_int = _parse_id(product_id)
    if product_id_int:
        query = query.where(ScopeNode.parent_id == product_id_int)

    res = await db.execute(query)
    studies = res.scalars().all()
    return _ok([_format_node(s) for s in studies])


@router.get("/studies/{study_id}/config", summary="Get study configuration")
async def get_study_config(
    study_id: str,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db_session)
):
    study_id_int = _parse_id(study_id)
    if not study_id_int:
        raise HTTPException(status_code=400, detail="Invalid study_id format")

    res = await db.execute(select(ScopeNode).where(ScopeNode.id == study_id_int))
    study = res.scalar_one_or_none()
    if not study or study.node_type != NodeType.STUDY:
        raise HTTPException(status_code=404, detail="Study not found")

    meta = study.extra_attrs or {}

    result = {
        "studyId": str(study_id),
        "protocolTitle": meta.get("protocol_title"),
        "phase": meta.get("phase"),
        "config": meta.get("study_config", {}),
    }
    return _ok(result)


@router.put("/studies/{study_id}/config", summary="Update study configuration")
async def update_study_config(
    study_id: str,
    data: StudyConfigUpdate,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db_session)
):
    study_id_int = _parse_id(study_id)
    if not study_id_int:
        raise HTTPException(status_code=400, detail="Invalid study_id format")

    res = await db.execute(select(ScopeNode).where(ScopeNode.id == study_id_int))
    study = res.scalar_one_or_none()
    if not study or study.node_type != NodeType.STUDY:
        raise HTTPException(status_code=404, detail="Study not found")

    meta = copy.deepcopy(study.extra_attrs or {})

    if data.protocol_title is not None:
        meta["protocol_title"] = data.protocol_title
    if data.phase is not None:
        meta["phase"] = data.phase

    config = meta.get("study_config", {})
    if data.sdtm_model_version is not None:
        config["sdtmModelVersion"] = data.sdtm_model_version
    if data.sdtm_ig_version is not None:
        config["sdtmIgVersion"] = data.sdtm_ig_version
    if data.adam_model_version is not None:
        config["adamModelVersion"] = data.adam_model_version
    if data.adam_ig_version is not None:
        config["adamIgVersion"] = data.adam_ig_version
    if data.meddra_version is not None:
        config["meddraVersion"] = data.meddra_version
    if data.whodrug_version is not None:
        config["whodrugVersion"] = data.whodrug_version

    meta["study_config"] = config

    study.extra_attrs = meta
    study.updated_by = user.username
    await db.commit()

    return _ok({"message": "Study configuration updated"})


@router.get("/analyses", summary="List analyses")
async def list_analyses(
    user: CurrentUser,
    study_id: str | None = Query(None),
    db: AsyncSession = Depends(get_db_session)
):
    query = select(ScopeNode).where(
        ScopeNode.node_type == NodeType.ANALYSIS,
        ScopeNode.is_deleted == False
    )
    study_id_int = _parse_id(study_id)
    if study_id_int:
        query = query.where(ScopeNode.parent_id == study_id_int)

    res = await db.execute(query)
    analyses = res.scalars().all()
    return _ok([_format_node(a) for a in analyses])


@router.put("/nodes/{node_id}/archive", summary="Toggle node archive status")
async def archive_node(
    node_id: str,
    data: NodeArchiveRequest,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db_session)
):
    """Toggle archive/active status. We map 'Archived' to soft delete."""
    node_id_int = _parse_id(node_id)
    if not node_id_int:
        raise HTTPException(status_code=400, detail="Invalid node_id format")

    res = await db.execute(select(ScopeNode).where(ScopeNode.id == node_id_int))
    node = res.scalar_one_or_none()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    is_deleted = (data.status == "Archived")

    node.is_deleted = is_deleted
    if is_deleted:
        node.deleted_at = datetime.utcnow()
    else:
        node.deleted_at = None

    node.updated_by = user.username
    await db.commit()

    return _ok({"id": str(node_id), "status": data.status})


@router.post("/nodes", summary="Create a new node")
async def create_node(
    data: NodeCreate,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db_session)
):
    """Create a new TA, Compound, Study, or Analysis."""

    # Map frontend types to DB NodeType
    node_type_map = {
        "TA": NodeType.TA,
        "COMPOUND": NodeType.COMPOUND,
        "STUDY": NodeType.STUDY,
        "ANALYSIS": NodeType.ANALYSIS,
    }
    target_type = node_type_map.get(data.node_type)
    if not target_type:
        raise HTTPException(status_code=400, detail="Invalid node_type")

    parent_id = _parse_id(data.parent_id)

    # Check for duplicate name at the same level
    # A node with the same name should not exist at the same parent level (excluding archived nodes)
    duplicate_check = await db.execute(
        select(ScopeNode).where(
            ScopeNode.name == data.title,
            ScopeNode.parent_id == parent_id,
            ScopeNode.is_deleted == False,  # noqa: E712
        )
    )
    existing_node = duplicate_check.scalar_one_or_none()
    if existing_node:
        raise HTTPException(
            status_code=400,
            detail=f"A node with name '{data.title}' already exists at this level. Please use a different name."
        )

    meta = {}
    code = f"{data.node_type}-{uuid.uuid4().hex[:6].upper()}"

    if target_type == NodeType.STUDY:
        code = data.title
        meta = {
            "phase": data.phase or "Phase I",
            "protocol_title": data.protocol_title or data.title,
            "study_config": {},
        }
    elif target_type == NodeType.ANALYSIS:
        meta = {"analysis_type": "Interim"}

    try:
        node = ScopeNode(
            code=code,
            name=data.title,
            description=data.description,
            node_type=target_type,
            parent_id=parent_id,
            lifecycle_status=LifecycleStatus.ONGOING,
            created_by=user.username,
            extra_attrs=meta,
        )

        db.add(node)
        await db.commit()
        await db.refresh(node)

        # Update path
        if parent_id:
            p_res = await db.execute(select(ScopeNode).where(ScopeNode.id == parent_id))
            parent_node = p_res.scalar_one_or_none()
            if parent_node:
                node.path = f"{parent_node.path}{node.id}/"
                node.depth = parent_node.depth + 1
        else:
            node.path = f"/{node.id}/"
            node.depth = 0

        await db.commit()
        await db.refresh(node)

        return _ok(_format_node(node))
    except Exception as e:
        await db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to create node: {str(e)}")


# ============================================================
# Milestones (Stored in extra_attrs JSONB array on Node)
# ============================================================

def _get_milestone_node(study_id: int, analysis_id: int | None, db: AsyncSession):
    # Depending on level, milestones live on the Study or Analysis node
    target_id = analysis_id if analysis_id else study_id
    query = select(ScopeNode).where(ScopeNode.id == target_id)
    return query


@router.get("/milestones", summary="List milestones")
async def list_milestones(
    user: CurrentUser,
    study_id: str = Query(..., description="Study ID (required)"),
    analysis_id: str | None = Query(None, description="Analysis ID (optional filter)"),
    db: AsyncSession = Depends(get_db_session)
):
    s_id = _parse_id(study_id)
    if not s_id:
        return _ok([])

    # Get study milestones
    res = await db.execute(select(ScopeNode).where(ScopeNode.id == s_id))
    study = res.scalar_one_or_none()
    study_ms = (study.extra_attrs or {}).get("milestones", []) if study else []

    results = [m for m in study_ms if m.get("level") == "Study" and str(m.get("study_id")) == study_id]

    # Get analysis milestones if requested
    if analysis_id:
        a_id = _parse_id(analysis_id)
        if a_id:
            res2 = await db.execute(select(ScopeNode).where(ScopeNode.id == a_id))
            analysis = res2.scalar_one_or_none()
            analysis_ms = (analysis.extra_attrs or {}).get("milestones", []) if analysis else []
            a_results = [m for m in analysis_ms if m.get("level") == "Analysis" and str(m.get("analysis_id")) == analysis_id]
            results.extend(a_results)

    return _ok(results)


@router.post("/milestones", summary="Create milestone")
async def create_milestone(
    data: MilestoneCreate,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db_session)
):
    target_id = _parse_id(data.analysis_id) if data.analysis_id and data.level == 'Analysis' else _parse_id(data.study_id)
    if not target_id:
        raise HTTPException(status_code=400, detail="Invalid study_id or analysis_id format")

    res = await db.execute(select(ScopeNode).where(ScopeNode.id == target_id))
    node = res.scalar_one_or_none()
    if not node:
        raise HTTPException(status_code=404, detail="Target node not found")
        
    meta = copy.deepcopy(node.extra_attrs or {})
    ms_list = meta.get("milestones", [])
    
    milestone = {
        "id": _gen_uuid("ms"),
        "name": data.name,
        "study_id": data.study_id,
        "analysis_id": data.analysis_id,
        "level": data.level,
        "preset_type": data.preset_type,
        "planned_date": data.planned_date,
        "actual_date": data.actual_date,
        "status": data.status,
        "assignee": data.assignee,
        "comment": data.comment,
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
    }
    
    ms_list.append(milestone)
    meta["milestones"] = ms_list
    node.extra_attrs = meta
    node.updated_by = user.username
    await db.commit()
    
    return _ok(milestone)


@router.put("/milestones/{milestone_id}", summary="Update milestone")
async def update_milestone(
    milestone_id: str, 
    data: MilestoneUpdate,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db_session)
):
    # This is a bit brute force, but works fine for DB-backed JSON arrays without direct indexing
    # We must find which node owns this milestone
    all_nodes_with_ms = await db.execute(
        select(ScopeNode).where(ScopeNode.extra_attrs.op("?")("milestones"))
    )
    
    for node in all_nodes_with_ms.scalars():
        meta = copy.deepcopy(node.extra_attrs or {})
        ms_list = meta.get("milestones", [])
        updated = False
        
        for ms in ms_list:
            if ms.get("id") == milestone_id:
                if data.name is not None:
                    ms["name"] = data.name
                if data.planned_date is not None:
                    ms["planned_date"] = data.planned_date
                if data.actual_date is not None:
                    ms["actual_date"] = data.actual_date
                if data.status is not None:
                    ms["status"] = data.status
                if data.assignee is not None:
                    ms["assignee"] = data.assignee
                if data.comment is not None:
                    ms["comment"] = data.comment
                ms["updated_at"] = _now_iso()
                
                updated = True
                
                meta["milestones"] = ms_list
                node.extra_attrs = meta
                node.updated_by = user.username
                await db.commit()
                return _ok(ms)
                
    raise HTTPException(status_code=404, detail=f"Milestone {milestone_id} not found")


@router.delete("/milestones/{milestone_id}", summary="Delete milestone")
async def delete_milestone(
    milestone_id: str,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db_session)
):
    all_nodes_with_ms = await db.execute(
        select(ScopeNode).where(ScopeNode.extra_attrs.op("?")("milestones"))
    )
    
    for node in all_nodes_with_ms.scalars():
        meta = copy.deepcopy(node.extra_attrs or {})
        ms_list = meta.get("milestones", [])
        
        new_list = [ms for ms in ms_list if ms.get("id") != milestone_id]
        if len(new_list) < len(ms_list):
            meta["milestones"] = new_list
            node.extra_attrs = meta
            node.updated_by = user.username
            await db.commit()
            return _ok({"deleted": milestone_id})
            
    raise HTTPException(status_code=404, detail="Milestone not found")


# ============================================================
# Execution Jobs (Stored in ProgrammingTracker)
# ============================================================

@router.get("/execution-jobs", summary="List execution jobs")
async def list_execution_jobs(
    user: CurrentUser,
    analysis_id: str = Query(..., description="Analysis ID (required)"),
    db: AsyncSession = Depends(get_db_session)
):
    a_id = _parse_id(analysis_id)
    if not a_id:
        return _ok([])

    res = await db.execute(
        select(ProgrammingTracker)
        .where(
            ProgrammingTracker.analysis_id == a_id,
            ProgrammingTracker.is_deleted == False
        )
        .order_by(ProgrammingTracker.created_at.desc())
    )
    trackers = res.scalars().all()
    
    # Map pipeline type to short type
    type_map = {
        "SDTM": "SDTM",
        "ADaM": "ADaM",
        "TFL": "TFL",
        "Other_Lookup": "Data Import",
    }

    def format_duration(start: datetime | None, end: datetime | None) -> str | None:
        if not start:
            return None
        calc_end = end or datetime.utcnow()
        seconds = int((calc_end - start).total_seconds())
        
        if seconds < 60:
            return f"{seconds} sec"
        if seconds < 3600:
            return f"{seconds // 60} min"
        hours = seconds // 3600
        mins = (seconds % 3600) // 60
        return f"{hours}h {mins}m" if mins > 0 else f"{hours}h"

    formatted = []
    for t in trackers:
        # Determine pseudo-progress based on prod/qc status
        progress = 0
        status_text = "Queued"
        
        if t.prod_status.value == "Programming":
            progress = 30
            status_text = "Running"
        elif t.prod_status.value in ("Ready_for_QC", "Completed"):
            if t.qc_status.value == "Passed":
                progress = 100
                status_text = "Success"
            elif t.qc_status.value == "Issues_Found":
                progress = 75
                status_text = "Failed"
            elif t.qc_status.value == "In_Progress":
                progress = 80
                status_text = "Running"
            else:
                progress = 50
                status_text = "Running"
                
        # Error text
        error = None
        if status_text == "Failed":
            issues = t.extra_attrs.get("issues", []) if t.extra_attrs else []
            if issues:
                error = issues[0].get("description", "Issues found during QC")
            else:
                error = "Issues found during QC"

        env = "Production"
        if t.extra_attrs:
            env = t.extra_attrs.get("environment", "Production")

        formatted.append({
            "id": str(t.id),
            "name": t.deliverable_name,
            "analysisId": str(t.analysis_id),
            "type": type_map.get(t.deliverable_type.value, "Other"),
            "status": status_text,
            "priority": t.priority.value,
            "environment": env,
            "progress": progress,
            "startTime": t.started_at.isoformat() + "Z" if t.started_at else None,
            "endTime": t.completed_at.isoformat() + "Z" if t.completed_at else None,
            "duration": format_duration(t.started_at, t.completed_at),
            "durationSeconds": int((t.completed_at - t.started_at).total_seconds()) if t.started_at and t.completed_at else None,
            "triggeredBy": t.prod_programmer_id or t.created_by,
            "error": error,
        })
        
    return _ok(formatted)
