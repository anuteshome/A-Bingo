import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from app.core.security import decode_access_token
from app.core.redis import get_redis

router = APIRouter(tags=["WebSockets"])

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, set[WebSocket]] = {}

    async def connect(self, round_id: str, websocket: WebSocket):
        await websocket.accept()
        if round_id not in self.active_connections:
            self.active_connections[round_id] = set()
        self.active_connections[round_id].add(websocket)

    def disconnect(self, round_id: str, websocket: WebSocket):
        if round_id in self.active_connections:
            self.active_connections[round_id].discard(websocket)
            if not self.active_connections[round_id]:
                del self.active_connections[round_id]

ws_manager = ConnectionManager()

@router.websocket("/ws/rounds/{round_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    round_id: str,
    token: str = Query(...)
):
    # Verify JWT access token
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
    except Exception:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await ws_manager.connect(round_id, websocket)

    redis = await get_redis()
    pubsub = redis.pubsub()
    channel_name = f"round:{round_id}:events"
    await pubsub.subscribe(channel_name)

    async def redis_listener():
        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    data = message["data"]
                    await websocket.send_text(data)
        except Exception:
            pass

    listener_task = asyncio.create_task(redis_listener())

    try:
        while True:
            # Client ping/pong or client messages
            msg = await websocket.receive_text()
            # Respond to ping
            if msg == "ping":
                await websocket.send_text(json.dumps({"event": "pong"}))
    except WebSocketDisconnect:
        pass
    finally:
        listener_task.cancel()
        await pubsub.unsubscribe(channel_name)
        ws_manager.disconnect(round_id, websocket)
