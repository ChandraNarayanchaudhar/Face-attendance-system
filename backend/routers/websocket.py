# routers/websocket.py — Live WebSocket for dashboard

import json
from datetime import datetime
from typing import Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()
active_connections: Set[WebSocket] = set()


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