"""
start_cameras.py — Start multiple cameras at once.

Edit CAMERAS list below then run:
    python start_cameras.py

Gets token automatically from backend.
"""

import subprocess
import sys
import time
import requests
import os

API_URL = "http://localhost:8000/api"

# ── Edit this to match your camera setup ──────────────────────────────────────
CAMERAS = [
    {
        # Gate camera — USB webcam or 0
        "camera":     0,
        "mode":       "gate",
        "name":       "Cam 1 • Gate",
        "session_id": None,  # gate mode does not need session
    },
    {
        # Classroom camera — USB cam index 1
        # Replace session_id with real session ID from database
        "camera":     1,
        "mode":       "class",
        "name":       "Cam 2 • Lab 2A",
        "session_id": "SES-1001",  # ← CHANGE THIS to real session ID
    },
    # Add more cameras:
    # {
    #     "camera":     "rtsp://admin:pass@192.168.1.100:554/stream",
    #     "mode":       "class",
    #     "name":       "Cam 3 • Room 301",
    #     "session_id": "SES-1002",
    # },
]

# ── Admin credentials for auto login ──────────────────────────────────────────
ADMIN_EMAIL    = "admin@demo.com"
ADMIN_PASSWORD = "admin123"


def get_token():
    # Login and get JWT token automatically
    try:
        r = requests.post(f"{API_URL}/auth/login", json={
            "email":    ADMIN_EMAIL,
            "password": ADMIN_PASSWORD,
            "role":     "admin",
        }, timeout=5)
        if r.status_code == 200:
            token = r.json()["access_token"]
            print(f"✅ Token obtained")
            return token
        else:
            print(f"❌ Login failed: {r.json()}")
    except Exception as e:
        print(f"❌ Cannot connect to backend: {e}")
        print("   Make sure backend is running: uvicorn main:app --reload --port 8000")
    return None


def start_camera(cam_config, token):
    # Build command for one camera
    cmd = [
        sys.executable,
        os.path.join(os.path.dirname(__file__), "recognize.py"),
        "--camera",   str(cam_config["camera"]),
        "--mode",     cam_config["mode"],
        "--name",     cam_config["name"],
        "--token",    token,
    ]
    if cam_config.get("session_id"):
        cmd += ["--session_id", cam_config["session_id"]]

    print(f"  🚀 Starting {cam_config['name']} ({cam_config['mode']} mode)")
    return subprocess.Popen(cmd)


def main():
    print("=" * 55)
    print("  📷 SMART ATTENDANCE — CAMERA LAUNCHER")
    print("=" * 55)
    print(f"  Cameras to start: {len(CAMERAS)}")
    print("=" * 55)

    # Get token
    token = get_token()
    if not token:
        sys.exit(1)

    processes = []

    # Start each camera
    for cam in CAMERAS:
        proc = start_camera(cam, token)
        processes.append((cam["name"], proc))
        time.sleep(2)  # small delay between camera starts

    print(f"\n✅ All {len(processes)} cameras started!")
    print("Press Ctrl+C to stop all cameras\n")

    try:
        # Monitor processes
        while True:
            for name, proc in processes:
                if proc.poll() is not None:
                    print(f"⚠️  Camera stopped: {name}")
            time.sleep(5)

    except KeyboardInterrupt:
        print("\n⏹️  Stopping all cameras...")
        for name, proc in processes:
            proc.terminate()
            print(f"  ✅ Stopped: {name}")
        print("All cameras stopped.")


if __name__ == "__main__":
    main()