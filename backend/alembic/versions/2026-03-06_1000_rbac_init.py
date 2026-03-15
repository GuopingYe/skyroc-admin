"""add rbac models

Revision ID: rbac_init
Revises: qrs_enum_001
Create Date: 2026-03-06 10:00:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'rbac_init'
down_revision: Union[str, None] = 'qrs_enum_001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ============================================================
    # 1. 创建 users 表
    # ============================================================
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('username', sa.String(length=100), nullable=False, comment='用户名（登录标识）'),
        sa.Column('email', sa.String(length=255), nullable=False, comment='邮箱地址'),
        sa.Column('display_name', sa.String(length=255), nullable=True, comment='显示名称'),
        sa.Column('password_hash', sa.String(length=255), nullable=True, comment='密码哈希（本地认证）'),
        sa.Column('external_id', sa.String(length=255), nullable=True, comment='外部系统 ID（LDAP/SSO）'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true', comment='是否激活'),
        sa.Column('is_superuser', sa.Boolean(), nullable=False, server_default='false', comment='是否超级管理员'),
        sa.Column('department', sa.String(length=255), nullable=True, comment='部门'),
        sa.Column('extra_attrs', postgresql.JSONB(), nullable=True, comment='扩展属性'),
        sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True, comment='最后登录时间'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('created_by', sa.String(length=100), nullable=False, server_default='system', comment='创建者'),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('deleted_by', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('username'),
        sa.UniqueConstraint('email'),
        sa.UniqueConstraint('external_id'),
        comment='用户表'
    )
    op.create_index('ix_users_active', 'users', ['is_active', 'is_deleted'])
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_external_id'), 'users', ['external_id'], unique=True)

    # ============================================================
    # 2. 创建 permissions 表
    # ============================================================
    op.create_table(
        'permissions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('code', sa.String(length=100), nullable=False, comment='权限编码'),
        sa.Column('name', sa.String(length=100), nullable=False, comment='权限名称'),
        sa.Column('description', sa.Text(), nullable=True, comment='权限描述'),
        sa.Column('category', sa.String(length=50), nullable=False, comment='权限分类'),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code'),
        comment='权限表'
    )
    op.create_index('ix_permissions_category', 'permissions', ['category'])
    op.create_index(op.f('ix_permissions_code'), 'permissions', ['code'], unique=True)

    # ============================================================
    # 3. 创建 roles 表
    # ============================================================
    op.create_table(
        'roles',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False, comment='角色编码'),
        sa.Column('name', sa.String(length=100), nullable=False, comment='角色名称'),
        sa.Column('description', sa.Text(), nullable=True, comment='角色描述'),
        sa.Column('is_system', sa.Boolean(), nullable=False, server_default='false', comment='是否系统内置'),
        sa.Column('color', sa.String(length=20), nullable=True, comment='前端显示颜色'),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('created_by', sa.String(length=100), nullable=False, server_default='system'),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('deleted_by', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code'),
        comment='角色表'
    )
    op.create_index('ix_roles_active', 'roles', ['is_deleted', 'is_system'])
    op.create_index(op.f('ix_roles_code'), 'roles', ['code'], unique=True)

    # ============================================================
    # 4. 创建 role_permissions 关联表
    # ============================================================
    op.create_table(
        'role_permissions',
        sa.Column('role_id', sa.Integer(), nullable=False, comment='角色 ID'),
        sa.Column('permission_id', sa.Integer(), nullable=False, comment='权限 ID'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['permission_id'], ['permissions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('role_id', 'permission_id'),
        comment='角色-权限关联表'
    )

    # ============================================================
    # 5. 创建 user_scope_roles 关联表（核心）
    # ============================================================
    op.create_table(
        'user_scope_roles',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False, comment='用户 ID'),
        sa.Column('scope_node_id', sa.Integer(), nullable=False, comment='作用域节点 ID'),
        sa.Column('role_id', sa.Integer(), nullable=False, comment='角色 ID'),
        sa.Column('granted_by', sa.String(length=100), nullable=False, comment='授权人'),
        sa.Column('granted_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('valid_from', sa.DateTime(timezone=True), nullable=True),
        sa.Column('valid_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('extra_attrs', postgresql.JSONB(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['scope_node_id'], ['scope_nodes.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'scope_node_id', 'role_id', name='uq_user_scope_role'),
        comment='用户-作用域-角色关联表'
    )
    op.create_index('ix_user_scope_roles_user_scope', 'user_scope_roles', ['user_id', 'scope_node_id'])
    op.create_index(op.f('ix_user_scope_roles_user_id'), 'user_scope_roles', ['user_id'])
    op.create_index(op.f('ix_user_scope_roles_scope_node_id'), 'user_scope_roles', ['scope_node_id'])
    op.create_index(op.f('ix_user_scope_roles_role_id'), 'user_scope_roles', ['role_id'])


def downgrade() -> None:
    # 按创建的逆序删除
    op.drop_table('user_scope_roles')
    op.drop_table('role_permissions')
    op.drop_table('roles')
    op.drop_table('permissions')
    op.drop_table('users')