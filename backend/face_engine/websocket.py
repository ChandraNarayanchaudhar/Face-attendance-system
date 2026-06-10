# WebSocket endpoint in FastAPI — dashboard connects here for live updates
# Broadcasts: face detection events, attendance updates, alerts

import json
import asyncio
from datetime import datetime
from typing import Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session

from database import get_db
import models

router = APIRouter()

# All active WebSocket connections
active_connections: Set[WebSocket] = set()


async def broadcast_event(event: dict):
    # Send event to all connected dashboard clients
    if not active_connections:
        return
    message = json.dumps(event)
    disconnected = set()
    for ws in active_connections:
        try:
            await ws.send_text(message)
        except Exception:
            disconnected.add(ws)
    active_connections -= disconnected


@router.websocket("/ws/dashboard")
async def dashboard_websocket(websocket: WebSocket):
    # Dashboard WebSocket endpoint — admin connects here
    await websocket.accept()
    active_connections.add(websocket)
    print(f"✅ Dashboard WebSocket connected ({len(active_connections)} total)")

    try:
        # Send welcome message
        await websocket.send_text(json.dumps({
            "type": "connected",
            "message": "Connected to Smart Attendance live feed",
            "timestamp": datetime.now().isoformat()
        }))

        # Listen for messages from dashboard
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                # Handle ping to keep connection alive
                if msg.get("type") == "ping":
                    await websocket.send_text(json.dumps({
                        "type": "pong",
                        "timestamp": datetime.now().isoformat()
                    }))
            except json.JSONDecodeError:
                pass

    except WebSocketDisconnect:
        active_connections.discard(websocket)
        print(f"❌ Dashboard disconnected ({len(active_connections)} remaining)")


@router.post("/ws/broadcast")
async def broadcast_to_dashboard(event: dict):
    # REST endpoint — recognize.py calls this to broadcast events
    await broadcast_event(event)
    return {"status": "broadcasted", "clients": len(active_connections)}