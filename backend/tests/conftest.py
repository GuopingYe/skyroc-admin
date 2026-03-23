"""
Test Configuration and Fixtures

Provides:
- Async test client for FastAPI
- Test database setup/teardown
- Mock user authentication
- Audit context for compliance testing
"""
import asyncio
import os
import tempfile
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Generator

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.api.deps import get_current_user, get_db_session
from app.database import async_session_factory, engine
from app.main import app
from app.models import Base, User, set_audit_context


# ============================================================
# Test Database Configuration
# ============================================================

# Use file-based SQLite for tests
# Close the temp file immediately to avoid Windows file locking issues
TEST_DB_FILE = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
TEST_DB_PATH = TEST_DB_FILE.name
TEST_DB_FILE.close()  # Close file handle on Windows to allow deletion
TEST_DATABASE_URL = f"sqlite+aiosqlite:///{TEST_DB_PATH}"

# Global state for table creation (used by pytest_configure)
_tables_created = False


def pytest_configure(config):
    """Set up test database once before any tests run."""
    global _tables_created

    if _tables_created:
        return

    # Delete existing db file if it exists (cleanup from previous run)
    if os.path.exists(TEST_DB_PATH):
        os.unlink(TEST_DB_PATH)

    # Create sync engine just for table creation
    from sqlalchemy import create_engine as sync_create_engine
    sync_url = TEST_DATABASE_URL.replace("+aiosqlite", "")
    sync_engine = sync_create_engine(sync_url, echo=False)

    Base.metadata.create_all(sync_engine, checkfirst=True)
    sync_engine.dispose()

    # Register audit listeners for tests
    from app.models import register_audit_listeners
    register_audit_listeners(Base)

    _tables_created = True


def pytest_unconfigure(config):
    """Clean up test database after all tests."""
    try:
        if os.path.exists(TEST_DB_PATH):
            os.unlink(TEST_DB_PATH)
    except (FileNotFoundError, PermissionError, OSError):
        pass


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def test_engine():
    """Create test database engine (session-scoped singleton)."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
        future=True,
        connect_args={"check_same_thread": False},
    )
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def db_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create database session for tests with transaction rollback."""
    async with test_engine.connect() as connection:
        transaction = await connection.begin()
        async with AsyncSession(
            bind=connection,
            expire_on_commit=False,
        ) as session:
            yield session
        # Rollback the transaction (session was bound to this connection)
        await transaction.rollback()


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create async test client."""
    from httpx import ASGITransport

    # Override dependency
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db_session] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
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
    await db_session.flush()  # Flush instead of commit (within savepoint)
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
    await db_session.flush()  # Flush instead of commit
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture(scope="function")
async def authenticated_client(
    client: AsyncClient,
    test_user: User
) -> AsyncClient:
    """Create authenticated test client."""
    from app.core.security import create_access_token

    # Override current user dependency
    async def override_get_current_user():
        return test_user

    app.dependency_overrides[get_current_user] = override_get_current_user

    # Set audit context for compliance tests
    set_audit_context(str(test_user.id), test_user.username)

    yield client

    app.dependency_overrides.clear()


# ============================================================
# Audit Trail Test Helpers
# ============================================================

@pytest.fixture
def audit_context(test_user: User):
    """Set audit context for compliance tests."""
    set_audit_context(str(test_user.id), test_user.username)
    yield
    # Context is cleaned up automatically


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

        node = ScopeNode(
            node_type=NodeType(node_type),
            name=name,
            lifecycle_status=LifecycleStatus.ONGOING,
            parent_id=parent_id,
        )
        db_session.add(node)
        await db_session.flush()
        await db_session.refresh(node)
        return node

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
    """Provide test data factory."""
    return TestDataFactory