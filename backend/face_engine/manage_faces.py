"""
manage_faces.py — Manage trained face data.

Commands:
  python manage_faces.py --list              # show all trained students
  python manage_faces.py --delete ST-1023    # remove one student
  python manage_faces.py --clear             # remove ALL training data
  python manage_faces.py --test              # test recognition from webcam
"""

import os
import sys
import pickle
import argparse
import numpy as np

BASE_DIR       = os.path.dirname(os.path.abspath(__file__))
ENCODINGS_FILE = os.path.join(BASE_DIR, "models", "encodings.pkl")


def load():
    if not os.path.exists(ENCODINGS_FILE):
        print("No training data found")
        return None
    with open(ENCODINGS_FILE, "rb") as f:
        return pickle.load(f)


def save(data):
    with open(ENCODINGS_FILE, "wb") as f:
        pickle.dump(data, f)


def list_all():
    # Show all trained students
    data = load()
    if not data:
        print("❌ No trained faces found")
        print("   Run: python train.py --student_id ST-1023 --name 'Name' --webcam")
        return

    print(f"\n✅ Trained students: {len(data['student_ids'])}")
    print("-" * 40)
    for i, (sid, name) in enumerate(zip(data["student_ids"], data["names"])):
        has_deep = data["encodings_deep"][i] is not None
        algs = "HOG + ArcFace" if has_deep else "HOG only"
        print(f"  {i+1}. {sid} — {name} ({algs})")
    print("-" * 40)


def delete_student(student_id):
    # Remove one student from training data
    data = load()
    if not data:
        return

    if student_id not in data["student_ids"]:
        print(f"❌ Student {student_id} not found in training data")
        return

    name = data["names"][data["student_ids"].index(student_id)]
    keep = [i for i, sid in enumerate(data["student_ids"]) if sid != student_id]

    data["student_ids"]    = [data["student_ids"][i]    for i in keep]
    data["names"]          = [data["names"][i]          for i in keep]
    data["encodings_fr"]   = [data["encodings_fr"][i]   for i in keep]
    data["encodings_deep"] = [data["encodings_deep"][i] for i in keep]

    save(data)
    print(f"✅ Deleted {name} ({student_id}) from training data")
    print(f"   Remaining: {len(data['student_ids'])} students")


def clear_all():
    # Remove ALL training data
    confirm = input("⚠️  Delete ALL training data? Type YES to confirm: ")
    if confirm.strip() == "YES":
        if os.path.exists(ENCODINGS_FILE):
            os.remove(ENCODINGS_FILE)
            print("✅ All training data cleared")
        else:
            print("No training data to clear")
    else:
        print("Cancelled")


def test_recognition():
    # Test recognition from webcam — shows who it detects
    try:
        import face_recognition
        import cv2
    except ImportError:
        print("❌ Run: pip install face-recognition opencv-python")
        return

    data = load()
    if not data:
        return

    print("\n📷 Opening webcam for recognition test")
    print("   Press Q to quit\n")

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("❌ Cannot open webcam")
        return

    frame_n = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame_n += 1
        if frame_n % 3 != 0:
            cv2.imshow("Recognition Test", frame)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
            continue

        # Detect and recognize
        small  = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
        rgb_sm = cv2.cvtColor(small, cv2.COLOR_BGR2RGB)
        rgb_fl = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        locs = face_recognition.face_locations(rgb_sm, model="hog")
        encs = face_recognition.face_encodings(rgb_sm, locs)

        locs_fl = [(t*4, r*4, b*4, l*4) for t, r, b, l in locs]
        encs_fl = face_recognition.face_encodings(rgb_fl, locs_fl) or encs

        for (top, right, bottom, left), enc in zip(locs_fl, encs_fl):
            # Match using HOG
            if data["encodings_fr"]:
                dists    = face_recognition.face_distance(data["encodings_fr"], enc)
                best_idx = int(np.argmin(dists))
                best_d   = float(dists[best_idx])

                if best_d < 0.5:
                    name  = data["names"][best_idx]
                    sid   = data["student_ids"][best_idx]
                    conf  = int((1 - best_d) * 100)
                    color = (0, 255, 0)
                    label = f"{name} {conf}%"
                    print(f"  ✅ Recognized: {name} ({sid}) — {conf}%")
                else:
                    color = (0, 0, 255)
                    label = "Unknown"

                cv2.rectangle(frame, (left, top), (right, bottom), color, 2)
                cv2.rectangle(frame, (left, bottom-30), (right, bottom), color, cv2.FILLED)
                cv2.putText(frame, label,
                            (left+4, bottom-8),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)

        cv2.putText(frame, "Recognition Test — Press Q to quit",
                    (10, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)
        cv2.imshow("Recognition Test", frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()


def main():
    parser = argparse.ArgumentParser(description="Manage trained face data")
    parser.add_argument("--list",   action="store_true", help="List all trained students")
    parser.add_argument("--delete", metavar="STUDENT_ID", help="Delete one student")
    parser.add_argument("--clear",  action="store_true", help="Clear all training data")
    parser.add_argument("--test",   action="store_true", help="Test recognition from webcam")
    args = parser.parse_args()

    if args.list:
        list_all()
    elif args.delete:
        delete_student(args.delete)
    elif args.clear:
        clear_all()
    elif args.test:
        test_recognition()
    else:
        # Default: show list
        list_all()
        print("\nCommands:")
        print("  python manage_faces.py --list")
        print("  python manage_faces.py --delete ST-1023")
        print("  python manage_faces.py --clear")
        print("  python manage_faces.py --test")


if __name__ == "__main__":
    main()