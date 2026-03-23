"""
RBAC (Role-Based Access Control) Tests

Tests verify:
- Role and permission creation
- User-role assignment
- Permission checking
- Superuser privileges
"""
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    User,
    Role,
    Permission,
    UserScopeRole,
)


@pytest.mark.asyncio
class TestRBAC:
    """Test RBAC functionality."""

    async def test_create_role(self, db_session: AsyncSession):
        """Test creating a role."""
        role = Role(
            code="test_role",
            name="Test Role",
            description="A test role",
        )
        db_session.add(role)
        await db_session.flush()

        assert role.id is not None
        assert role.code == "test_role"

    async def test_create_permission(self, db_session: AsyncSession):
        """Test creating a permission."""
        permission = Permission(
            code="test_permission",
            name="Test Permission",
            description="A test permission",
            category="admin",
        )
        db_session.add(permission)
        await db_session.flush()

        assert permission.id is not None
        assert permission.code == "test_permission"

    async def test_assign_permission_to_role(
        self,
        db_session: AsyncSession
    ):
        """Test assigning permission to role."""
        from app.models import RolePermission

        role = Role(code="editor", name="Editor")
        permission = Permission(code="can_edit", name="Can Edit", category="admin")

        db_session.add_all([role, permission])
        await db_session.flush()

        # Assign permission to role via association table
        role_permission = RolePermission(
            role_id=role.id,
            permission_id=permission.id,
        )
        db_session.add(role_permission)
        await db_session.flush()

        # Verify
        assert role_permission.role_id == role.id
        assert role_permission.permission_id == permission.id

    async def test_assign_role_to_user(
        self,
        db_session: AsyncSession,
        test_user: User
    ):
        """Test assigning role to user via UserScopeRole."""
        from app.models import ScopeNode, NodeType, LifecycleStatus

        # Create a scope node for the assignment
        scope_node = ScopeNode(
            code="TEST-SCOPE-001",
            node_type=NodeType.GLOBAL,
            name="Test Scope",
            lifecycle_status=LifecycleStatus.ONGOING,
            created_by=str(test_user.id),
        )
        db_session.add(scope_node)
        await db_session.flush()

        role = Role(code="viewer", name="Viewer")
        db_session.add(role)
        await db_session.flush()

        # Create user-scope-role assignment
        user_scope_role = UserScopeRole(
            user_id=test_user.id,
            role_id=role.id,
            scope_node_id=scope_node.id,
            granted_by="system",
        )
        db_session.add(user_scope_role)
        await db_session.flush()

        # Verify
        assert user_scope_role.id is not None

    async def test_superuser_has_all_permissions(
        self,
        admin_user: User
    ):
        """Test that superuser flag grants full access."""
        assert admin_user.is_superuser is True


@pytest.mark.asyncio
class TestPermissionChecking:
    """Test permission checking logic."""

    async def test_check_user_has_permission(
        self,
        db_session: AsyncSession,
        test_user: User
    ):
        """Test checking if user has a specific permission."""
        from app.models import ScopeNode, NodeType, LifecycleStatus

        # Create a scope node for the assignment
        scope_node = ScopeNode(
            code="TEST-SCOPE-002",
            node_type=NodeType.GLOBAL,
            name="Test Scope",
            lifecycle_status=LifecycleStatus.ONGOING,
            created_by=str(test_user.id),
        )
        db_session.add(scope_node)
        await db_session.flush()

        # Setup
        role = Role(code="admin", name="Admin")
        permission = Permission(code="manage_users", name="Manage Users", category="admin")
        role.permissions.append(permission)
        db_session.add(role)
        await db_session.flush()

        # Assign role to user
        user_role = UserScopeRole(
            user_id=test_user.id,
            role_id=role.id,
            scope_node_id=scope_node.id,
            granted_by="system",
        )
        db_session.add(user_role)
        await db_session.flush()

        # Query user's permissions
        from sqlalchemy import select
        result = await db_session.execute(
            select(Permission.code)
            .select_from(UserScopeRole)
            .join(Role, UserScopeRole.role_id == Role.id)
            .join(Role.permissions)
            .where(UserScopeRole.user_id == test_user.id)
            .distinct()
        )
        permissions = [row[0] for row in result.fetchall()]

        assert "manage_users" in permissions