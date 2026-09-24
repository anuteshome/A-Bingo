import redis.asyncio as aioredis
from typing import Optional
from app.core.config import settings

class RedisManager:
    def __init__(self):
        self.redis: Optional[aioredis.Redis] = None

    async def connect(self):
        if not self.redis:
            self.redis = aioredis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                encoding="utf-8"
            )

    async def disconnect(self):
        if self.redis:
            await self.redis.close()
            self.redis = None

    def get_client(self) -> aioredis.Redis:
        if not self.redis:
            # Fallback inline connection
            self.redis = aioredis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                encoding="utf-8"
            )
        return self.redis

redis_manager = RedisManager()

async def get_redis() -> aioredis.Redis:
    return redis_manager.get_client()
