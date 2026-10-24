import hashlib
import secrets
import time
from typing import Optional
from fastapi import HTTPException, Security, Depends
from fastapi.security import APIKeyHeader, APIKeyQuery

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)
api_key_query = APIKeyQuery(name="api_key", auto_error=False)

API_KEYS: dict = {}
USER_SESSIONS: dict = {}

class AuthManager:
    def __init__(self):
        self.api_keys: dict = {}
        self.revoked_keys: set = set()

    def generate_api_key(self, user_id: int, name: str = "default") -> str:
        key = f"sk_{secrets.token_hex(32)}"
        self.api_keys[key] = {
            "user_id": user_id,
            "name": name,
            "created_at": time.time(),
            "last_used": None,
            "usage_count": 0
        }
        return key

    def validate_api_key(self, key: str) -> Optional[dict]:
        if key in self.revoked_keys:
            return None
        if key in self.api_keys:
            self.api_keys[key]["last_used"] = time.time()
            self.api_keys[key]["usage_count"] += 1
            return self.api_keys[key]
        return None

    def revoke_api_key(self, key: str) -> bool:
        if key in self.api_keys:
            self.revoked_keys.add(key)
            del self.api_keys[key]
            return True
        return False

    def get_user_keys(self, user_id: int) -> list:
        return [
            {"key": k[:8] + "...", "name": v["name"], "created_at": v["created_at"]}
            for k, v in self.api_keys.items()
            if v["user_id"] == user_id
        ]

auth_manager = AuthManager()

async def get_current_user(
    api_key_header: Optional[str] = Security(api_key_header),
    api_key_query: Optional[str] = Security(api_key_query)
) -> Optional[dict]:
    key = api_key_header or api_key_query
    if not key:
        return None

    user_data = auth_manager.validate_api_key(key)
    if not user_data:
        raise HTTPException(
            status_code=401,
            detail="Invalid or revoked API key"
        )
    return user_data

async def require_auth(
    user: Optional[dict] = Depends(get_current_user)
) -> dict:
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Provide a valid API key."
        )
    return user
