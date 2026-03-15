---
description: 核心后端架构规范。包含 FastAPI, SQLAlchemy, 树状 Scope_Node 设计、盲态隔离机制和自动化审计 (Audit Trail) 的规则。在进行任何数据库设计或 API 开发时调用。
---
# Backend Architecture Rules

## 技术栈
- Python 3.11+, FastAPI, SQLAlchemy 2.0, Alembic, PostgreSQL, PyMuPDF。

## 核心设计模式 (严格执行)
1. **树状层级 (Scope Node):** 标准必须采用 `CDISC -> Global -> TA -> Compound -> Indication -> Study -> Analysis` 的层级继承模型。
2. **盲态隔离 (Blinded/Unblinded):** 所有的查询 API 必须经过 RBAC 校验。底层 SQL 查询强制带入 `visibility_context` 过滤条件，严防盲态穿透。
3. **自动化审计 (Event Listeners):** 利用 SQLAlchemy 事件监听器拦截核心表的 UPDATE，自动抓取旧值和新值存入 `Audit_Log` 表。
4. **异构数据处理:** 针对 eDT 等 Vendor 数据字典，强制使用 `JSONB` 字段存储。

## 启动方式
1. 使用 backend\scripts\start_dev.py 启动