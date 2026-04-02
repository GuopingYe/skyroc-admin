"""Simple in-memory TTL cache for reference data.

Reference data is read-heavy, rarely changes, and small in volume.
A lightweight dict-based TTL cache avoids external dependencies (Redis)
while still providing meaningful performance gains.
"""
import time
from typing import Any, Generic, TypeVar

T = TypeVar("T")

_sentinel = object()


class TTLCache(Generic[T]):
    """Thread-safe-ish TTL cache for async single-process usage.

    Not suitable for multi-process deployments without external synchronization.
    For reference data, this is acceptable because cache serves as a read-through
    optimization — stale reads are harmless and self-correct after TTL expiry.
    """

    def __init__(self, ttl_seconds: float = 300, max_size: int = 256):
        self._store: dict[str, tuple[float, T]] = {}
        self._ttl = ttl_seconds
        self._max_size = max_size

    def get(self, key: str) -> T | None:
        """Return cached value if not expired, else None."""
        entry = self._store.get(key, _sentinel)
        if entry is _sentinel:
            return None
        ts, value = entry  # type: ignore[misc]
        if time.monotonic() - ts > self._ttl:
            del self._store[key]
            return None
        return value

    def set(self, key: str, value: T) -> None:
        """Store value with current timestamp."""
        if len(self._store) >= self._max_size and key not in self._store:
            oldest_key = min(self._store, key=lambda k: self._store[k][0])
            del self._store[oldest_key]
        self._store[key] = (time.monotonic(), value)

    def invalidate(self, prefix: str = "") -> None:
        """Remove entries matching prefix. Empty prefix = clear all."""
        if not prefix:
            self._store.clear()
            return
        keys_to_remove = [k for k in self._store if k.startswith(prefix)]
        for k in keys_to_remove:
            del self._store[k]

    def __len__(self) -> int:
        return len(self._store)
