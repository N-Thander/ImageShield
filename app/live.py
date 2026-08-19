import asyncio
import contextlib
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from common.events import subscribe  # async generator over the event bus

router = APIRouter()


class ConnectionManager:
    def __init__(self) -> None:
        self._clients: set[WebSocket] = set()
        self._lock = asyncio.Lock()
        self._pump_task: asyncio.Task | None = None

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        async with self._lock:
            self._clients.add(ws)
            if self._pump_task is None:      # start the single bus reader lazily
                self._pump_task = asyncio.create_task(self._pump())

    async def disconnect(self, ws: WebSocket) -> None:
        async with self._lock:
            self._clients.discard(ws)

    async def _pump(self) -> None:
        # one subscription to the bus, broadcast to every client
        async for event in subscribe():
            if not self._clients:
                continue
            payload = event.to_json()
            dead: list[WebSocket] = []
            for ws in list(self._clients):
                try:
                    await ws.send_text(payload)
                except Exception:
                    dead.append(ws)
            if dead:
                async with self._lock:
                    for ws in dead:
                        self._clients.discard(ws)


manager = ConnectionManager()


@router.websocket("/live")
async def live(ws: WebSocket) -> None:
    await manager.connect(ws)
    try:
        while True:
            # we don't expect inbound messages; this keeps the socket open
            # and detects client-side close promptly
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await manager.disconnect(ws)
