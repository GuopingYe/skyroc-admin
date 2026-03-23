"""
RBAC 模型 - 分层级、分作用域的角色访问控制

核心架构设计：
1. User: 用户基础信息
2. Role: 角色定义（如 Admin, Programmer, QC Reviewer）
3. Permission: 细粒度权限（如 'mapping:edit', 'pr:approve'）
4. role_permissions: 角色-权限多对多关联表
5. user_scope_roles: 用户-作用域-角色三方关联表（核心）

权限继承逻辑：
- 用户在某个 ScopeNode 上被分配角色后，自动拥有该节点及其所有后代节点的对应权限
- 通过 ScopeNode.path 字段实现快速的前缀匹配查询
"""
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, func
from app.models.base import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, SoftDeleteMixin, TimestampMixin


class User(Base, TimestampMixin, SoftDeleteMixin):
    """
    用户表

    存储系统用户基础信息，支持：
    - 本地认证（username/password）
    - LDAP/SSO 集成（通过 external_id）
    """

    __tablename__ = "users"

    # 主键
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # 用户标识
    username: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
        comment="用户名（登录标识）",
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
        comment="邮箱地址",
    )
    display_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        comment="显示名称",
    )

    # 认证信息
    password_hash: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        comment="密码哈希（本地认证）",
    )
    external_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        unique=True,
        index=True,
        comment="外部系统 ID（LDAP/SSO）",
    )

    # 状态
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        index=True,
        comment="是否激活",
    )
    is_superuser: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        comment="是否超级管理员（跳过所有权限检查）",
    )

    # 扩展属性
    department: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        comment="部门",
    )
    extra_attrs: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="扩展属性",
    )

    # 审计字段
    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="最后登录时间",
    )
    created_by: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="system",
        comment="创建者",
    )

    # ============================================================
    # Relationships
    # ============================================================
    scope_roles: Mapped[list["UserScopeRole"]] = relationship(
        "UserScopeRole",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    # ============================================================
    # 表级约束
    # ============================================================
    __table_args__ = (
        Index("ix_users_active", "is_active", "is_deleted"),
        {"comment": "用户表"},
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, username={self.username})>"


class Role(Base, TimestampMixin, SoftDeleteMixin):
    """
    角色表

    定义系统角色，如：
    - Super Admin: 全部权限
    - Admin: 管理权限
    - Study Lead: 研究负责人
    - Programmer: 程序员
    - QC Reviewer: QC 审核员
    - Viewer: 只读访问
    """

    __tablename__ = "roles"

    # 主键
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # 角色标识
    code: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
        comment="角色编码（如 SUPER_ADMIN, PROGRAMMER）",
    )
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="角色名称（显示用）",
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="角色描述",
    )

    # 角色属性
    is_system: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        comment="是否系统内置角色（不可删除）",
    )
    color: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
        comment="前端显示颜色",
    )
    sort_order: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="排序序号",
    )

    # 审计字段
    created_by: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="system",
        comment="创建者",
    )

    # ============================================================
    # Relationships
    # ============================================================
    permissions: Mapped[list["Permission"]] = relationship(
        "Permission",
        secondary="role_permissions",
        back_populates="roles",
    )
    user_scope_roles: Mapped[list["UserScopeRole"]] = relationship(
        "UserScopeRole",
        back_populates="role",
        cascade="all, delete-orphan",
    )

    # ============================================================
    # 表级约束
    # ============================================================
    __table_args__ = (
        Index("ix_roles_active", "is_deleted", "is_system"),
        {"comment": "角色表"},
    )

    def __repr__(self) -> str:
        return f"<Role(id={self.id}, code={self.code})>"


class Permission(Base, TimestampMixin):
    """
    权限表

    定义细粒度权限，格式为 `资源:操作`：
    - mapping:edit - 编辑映射
    - mapping:view - 查看映射
    - pr:approve - 审批 PR
    - study:create - 创建研究
    - user:manage - 用户管理
    """

    __tablename__ = "permissions"

    # 主键
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # 权限标识
    code: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
        comment="权限编码（如 mapping:edit）",
    )
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="权限名称（显示用）",
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="权限描述",
    )

    # 分类
    category: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        comment="权限分类（project/metadata/qc/admin）",
    )
    sort_order: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="排序序号",
    )

    # ============================================================
    # Relationships
    # ============================================================
    roles: Mapped[list["Role"]] = relationship(
        "Role",
        secondary="role_permissions",
        back_populates="permissions",
    )

    # ============================================================
    # 表级约束
    # ============================================================
    __table_args__ = (
        {"comment": "权限表"},
    )

    def __repr__(self) -> str:
        return f"<Permission(id={self.id}, code={self.code})>"


class RolePermission(Base):
    """
    角色-权限关联表

    多对多关系：一个角色包含多个权限，一个权限可属于多个角色
    """

    __tablename__ = "role_permissions"

    # 复合主键
    role_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("roles.id", ondelete="CASCADE"),
        primary_key=True,
        comment="角色 ID",
    )
    permission_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("permissions.id", ondelete="CASCADE"),
        primary_key=True,
        comment="权限 ID",
    )

    # 审计字段
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # ============================================================
    # 表级约束
    # ============================================================
    __table_args__ = (
        {"comment": "角色-权限关联表"},
    )

    def __repr__(self) -> str:
        return f"<RolePermission(role_id={self.role_id}, permission_id={self.permission_id})>"


class UserScopeRole(Base, TimestampMixin):
    """
    用户-作用域-角色关联表（核心三方关联）

    这是 RBAC 的核心表，实现分层级权限继承：
    - 用户在某个 ScopeNode 上被分配角色
    - 通过 ScopeNode.path 字段，权限自动继承到所有后代节点
    """

    __tablename__ = "user_scope_roles"

    # 主键
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # 三方关联
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="用户 ID",
    )
    scope_node_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("scope_nodes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="作用域节点 ID",
    )
    role_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("roles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="角色 ID",
    )

    # 授权信息
    granted_by: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="授权人",
    )
    granted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="授权时间",
    )

    # 有效期（可选）
    valid_from: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="生效时间",
    )
    valid_until: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="失效时间",
    )

    # 扩展属性
    extra_attrs: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="扩展属性",
    )

    # ============================================================
    # Relationships
    # ============================================================
    user: Mapped["User"] = relationship(
        "User",
        back_populates="scope_roles",
    )
    scope_node: Mapped["ScopeNode"] = relationship(
        "ScopeNode",
        back_populates="user_scope_roles",
    )
    role: Mapped["Role"] = relationship(
        "Role",
        back_populates="user_scope_roles",
    )

    # ============================================================
    # 表级约束
    # ============================================================
    __table_args__ = (
        # 同一用户在同一作用域上不能重复分配同一角色
        UniqueConstraint("user_id", "scope_node_id", "role_id", name="uq_user_scope_role"),
        Index("ix_user_scope_roles_user_scope", "user_id", "scope_node_id"),
        {"comment": "用户-作用域-角色关联表"},
    )

    def __repr__(self) -> str:
        return f"<UserScopeRole(user_id={self.user_id}, scope_node_id={self.scope_node_id}, role_id={self.role_id})>"


# 延迟导入避免循环引用
from app.models.scope_node import ScopeNode