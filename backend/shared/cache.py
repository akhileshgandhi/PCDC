import time
from typing import Any, Dict

_cache: Dict[str, Dict[str, Any]] = {}


def cache_get(key: str) -> Any:
    entry = _cache.get(key)
    if entry and time.time() < entry["expires"]:
        return entry["value"]
    if entry:
        _cache.pop(key, None)
    return None


def cache_set(key: str, value: Any, ttl_seconds: int = 300) -> Any:
    _cache[key] = {"value": value, "expires": time.time() + ttl_seconds}
    return value


def cache_delete_prefix(prefix: str) -> None:
    for key in list(_cache.keys()):
        if key.startswith(prefix):
            _cache.pop(key, None)
