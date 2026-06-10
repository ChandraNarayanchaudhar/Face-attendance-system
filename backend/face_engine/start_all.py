# Start all cameras at once — one command to run everything
# Usage: python start_all.py --token YOUR_JWT_TOKEN

import subprocess
import sys
import argparse
import time

def get_token():
    # Get JWT token by logging in
    import requests
    res = requests.post("http://localhost:8000/api/auth/login", json={
        "email":    "admin@demo.com",
        "password": "admin123",
        "role":     "admin"
    })
    if res.status_code == 200:
        return res.json()["access_token"]
    print("❌ Login failed — check admin credentials")
    sys.exit(1)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--token", default=None, help="JWT token (auto-fetched if not provided)")
    parser.add_argument("--session_id", required=True, help="Session ID for class camera")
    args = parser.parse_args()

    # Get token automatically if not provided
    token = args.token or get_token()
    print(f"✅ Token obtained")

    processes = []

    # ── Start Gate Camera (Camera 0) ──────────────────────────────────────────
    gate_cmd = [
        sys.executable, "recognize.py",
        "--camera", "0",
        "--mode",   "gate",
        "--name",   "Cam 1 • Gate",
        "--token",  token,
    ]
    print("🚪 Starting Gate Camera...")
    gate_proc = subprocess.Popen(gate_cmd)
    processes.append(gate_proc)
    time.sleep(2)

    # ── Start Class Camera (Camera 1) ─────────────────────────────────────────
    class_cmd = [
        sys.executable, "recognize.py",
        "--camera",     "1",
        "--mode",       "class",
        "--session_id", args.session_id,
        "--name",       "Cam 2 • Classroom",
        "--token",      token,
    ]
    print("📚 Starting Classroom Camera...")
    class_proc = subprocess.Popen(class_cmd)
    processes.append(class_proc)

    print("\n✅ All cameras started!")
    print("Press Ctrl+C to stop all cameras\n")

    try:
        # Wait for all processes
        for p in processes:
            p.wait()
    except KeyboardInterrupt:
        print("\n⏹️  Stopping all cameras...")
        for p in processes:
            p.terminate()
        print("✅ All cameras stopped")


if __name__ == "__main__":
    main()