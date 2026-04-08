"""Tests for model-level business logic methods on low-coverage models."""
import pytest
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.scope_node import ScopeNode
from app.models.enums import NodeType
from app.models.tracker import ProgrammingTracker
from app.models.mapping_enums import (
    ProdStatus, QCStatus, TrackerStatus, DeliverableType,
    Priority, QCMethod, IssueStatus,
)
from app.models.tracker_issue import TrackerIssue
from app.models.pull_request import MetadataPullRequest
from app.models.mapping_enums import PRStatus, PRItemType
from app.models.specification import Specification
from app.models.mapping_enums import SpecType, SpecStatus
from app.models.mapping_rule import MappingRule
from app.models.mapping_enums import MappingStatus
from app.models.workspace import AnalysisWorkspace
from app.models.enums import WorkspaceType, VisibilityContext
from tests.conftest import TestDataFactory


# ============================================================
# ScopeNode methods
# ============================================================

@pytest.mark.asyncio
async def test_scope_node_build_path(db_session: AsyncSession):
    """ScopeNode.build_path constructs materialized path."""
    node = ScopeNode(
        node_type=NodeType.TA,
        name="Oncology",
        code="TA-ONC",
        created_by="test",
    )
    db_session.add(node)
    await db_session.flush()
    await db_session.refresh(node)

    assert node.build_path() == f"/{node.id}/"
    assert node.build_path(parent_path="/10/") == f"/10/{node.id}/"


@pytest.mark.asyncio
async def test_scope_node_ancestor_descendant(db_session: AsyncSession):
    """ScopeNode.is_ancestor_of / is_descendant_of work correctly."""
    parent = ScopeNode(node_type=NodeType.TA, name="Parent", code="P", created_by="test")
    db_session.add(parent)
    await db_session.flush()
    await db_session.refresh(parent)
    parent.path = f"/{parent.id}/"

    child = ScopeNode(
        node_type=NodeType.STUDY, name="Child", code="C",
        parent_id=parent.id, created_by="test",
    )
    db_session.add(child)
    await db_session.flush()
    await db_session.refresh(child)
    child.path = f"/{parent.id}/{child.id}/"

    assert parent.is_ancestor_of(child) is True
    assert child.is_descendant_of(parent) is True
    assert parent.is_descendant_of(child) is False
    assert child.is_ancestor_of(parent) is False


# ============================================================
# ProgrammingTracker state machine
# ============================================================

async def _create_tracker(db_session: AsyncSession, **overrides):
    """Helper to create a minimal ProgrammingTracker."""
    ta = await TestDataFactory.create_scope_node(db_session, "TA", "TA1")
    analysis = await TestDataFactory.create_scope_node(db_session, "ANALYSIS", "A001", ta.id)
    await db_session.flush()

    defaults = dict(
        analysis_id=analysis.id,
        deliverable_name="AE Summary",
        deliverable_type=DeliverableType.TFL,
        task_name="t_ae_summary",
        prod_status=ProdStatus.NOT_STARTED,
        qc_status=QCStatus.NOT_STARTED,
        status=TrackerStatus.NOT_STARTED,
        priority=Priority.MEDIUM,
        execution_order=1,
        qc_method=QCMethod.DOUBLE_PROGRAMMING,
        prod_programmer_id="dev1",
        created_by="test",
    )
    defaults.update(overrides)
    tracker = ProgrammingTracker(**defaults)
    db_session.add(tracker)
    await db_session.flush()
    await db_session.refresh(tracker)
    return tracker


@pytest.mark.asyncio
async def test_tracker_full_lifecycle(db_session: AsyncSession):
    """ProgrammingTracker: not_started → programming → QC → pass → sign-off."""
    tracker = await _create_tracker(db_session)

    tracker.start_programming()
    assert tracker.prod_status == ProdStatus.PROGRAMMING
    assert tracker.status == TrackerStatus.PROGRAMMING

    tracker.submit_for_qc()
    assert tracker.prod_status == ProdStatus.READY_FOR_QC
    assert tracker.status == TrackerStatus.READY_FOR_QC

    tracker.start_qc()
    assert tracker.qc_status == QCStatus.IN_PROGRESS
    assert tracker.status == TrackerStatus.QC_IN_PROGRESS

    tracker.pass_qc()
    assert tracker.qc_status == QCStatus.PASSED
    assert tracker.prod_status == ProdStatus.COMPLETED
    assert tracker.status == TrackerStatus.PASSED

    tracker.sign_off()
    assert tracker.status == TrackerStatus.SIGNED_OFF


@pytest.mark.asyncio
async def test_tracker_fail_qc(db_session: AsyncSession):
    """ProgrammingTracker: QC fail sets correct status."""
    tracker = await _create_tracker(
        db_session,
        prod_status=ProdStatus.READY_FOR_QC,
        qc_status=QCStatus.IN_PROGRESS,
        status=TrackerStatus.QC_IN_PROGRESS,
    )

    tracker.fail_qc()
    assert tracker.qc_status == QCStatus.ISSUES_FOUND
    assert tracker.status == TrackerStatus.FAILED
    assert tracker.has_open_issues() is True


@pytest.mark.asyncio
async def test_tracker_sign_off_requires_qc_pass(db_session: AsyncSession):
    """ProgrammingTracker.sign_off raises ValueError if QC not passed."""
    tracker = await _create_tracker(
        db_session,
        prod_status=ProdStatus.PROGRAMMING,
        qc_status=QCStatus.NOT_STARTED,
        status=TrackerStatus.PROGRAMMING,
    )

    with pytest.raises(ValueError, match="QC has not passed"):
        tracker.sign_off()


@pytest.mark.asyncio
async def test_tracker_is_complete(db_session: AsyncSession):
    """ProgrammingTracker.is_complete returns True when both prod and QC done."""
    tracker = await _create_tracker(
        db_session,
        prod_status=ProdStatus.COMPLETED,
        qc_status=QCStatus.PASSED,
        status=TrackerStatus.PASSED,
    )

    assert tracker.is_complete() is True
    assert tracker.has_open_issues() is False


@pytest.mark.asyncio
async def test_tracker_report_issues(db_session: AsyncSession):
    """ProgrammingTracker.report_issues sets ISSUES_FOUND."""
    tracker = await _create_tracker(
        db_session,
        qc_status=QCStatus.IN_PROGRESS,
        status=TrackerStatus.QC_IN_PROGRESS,
    )
    tracker.report_issues()
    assert tracker.qc_status == QCStatus.ISSUES_FOUND
    assert tracker.status == TrackerStatus.FAILED


# ============================================================
# TrackerIssue lifecycle
# ============================================================

@pytest.mark.asyncio
async def test_tracker_issue_answer_resolve_close(db_session: AsyncSession):
    """TrackerIssue: open → answer → resolve → close."""
    issue = TrackerIssue(
        tracker_id=1,
        qc_cycle="1",
        finding_description="Wrong column order",
        raised_by="qc_user",
        issue_status=IssueStatus.OPEN,
        created_by="test",
    )
    db_session.add(issue)
    await db_session.flush()

    assert issue.is_open() is True

    issue.answer("Fixed in v2", "dev1", "Developer One")
    assert issue.issue_status == IssueStatus.ANSWERED
    assert issue.developer_response == "Fixed in v2"
    assert issue.is_open() is True  # ANSWERED is still open

    issue.resolve("Confirmed fixed", "qc_user")
    assert issue.issue_status == IssueStatus.RESOLVED
    assert issue.is_open() is False

    issue.close()
    assert issue.issue_status == IssueStatus.CLOSED


# ============================================================
# MetadataPullRequest lifecycle
# ============================================================

@pytest.mark.asyncio
async def test_pr_lifecycle_submit_approve_merge(db_session: AsyncSession):
    """MetadataPullRequest: pending → approve → merge."""
    pr = MetadataPullRequest(
        pr_number="PR-001",
        title="Add DM dataset",
        source_scope_id=10,
        target_scope_id=5,
        item_type=PRItemType.MAPPING,
        item_id=1,
        diff_snapshot={},
        status=PRStatus.PENDING,
        requester_id="dev1",
        created_by="test",
    )
    db_session.add(pr)
    await db_session.flush()

    assert pr.is_pending() is True

    pr.approve("reviewer1", "LGTM")
    assert pr.status == PRStatus.APPROVED
    assert pr.reviewer_id == "reviewer1"

    pr.merge()
    assert pr.status == PRStatus.MERGED


@pytest.mark.asyncio
async def test_pr_reject(db_session: AsyncSession):
    """MetadataPullRequest: reject sets correct status."""
    pr = MetadataPullRequest(
        pr_number="PR-002",
        title="Bad PR",
        source_scope_id=10,
        target_scope_id=5,
        item_type=PRItemType.MAPPING,
        item_id=1,
        diff_snapshot={},
        status=PRStatus.PENDING,
        requester_id="dev1",
        created_by="test",
    )
    db_session.add(pr)
    await db_session.flush()

    pr.reject("reviewer1", "Needs rework")
    assert pr.status == PRStatus.REJECTED
    assert pr.review_comment == "Needs rework"


# ============================================================
# Specification lifecycle
# ============================================================

@pytest.mark.asyncio
async def test_spec_activate_archive(db_session: AsyncSession):
    """Specification: activate → archive."""
    global_node = await TestDataFactory.create_scope_node(db_session, "GLOBAL", "GL")
    spec = Specification(
        scope_node_id=global_node.id,
        name="SDTM v3.4",
        spec_type=SpecType.SDTM,
        version="3.4",
        status=SpecStatus.DRAFT,
        created_by="test",
    )
    db_session.add(spec)
    await db_session.flush()

    assert spec.is_active() is False

    spec.activate()
    assert spec.status == SpecStatus.ACTIVE
    assert spec.is_active() is True
    assert spec.activated_at is not None

    spec.archive()
    assert spec.status == SpecStatus.ARCHIVED
    assert spec.archived_at is not None
    assert spec.is_active() is False


# ============================================================
# MappingRule methods
# ============================================================

@pytest.mark.asyncio
async def test_mapping_rule_set_derivation(db_session: AsyncSession):
    """MappingRule.set_derivation stores multi-modal logic."""
    rule = MappingRule(
        source_item_id=1,
        target_variable_id=1,
        mapping_type="derived",
        status=MappingStatus.DRAFT,
        created_by="test",
    )
    db_session.add(rule)
    await db_session.flush()

    rule.set_derivation(sas_code="x = 1;", r_code="x <- 1", nl_code="Set x to 1")
    await db_session.flush()
    await db_session.refresh(rule)

    assert rule.derivation_logic["sas"] == "x = 1;"
    assert rule.derivation_logic["r"] == "x <- 1"
    assert rule.derivation_logic["nl"] == "Set x to 1"
    assert rule.is_derived() is True


@pytest.mark.asyncio
async def test_mapping_rule_is_validated(db_session: AsyncSession):
    """MappingRule.is_validated returns True when VALIDATED."""
    rule = MappingRule(
        source_item_id=1,
        target_variable_id=1,
        mapping_type="direct",
        status=MappingStatus.VALIDATED,
        created_by="test",
    )
    db_session.add(rule)
    await db_session.flush()

    assert rule.is_validated() is True
    assert rule.is_derived() is False


# ============================================================
# Workspace visibility
# ============================================================

@pytest.mark.asyncio
async def test_workspace_blinded_access(db_session: AsyncSession):
    """AnalysisWorkspace visibility rules work correctly."""
    ws = AnalysisWorkspace(
        scope_node_id=1,
        code="WS-BLIND",
        name="Blinded Workspace",
        workspace_type=WorkspaceType.BLINDED,
        visibility_context=VisibilityContext.BLINDED_ONLY,
        server_host="host",
        server_path="/path",
        created_by="test",
    )
    db_session.add(ws)
    await db_session.flush()

    assert ws.is_blinded() is True
    assert ws.is_accessible_by(VisibilityContext.BLINDED_ONLY) is True
    assert ws.is_accessible_by(VisibilityContext.UNBLINDED_ONLY) is True


@pytest.mark.asyncio
async def test_workspace_unblinded_only_rejects_blinded_user(db_session: AsyncSession):
    """UNBLINDED_ONLY workspace rejects blinded users."""
    ws = AnalysisWorkspace(
        scope_node_id=1,
        code="WS-UB",
        name="Unblinded Workspace",
        workspace_type=WorkspaceType.UNBLINDED,
        visibility_context=VisibilityContext.UNBLINDED_ONLY,
        server_host="host",
        server_path="/path",
        created_by="test",
    )
    db_session.add(ws)
    await db_session.flush()

    assert ws.is_blinded() is False
    assert ws.is_accessible_by(VisibilityContext.BLINDED_ONLY) is False
    assert ws.is_accessible_by(VisibilityContext.UNBLINDED_ONLY) is True


@pytest.mark.asyncio
async def test_workspace_all_visible(db_session: AsyncSession):
    """VisibilityContext.ALL workspace is accessible by everyone."""
    ws = AnalysisWorkspace(
        scope_node_id=1,
        code="WS-ALL",
        name="Public Workspace",
        workspace_type=WorkspaceType.BLINDED,
        visibility_context=VisibilityContext.ALL,
        server_host="host",
        server_path="/path",
        created_by="test",
    )
    db_session.add(ws)
    await db_session.flush()

    assert ws.is_accessible_by(VisibilityContext.BLINDED_ONLY) is True
    assert ws.is_accessible_by(VisibilityContext.UNBLINDED_ONLY) is True


@pytest.mark.asyncio
async def test_workspace_full_path(db_session: AsyncSession):
    """AnalysisWorkspace.full_path property."""
    ws = AnalysisWorkspace(
        scope_node_id=1,
        code="WS-FP",
        name="Test",
        workspace_type=WorkspaceType.BLINDED,
        visibility_context=VisibilityContext.ALL,
        server_host="srv01",
        server_path="/data/ws",
        created_by="test",
    )
    db_session.add(ws)
    await db_session.flush()

    assert ws.full_path == "srv01:/data/ws"
