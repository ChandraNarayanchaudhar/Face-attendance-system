"""
list_cameras.py — Find all connected cameras on your system.

Run: python list_cameras.py

Shows:
  - All available camera indexes
  - CCTV/IP camera connection test
  - Camera resolution and FPS
"""

import cv2
import sys

# ── Test USB/webcam cameras ────────────────────────────────────────────────────
def find_usb_cameras(max_test=5):
    print("\n🔍 Scanning for USB/webcam cameras...\n")
    found = []

    for i in range(max_test):
        cap = cv2.VideoCapture(i)
        if cap.isOpened():
            # Get camera properties
            width  = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            fps    = int(cap.get(cv2.CAP_PROP_FPS))

            ret, frame = cap.read()
            if ret:
                print(f"  ✅ Camera {i}: {width}x{height} @ {fps}fps")
                found.append(i)
            else:
                print(f"  ⚠️  Camera {i}: detected but no frame")

            cap.release()
        else:
            print(f"  ❌ Camera {i}: not available")

    return found


# ── Test IP/CCTV camera ────────────────────────────────────────────────────────
def test_ip_camera(url):
    print(f"\n🌐 Testing IP camera: {url}")
    cap = cv2.VideoCapture(url)

    if not cap.isOpened():
        print("  ❌ Cannot connect to IP camera")
        print("  Check: IP address, port, username, password, stream path")
        return False

    ret, frame = cap.read()
    if ret:
        h, w = frame.shape[:2]
        print(f"  ✅ Connected! Resolution: {w}x{h}")
        cap.release()
        return True
    else:
        print("  ❌ Connected but no frames")
        cap.release()
        return False


# ── Preview one camera ─────────────────────────────────────────────────────────
def preview(camera_id, name="Camera Preview"):
    print(f"\n📺 Opening preview for camera {camera_id}")
    print("   Press Q to close\n")

    cap = cv2.VideoCapture(camera_id)
    if not cap.isOpened():
        print("❌ Cannot open camera")
        return

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # Show camera index on frame
        cv2.putText(frame, f"Camera: {camera_id}", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
        cv2.putText(frame, "Press Q to close", (10, 60),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 0), 1)

        cv2.imshow(name, frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()


def main():
    print("=" * 55)
    print("  📷 CAMERA DETECTION TOOL")
    print("=" * 55)

    # Find USB cameras
    found = find_usb_cameras(max_test=5)

    print(f"\n📊 Summary: {len(found)} USB camera(s) found")
    if found:
        print(f"   Available indexes: {found}")
        print(f"\n   Use in recognize.py:")
        for idx in found:
            print(f"     --camera {idx}")

    # CCTV IP camera examples
    print("\n" + "=" * 55)
    print("  🌐 IP/CCTV CAMERA RTSP URLs")
    print("=" * 55)
    print("\n  Common RTSP URL formats:")
    print("  Hikvision : rtsp://admin:password@192.168.1.100:554/Streaming/Channels/101")
    print("  Dahua     : rtsp://admin:password@192.168.1.100:554/cam/realmonitor?channel=1&subtype=0")
    print("  Generic   : rtsp://username:password@ip_address:port/stream")
    print("  No auth   : rtsp://192.168.1.100:554/stream")

    print("\n  To test your IP camera:")
    print("  python list_cameras.py --test-ip rtsp://admin:pass@192.168.1.100:554/stream")

    # Test IP camera if URL provided
    if "--test-ip" in sys.argv:
        idx = sys.argv.index("--test-ip")
        if idx + 1 < len(sys.argv):
            test_ip_camera(sys.argv[idx + 1])

    # Preview camera if requested
    if "--preview" in sys.argv:
        idx = sys.argv.index("--preview")
        if idx + 1 < len(sys.argv):
            cam_id = sys.argv[idx + 1]
            cam_id = int(cam_id) if cam_id.isdigit() else cam_id
            preview(cam_id)

    print("\n" + "=" * 55)
    print("  Usage examples:")
    print("  python list_cameras.py                    # scan cameras")
    print("  python list_cameras.py --preview 0        # preview camera 0")
    print("  python list_cameras.py --test-ip rtsp://  # test IP camera")
    print("=" * 55)


if __name__ == "__main__":
    main()
    