"""
LDAP Sync Service stub.

Interface is defined now. Implementation fills in later when LDAP is configured.
"""

from sqlalchemy.ext.asyncio import AsyncSession


async def sync_users(db: AsyncSession) -> dict:
    """
    Sync users from LDAP directory.

    Raises:
        NotImplementedError: Until LDAP sync is configured and implemented.
    """
    raise NotImplementedError("LDAP sync not yet implemented. Set LDAP_URL and implement this service.")
