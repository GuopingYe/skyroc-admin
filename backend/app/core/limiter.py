"""
Rate limiting configuration using slowapi.

This module provides a shared limiter instance that can be used
across the application for consistent rate limiting.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

# Shared limiter instance for the application
# In production with multiple workers, configure Redis storage:
# from slowapi.stores import RedisStore
# limiter = Limiter(key_func=get_remote_address, storage_uri="redis://localhost:6379")
limiter = Limiter(key_func=get_remote_address)