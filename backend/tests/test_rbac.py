"""
RBAC (Role-Based Access Control) Tests

Tests verify:
- Role and permission creation
- User-role assignment
- Permission checking
- Superuser privileges
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Permission,
    Role,
    ScopeNode,
    User,
    UserScopeRole,
)
from app.models.enums import LifecycleStatus, NodeType
from app.api.deps import get_current_user
from app.main import app


async def create_scope_node(
    db_session: AsyncSession,
    *,
    code: str,
    name: str,
    node_type: NodeType,
    created_by: str,
    parent: ScopeNode | None = None,
) -> ScopeNode:
    node = ScopeNode(
        code=code,
        name=name,
        node_type=node_type,
        lifecycle_status=LifecycleStatus.ONGOING,
        created_by=created_by,
        parent_id=parent.id if parent else None,
        depth=(parent.depth + 1) if parent else 0,
    )
    db_session.add(node)
    await db_session.flush()
    node.path = f"{parent.path}{node.id}/" if parent and parent.path else f"/{node.id}/"
    await db_session.flush()
    await db_session.refresh(node)
    return node


async def create_user(
    db_session: AsyncSession,
    *,
    username: str,
    email: str,
    is_superuser: bool = False,
) -> User:
    from app.core.security import hash_password

    user = User(
        username=username,
        email=email,
        password_hash=hash_password("testpassword123"),
        display_name=username,
        is_active=True,
        is_superuser=is_superuser,
    )
    db_session.add(user)
    await db_session.flush()
    await db_session.refresh(user)
    return user


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


@pytest.mark.asyncio
class TestAssignTeamEndpoint:
    async def test_assign_team_allows_descendant_scope_assignment(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
    ):
        manager_permission = Permission(
            code="pipeline:assign-team",
            name="Assign Team",
            category="project",
        )
        manager_role = Role(code="line_manager", name="Line Manager", sort_order=65)
        manager_role.permissions.append(manager_permission)

        study_role = Role(code="study_prog", name="Study Programmer", sort_order=40)
        db_session.add_all([manager_permission, manager_role, study_role])
        await db_session.flush()

        ta_scope = await create_scope_node(
            db_session,
            code="TA-001",
            name="TA One",
            node_type=NodeType.TA,
            created_by=test_user.username,
        )
        study_scope = await create_scope_node(
            db_session,
            code="STUDY-001",
            name="Study One",
            node_type=NodeType.STUDY,
            created_by=test_user.username,
            parent=ta_scope,
        )

        manager_assignment = UserScopeRole(
            user_id=test_user.id,
            role_id=manager_role.id,
            scope_node_id=ta_scope.id,
            granted_by="system",
        )
        db_session.add(manager_assignment)
        await db_session.flush()

        target_user = await create_user(
            db_session,
            username="targetuser",
            email="target@example.com",
        )

        async def override_get_current_user():
            return test_user

        app.dependency_overrides[get_current_user] = override_get_current_user
        try:
            response = await client.post(
                "/api/v1/rbac/assign-team",
                json={
                    "user_id": target_user.id,
                    "scope_node_id": study_scope.id,
                    "role_id": study_role.id,
                },
            )
        finally:
            app.dependency_overrides.clear()

        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert data["assignment"]["scope_node"]["id"] == study_scope.id
        assert data["assignment"]["role"]["id"] == study_role.id

    async def test_assign_team_rejects_outside_caller_scope(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
    ):
        manager_permission = Permission(
            code="pipeline:assign-team",
            name="Assign Team",
            category="project",
        )
        manager_role = Role(code="scope_manager", name="Scope Manager", sort_order=65)
        manager_role.permissions.append(manager_permission)
        study_role = Role(code="viewer_role", name="Viewer", sort_order=10)
        db_session.add_all([manager_permission, manager_role, study_role])
        await db_session.flush()

        ta_scope_a = await create_scope_node(
            db_session,
            code="TA-A",
            name="TA A",
            node_type=NodeType.TA,
            created_by=test_user.username,
        )
        ta_scope_b = await create_scope_node(
            db_session,
            code="TA-B",
            name="TA B",
            node_type=NodeType.TA,
            created_by=test_user.username,
        )
        outside_study_scope = await create_scope_node(
            db_session,
            code="STUDY-B",
            name="Study B",
            node_type=NodeType.STUDY,
            created_by=test_user.username,
            parent=ta_scope_b,
        )

        db_session.add(
            UserScopeRole(
                user_id=test_user.id,
                role_id=manager_role.id,
                scope_node_id=ta_scope_a.id,
                granted_by="system",
            )
        )
        await db_session.flush()

        target_user = await create_user(
            db_session,
            username="outsideuser",
            email="outside@example.com",
        )

        async def override_get_current_user():
            return test_user

        app.dependency_overrides[get_current_user] = override_get_current_user
        try:
            response = await client.post(
                "/api/v1/rbac/assign-team",
                json={
                    "user_id": target_user.id,
                    "scope_node_id": outside_study_scope.id,
                    "role_id": study_role.id,
                },
            )
        finally:
            app.dependency_overrides.clear()

        assert response.status_code == 200
        data = response.json()
        assert data["code"] in ["8888", "403"]

    async def test_assign_team_rejects_privilege_escalation(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user: User,
    ):
        manager_permission = Permission(
            code="pipeline:assign-team",
            name="Assign Team",
            category="project",
        )
        manager_role = Role(code="manager_role", name="Manager", sort_order=65)
        manager_role.permissions.append(manager_permission)
        higher_role = Role(code="ta_head_role", name="TA Head", sort_order=80)
        db_session.add_all([manager_permission, manager_role, higher_role])
        await db_session.flush()

        ta_scope = await create_scope_node(
            db_session,
            code="TA-ROOT",
            name="TA Root",
            node_type=NodeType.TA,
            created_by=test_user.username,
        )
        study_scope = await create_scope_node(
            db_session,
            code="STUDY-CHILD",
            name="Study Child",
            node_type=NodeType.STUDY,
            created_by=test_user.username,
            parent=ta_scope,
        )

        db_session.add(
            UserScopeRole(
                user_id=test_user.id,
                role_id=manager_role.id,
                scope_node_id=ta_scope.id,
                granted_by="system",
            )
        )
        await db_session.flush()

        target_user = await create_user(
            db_session,
            username="escalationuser",
            email="escalation@example.com",
        )

        async def override_get_current_user():
            return test_user

        app.dependency_overrides[get_current_user] = override_get_current_user
        try:
            response = await client.post(
                "/api/v1/rbac/assign-team",
                json={
                    "user_id": target_user.id,
                    "scope_node_id": study_scope.id,
                    "role_id": higher_role.id,
                },
            )
        finally:
            app.dependency_overrides.clear()

        assert response.status_code == 200
        data = response.json()
        assert data["code"] in ["8888", "403"]
