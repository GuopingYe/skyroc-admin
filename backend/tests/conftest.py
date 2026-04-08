"""
Test Configuration and Fixtures

Provides:
- Async test client for FastAPI
- Test database setup/teardown (SQLite for tests)
- Mock user authentication
- Audit context for compliance testing

Architecture:
- Test and API share a single AsyncSession (via dependency override)
- API handlers call commit() normally — data persists in SQLite file
- Table truncation after each test provides isolation
"""
import asyncio
import os
import tempfile
import uuid
from typing import AsyncGenerator, Generator

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

# Override DATABASE_URL to SQLite BEFORE any app modules are imported
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_clinical_mdr.db"
os.environ["ENVIRONMENT"] = "test"

from app.api.deps import get_current_user, get_db_session
from app.main import app
from app.models import Base, User, set_audit_context, clear_audit_context


# ============================================================
# Test Database Configuration
# ============================================================

_fd, TEST_DB_PATH = tempfile.mkstemp(suffix=".db")
os.close(_fd)
TEST_DATABASE_URL = f"sqlite+aiosqlite:///{TEST_DB_PATH}"

_tables_created = False


def pytest_configure(config):
    """Create tables once before any tests run."""
    global _tables_created
    if _tables_created:
        return

    if os.path.exists(TEST_DB_PATH):
        os.unlink(TEST_DB_PATH)

    from sqlalchemy import create_engine as sync_create_engine
    sync_url = TEST_DATABASE_URL.replace("+aiosqlite", "")
    sync_engine = sync_create_engine(sync_url, echo=False)
    Base.metadata.create_all(sync_engine, checkfirst=True)
    sync_engine.dispose()

    from app.models import register_audit_listeners
    register_audit_listeners(Base)
    _tables_created = True


def pytest_unconfigure(config):
    """Clean up test database file."""
    try:
        if os.path.exists(TEST_DB_PATH):
            os.unlink(TEST_DB_PATH)
    except (FileNotFoundError, PermissionError, OSError):
        pass


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def test_engine():
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
        future=True,
        connect_args={"check_same_thread": False},
    )
    yield engine
    await engine.dispose()


# ============================================================
# Per-test table cleanup (autouse — runs last in teardown)
# ============================================================

@pytest_asyncio.fixture(scope="function", autouse=True)
async def _clean_test_db(test_engine):
    """Truncate all tables after each test for isolation."""
    yield
    async with test_engine.begin() as conn:
        await conn.execute(text("PRAGMA foreign_keys = OFF"))
        for table in reversed(Base.metadata.sorted_tables):
            await conn.execute(table.delete())
        await conn.execute(text("PRAGMA foreign_keys = ON"))


# ============================================================
# DB Session & Client Fixtures
# ============================================================

@pytest_asyncio.fixture(scope="function")
async def db_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Session shared between test code and API (via dependency override).

    API handlers can call commit() normally. Table cleanup provides isolation.
    """
    async with AsyncSession(test_engine, expire_on_commit=False) as session:
        yield session


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Async test client with DB override that shares the test session."""
    from httpx import ASGITransport

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db_session] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        follow_redirects=True,
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


# ============================================================
# Test User Fixtures
# ============================================================

@pytest_asyncio.fixture(scope="function")
async def test_user(db_session: AsyncSession) -> User:
    """Create test user."""
    from app.core.security import hash_password

    user = User(
        username="testuser",
        email="test@example.com",
        password_hash=hash_password("testpassword123"),
        display_name="Test User",
        is_active=True,
        is_superuser=False,
    )
    db_session.add(user)
    await db_session.flush()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture(scope="function")
async def admin_user(db_session: AsyncSession) -> User:
    """Create admin user."""
    from app.core.security import hash_password

    user = User(
        username="admin",
        email="admin@example.com",
        password_hash=hash_password("adminpassword123"),
        display_name="Admin User",
        is_active=True,
        is_superuser=True,
    )
    db_session.add(user)
    await db_session.flush()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture(scope="function")
async def authenticated_client(
    client: AsyncClient,
    test_user: User
) -> AsyncClient:
    """Create authenticated test client."""
    async def override_get_current_user():
        return test_user

    app.dependency_overrides[get_current_user] = override_get_current_user
    set_audit_context(str(test_user.id), test_user.username)
    yield client
    app.dependency_overrides.pop(get_current_user, None)
    clear_audit_context()


@pytest_asyncio.fixture(scope="function")
async def admin_authenticated_client(
    client: AsyncClient,
    admin_user: User,
) -> AsyncClient:
    """Create admin-authenticated test client."""
    async def override_get_current_user():
        return admin_user

    app.dependency_overrides[get_current_user] = override_get_current_user
    set_audit_context(str(admin_user.id), admin_user.username)
    yield client
    app.dependency_overrides.pop(get_current_user, None)
    clear_audit_context()


# ============================================================
# Audit Trail Test Helpers
# ============================================================

@pytest.fixture
def audit_context(test_user: User):
    set_audit_context(str(test_user.id), test_user.username)
    yield


# ============================================================
# Test Data Factories
# ============================================================

class TestDataFactory:
    """Factory for creating test data."""

    @staticmethod
    async def create_scope_node(
        db_session: AsyncSession,
        node_type: str = "TA",
        name: str = "Test TA",
        parent_id: int | None = None,
    ):
        """Create a scope node for testing."""
        from app.models import ScopeNode, NodeType, LifecycleStatus
        from sqlalchemy import select

        code = f"TEST-{node_type}-{uuid.uuid4().hex[:8].upper()}"
        node = ScopeNode(
            code=code,
            name=name,
            node_type=NodeType(node_type),
            lifecycle_status=LifecycleStatus.ONGOING,
            parent_id=parent_id,
            created_by="test_factory",
        )
        db_session.add(node)
        await db_session.flush()

        if parent_id:
            parent_res = await db_session.execute(
                select(ScopeNode).where(ScopeNode.id == parent_id)
            )
            parent_node = parent_res.scalar_one_or_none()
            if parent_node and parent_node.path:
                node.path = f"{parent_node.path}{node.id}/"
                node.depth = parent_node.depth + 1
            else:
                node.path = f"/{node.id}/"
        else:
            node.path = f"/{node.id}/"

        await db_session.flush()
        await db_session.refresh(node)
        return node

    @staticmethod
    async def create_hierarchy(
        db_session: AsyncSession,
        *levels: tuple[str, str],
        commit: bool = False,
    ) -> list:
        """Create a chain of scope nodes, e.g. create_hierarchy(db, ("TA","Oncology"), ("STUDY","S001"))."""
        nodes = []
        parent_id = None
        for node_type, name in levels:
            node = await TestDataFactory.create_scope_node(db_session, node_type, name, parent_id)
            nodes.append(node)
            parent_id = node.id
        if commit:
            await db_session.commit()
        return nodes

    @staticmethod
    async def create_specification(
        db_session: AsyncSession,
        scope_node_id: int,
        name: str = "SDTM v3.4",
        spec_type: str = "SDTM",
        version: str = "3.4",
        status: str = "Active",
    ):
        """Create a Specification for testing."""
        from app.models import Specification
        from app.models.mapping_enums import SpecType, SpecStatus

        spec = Specification(
            scope_node_id=scope_node_id,
            name=name,
            spec_type=SpecType(spec_type),
            version=version,
            status=SpecStatus(status),
            created_by="test_factory",
        )
        db_session.add(spec)
        await db_session.flush()
        await db_session.refresh(spec)
        return spec

    @staticmethod
    async def create_study_config(
        db_session: AsyncSession,
        study_node,
    ):
        """Add study config to a study node's extra_attrs."""
        study_node.extra_attrs = {
            **(study_node.extra_attrs or {}),
            "study_config": {
                "sdtmModelVersion": "CDISC SDTM v3.4",
                "sdtmIgVersion": "SDTMIG v3.4",
            },
            "protocol_title": f"Protocol for {study_node.name}",
            "phase": "Phase II",
        }
        await db_session.flush()
        await db_session.refresh(study_node)
        return study_node.extra_attrs.get("study_config", {})

    @staticmethod
    async def create_milestone(
        db_session: AsyncSession,
        study_node,
    ):
        """Add a milestone to a study node's extra_attrs."""
        ms_id = f"ms-{uuid.uuid4().hex[:8]}"
        milestone = {
            "id": ms_id,
            "name": "Database Lock",
            "study_id": str(study_node.id),
            "analysis_id": None,
            "level": "Study",
            "preset_type": None,
            "planned_date": "2024-12-31",
            "actual_date": None,
            "status": "Planned",
            "assignee": None,
            "comment": None,
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z",
        }
        extra = dict(study_node.extra_attrs or {})
        ms_list = extra.get("milestones", [])
        ms_list.append(milestone)
        extra["milestones"] = ms_list
        study_node.extra_attrs = extra
        await db_session.flush()
        await db_session.refresh(study_node)
        return milestone

    @staticmethod
    async def create_role(
        db_session: AsyncSession,
        code: str = "test_role",
        name: str = "Test Role",
    ):
        """Create a role for testing."""
        from app.models import Role

        role = Role(
            code=code,
            name=name,
            description=f"Test role: {name}",
        )
        db_session.add(role)
        await db_session.flush()
        await db_session.refresh(role)
        return role


@pytest.fixture
def data_factory():
    return TestDataFactory
