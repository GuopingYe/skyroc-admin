"""
SQLAlchemy 事件监听器 - 自动审计

核心架构设计：
1. 基于 SQLAlchemy Event Listeners (after_insert, after_update, after_delete)
2. 自动抓取 old_values 和 new_values 写入 AuditLog
3. 业务代码无感知，确保 21 CFR Part 11 合规
"""
import logging
from contextvars import ContextVar
from datetime import datetime
from typing import Any

from sqlalchemy import event
from sqlalchemy.orm import InstanceState, Session, object_session

from app.models.audit_log import AuditLog
from app.models.base import SoftDeleteMixin
from app.models.enums import AuditAction

logger = logging.getLogger(__name__)

# 上下文变量：存储当前请求的用户信息
# 在 FastAPI 中间件中设置，在事件监听器中读取
_current_user_id: ContextVar[str | None] = ContextVar("current_user_id", default=None)
_current_user_name: ContextVar[str | None] = ContextVar("current_user_name", default=None)
_current_operation_context: ContextVar[dict[str, Any] | None] = ContextVar(
    "current_operation_context", default=None
)
_current_audit_reason: ContextVar[str | None] = ContextVar("current_audit_reason", default=None)


def set_audit_context(
    user_id: str,
    user_name: str | None = None,
    context: dict[str, Any] | None = None,
    reason: str | None = None,
) -> None:
    """
    设置当前请求的审计上下文

    在 FastAPI 依赖注入中调用，设置当前用户信息

    Args:
        user_id: 用户 ID
        user_name: 用户名
        context: 操作上下文（如请求 ID、客户端 IP）
        reason: 操作原因
    """
    _current_user_id.set(user_id)
    _current_user_name.set(user_name)
    _current_operation_context.set(context)
    _current_audit_reason.set(reason)


def get_audit_context() -> dict[str, Any]:
    """
    获取当前审计上下文

    Returns:
        包含用户信息的字典
    """
    return {
        "user_id": _current_user_id.get(),
        "user_name": _current_user_name.get(),
        "context": _current_operation_context.get(),
        "reason": _current_audit_reason.get(),
    }


def clear_audit_context() -> None:
    """清除审计上下文（请求结束时调用）"""
    _current_user_id.set(None)
    _current_user_name.set(None)
    _current_operation_context.set(None)
    _current_audit_reason.set(None)


def _extract_model_state(instance: Any) -> dict[str, Any]:
    """
    从模型实例提取状态字典

    Args:
        instance: SQLAlchemy 模型实例

    Returns:
        状态字典
    """
    state: InstanceState = instance._sa_instance_state
    result = {}

    for key in state.mapper.columns.keys():
        # 跳过内部属性
        if key.startswith("_"):
            continue
        value = getattr(instance, key, None)
        # 处理特殊类型
        if isinstance(value, datetime):
            value = value.isoformat()
        elif hasattr(value, "value"):  # Enum
            value = value.value
        result[key] = value

    return result


def _compute_diff(old_values: dict[str, Any], new_values: dict[str, Any]) -> dict[str, Any]:
    """
    计算两个状态之间的差异

    Args:
        old_values: 旧值字典
        new_values: 新值字典

    Returns:
        差异字典
    """
    diff = {}
    all_keys = set(old_values.keys()) | set(new_values.keys())

    for key in all_keys:
        old_val = old_values.get(key)
        new_val = new_values.get(key)
        if old_val != new_val:
            diff[key] = {"old": old_val, "new": new_val}

    return diff


def _create_audit_log(
    session: Session,
    action: AuditAction,
    instance: Any,
    old_values: dict[str, Any] | None = None,
    new_values: dict[str, Any] | None = None,
) -> AuditLog:
    """
    创建审计日志记录

    Args:
        session: 数据库会话
        action: 操作类型
        instance: 模型实例
        old_values: 旧值字典
        new_values: 新值字典

    Returns:
        创建的 AuditLog 实例
    """
    context = get_audit_context()
    user_id = context.get("user_id") or "system"
    user_name = context.get("user_name")
    operation_context = context.get("context")
    reason = context.get("reason")

    # 计算差异
    diff_snapshot = None
    if old_values and new_values:
        diff_snapshot = _compute_diff(old_values, new_values)

    # 获取表名和记录 ID
    table_name = instance.__tablename__
    record_id = getattr(instance, "id", 0)

    # 获取关联的 scope_node_id（如果存在）
    scope_node_id = getattr(instance, "scope_node_id", None)

    audit_log = AuditLog(
        action=action,
        table_name=table_name,
        record_id=record_id,
        old_values=old_values,
        new_values=new_values,
        diff_snapshot=diff_snapshot,
        operation_context=operation_context,
        user_id=user_id,
        user_name=user_name,
        reason=reason,
        scope_node_id=scope_node_id,
    )

    session.add(audit_log)
    return audit_log


# ============================================================
# 事件监听器注册函数
# ============================================================


def register_audit_listeners(base_class: type) -> None:
    """
    为所有继承自 Base 的模型注册审计监听器

    Args:
        base_class: SQLAlchemy 声明式基类
    """

    @event.listens_for(base_class, "after_insert")
    def after_insert_listener(mapper, connection, target):
        """INSERT 操作后触发"""
        # 检查是否需要审计（跳过 AuditLog 自身）
        if isinstance(target, AuditLog):
            return

        # 检查模型是否启用了审计
        if not getattr(target.__class__, "__audit_enabled__", True):
            return

        try:
            new_values = _extract_model_state(target)
            session = object_session(target)
            if session:
                _create_audit_log(
                    session=session,
                    action=AuditAction.CREATE,
                    instance=target,
                    new_values=new_values,
                )
        except Exception as e:
            logger.error(f"Audit log creation failed for INSERT: {e}")

    @event.listens_for(base_class, "after_update")
    def after_update_listener(mapper, connection, target):
        """UPDATE 操作后触发"""
        # 检查是否需要审计（跳过 AuditLog 自身）
        if isinstance(target, AuditLog):
            return

        # 检查模型是否启用了审计
        if not getattr(target.__class__, "__audit_enabled__", True):
            return

        try:
            state: InstanceState = target._sa_instance_state

            # 获取变更前的值
            old_values = {}
            new_values = {}

            for attr in state.attrs:
                key = attr.key
                if key.startswith("_"):
                    continue

                # 获取历史值
                hist = state.committed_state.get(key)
                if hist is not None:
                    # 有变更的字段
                    old_values[key] = hist if not isinstance(hist, tuple) else hist[0]
                    new_values[key] = getattr(target, key, None)
                else:
                    # 未变更的字段
                    new_values[key] = getattr(target, key, None)
                    old_values[key] = new_values[key]

            # 只有在有实际变更时才记录
            if old_values != new_values:
                session = object_session(target)
                if session:
                    # 特殊处理：软删除检测
                    if isinstance(target, SoftDeleteMixin) and target.is_deleted:
                        action = AuditAction.DELETE
                    else:
                        action = AuditAction.UPDATE

                    _create_audit_log(
                        session=session,
                        action=action,
                        instance=target,
                        old_values=old_values,
                        new_values=new_values,
                    )
        except Exception as e:
            logger.error(f"Audit log creation failed for UPDATE: {e}")

    @event.listens_for(base_class, "after_delete")
    def after_delete_listener(mapper, connection, target):
        """DELETE 操作后触发"""
        # 检查是否需要审计（跳过 AuditLog 自身）
        if isinstance(target, AuditLog):
            return

        # 检查模型是否启用了审计
        if not getattr(target.__class__, "__audit_enabled__", True):
            return

        try:
            old_values = _extract_model_state(target)
            session = object_session(target)
            if session:
                _create_audit_log(
                    session=session,
                    action=AuditAction.DELETE,
                    instance=target,
                    old_values=old_values,
                )
        except Exception as e:
            logger.error(f"Audit log creation failed for DELETE: {e}")

    logger.info("Audit listeners registered successfully")


# ============================================================
# 审计装饰器
# ============================================================


def audit_enabled(enabled: bool = True):
    """
    类装饰器：控制模型是否启用审计

    用法:
        @audit_enabled(False)
        class SomeModel(Base):
            ...
    """

    def decorator(cls):
        cls.__audit_enabled__ = enabled
        return cls

    return decorator


def with_audit_reason(reason: str):
    """
    上下文管理器：设置审计原因

    用法:
        with with_audit_reason("数据迁移"):
            session.commit()
    """
    from contextlib import contextmanager

    @contextmanager
    def _context():
        _current_audit_reason.set(reason)
        try:
            yield
        finally:
            _current_audit_reason.set(None)

    return _context()