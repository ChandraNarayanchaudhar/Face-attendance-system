# routers/websocket.py — Live WebSocket for dashboard

import asyncio
import json
from datetime import datetime
from typing import Optional, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()
active_connections: Set[WebSocket] = set()

# Reference to the FastAPI app's running event loop, captured on startup.
# Needed because most route handlers (mark_attendance, add_feed_event, etc.)
# are plain `def` functions — FastAPI runs those in a worker thread, which
# has no event loop of its own, so they can't just `await broadcast(...)`.
_MAIN_LOOP: Optional[asyncio.AbstractEventLoop] = None


def set_main_loop(loop: asyncio.AbstractEventLoop) -> None:
    global _MAIN_LOOP
    _MAIN_LOOP = loop


async def broadcast(event: dict):
    if not active_connections:
        return
    msg = json.dumps(event)
    dead = set()
    for ws in active_connections:
        try:
            await ws.send_text(msg)
        except Exception:
            dead.add(ws)
    active_connections -= dead


def broadcast_sync(event: dict) -> None:
    """Fire-and-forget broadcast, safe to call from sync route handlers or
    any worker thread. Silently no-ops if the loop isn't ready yet or no
    clients are connected — a missed live-feed push should never break the
    actual request that triggered it."""
    if _MAIN_LOOP is None:
        return
    try:
        asyncio.run_coroutine_threadsafe(broadcast(event), _MAIN_LOOP)
    except Exception:
        pass


@router.websocket("/ws/dashboard")
async def dashboard_ws(websocket: WebSocket):
    await websocket.accept()
    active_connections.add(websocket)
    try:
        await websocket.send_text(json.dumps({
            "type": "connected",
            "message": "Connected to Smart Attendance live feed",
            "timestamp": datetime.now().isoformat(),
        }))
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await websocket.send_text(json.dumps({
                        "type": "pong",
                        "timestamp": datetime.now().isoformat(),
                    }))
            except Exception:
                pass
    except WebSocketDisconnect:
        active_connections.discard(websocket)


@router.post("/ws/broadcast")
async def broadcast_event(event: dict):
    await broadcast(event)
    return {"status": "ok", "clients": len(active_connections)}