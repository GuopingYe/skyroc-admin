"""
核心枚举定义
"""
import enum


class NodeType(str, enum.Enum):
    """
    作用域节点类型

    层级关系: CDISC -> Global -> TA -> Compound -> Indication -> Study -> Analysis
    """

    CDISC = "CDISC"  # CDISC 官方标准层
    GLOBAL = "GLOBAL"  # 企业全局标准层
    TA = "TA"  # Therapeutic Area 治疗领域层
    COMPOUND = "COMPOUND"  # 化合物层
    INDICATION = "INDICATION"  # 适应症层
    STUDY = "STUDY"  # 临床试验层
    ANALYSIS = "ANALYSIS"  # 分析层


class LifecycleStatus(str, enum.Enum):
    """
    生命周期状态

    用于影响分析：只扫描 Ongoing 状态的节点
    """

    PLANNING = "Planning"  # 规划中
    ONGOING = "Ongoing"  # 进行中（影响分析的目标）
    TERMINATED = "Terminated"  # 已终止
    COMPLETED = "Completed"  # 已完成


class VisibilityContext(str, enum.Enum):
    """
    可见性上下文（盲态隔离核心）

    核心元数据表必须包含此字段，用于：
    1. 盲态用户只能看到 All 和 Blinded_Only 的数据
    2. 非盲态用户可以看到所有数据
    3. FastAPI 通过依赖注入强制附加此过滤条件
    """

    ALL = "All"  # 所有用户可见
    BLINDED_ONLY = "Blinded_Only"  # 仅盲态团队可见
    UNBLINDED_ONLY = "Unblinded_Only"  # 仅非盲态团队可见


class AuditAction(str, enum.Enum):
    """
    审计操作类型
    """

    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"  # 软删除
    RESTORE = "RESTORE"  # 恢复


class WorkspaceType(str, enum.Enum):
    """
    工作区类型（盲态隔离）
    """

    BLINDED = "Blinded"  # 盲态工作区
    UNBLINDED = "Unblinded"  # 非盲态工作区


class ReferenceDataCategory(str, enum.Enum):
    """Reference data categories for configurable dropdowns and metadata."""

    POPULATION = "POPULATION"
    SDTM_DOMAIN = "SDTM_DOMAIN"
    ADAM_DATASET = "ADAM_DATASET"
    STUDY_PHASE = "STUDY_PHASE"
    STAT_TYPE = "STAT_TYPE"
    DISPLAY_TYPE = "DISPLAY_TYPE"
    ANALYSIS_CATEGORY = "ANALYSIS_CATEGORY"
    THERAPEUTIC_AREA = "THERAPEUTIC_AREA"
    REGULATORY_AGENCY = "REGULATORY_AGENCY"
    CONTROL_TYPE = "CONTROL_TYPE"
    BLINDING_STATUS = "BLINDING_STATUS"
    STUDY_DESIGN = "STUDY_DESIGN"
