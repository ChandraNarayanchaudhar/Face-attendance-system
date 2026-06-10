# WebSocket server — streams live face recognition events to frontend dashboard
# Run: python camera_server.py
# Frontend connects to: ws://localhost:8765

import asyncio
import websockets
import json
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading

# All connected WebSocket clients
connected_clients = set()

# Recent events buffer — sent to new connections
recent_events = []
MAX_RECENT = 50


async def broadcast(event_data: dict):
    # Send event to all connected dashboard clients
    if not connected_clients:
        return
    message = json.dumps(event_data)
    # Send to all clients simultaneously
    disconnected = set()
    for client in connected_clients:
        try:
            await client.send(message)
        except websockets.exceptions.ConnectionClosed:
            disconnected.add(client)
    # Remove disconnected clients
    connected_clients -= disconnected


async def handle_client(websocket, path):
    # Handle new WebSocket connection from dashboard
    connected_clients.add(websocket)
    print(f"✅ Dashboard connected ({len(connected_clients)} total)")

    try:
        # Send recent events to new connection so dashboard catches up
        for event in recent_events[-20:]:
            await websocket.send(json.dumps(event))

        # Keep connection alive and listen for messages
        async for message in websocket:
            try:
                data = json.loads(message)
                # Frontend can send events too (e.g. admin override)
                print(f"📨 Received from dashboard: {data}")
            except json.JSONDecodeError:
                pass

    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        connected_clients.discard(websocket)
        print(f"❌ Dashboard disconnected ({len(connected_clients)} remaining)")


def create_event(event_type, data):
    # Create a standardized event object
    event = {
        "type":      event_type,
        "data":      data,
        "timestamp": datetime.now().isoformat(),
    }
    # Add to recent buffer
    recent_events.append(event)
    if len(recent_events) > MAX_RECENT:
        recent_events.pop(0)
    return event


class EventReceiver(BaseHTTPRequestHandler):
    # HTTP endpoint to receive events from recognize.py
    # recognize.py posts events here → broadcast to WebSocket clients

    def do_POST(self):
        # Read event data from recognize.py
        length = int(self.headers.get('Content-Length', 0))
        body   = self.rfile.read(length)
        try:
            data  = json.loads(body)
            event = create_event(data.get("type", "unknown"), data)
            # Broadcast to all WebSocket clients
            asyncio.run_coroutine_threadsafe(
                broadcast(event),
                asyncio.get_event_loop()
            )
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'{"status": "ok"}')
        except Exception as e:
            self.send_response(500)
            self.end_headers()
            print(f"Event error: {e}")

    def log_message(self, format, *args):
        pass  # suppress HTTP logs


async def main():
    print("🚀 Camera WebSocket Server starting...")
    print("   WebSocket: ws://localhost:8765")
    print("   Waiting for dashboard connections...\n")

    # Start WebSocket server on port 8765
    async with websockets.serve(handle_client, "localhost", 8765):
        await asyncio.Future()  # run forever


if __name__ == "__main__":
    asyncio.run(main())