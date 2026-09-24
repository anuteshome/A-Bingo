import json
from datetime import datetime, timezone
from typing import Dict, Any
from app.core.redis import get_redis

async def publish_round_event(round_id: str, event_type: str, data: Dict[str, Any]):
    """
    Publishes a JSON payload event to Redis Pub/Sub channel 'round:{round_id}:events'.
    """
    redis = await get_redis()
    channel = f"round:{round_id}:events"
    payload = {
        "event": event_type,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": data
    }
    await redis.publish(channel, json.dumps(payload))
