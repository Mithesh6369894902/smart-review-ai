import hashlib
import json
import time
from typing import Optional, Any
from collections import OrderedDict
import threading

class LRUCache:
    def __init__(self, max_size: int = 1000, ttl: int = 3600):
        self.max_size = max_size
        self.ttl = ttl
        self.cache: OrderedDict = OrderedDict()
        self.timestamps: dict = {}
        self.lock = threading.Lock()
        self.hits = 0
        self.misses = 0

    def _make_key(self, text: str) -> str:
        return hashlib.md5(text.lower().strip().encode()).hexdigest()

    def get(self, key: str) -> Optional[Any]:
        with self.lock:
            if key in self.cache:
                if time.time() - self.timestamps[key] < self.ttl:
                    self.cache.move_to_end(key)
                    self.hits += 1
                    return self.cache[key]
                else:
                    del self.cache[key]
                    del self.timestamps[key]
            self.misses += 1
            return None

    def set(self, key: str, value: Any):
        with self.lock:
            if key in self.cache:
                self.cache.move_to_end(key)
            self.cache[key] = value
            self.timestamps[key] = time.time()
            if len(self.cache) > self.max_size:
                oldest_key = next(iter(self.cache))
                del self.cache[oldest_key]
                del self.timestamps[oldest_key]

    def get_analysis(self, text: str) -> Optional[dict]:
        key = self._make_key(text)
        return self.get(key)

    def set_analysis(self, text: str, result: dict):
        key = self._make_key(text)
        self.set(key, result)

    def clear(self):
        with self.lock:
            self.cache.clear()
            self.timestamps.clear()

    def get_stats(self) -> dict:
        with self.lock:
            total = self.hits + self.misses
            return {
                "size": len(self.cache),
                "max_size": self.max_size,
                "hits": self.hits,
                "misses": self.misses,
                "hit_rate": round(self.hits / max(total, 1) * 100, 2)
            }

analysis_cache = LRUCache(max_size=500, ttl=3600)
