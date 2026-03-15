"""
Mapping Studio 相关枚举定义
"""
import enum


class DatasetClass(str, enum.Enum):
    """
    SDTM 数据集分类

    参考 CDISC SDTM IG v3.4 + SDTM Model v2.0

    分层结构:
    1. General Observations (抽象基类) - 所有观测类共有的泛化变量模板
       - 不是具体的 Dataset，而是变量模板库
    2. Observation Classes (观测类) - 具体数据域
       - Findings, Events, Interventions, Findings About
    3. Special Classes (特殊类) - 独立数据模型
       - Special Purpose, Trial Design, Relationship
    4. Associated Persons (相关人员) - AP 域专用变量模板
    5. QRS (量表库) - 基于 Findings 的特殊扩展

    注意: 数据库存储值使用下划线格式 (如 SPECIAL_PURPOSE)
          显示时通过 .display_name 属性获取友好名称
    """

    # === General Observations (抽象基类) ===
    GENERAL_OBSERVATIONS = "GENERAL_OBSERVATIONS"

    # === Observation Classes (观测类) ===
    INTERVENTIONS = "INTERVENTIONS"
    EVENTS = "EVENTS"
    FINDINGS = "FINDINGS"
    FINDINGS_ABOUT = "FINDINGS_ABOUT"

    # === Special Classes (特殊类) ===
    SPECIAL_PURPOSE = "SPECIAL_PURPOSE"
    TRIAL_DESIGN = "TRIAL_DESIGN"
    RELATIONSHIP = "RELATIONSHIP"

    # === Associated Persons (相关人员) ===
    ASSOCIATED_PERSONS = "ASSOCIATED_PERSONS"

    # === QRS (量表库) ===
    QRS = "QRS"

    @property
    def display_name(self) -> str:
        """返回用于显示的友好名称（带空格）"""
        display_names = {
            DatasetClass.GENERAL_OBSERVATIONS: "General Observations",
            DatasetClass.INTERVENTIONS: "Interventions",
            DatasetClass.EVENTS: "Events",
            DatasetClass.FINDINGS: "Findings",
            DatasetClass.FINDINGS_ABOUT: "Findings About",
            DatasetClass.SPECIAL_PURPOSE: "Special Purpose",
            DatasetClass.TRIAL_DESIGN: "Trial Design",
            DatasetClass.RELATIONSHIP: "Relationship",
            DatasetClass.ASSOCIATED_PERSONS: "Associated Persons",
            DatasetClass.QRS: "QRS",
        }
        return display_names.get(self, self.value)


class VariableCore(str, enum.Enum):
    """
    变量核心性

    SDTM 标准中的变量分类
    """

    REQ = "Req"  # Required - 必须变量
    PERM = "Perm"  # Permissible - 允许变量
    EXP = "Exp"  # Expected - 期望变量


class SourceType(str, enum.Enum):
    """
    源数据类型
    """

    EDC = "EDC"  # 电子数据采集系统
    EDT = "eDT"  # 电子数据传输
    SAAS = "SaaS"  # 第三方 SaaS 系统
    MANUAL = "Manual"  # 手动导入


class MappingStatus(str, enum.Enum):
    """
    映射规则状态

    生命周期状态流转：Draft -> In_Production -> QCing -> Validated
    """

    DRAFT = "Draft"  # 草稿
    IN_PRODUCTION = "In_Production"  # 生产中
    QCING = "QCing"  # QC 审核中
    VALIDATED = "Validated"  # 已验证通过


class DataType(str, enum.Enum):
    """
    数据类型
    """

    CHAR = "Char"  # 字符型
    NUM = "Num"  # 数值型
    DATE = "Date"  # 日期型
    DATETIME = "DateTime"  # 日期时间型
    TIME = "Time"  # 时间型


class OverrideType(str, enum.Enum):
    """
    Spec 继承覆盖类型

    用于 Analysis 继承 Study 的 Spec 时标记变更类型
    """

    NONE = "None"  # 完全继承，无修改
    MODIFIED = "Modified"  # 已修改
    ADDED = "Added"  # 新增
    DELETED = "Deleted"  # 已删除（软删除标记）


class OriginType(str, enum.Enum):
    """
    变量来源类型

    标识变量的出处，用于追踪标准继承链
    """

    CDISC = "CDISC"  # CDISC 官方标准
    SPONSOR_STANDARD = "Sponsor_Standard"  # 申办方企业标准
    TA_STANDARD = "TA_Standard"  # 治疗领域标准
    STUDY_CUSTOM = "Study_Custom"  # 试验自定义


class SpecType(str, enum.Enum):
    """
    规范文档类型
    """

    SDTM = "SDTM"  # SDTM 规范
    ADAM = "ADaM"  # ADaM 规范
    QRS = "QRS"  # Questionnaires, Ratings, and Scales 量表规范


class SpecStatus(str, enum.Enum):
    """
    规范文档状态
    """

    DRAFT = "Draft"  # 草稿
    ACTIVE = "Active"  # 激活
    ARCHIVED = "Archived"  # 归档


class DeliverableType(str, enum.Enum):
    """
    交付物类型

    Programming Tracker 中使用
    """

    SDTM = "SDTM"  # SDTM 数据集
    ADAM = "ADaM"  # ADaM 数据集
    TFL = "TFL"  # 表格/图表/列表
    OTHER_LOOKUP = "Other_Lookup"  # 其他/查询表


class TrackerStatus(str, enum.Enum):
    """
    任务状态（旧版，保留兼容）

    Programming Tracker 中使用
    """

    NOT_STARTED = "Not_Started"  # 未开始
    PROGRAMMING = "Programming"  # 编程中
    READY_FOR_QC = "Ready_for_QC"  # 待 QC
    QC_IN_PROGRESS = "QC_In_Progress"  # QC 进行中
    PASSED = "Passed"  # 已通过
    FAILED = "Failed"  # 未通过


class ProdStatus(str, enum.Enum):
    """
    生产状态（双轨状态机 - 生产侧）
    """

    NOT_STARTED = "Not_Started"  # 未开始
    PROGRAMMING = "Programming"  # 编程中
    READY_FOR_QC = "Ready_for_QC"  # 待 QC
    COMPLETED = "Completed"  # 已完成


class QCStatus(str, enum.Enum):
    """
    QC 状态（双轨状态机 - QC 侧）
    """

    NOT_STARTED = "Not_Started"  # 未开始
    IN_PROGRESS = "In_Progress"  # 进行中
    ISSUES_FOUND = "Issues_Found"  # 发现问题
    PASSED = "Passed"  # 已通过


class Priority(str, enum.Enum):
    """
    任务优先级
    """

    HIGH = "High"  # 高优先级
    MEDIUM = "Medium"  # 中优先级
    LOW = "Low"  # 低优先级


class IssueStatus(str, enum.Enum):
    """
    Issue 状态
    """

    OPEN = "Open"  # 待处理
    ANSWERED = "Answered"  # 已回复
    RESOLVED = "Resolved"  # 已解决
    CLOSED = "Closed"  # 已关闭


class QCMethod(str, enum.Enum):
    """
    QC 方法
    """

    DOUBLE_PROGRAMMING = "Double_Programming"  # 双重编程
    SPOT_CHECK = "Spot_Check"  # 抽查
    REVIEW = "Review"  # 审阅


class PRStatus(str, enum.Enum):
    """
    Pull Request 状态
    """

    PENDING = "Pending"  # 待审批
    APPROVED = "Approved"  # 已批准
    REJECTED = "Rejected"  # 已拒绝
    MERGED = "Merged"  # 已合并


class PRItemType(str, enum.Enum):
    """
    Pull Request 项目类型
    """

    TFL = "TFL"  # TFL 模板
    MAPPING = "Mapping"  # 映射规则
    SPEC = "Spec"  # 数据集规格