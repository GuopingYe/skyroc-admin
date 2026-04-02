"""
数据模型包

核心模型：
- ScopeNode: 树状作用域节点
- AnalysisWorkspace: 分析工作区（盲态隔离）
- AuditLog: 审计日志

Specification 模块：
- Specification: 规范文档表（SDTM/ADaM）

Mapping Studio 模型：
- TargetDataset: 目标数据集
- TargetVariable: 目标变量
- SourceCollection: 源数据集合
- SourceItem: 源数据字段（含 aCRF 锚点）
- MappingRule: 映射规则（核心）

TFL 构建器 (ARS) 模型：
- ARSDisplay: TFL 输出定义
- ARSTemplateBlock: TFL 模板块
- ARSDisplaySection: TFL 区块桥接
- ARSDataBinding: 数据绑定

Programming Tracker 模型：
- ProgrammingTracker: 编程任务追踪（双轨状态机）
- TrackerIssue: QC Issue 记录

Pull Request 模型：
- MetadataPullRequest: 元数据拉取请求

设计原则：
1. 所有模型继承自 Base，确保统一配置
2. 核心元数据表包含 SoftDeleteMixin，满足 21 CFR Part 11 合规
3. 审计日志通过 Event Listener 自动触发，业务代码无感知
"""

from app.models.ars import ARSDataBinding, ARSDisplay, ARSDisplaySection, ARSTemplateBlock
from app.models.ars_study import StatisticsItem, StatisticsSet, StudyDefaults, StudyTemplate
from app.models.shell_library import ShellLibraryTemplate
from app.models.audit_log import AuditLog
from app.models.audit_listener import (
    clear_audit_context,
    get_audit_context,
    register_audit_listeners,
    set_audit_context,
    with_audit_reason,
)
from app.models.base import Base, SoftDeleteMixin, TimestampMixin
from app.models.biomedical_concept import BiomedicalConcept
from app.models.cdisc_sync import CdiscLibraryConfig, CdiscSyncLog
from app.models.codelist import Codelist, CodelistTerm
from app.models.enums import AuditAction, LifecycleStatus, NodeType, ReferenceDataCategory, VisibilityContext, WorkspaceType
from app.models.mapping_enums import (
    DataType,
    DatasetClass,
    DeliverableType,
    IssueStatus,
    MappingStatus,
    OriginType,
    OverrideType,
    PRItemType,
    PRStatus,
    Priority,
    ProdStatus,
    QCMethod,
    QCStatus,
    SourceType,
    SpecStatus,
    SpecType,
    TrackerStatus,
    VariableCore,
)
from app.models.mapping_rule import MappingRule
from app.models.pull_request import MetadataPullRequest
from app.models.rbac import Permission, Role, RolePermission, User, UserScopeRole
from app.models.reference_data import ReferenceData
from app.models.scope_node import ScopeNode
from app.models.source_collection import SourceCollection
from app.models.source_item import SourceItem
from app.models.specification import Specification
from app.models.target_dataset import TargetDataset
from app.models.target_variable import TargetVariable
from app.models.tracker import ProgrammingTracker
from app.models.tracker_issue import TrackerIssue
from app.models.workspace import AnalysisWorkspace

__all__ = [
    # Base
    "Base",
    "TimestampMixin",
    "SoftDeleteMixin",
    # Core Enums
    "NodeType",
    "LifecycleStatus",
    "VisibilityContext",
    "WorkspaceType",
    "AuditAction",
    "ReferenceDataCategory",
    # Mapping Enums
    "DatasetClass",
    "VariableCore",
    "SourceType",
    "MappingStatus",
    "DataType",
    "OverrideType",
    "OriginType",
    "SpecType",
    "SpecStatus",
    "DeliverableType",
    "TrackerStatus",
    "ProdStatus",
    "QCStatus",
    "Priority",
    "IssueStatus",
    "QCMethod",
    "PRStatus",
    "PRItemType",
    # Core Models
    "ScopeNode",
    "AnalysisWorkspace",
    "AuditLog",
    # RBAC Models
    "User",
    "Role",
    "Permission",
    "RolePermission",
    "UserScopeRole",
    # Specification Models
    "Specification",
    # Mapping Models
    "TargetDataset",
    "TargetVariable",
    "SourceCollection",
    "SourceItem",
    "MappingRule",
    # ARS Models
    "ARSDisplay",
    "ARSTemplateBlock",
    "ARSDisplaySection",
    "ARSDataBinding",
    # ARS Study-Level Models
    "StatisticsSet",
    "StatisticsItem",
    "StudyDefaults",
    "StudyTemplate",
    # Shell Library Models
    "ShellLibraryTemplate",
    # Tracker Models
    "ProgrammingTracker",
    "TrackerIssue",
    # Pull Request Models
    "MetadataPullRequest",
    # Reference Data Models
    "ReferenceData",
    # CDISC Standard Models
    "BiomedicalConcept",
    "Codelist",
    "CodelistTerm",
    # CDISC Sync Models
    "CdiscLibraryConfig",
    "CdiscSyncLog",
    # Audit utilities
    "register_audit_listeners",
    "set_audit_context",
    "get_audit_context",
    "clear_audit_context",
    "with_audit_reason",
]