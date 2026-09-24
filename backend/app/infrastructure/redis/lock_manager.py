import asyncio
import uuid
from typing import Optional
from redis.asyncio import Redis
from app.core.redis import get_redis

class DistributedLock:
    def __init__(self, key: str, ttl_seconds: int = 3):
        self.key = key
        self.ttl = ttl_seconds
        self.lock_value = str(uuid.uuid4())
        self.redis: Optional[Redis] = None

    async def __aenter__(self):
        self.redis = await get_redis()
        acquired = await self.redis.set(self.key, self.lock_value, nx=True, ex=self.ttl)
        if not acquired:
            raise RuntimeError(f"Could not acquire lock for resource: {self.key}")
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.redis:
            # Lua script to release lock only if value matches
            script = """
            if redis.call('get', KEYS[1]) == ARGV[1] then
                return redis.call('del', KEYS[1])
            else
                return 0
            end
            """
            try:
                await self.redis.eval(script, 1, self.key, self.lock_value)
            except Exception:
                pass


def acquire_card_lock(round_id: str, card_number: int, ttl: int = 3):
    return DistributedLock(f"lock:round:{round_id}:card:{card_number}", ttl_seconds=ttl)


def acquire_claim_lock(round_id: str, ttl: int = 5):
    return DistributedLock(f"lock:round:{round_id}:claim", ttl_seconds=ttl)
