---
description: 临床标准的自下而上治理引擎。包含 Pull Request (PR) 审批流、版本锁定 (Version Pinning) 和影响分析 (Impact Preview) 的业务逻辑。
---
# PR & Governance Workflow

1. **版本锁定:** Analysis 级别的子节点继承 Global 标准时，必须记录 `pinned_version`，实现版本解耦。
2. **影响分析:** 在 PR 合并前，必须能通过联表查询 `Scope_Node` 算出波及的 `Ongoing` 状态的项目。
3. **隔离事务:** 合并操作必须在 `session.commit()` 中保持强一致性。