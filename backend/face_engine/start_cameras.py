"""
start_cameras.py — Start both gate and class cameras with one command

Usage:
  python start_cameras.py

What happens:
  1. Logs into backend automatically
  2. Finds today's active/scheduled sessions
  3. Detects connected cameras and assigns Gate/Class to separate ones
  4. Opens Gate camera window (always on)
  5. Opens Class camera window (for active session, using its assigned camera if set)
  6. Press Ctrl+C to stop all cameras
"""

import subprocess
import sys
import time
import os
import requests
from datetime import date

# ── Config ────────────────────────────────────────────────────────────────────
API_URL        = "http://127.0.0.1:8000/api"
ADMIN_EMAIL    = "admin@smart.com"
ADMIN_PASSWORD = "admin123"

# Path to recognize.py
RECOGNIZE_PY = os.path.join(os.path.dirname(os.path.abspath(__file__)), "recognize.py")


def detect_cameras(max_test=5):
    """Probe camera indexes 0..max_test-1 and return the ones that work."""
    import cv2
    found = []
    for i in range(max_test):
        cap = cv2.VideoCapture(i)
        if cap.isOpened():
            ret, _ = cap.read()
            if ret:
                found.append(i)
            cap.release()
    return found


def pick_camera_indexes(found):
    """
    Decide which camera index to use for Gate and which for Class.
    - 2+ cameras found → Gate = first, Class = second (auto)
    - 1 camera found    → both share it, but ask for confirmation since
                           two processes can't reliably share one webcam
    - 0 found           → fall back to index 0 for both (let recognize.py
                           report the failure clearly)
    """
    print_separator("DETECTING CAMERAS")
    if found:
        print(f"  Found {len(found)} camera(s): {found}")
    else:
        print("  ⚠️  No cameras detected automatically")

    if len(found) >= 2:
        gate_idx, class_idx = found[0], found[1]
        print(f"  ✅ Auto-assigned — Gate: camera {gate_idx}, Class: camera {class_idx}")
        return gate_idx, class_idx

    if len(found) == 1:
        only = found[0]
        print(f"  ⚠️  Only 1 camera found (index {only}).")
        print(f"     Running Gate + Class at the same time needs 2 separate")
        print(f"     cameras (2 USB webcams, or 1 built-in + 1 USB/phone-cam).")
        print(f"     Plug in a second camera, or run one mode at a time:")
        print(f"       python recognize.py --mode gate  --camera {only} ...")
        print(f"       python recognize.py --mode class --camera {only} --session_id ... ...")
        return only, only

    print("  Falling back to index 0 for both — run 'python list_cameras.py' to debug.")
    return 0, 0


def print_separator(title=""):
    print("=" * 55)
    if title:
        print(f"  {title}")
        print("=" * 55)


def get_token():
    # Login and get JWT token automatically
    print("🔑 Logging into backend...")
    try:
        r = requests.post(f"{API_URL}/auth/login", json={
            "email":    ADMIN_EMAIL,
            "password": ADMIN_PASSWORD,
            "role":     "admin",
        }, timeout=5)
        if r.status_code == 200:
            token = r.json()["access_token"]
            print("✅ Login successful")
            return token
        else:
            print(f"❌ Login failed: {r.json().get('detail', 'unknown error')}")
            print(f"   Check email/password in start_cameras.py")
    except Exception as e:
        print(f"❌ Cannot connect to backend: {e}")
        print(f"   Make sure backend is running:")
        print(f"   uvicorn main:app --reload --port 8000 --host 0.0.0.0")
    return None


def get_todays_sessions(token):
    # Get all sessions scheduled for today
    today = date.today().isoformat()
    try:
        r = requests.get(
            f"{API_URL}/sessions?session_date={today}",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type":  "application/json",
            },
            timeout=5,
        )
        if r.status_code == 200:
            sessions = r.json()
            print(f"\n📅 Today's sessions ({today}):")
            if not sessions:
                print("   No sessions scheduled for today")
                print("   Create a session in admin dashboard first")
                return []
            for s in sessions:
                print(f"   [{s['status']}] {s.get('subject_name','—')} | "
                      f"{s.get('start_time')}–{s.get('end_time')} | "
                      f"ID: {s['id'][:8]}...")
            return sessions
        else:
            print(f"❌ Cannot get sessions: {r.status_code}")
    except Exception as e:
        print(f"❌ Cannot get sessions: {e}")
    return []


def pick_session(sessions):
    """
    Pick which session to use for class camera.
    Priority:
      1. Live session (already started)
      2. Scheduled session (not started yet)
      3. Ask user to pick if multiple
    """
    if not sessions:
        return None

    # Filter out completed sessions
    active = [s for s in sessions if s["status"] != "Completed"]
    if not active:
        print("\n⚠️  All sessions for today are completed")
        return None

    # If only one active session — use it
    if len(active) == 1:
        s = active[0]
        print(f"\n✅ Using session: {s.get('subject_name','—')} ({s['status']})")
        return s

    # Multiple sessions — let user pick
    print(f"\n📋 Multiple sessions found. Pick one:")
    for i, s in enumerate(active):
        print(f"   {i+1}. {s.get('subject_name','—')} | "
              f"{s.get('start_time')}–{s.get('end_time')} | "
              f"Status: {s['status']}")

    while True:
        try:
            choice = input("\nEnter number (1, 2, 3...): ").strip()
            idx = int(choice) - 1
            if 0 <= idx < len(active):
                chosen = active[idx]
                print(f"✅ Selected: {chosen.get('subject_name','—')}")
                return chosen
            else:
                print(f"   Enter a number between 1 and {len(active)}")
        except (ValueError, KeyboardInterrupt):
            return None


def start_camera(mode, session_id, token, name, camera_index=0):
    """
    Start one camera as a subprocess.
    Each camera runs in its own window.
    """
    cmd = [
        sys.executable,
        RECOGNIZE_PY,
        "--mode",   mode,
        "--name",   name,
        "--token",  token,
        "--camera", str(camera_index),
    ]
    if session_id:
        cmd += ["--session_id", session_id]

    print(f"\n🚀 Starting: {name} ({mode} mode) — camera index {camera_index}")
    if session_id:
        print(f"   Session: {session_id[:8]}...")

    # Start in new window on Windows
    try:
        if sys.platform == "win32":
            proc = subprocess.Popen(
                cmd,
                creationflags=subprocess.CREATE_NEW_CONSOLE,
            )
        else:
            # Mac/Linux — open new terminal
            proc = subprocess.Popen(cmd)
        return proc
    except Exception as e:
        print(f"❌ Failed to start {name}: {e}")
        return None


def main():
    print_separator("📷 SMART ATTENDANCE — CAMERA LAUNCHER")

    # Step 1 — Check recognize.py exists
    if not os.path.exists(RECOGNIZE_PY):
        print(f"❌ recognize.py not found at: {RECOGNIZE_PY}")
        print("   Make sure recognize.py is in the same folder")
        sys.exit(1)

    # Step 2 — Get token
    token = get_token()
    if not token:
        sys.exit(1)

    # Step 3 — Get today's sessions
    print_separator()
    sessions = get_todays_sessions(token)

    # Step 4 — Pick session for class camera
    session = pick_session(sessions)

    # Step 5 — Detect and assign camera indexes
    found = detect_cameras()
    gate_idx, class_idx = pick_camera_indexes(found)

    # Step 6 — Show plan
    print_separator("CAMERA PLAN")
    print(f"  Camera 1: Gate mode — watches entrance (device index {gate_idx})")
    if session:
        print(f"  Camera 2: Class mode — {session.get('subject_name','—')} (device index {class_idx})")
        print(f"            Time: {session.get('start_time')}–{session.get('end_time')}")
    else:
        print(f"  Camera 2: NOT started (no active session)")
        print(f"            Create a session in admin dashboard first")
    print(f"\n  Each camera opens in its own window")
    print()

    # Step 7 — Confirm
    try:
        confirm = input("Start cameras? (y/n): ").strip().lower()
        if confirm != 'y':
            print("Cancelled.")
            return
    except KeyboardInterrupt:
        print("\nCancelled.")
        return

    # Step 8 — Start cameras
    print_separator()
    processes = []

    # Start Gate camera
    gate_proc = start_camera(
        mode="gate",
        session_id=None,
        token=token,
        name="Cam 1 — Gate",
        camera_index=gate_idx,
    )
    if gate_proc:
        processes.append(("Gate Camera", gate_proc))
        time.sleep(2)  # small delay before starting second camera

    # Start Class camera (only if session available)
    if session:
        session_camera = session.get("camera")  # room-assigned camera, if set
        class_camera = session_camera if session_camera else class_idx
        if session_camera:
            print(f"\n  ℹ️  Using camera assigned to this session's room: {session_camera}")
        class_proc = start_camera(
            mode="class",
            session_id=session["id"],
            token=token,
            name=f"Cam 2 — {session.get('subject_name', 'Class')}",
            camera_index=class_camera,
        )
        if class_proc:
            processes.append(("Class Camera", class_proc))

    # Step 9 — Monitor
    if not processes:
        print("❌ No cameras started")
        return

    print(f"\n✅ {len(processes)} camera(s) started!")
    print(f"   Each camera is in its own window")
    print(f"   Press Q in camera window to stop that camera")
    print(f"   Press Ctrl+C here to stop ALL cameras\n")

    # Keep running and monitor processes
    try:
        while True:
            time.sleep(5)
            # Check if any camera stopped unexpectedly
            for name, proc in processes:
                if proc.poll() is not None:
                    print(f"⚠️  {name} stopped")
    except KeyboardInterrupt:
        print(f"\n\n⏹️  Stopping all cameras...")
        for name, proc in processes:
            try:
                proc.terminate()
                print(f"   ✅ Stopped: {name}")
            except Exception:
                pass
        print("\n👋 All cameras stopped")


if __name__ == "__main__":
    main()