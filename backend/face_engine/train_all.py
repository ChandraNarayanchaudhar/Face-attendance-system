"""
train_all.py — Train ALL students one by one automatically

How to use:
  1. Edit STUDENTS list below with your real students
     Make sure IDs match exactly what is in your database
  2. Run: python train_all.py
  3. For each student:
     - Webcam opens
     - Student sits in front of camera
     - Press SPACE 15 times for 15 photos
     - Press Q when done
     - Next student starts automatically
  4. All done — camera can recognize all students

Options:
  python train_all.py                  train all students with webcam
  python train_all.py --no-webcam      train from existing photos only
  python train_all.py --from 3         start from student number 3
  python train_all.py --list           show who needs training
"""

import subprocess
import sys
import time
import os
import pickle
import argparse

# ══════════════════════════════════════════════════════════════════════════════
# EDIT THIS LIST — Add your real students here
# Make sure student_id matches exactly what is in your database
# ══════════════════════════════════════════════════════════════════════════════
STUDENTS = [
    {"id": "ST-1", "name": "Sita Karki"},
    {"id": "ST-2", "name": "Aayush Thapa"},
    {"id": "ST-3", "name": "Nisha Rai"},
    {"id": "ST-4", "name": "Prakash Shah"},
    {"id": "ST-5", "name": "Meera Joshi"},
    {"id": "ST-6", "name": "Bikash Tamang"},
    # Add more students below:
    # {"id": "ST-7", "name": "Student Name"},
    # {"id": "ST-8", "name": "Student Name"},
]
# ══════════════════════════════════════════════════════════════════════════════

BASE_DIR       = os.path.dirname(os.path.abspath(__file__))
ENCODINGS_FILE = os.path.join(BASE_DIR, "models", "encodings.pkl")
TRAIN_PY       = os.path.join(BASE_DIR, "train.py")


def print_separator(title=""):
    print("=" * 55)
    if title:
        print(f"  {title}")
        print("=" * 55)


def get_already_trained():
    # Return set of student IDs already in encodings file
    if not os.path.exists(ENCODINGS_FILE):
        return set()
    try:
        with open(ENCODINGS_FILE, "rb") as f:
            data = pickle.load(f)
        return set(data.get("student_ids", []))
    except Exception:
        return set()


def cmd_list():
    """Show training status for all students in list."""
    print_separator("TRAINING STATUS")
    trained = get_already_trained()

    print(f"  {'#':<4} {'ID':<10} {'Name':<25} {'Status'}")
    print(f"  {'-'*4} {'-'*10} {'-'*25} {'-'*10}")

    need_training = []
    for i, s in enumerate(STUDENTS):
        if s["id"] in trained:
            status = "✅ Trained"
        else:
            status = "❌ Not trained"
            need_training.append(s)
        print(f"  {i+1:<4} {s['id']:<10} {s['name']:<25} {status}")

    print()
    print(f"  Total students:    {len(STUDENTS)}")
    print(f"  Already trained:   {len(STUDENTS) - len(need_training)}")
    print(f"  Need training:     {len(need_training)}")
    print_separator()


def train_one(student, use_webcam, photos_count):
    """Train one student by calling train.py as subprocess."""
    cmd = [
        sys.executable,
        TRAIN_PY,
        "--student_id", student["id"],
        "--name",       student["name"],
        "--photos",     str(photos_count),
    ]
    if use_webcam:
        cmd.append("--webcam")

    result = subprocess.run(cmd, cwd=BASE_DIR)
    return result.returncode == 0


def main():
    parser = argparse.ArgumentParser(
        description="Train all students one by one"
    )
    parser.add_argument("--no-webcam",  action="store_true",
                        help="Train from existing photos (no webcam)")
    parser.add_argument("--photos",     type=int, default=15,
                        help="Photos per student (default 15)")
    parser.add_argument("--from",       dest="start_from",
                        type=int, default=1,
                        help="Start from student number (default 1)")
    parser.add_argument("--list",       action="store_true",
                        help="Show training status and exit")
    parser.add_argument("--untrained",  action="store_true",
                        help="Only train students not yet trained")
    args = parser.parse_args()

    # Just show list
    if args.list:
        cmd_list()
        return

    use_webcam = not args.no_webcam

    # Filter students based on options
    if args.untrained:
        trained = get_already_trained()
        to_train = [s for s in STUDENTS if s["id"] not in trained]
        print(f"\n  Training only untrained students: {len(to_train)}")
    else:
        start_idx = args.start_from - 1
        to_train  = STUDENTS[start_idx:]
        if start_idx > 0:
            print(f"\n  Starting from student {args.start_from}")

    if not to_train:
        print("\n✅ All students already trained!")
        print("   Run: python manage_faces.py --list to verify")
        return

    # Show plan
    print_separator("BATCH FACE TRAINING")
    print(f"  Students to train: {len(to_train)}")
    print(f"  Photos each:       {args.photos}")
    print(f"  Mode:              {'Webcam' if use_webcam else 'From saved photos'}")
    print()

    if use_webcam:
        print("  📋 Instructions for each student:")
        print("     1. Student sits in front of laptop camera")
        print("     2. GREEN box = face detected")
        print("     3. Press SPACE to take photo")
        print(f"     4. Take {args.photos} photos:")
        print("        • Look straight (photos 1-3)")
        print("        • Turn slightly left (4-5)")
        print("        • Turn slightly right (6-7)")
        print("        • Look slightly up (8-9)")
        print("        • Look slightly down (10-11)")
        print("        • Normal again (12-15)")
        print("     5. Press Q when done")
        print("     6. Next student starts in 3 seconds")
        print()

    # Confirm
    try:
        confirm = input("  Start training? (y/n): ").strip().lower()
        if confirm != "y":
            print("  Cancelled")
            return
    except KeyboardInterrupt:
        print("\n  Cancelled")
        return

    # Train each student
    results = {"success": [], "failed": [], "skipped": []}

    for i, student in enumerate(to_train):
        global_num = STUDENTS.index(student) + 1
        print_separator(
            f"Student {i+1}/{len(to_train)} "
            f"(#{global_num} overall)"
        )
        print(f"  Name: {student['name']}")
        print(f"  ID:   {student['id']}")
        print()

        if use_webcam:
            print(f"  ⏳ Webcam opens in 3 seconds...")
            print(f"     Call student {student['name']} to sit in front of camera")
            time.sleep(3)

        # Train this student
        success = train_one(student, use_webcam, args.photos)

        if success:
            results["success"].append(student)
            print(f"\n  ✅ {student['name']} — DONE")
        else:
            results["failed"].append(student)
            print(f"\n  ❌ {student['name']} — FAILED")

            # Ask to retry or skip
            if use_webcam:
                try:
                    retry = input("  Retry this student? (y/n): ").strip().lower()
                    if retry == "y":
                        success2 = train_one(student, use_webcam, args.photos)
                        if success2:
                            results["success"].append(student)
                            results["failed"].remove(student)
                            print(f"  ✅ {student['name']} — DONE (retry)")
                except KeyboardInterrupt:
                    pass

        # Pause between students
        if i < len(to_train) - 1:
            print(f"\n  Next student in 3 seconds...")
            print(f"  Next: {to_train[i+1]['name']}")
            time.sleep(3)

    # Final summary
    print_separator("TRAINING COMPLETE — SUMMARY")
    print(f"  ✅ Success:  {len(results['success'])}")
    for s in results["success"]:
        print(f"     • {s['id']} — {s['name']}")

    if results["failed"]:
        print(f"\n  ❌ Failed:   {len(results['failed'])}")
        for s in results["failed"]:
            print(f"     • {s['id']} — {s['name']}")
        print()
        print("  To retry failed students:")
        for s in results["failed"]:
            print(f"    python train.py --student_id {s['id']} --name '{s['name']}' --webcam")

    print_separator()
    print("  Verify all trained faces:")
    print("  python manage_faces.py --list")
    print()
    print("  Test recognition:")
    print("  python manage_faces.py --test")
    print()
    print("  Start cameras:")
    print("  python start_cameras.py")
    print_separator()


if __name__ == "__main__":
    main()