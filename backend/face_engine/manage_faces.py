"""
manage_faces.py — Manage trained face data

Commands:
  python manage_faces.py --list
  python manage_faces.py --delete ST-1
  python manage_faces.py --clear
  python manage_faces.py --test
  python manage_faces.py --retrain ST-1 --name "Sita Karki"
"""

import os
import sys
import argparse
import numpy as np

import face_db

# ── Paths ──────────────────────────────────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
PHOTOS_DIR = os.path.join(BASE_DIR, "student_photos")


def print_separator(title=""):
    print("=" * 50)
    if title:
        print(f"  {title}")
        print("=" * 50)


def load():
    # Load all trained students from the database.
    data = face_db.load_all()
    if not data.get("student_ids"):
        return None
    return data


def cmd_list():
    """Show all trained students with details."""
    print_separator("TRAINED STUDENTS")
    data = load()

    if not data or not data.get("student_ids"):
        print("  No trained students found")
        print()
        print("  Train a student:")
        print("  python train.py --student_id ST-1 --name 'Sita Karki' --webcam")
        return

    total = len(data["student_ids"])
    print(f"  Total: {total} student(s)\n")

    for i, (sid, name) in enumerate(zip(data["student_ids"], data["names"])):
        # Handle all possible key names — old and new format
        has_arc = False
        has_net = False

        # Check ArcFace — could be encodings_arcface or encodings_deep
        arc_list = data.get("encodings_arcface", data.get("encodings_deep", []))
        if i < len(arc_list) and arc_list[i] is not None:
            has_arc = True

        # Check Facenet
        net_list = data.get("encodings_facenet", [])
        if i < len(net_list) and net_list[i] is not None:
            has_net = True

        # Build algorithm string
        algs = "HOG"
        if has_arc: algs += " + ArcFace"
        if has_net: algs += " + Facenet"

        # Count photos
        photos_dir  = os.path.join(PHOTOS_DIR, sid)
        photo_count = 0
        if os.path.exists(photos_dir):
            photo_count = len([
                f for f in os.listdir(photos_dir)
                if f.lower().endswith((".jpg", ".jpeg", ".png"))
            ])

        print(f"  {i+1}. {sid} — {name}")
        print(f"     Algorithms: {algs}")
        print(f"     Photos saved: {photo_count}")
        print()

    print_separator()
    
def cmd_delete(student_id):
    """Remove one student from training data."""
    print_separator(f"DELETE: {student_id}")
    data = load()

    if not data or student_id not in data["student_ids"]:
        print(f"  ❌ Student {student_id} not found in training data")
        print()
        print("  Available IDs:")
        if data:
            for sid in data["student_ids"]:
                print(f"    {sid}")
        return

    # Find student name before deleting
    idx  = data["student_ids"].index(student_id)
    name = data["names"][idx]

    # Confirm deletion
    confirm = input(f"  Delete {name} ({student_id})? (y/n): ").strip().lower()
    if confirm != "y":
        print("  Cancelled")
        return

    face_db.delete_encoding(student_id)
    remaining = len(face_db.load_all()["student_ids"])
    print(f"  ✅ Deleted {name} ({student_id}) from training data")
    print(f"     Remaining: {remaining} students")


def cmd_clear():
    """Remove ALL training data."""
    print_separator("CLEAR ALL TRAINING DATA")

    data = load()
    if not data or not data.get("student_ids"):
        print("  No training data to clear")
        return

    count = len(data["student_ids"])
    print(f"  This will delete {count} trained student(s):")
    for sid, name in zip(data["student_ids"], data["names"]):
        print(f"    {sid} — {name}")

    print()
    confirm = input("  Type YES to confirm: ").strip()
    if confirm != "YES":
        print("  Cancelled")
        return

    deleted = face_db.clear_all()
    if deleted:
        print(f"  ✅ All training data cleared ({deleted} student(s) removed from database)")
    else:
        print("  No data to delete")


def cmd_test():
    """Test face recognition live from webcam."""
    print_separator("TEST RECOGNITION")

    # Check libraries
    try:
        import face_recognition
        import cv2
    except ImportError as e:
        print(f"  ❌ Missing: {e}")
        return

    data = load()
    if not data or not data.get("student_ids"):
        print("  ❌ No trained faces found")
        print("  Run: python train.py --student_id ST-1 --name 'Name' --webcam")
        return

    print(f"  Testing with {len(data['student_ids'])} trained face(s)")
    print(f"  Green box = recognized | Red box = unknown")
    print(f"  Press Q to quit\n")

    # Open webcam
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("  ❌ Cannot open webcam")
        return

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    frame_n = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame_n += 1
        # Process every 3rd frame for speed
        if frame_n % 3 != 0:
            cv2.imshow("Recognition Test — Press Q to quit", frame)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
            continue

        # Detect faces
        small  = cv2.resize(frame, (0,0), fx=0.25, fy=0.25)
        rgb_sm = cv2.cvtColor(small, cv2.COLOR_BGR2RGB)
        rgb_fl = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        locs_sm = face_recognition.face_locations(rgb_sm, model="hog")
        locs_fl = [(t*4, r*4, b*4, l*4) for t,r,b,l in locs_sm]
        encs_fl = face_recognition.face_encodings(rgb_fl, locs_fl)

        for (top, right, bottom, left), enc in zip(locs_fl, encs_fl):
            # Match using HOG algorithm
            if data.get("encodings_hog"):
                dists    = face_recognition.face_distance(data["encodings_hog"], enc)
                best_idx = int(np.argmin(dists))
                best_d   = float(dists[best_idx])

                if best_d < 0.5:
                    # Known person
                    name  = data["names"][best_idx]
                    sid   = data["student_ids"][best_idx]
                    conf  = int((1 - best_d) * 100)
                    color = (0, 255, 0)   # green

                    # Draw green box
                    cv2.rectangle(frame, (left, top), (right, bottom), color, 2)
                    cv2.rectangle(frame,
                                  (left, bottom-40), (right, bottom),
                                  color, cv2.FILLED)
                    cv2.putText(frame,
                                f"{name}",
                                (left+4, bottom-22),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0,0,0), 1)
                    cv2.putText(frame,
                                f"{sid} | {conf}% match",
                                (left+4, bottom-6),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.38, (0,0,0), 1)

                    print(f"  ✅ Recognized: {name} ({sid}) — {conf}%")

                else:
                    # Unknown person
                    color = (0, 0, 255)   # red
                    cv2.rectangle(frame, (left, top), (right, bottom), color, 2)
                    cv2.putText(frame, "UNKNOWN",
                                (left, top-8),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)

        # Instructions overlay
        cv2.putText(frame,
                    "RECOGNITION TEST",
                    (10, 28),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0,255,255), 2)
        cv2.putText(frame,
                    f"Trained: {len(data['student_ids'])} face(s) | Q=quit",
                    (10, 52),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (200,200,200), 1)

        cv2.imshow("Recognition Test — Press Q to quit", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
    print("\n✅ Test complete")


def cmd_retrain(student_id, name):
    """Retrain one student — deletes old data and trains again."""
    print_separator(f"RETRAIN: {student_id}")

    data = load()
    if data and student_id in data.get("student_ids", []):
        print(f"  Removing old training data for {student_id}...")
        face_db.delete_encoding(student_id)
        print(f"  ✅ Old data removed")

    # Now run train.py for this student
    import subprocess
    train_py = os.path.join(BASE_DIR, "train.py")
    cmd = [
        sys.executable, train_py,
        "--student_id", student_id,
        "--name",       name,
        "--webcam",
    ]
    print(f"\n  Opening webcam for {name}...")
    subprocess.run(cmd)


def cmd_stats():
    """Show statistics about training data."""
    print_separator("TRAINING STATISTICS")
    data = load()

    if not data or not data.get("student_ids"):
        print("  No training data found")
        return

    total      = len(data["student_ids"])
    with_arc   = sum(1 for e in data["encodings_arcface"] if e is not None)
    with_net   = sum(1 for e in data["encodings_facenet"] if e is not None)
    hog_only   = sum(
        1 for i in range(total)
        if data["encodings_arcface"][i] is None and data["encodings_facenet"][i] is None
    )

    print(f"  Total students trained:  {total}")
    print(f"  HOG + ArcFace:           {with_arc}")
    print(f"  HOG + Facenet:           {with_net}")
    print(f"  HOG only:                {hog_only}")
    print()

    # Check photos
    total_photos = 0
    for sid in data["student_ids"]:
        photos_dir = os.path.join(PHOTOS_DIR, sid)
        if os.path.exists(photos_dir):
            count = len([
                f for f in os.listdir(photos_dir)
                if f.lower().endswith((".jpg", ".jpeg", ".png"))
            ])
            total_photos += count

    print(f"  Total photos saved:      {total_photos}")
    print(f"  Storage:                 database (face_encodings table, {total} row(s))")


def main():
    parser = argparse.ArgumentParser(
        description="Manage trained face recognition data"
    )
    parser.add_argument("--list",    action="store_true",
                        help="List all trained students")
    parser.add_argument("--delete",  metavar="STUDENT_ID",
                        help="Delete one student e.g. ST-1")
    parser.add_argument("--clear",   action="store_true",
                        help="Clear ALL training data")
    parser.add_argument("--test",    action="store_true",
                        help="Test recognition from webcam live")
    parser.add_argument("--retrain", metavar="STUDENT_ID",
                        help="Retrain one student from webcam")
    parser.add_argument("--name",    default=None,
                        help="Name for --retrain")
    parser.add_argument("--stats",   action="store_true",
                        help="Show training statistics")
    args = parser.parse_args()

    if args.list:
        cmd_list()
    elif args.delete:
        cmd_delete(args.delete)
    elif args.clear:
        cmd_clear()
    elif args.test:
        cmd_test()
    elif args.retrain:
        if not args.name:
            print("❌ --retrain needs --name")
            print("   Example: python manage_faces.py --retrain ST-1 --name 'Sita Karki'")
        else:
            cmd_retrain(args.retrain, args.name)
    elif args.stats:
        cmd_stats()
    else:
        # Default — show list and help
        cmd_list()
        print("\nCommands:")
        print("  python manage_faces.py --list")
        print("  python manage_faces.py --delete ST-1")
        print("  python manage_faces.py --clear")
        print("  python manage_faces.py --test")
        print("  python manage_faces.py --retrain ST-1 --name 'Sita Karki'")
        print("  python manage_faces.py --stats")


if __name__ == "__main__":
    main()