临床数据 MDR 与应用系统 - 后端架构需求说明书 (Backend PRD)
1. 核心定位与技术底座
定位: 医药企业级、强监管 (21 CFR Part 11) 的临床元数据存储与应用流转平台。

技术栈要求:

框架: Python 3.11+, FastAPI (异步 API)。

数据库: PostgreSQL + SQLAlchemy 2.0 (ORM) + Alembic (数据迁移)。

核心要求: 必须全面支持 JSONB 字段以应对非结构化/异构数据（如 vendor eDT, 拖拽生成的 TFL Mock Shells 布局配置）。

部署架构: 必须全容器化 (Docker/containerd)，通过脚本实现无痛升级与基于 Alembic 的精准数据库回滚。

2. 核心数据模型 (The Schema Heart)
后端设计的灵魂在于支持高度复杂的继承关系和合规要求，绝不能使用简单的扁平表。

2.1 树状作用域与生命周期 (Scope Node)
需求: 必须构建一个自引用的 Scope_Node 树状表，支撑 CDISC -> Global -> TA (Therapeutic Area) -> Compound -> Indication -> Study -> Analysis 的层级。

关键字段:

node_type (Enum)。

lifecycle_status (Enum: Planning, Ongoing, Terminated, Completed)：用于精准的影响分析（只扫描 Ongoing 节点）。

版本锁定 (Version Pinning): 当下级（Analysis）继承上级（Global）的元数据时，必须在关联表记录 pinned_version。允许上级升级，下级按需豁免（Exempt）或同步，实现版本解耦。

2.2 盲态与物理隔离 (Blinded/Unblinded Isolation)
需求: 在同一个 Analysis 节点下，支持盲态与非盲态团队的协作隔离。

机制:

新增 Analysis_Workspace 表，映射到实际的 Linux 服务器路径 (/blinded/, /unblinded/)。

核心元数据表（如 Mapping_Rule, ARS_Display）必须包含 visibility_context 字段 (Enum: All, Blinded_Only, Unblinded_Only)。

安全拦截: FastAPI 必须通过依赖注入 (Dependency Injection)，在所有底层 SQLAlchemy 查询中强制附加该字段过滤，严防盲态用户越权拉取非盲态推导逻辑或 TFL 模板。

2.3 业务无感的系统级审计 (Audit Trail)
需求: 满足 21 CFR Part 11。绝不允许物理 DELETE 核心元数据。

机制: 建立独立的 Audit_Log 表。必须使用 SQLAlchemy 的事件监听器 (Event Listeners，如 after_update, after_delete)。当业务代码执行常规操作时，底层自动抓取 old_values 和 new_values (JSONB) 写入审计表，记录 Who, When, What, Why。支持基于此表的“状态回滚”功能。

3. 核心业务模块 API 需求
3.1 全局标准库 (Global Library) 同步引擎
需求: 支持从 CDISC 官方 API 定期拉取标准，并转换为本地结构化数据。

复杂度: 必须支持从 Model 层 (如 SDTM Model 里的 --DTC) 到 IG 层 (如 AE 域的 AEDTC) 的分离与溯源关联。

元数据驱动 API: 后端接口不仅要返回标准数据 (data)，还必须返回动态的表头定义 (schema，包含多语言 Key)，由服务端驱动前端界面的渲染。

3.2 映射工作台 (Mapping Studio) 与解析引擎
需求: 管理源数据 (SDR) 到目标标准 (SDTM/ADaM) 的映射。

数据结构: 必须支持 1:N 映射（如一个 AGE 变量同时映射到 DM.AGE 和 DC.DCORRES）。推导逻辑字段必须是多模态结构（JSONB 包含 sas, r, nl 三种语言逻辑）。

aCRF 引擎 (PDF 处理):

正向生成: 接收 Blank CRF PDF 和映射规则，后端使用 PyMuPDF (fitz) 根据锚点文本自动在 PDF 上绘制红色批注框 (如 VS.VSORRES)。

反向解析: 接收手动微调后的最终版 aCRF，解析 PDF 注释层，提取页码并反写回数据库 (crf_page_numbers)，为生成 Define.xml 铺垫。

3.3 TFL 拖拽构建器 (ARS/Mock Shell Builder)
需求: 基于 CDISC ARS (Analysis Results Standard) 理念，将 TFL 结构化。

存储: 利用 JSONB 存储复杂的嵌套模板树（Table -> Section -> Block -> Row，包括缩进、统计量配置、过滤逻辑）。支持在 Analysis 层级覆盖 (Override) 继承自 Global 的局部样式。

3.4 任务执行与状态追踪 (Programming Tracker)
需求: 替代手工 Excel，实现“元数据驱动的实例化”。

自动同步 (Auto-Sync) API: 对比 Analysis 层级的元数据定义（有多少个 Dataset/TFL）与 Tracker 任务表，自动检测差异并执行 Upsert（新增任务或废弃旧任务）。支持批量分配人员和修改状态。

3.5 标准治理与 PR 审批流 (Pull Request Engine)
需求: 允许一线 Programmer 将 Study 级优秀实践（Mapping 规则、TFL 模板）上推到 Global/TA 库。

机制: 设计 Metadata_Pull_Request 中转表存储 diff_snapshot。

合并前影响预评估 (Pre-Merge Impact Preview): 核心亮点。在 Admin 审批 PR 时，后端必须实时查询并聚合返回：如果批准该变更，将影响多少个生命周期为 Ongoing 的下游 Study/Analysis。

3.6 权限感知的 AI Copilot 中间件
需求: 提供内置智能助手，用于查询变更影响或审计日志。

安全防线: 绝对禁止 AI 直接写 SQL (Text-to-SQL)。必须采用 Function Calling (Tool-Calling) 架构。后端预定义带 RBAC 校验的 Python 工具函数（如 search_audit_log，强制注入当前用户的 allowed_scope_ids）。AI 只能决定调用哪个工具提取参数，由后端执行函数并返回安全结果供 AI 总结。