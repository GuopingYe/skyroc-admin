"""Tests for utility modules (cache, audit context)."""
import time

from app.utils.cache import TTLCache
from app.models.audit_listener import (
    set_audit_context,
    get_audit_context,
    clear_audit_context,
    _extract_model_state,
)


# ============================================================
# TTLCache
# ============================================================


def test_cache_set_get():
    """TTLCache stores and retrieves values."""
    cache = TTLCache(ttl_seconds=10)
    cache.set("key1", "value1")
    assert cache.get("key1") == "value1"
    assert len(cache) == 1


def test_cache_get_missing():
    """TTLCache returns None for missing keys."""
    cache = TTLCache()
    assert cache.get("nonexistent") is None


def test_cache_expiry():
    """TTLCache evicts expired entries."""
    cache = TTLCache(ttl_seconds=0.01)
    cache.set("key1", "value1")
    time.sleep(0.02)
    assert cache.get("key1") is None


def test_cache_max_size_eviction():
    """TTLCache evicts oldest entry when at max size."""
    cache = TTLCache(ttl_seconds=60, max_size=2)
    cache.set("a", 1)
    cache.set("b", 2)
    cache.set("c", 3)  # Should evict "a"
    assert cache.get("a") is None
    assert cache.get("b") == 2
    assert cache.get("c") == 3


def test_cache_invalidate_all():
    """TTLCache.invalidate() with no prefix clears all."""
    cache = TTLCache()
    cache.set("x", 1)
    cache.set("y", 2)
    cache.invalidate()
    assert len(cache) == 0


def test_cache_invalidate_prefix():
    """TTLCache.invalidate(prefix) removes matching keys only."""
    cache = TTLCache()
    cache.set("user:1", "a")
    cache.set("user:2", "b")
    cache.set("role:1", "c")
    cache.invalidate(prefix="user:")
    assert cache.get("user:1") is None
    assert cache.get("role:1") == "c"


def test_cache_overwrite():
    """TTLCache.set overwrites existing key without eviction."""
    cache = TTLCache(ttl_seconds=60, max_size=1)
    cache.set("k", "old")
    cache.set("k", "new")
    assert cache.get("k") == "new"
    assert len(cache) == 1


# ============================================================
# Audit Context
# ============================================================


def test_set_get_audit_context():
    """Audit context variables round-trip correctly."""
    set_audit_context(
        user_id="user123",
        user_name="Test User",
        context={"ip": "127.0.0.1"},
        reason="testing",
    )
    ctx = get_audit_context()
    assert ctx["user_id"] == "user123"
    assert ctx["user_name"] == "Test User"
    assert ctx["context"] == {"ip": "127.0.0.1"}
    assert ctx["reason"] == "testing"
    clear_audit_context()


def test_clear_audit_context():
    """clear_audit_context resets all variables to None."""
    set_audit_context(user_id="u1", user_name="n1")
    clear_audit_context()
    ctx = get_audit_context()
    assert ctx["user_id"] is None
    assert ctx["user_name"] is None
    assert ctx["context"] is None
    assert ctx["reason"] is None
