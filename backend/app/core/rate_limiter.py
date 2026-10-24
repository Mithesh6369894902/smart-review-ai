import time
from collections import defaultdict
from typing import Optional
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse

class RateLimiter:
    def __init__(self):
        self.requests: dict = defaultdict(list)
        self.limits = {
            "default": {"requests": 100, "window": 60},
            "analyze": {"requests": 30, "window": 60},
            "batch": {"requests": 10, "window": 60},
        }

    def get_client_id(self, request: Request) -> str:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    def _bucket(self, client_id: str, endpoint: str) -> str:
        return f"{client_id}:{endpoint}"

    def check_rate_limit(self, client_id: str, endpoint: str = "default") -> bool:
        now = time.time()
        bucket = self._bucket(client_id, endpoint)
        limit_config = self.limits.get(endpoint, self.limits["default"])
        window = limit_config["window"]
        max_requests = limit_config["requests"]

        self.requests[bucket] = [
            req_time for req_time in self.requests[bucket]
            if now - req_time < window
        ]

        if len(self.requests[bucket]) >= max_requests:
            return False

        self.requests[bucket].append(now)
        return True

    def get_remaining(self, client_id: str, endpoint: str = "default") -> int:
        now = time.time()
        bucket = self._bucket(client_id, endpoint)
        limit_config = self.limits.get(endpoint, self.limits["default"])
        window = limit_config["window"]
        max_requests = limit_config["requests"]

        recent_requests = [
            req_time for req_time in self.requests.get(bucket, [])
            if now - req_time < window
        ]

        return max(0, max_requests - len(recent_requests))

    def get_retry_after(self, client_id: str, endpoint: str = "default") -> int:
        bucket = self._bucket(client_id, endpoint)
        if not self.requests[bucket]:
            return 0

        limit_config = self.limits.get(endpoint, self.limits["default"])
        window = limit_config["window"]
        oldest_request = min(self.requests[bucket])
        return max(0, int(window - (time.time() - oldest_request)))

rate_limiter = RateLimiter()

async def rate_limit_middleware(request: Request, call_next):
    client_id = rate_limiter.get_client_id(request)
    endpoint = request.url.path.split("/")[-1] if request.url.path != "/" else "default"

    if not rate_limiter.check_rate_limit(client_id, endpoint):
        retry_after = rate_limiter.get_retry_after(client_id, endpoint)
        return JSONResponse(
            status_code=429,
            content={
                "detail": "Rate limit exceeded",
                "retry_after": retry_after,
                "limit": rate_limiter.limits.get(endpoint, rate_limiter.limits["default"])["requests"]
            },
            headers={"Retry-After": str(retry_after)}
        )

    response = await call_next(request)

    remaining = rate_limiter.get_remaining(client_id, endpoint)
    response.headers["X-RateLimit-Remaining"] = str(remaining)
    response.headers["X-RateLimit-Limit"] = str(
        rate_limiter.limits.get(endpoint, rate_limiter.limits["default"])["requests"]
    )

    return response
