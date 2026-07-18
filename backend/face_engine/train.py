"""
train.py — Train student face using 3 algorithms

Algorithms used:
  1. face_recognition (dlib HOG 128-point) — fast detection
  2. DeepFace ArcFace (512-point) — high accuracy
  3. DeepFace Facenet512 (512-point) — confirmation

Usage:
  python train.py --student_id ST-1 --name "Sita Karki" --webcam
  python train.py --list
"""

import os
import sys
import argparse
import numpy as np

import face_db

# ── Check libraries ────────────────────────────────────────────────────────────
try:
    import face_recognition
    import cv2
    print("✅ face_recognition + OpenCV loaded")
except ImportError as e:
    print(f"❌ Missing: {e}")
    print("Run: pip install face-recognition opencv-python")
    sys.exit(1)

try:
    from deepface import DeepFace
    DEEPFACE_OK = True
    print("✅ DeepFace loaded")
except ImportError:
    DEEPFACE_OK = False
    print("⚠️  DeepFace not found — using HOG only")

# ── Paths ──────────────────────────────────────────────────────────────────────
BASE_DIR       = os.path.dirname(os.path.abspath(__file__))
PHOTOS_DIR     = os.path.join(BASE_DIR, "student_photos")


def load_existing():
    """Load all currently trained students from the database."""
    return face_db.load_all()


def capture_from_webcam(student_id, name, num_photos=15):
    """
    Open laptop webcam and capture photos interactively.
    Press SPACE = capture photo
    Press Q = done early (need minimum 5)
    """
    print(f"\n📷 Opening webcam for: {name}")
    print(f"   GREEN box = face detected")
    print(f"   Press SPACE to capture photo")
    print(f"   Take {num_photos} photos from different angles")
    print(f"   Press Q when done\n")

    save_dir = os.path.join(PHOTOS_DIR, student_id)
    os.makedirs(save_dir, exist_ok=True)

    # Open laptop webcam index 0
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("❌ Cannot open webcam")
        return False

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    captured = 0

    while captured < num_photos:
        ret, frame = cap.read()
        if not ret:
            break

        display = frame.copy()
        rgb     = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        # Detect faces in current frame
        locations  = face_recognition.face_locations(rgb, model="hog")
        face_found = len(locations) > 0

        # Draw box around face
        for (top, right, bottom, left) in locations:
            cv2.rectangle(display, (left, top), (right, bottom), (0,255,0), 2)

        # Instructions overlay
        cv2.putText(display,
                    f"Student: {name}",
                    (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,255,255), 2)
        cv2.putText(display,
                    f"Photos: {captured}/{num_photos}",
                    (10, 58), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,255,0), 2)

        if face_found:
            cv2.putText(display,
                        "Face detected ✓ — Press SPACE",
                        (10, 86), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0,255,0), 1)
        else:
            cv2.putText(display,
                        "No face — move closer",
                        (10, 86), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0,0,255), 1)

        cv2.putText(display,
                    "Q = finish early",
                    (10, 112), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200,200,200), 1)

        # Photo angle guide
        angle_guide = [
            "1-3: Look straight",
            "4-5: Turn left",
            "6-7: Turn right",
            "8-9: Look up",
            "10-11: Look down",
            "12-15: Normal"
        ]
        for i, guide in enumerate(angle_guide):
            color = (0,255,0) if captured >= (i*2) else (128,128,128)
            cv2.putText(display, guide,
                        (frame.shape[1]-180, 30 + i*22),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.42, color, 1)

        cv2.imshow(f"Training — {name}", display)
        key = cv2.waitKey(1) & 0xFF

        if key == ord(' ') and face_found:
            # Capture photo on SPACE
            path = os.path.join(save_dir, f"{student_id}_{captured:02d}.jpg")
            cv2.imwrite(path, frame)
            captured += 1
            print(f"   📸 Photo {captured}/{num_photos}")

            # Flash green to confirm
            flash   = frame.copy()
            overlay = np.zeros_like(flash)
            overlay[:] = (0, 255, 0)
            cv2.addWeighted(flash, 0.7, overlay, 0.3, 0, flash)
            cv2.imshow(f"Training — {name}", flash)
            cv2.waitKey(250)

        elif key in (ord('q'), ord('Q')):
            print(f"   Stopped at {captured} photos")
            break

    cap.release()
    cv2.destroyAllWindows()

    if captured < 5:
        print(f"❌ Only {captured} photos — need at least 5")
        return False

    print(f"✅ Captured {captured} photos")
    return True


def get_deepface_embedding(photo_path, model_name):
    """Get face embedding using DeepFace with specified model."""
    try:
        result = DeepFace.represent(
            img_path=photo_path,
            model_name=model_name,
            enforce_detection=False,
        )
        if result and result[0].get("embedding"):
            return np.array(result[0]["embedding"])
    except Exception:
        pass
    return None


def train_from_photos(student_id, name):
    """
    Extract face embeddings from saved photos using 3 algorithms.

    Algorithm 1 — HOG (face_recognition):
      Extracts 128 landmark points
      Fast, works on CPU
      Used for initial fast matching

    Algorithm 2 — ArcFace (DeepFace):
      Extracts 512 deep features
      Additive Angular Margin Loss
      Best for: same person different conditions

    Algorithm 3 — Facenet512 (DeepFace):
      Extracts 512 deep features
      Google FaceNet architecture
      Best for: confirmation of uncertain matches
    """
    photo_dir = os.path.join(PHOTOS_DIR, student_id)

    if not os.path.exists(photo_dir):
        print(f"❌ No photos at {photo_dir}")
        return False

    photos = [
        f for f in os.listdir(photo_dir)
        if f.lower().endswith((".jpg", ".jpeg", ".png"))
    ]

    if len(photos) == 0:
        print(f"❌ No photos found")
        return False

    print(f"\n🔄 Training {name} with 3 algorithms...")
    print(f"   Photos: {len(photos)}")
    print(f"\n   {'Photo':<20} {'HOG':<8} {'ArcFace':<12} {'Facenet':<10}")
    print(f"   {'-'*20} {'-'*8} {'-'*12} {'-'*10}")

    # Collect embeddings from all photos
    hog_embeddings     = []
    arcface_embeddings = []
    facenet_embeddings = []
    failed             = 0

    for i, photo_name in enumerate(photos):
        photo_path = os.path.join(photo_dir, photo_name)

        try:
            # ── Algorithm 1: HOG (face_recognition) ───────────────────────
            image     = face_recognition.load_image_file(photo_path)
            locations = face_recognition.face_locations(image, model="hog")
            encodings = face_recognition.face_encodings(image, locations)
            alg1 = "✓" if encodings else "✗"
            if encodings:
                hog_embeddings.append(encodings[0])

            # ── Algorithm 2: ArcFace (DeepFace) ───────────────────────────
            alg2 = "—"
            if DEEPFACE_OK:
                emb = get_deepface_embedding(photo_path, "ArcFace")
                if emb is not None:
                    arcface_embeddings.append(emb)
                    alg2 = "✓"
                else:
                    alg2 = "✗"

            # ── Algorithm 3: Facenet512 (DeepFace) ────────────────────────
            alg3 = "—"
            if DEEPFACE_OK:
                emb = get_deepface_embedding(photo_path, "Facenet512")
                if emb is not None:
                    facenet_embeddings.append(emb)
                    alg3 = "✓"
                else:
                    alg3 = "✗"

            print(f"   {photo_name:<20} {alg1:<8} {alg2:<12} {alg3:<10}")

        except Exception as e:
            print(f"   {photo_name:<20} SKIP: {e}")
            failed += 1

    if not hog_embeddings:
        print(f"\n❌ No faces found in photos for {name}")
        return False

    # Average all embeddings for each algorithm
    # Averaging = more robust representation than single photo
    avg_hog     = np.mean(hog_embeddings,     axis=0)
    avg_arcface = np.mean(arcface_embeddings, axis=0) if arcface_embeddings else None
    avg_facenet = np.mean(facenet_embeddings, axis=0) if facenet_embeddings else None

    # Save to the database (upserts if this student was already trained)
    face_db.save_encoding(
        student_id=student_id,
        name=name,
        hog=avg_hog,
        arcface=avg_arcface,
        facenet=avg_facenet,
        photo_count=len(photos),
    )
    total_students = len(face_db.load_all()["student_ids"])
    print(f"✅ Saved to database (table: face_encodings)")

    # Summary
    print(f"\n{'='*55}")
    print(f"✅ Training Complete!")
    print(f"   Student  : {name} ({student_id})")
    print(f"   HOG      : {len(hog_embeddings)}/{len(photos)} photos OK")
    print(f"   ArcFace  : {len(arcface_embeddings)}/{len(photos)} photos OK")
    print(f"   Facenet  : {len(facenet_embeddings)}/{len(photos)} photos OK")
    print(f"   Failed   : {failed} photos skipped")
    print(f"   Total    : {total_students} students in system")
    print(f"{'='*55}\n")
    return True


def list_trained():
    data = load_existing()
    if not data["student_ids"]:
        print("No trained students yet")
        return
    print(f"\nTrained: {len(data['student_ids'])} student(s)")
    print("-" * 45)
    for i, (sid, name) in enumerate(zip(data["student_ids"], data["names"])):
        has_arc = data.get("encodings_arcface", [None]*len(data["student_ids"]))[i] is not None
        has_net = data.get("encodings_facenet", [None]*len(data["student_ids"]))[i] is not None
        algs = "HOG"
        if has_arc: algs += " + ArcFace"
        if has_net: algs += " + Facenet"
        print(f"  {sid} — {name} ({algs})")
    print("-" * 45)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--student_id", help="Student ID e.g. ST-1")
    parser.add_argument("--name",       help="Full name e.g. 'Sita Karki'")
    parser.add_argument("--webcam",     action="store_true")
    parser.add_argument("--photos",     type=int, default=15)
    parser.add_argument("--list",       action="store_true")
    args = parser.parse_args()

    if args.list:
        list_trained()
        return

    if not args.student_id or not args.name:
        print("Usage:")
        print("  python train.py --student_id ST-1 --name 'Your Name' --webcam")
        print("  python train.py --list")
        return

    print(f"\n🎓 Training: {args.name} ({args.student_id})")

    if args.webcam:
        ok = capture_from_webcam(args.student_id, args.name, args.photos)
        if not ok:
            return

    train_from_photos(args.student_id, args.name)


if __name__ == "__main__":
    main()