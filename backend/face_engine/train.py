# Train student faces — registers face embeddings into database
# Run: python train.py --student_id ST-1023 --name "Sita Karki"
# Photos must be in: face_engine/student_photos/ST-1023/

import os
import sys
import pickle
import argparse
import numpy as np

# Add parent directory to path so we can import backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    import face_recognition
    import cv2
    from deepface import DeepFace
    print("✅ All libraries loaded")
except ImportError as e:
    print(f"❌ Missing library: {e}")
    print("Run: pip install face-recognition deepface opencv-python")
    sys.exit(1)

# Path where face embeddings are saved
ENCODINGS_FILE = os.path.join(os.path.dirname(__file__), "models", "encodings.pkl")
# Path where student photos are stored
PHOTOS_DIR = os.path.join(os.path.dirname(__file__), "student_photos")


def load_existing_encodings():
    # Load existing encodings file or create empty one
    if os.path.exists(ENCODINGS_FILE):
        with open(ENCODINGS_FILE, "rb") as f:
            return pickle.load(f)
    return {"student_ids": [], "names": [], "encodings_fr": [], "encodings_deep": []}


def save_encodings(data):
    # Save updated encodings back to file
    os.makedirs(os.path.dirname(ENCODINGS_FILE), exist_ok=True)
    with open(ENCODINGS_FILE, "wb") as f:
        pickle.dump(data, f)
    print(f"✅ Saved to {ENCODINGS_FILE}")


def capture_photos_from_webcam(student_id, name, num_photos=15):
    # Open webcam and capture multiple photos for training
    print(f"\n📷 Opening webcam to capture {num_photos} photos for {name}")
    print("Press SPACE to capture, Q to quit early\n")

    save_dir = os.path.join(PHOTOS_DIR, student_id)
    os.makedirs(save_dir, exist_ok=True)

    # Open webcam — 0 = default camera
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("❌ Cannot open webcam")
        return False

    captured = 0

    while captured < num_photos:
        ret, frame = cap.read()
        if not ret:
            break

        # Show live preview with instruction
        display = frame.copy()
        cv2.putText(display, f"Captured: {captured}/{num_photos}", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
        cv2.putText(display, "SPACE=capture  Q=quit", (10, 60),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 0), 1)
        cv2.putText(display, f"Student: {name}", (10, 90),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)

        # Detect faces in frame and draw box
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        face_locations = face_recognition.face_locations(rgb)
        for (top, right, bottom, left) in face_locations:
            cv2.rectangle(display, (left, top), (right, bottom), (0, 255, 0), 2)

        cv2.imshow(f"Register Face — {name}", display)

        key = cv2.waitKey(1) & 0xFF

        if key == ord(' ') and face_locations:
            # Save photo when SPACE pressed and face detected
            photo_path = os.path.join(save_dir, f"{student_id}_{captured}.jpg")
            cv2.imwrite(photo_path, frame)
            captured += 1
            print(f"  📸 Captured {captured}/{num_photos}")
        elif key == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
    print(f"\n✅ Captured {captured} photos for {name}")
    return captured > 0


def train_from_photos(student_id, name):
    # Extract face embeddings from all photos using both algorithms
    photo_dir = os.path.join(PHOTOS_DIR, student_id)

    if not os.path.exists(photo_dir):
        print(f"❌ No photos found at {photo_dir}")
        print(f"   Create folder and add 10-15 photos OR use --webcam flag")
        return False

    photos = [f for f in os.listdir(photo_dir)
              if f.lower().endswith(('.jpg', '.jpeg', '.png'))]

    if len(photos) == 0:
        print(f"❌ No photos in {photo_dir}")
        return False

    print(f"\n🔄 Training {name} from {len(photos)} photos...")

    # Load existing encodings
    data = load_existing_encodings()

    # Remove old encoding for this student if exists
    indices_to_keep = [i for i, sid in enumerate(data["student_ids"]) if sid != student_id]
    data["student_ids"]     = [data["student_ids"][i]     for i in indices_to_keep]
    data["names"]           = [data["names"][i]           for i in indices_to_keep]
    data["encodings_fr"]    = [data["encodings_fr"][i]    for i in indices_to_keep]
    data["encodings_deep"]  = [data["encodings_deep"][i]  for i in indices_to_keep]

    # Process each photo
    fr_encodings   = []  # face_recognition (dlib HOG) embeddings
    deep_encodings = []  # DeepFace ArcFace embeddings

    for photo_name in photos:
        photo_path = os.path.join(photo_dir, photo_name)
        print(f"  Processing {photo_name}...")

        try:
            # ── Algorithm 1: face_recognition (dlib HOG 128-point) ──────────
            image = face_recognition.load_image_file(photo_path)
            locations = face_recognition.face_locations(image, model="hog")
            encodings = face_recognition.face_encodings(image, locations)
            if encodings:
                fr_encodings.append(encodings[0])

            # ── Algorithm 2: DeepFace ArcFace (512-point deep embedding) ────
            result = DeepFace.represent(
                img_path=photo_path,
                model_name="ArcFace",
                enforce_detection=False
            )
            if result:
                deep_encodings.append(np.array(result[0]["embedding"]))

        except Exception as e:
            print(f"  ⚠️  Skipped {photo_name}: {e}")
            continue

    if not fr_encodings and not deep_encodings:
        print(f"❌ No faces found in photos for {name}")
        return False

    # Save average embedding for this student
    # Average of all photos = more robust face representation
    if fr_encodings:
        avg_fr = np.mean(fr_encodings, axis=0)
        data["student_ids"].append(student_id)
        data["names"].append(name)
        data["encodings_fr"].append(avg_fr)
        # Use deep encoding if available else empty
        if deep_encodings:
            avg_deep = np.mean(deep_encodings, axis=0)
            data["encodings_deep"].append(avg_deep)
        else:
            data["encodings_deep"].append(None)

    save_encodings(data)
    print(f"\n✅ Training complete for {name} ({student_id})")
    print(f"   face_recognition: {len(fr_encodings)} encodings averaged")
    print(f"   DeepFace ArcFace: {len(deep_encodings)} encodings averaged")
    return True


def main():
    parser = argparse.ArgumentParser(description="Train face recognition for a student")
    parser.add_argument("--student_id", required=True, help="Student ID e.g. ST-1023")
    parser.add_argument("--name",       required=True, help="Student name e.g. 'Sita Karki'")
    parser.add_argument("--webcam",     action="store_true", help="Capture photos from webcam")
    args = parser.parse_args()

    print(f"\n🎓 Face Training System")
    print(f"   Student: {args.name}")
    print(f"   ID: {args.student_id}")

    if args.webcam:
        # Capture photos from webcam then train
        success = capture_photos_from_webcam(args.student_id, args.name)
        if not success:
            print("❌ Photo capture failed")
            return

    # Train from photos folder
    train_from_photos(args.student_id, args.name)


if __name__ == "__main__":
    main()