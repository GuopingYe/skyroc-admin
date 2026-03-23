"""
Authentication API Tests

Tests cover:
- Login with valid/invalid credentials
- Token refresh flow
- User info retrieval
- Rate limiting (if applicable)
"""
import pytest
from httpx import AsyncClient

from app.models import User


@pytest.mark.asyncio
class TestAuthLogin:
    """Test login endpoint."""

    async def test_login_success(self, client: AsyncClient, test_user: User):
        """Test successful login returns tokens."""
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "userName": "testuser",
                "password": "testpassword123"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["code"] == "0000"
        assert "token" in data["data"]
        assert "refreshToken" in data["data"]

    async def test_login_invalid_username(self, client: AsyncClient):
        """Test login with non-existent user."""
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "userName": "nonexistent",
                "password": "anypassword"
            }
        )

        assert response.status_code == 200
        data = response.json()
        # Should return error code (401 mapped to 9999)
        assert data["code"] in ["9999", "401"]

    async def test_login_invalid_password(self, client: AsyncClient, test_user: User):
        """Test login with wrong password."""
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "userName": "testuser",
                "password": "wrongpassword"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["code"] in ["9999", "401"]

    async def test_login_disabled_user(
        self,
        client: AsyncClient,
        db_session,
        test_user: User
    ):
        """Test login with disabled account."""
        # Disable user
        test_user.is_active = False
        await db_session.commit()

        response = await client.post(
            "/api/v1/auth/login",
            json={
                "userName": "testuser",
                "password": "testpassword123"
            }
        )

        assert response.status_code == 200
        data = response.json()
        # Should return forbidden code
        assert data["code"] in ["8888", "403"]


@pytest.mark.asyncio
class TestAuthUserInfo:
    """Test get user info endpoint."""

    async def test_get_user_info_success(
        self,
        authenticated_client: AsyncClient,
        test_user: User
    ):
        """Test getting user info with valid token."""
        response = await authenticated_client.get("/api/v1/auth/getUserInfo")

        assert response.status_code == 200
        data = response.json()
        assert data["code"] == "0000"
        assert data["data"]["userName"] == "testuser"
        assert data["data"]["email"] == "test@example.com"

    async def test_get_user_info_unauthorized(self, client: AsyncClient):
        """Test getting user info without token."""
        response = await client.get("/api/v1/auth/getUserInfo")

        # Should return unauthorized
        assert response.status_code == 200
        data = response.json()
        assert data["code"] in ["9999", "401"]


@pytest.mark.asyncio
class TestAuthTokenRefresh:
    """Test token refresh endpoint."""

    async def test_refresh_token_success(self, client: AsyncClient, test_user: User):
        """Test refreshing token with valid refresh token."""
        # First, login to get tokens
        login_response = await client.post(
            "/api/v1/auth/login",
            json={
                "userName": "testuser",
                "password": "testpassword123"
            }
        )
        refresh_token = login_response.json()["data"]["refreshToken"]

        # Then refresh
        response = await client.post(
            "/api/v1/auth/refreshToken",
            json={"refreshToken": refresh_token}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["code"] == "0000"
        assert "token" in data["data"]
        assert "refreshToken" in data["data"]

    async def test_refresh_token_invalid(self, client: AsyncClient):
        """Test refreshing with invalid token."""
        response = await client.post(
            "/api/v1/auth/refreshToken",
            json={"refreshToken": "invalid_token"}
        )

        assert response.status_code == 200
        data = response.json()
        # Should return logout code (8888)
        assert data["code"] in ["8888", "401"]