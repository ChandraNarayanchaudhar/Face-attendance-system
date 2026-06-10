# Live face recognition — watches camera and marks attendance
# Uses both algorithms: face_recognition (HOG) + DeepFace (ArcFace)
# Applies all time rules: Present/Late/Absent/Early-leave/Ignored
#
# Usage:
#   Gate camera:  python recognize.py --camera 0 --mode gate --name "Cam 1 Gate"
#   Class camera: python recognize.py --camera 1 --mode class --session_id SES-1001 --name "Cam 2 Lab2A"

import os
import sys
import cv2
import pickle
import argparse
import numpy as np
import requests
import json
from datetime import datetime, date, timedelta
from threading import Thread

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    import face_recognition
    from deepface import DeepFace
except ImportError as e:
    print(f"❌ Missing: {e}")
    sys.exit(1)

# Backend API URL
API_URL = "http://localhost:8000/api"

# Path to saved face embeddings
ENCODINGS_FILE = os.path.join(os.path.dirname(__file__), "models", "encodings.pkl")

# How long to wait before marking same person again (seconds)
COOLDOWN_SECONDS = 30

# ── Time Rules ────────────────────────────────────────────────────────────────
# Present  = enter within PRESENT_WINDOW minutes of session start
PRESENT_WINDOW_MINS = 5
# Early leave = leave more than EARLY_LEAVE_MINS before session end = Absent
EARLY_LEAVE_MINS = 10


class FaceRecognitionEngine:

    def __init__(self, camera_id, camera_name, mode, session_id=None, token=None):
        self.camera_id   = camera_id     # webcam index or RTSP URL
        self.camera_name = camera_name   # display name "Cam 1 Gate"
        self.mode        = mode          # "gate" or "class"
        self.session_id  = session_id    # required for class mode
        self.token       = token         # JWT token for API calls

        # Track who is currently inside the room
        # {student_id: {"entry_time": datetime, "name": str}}
        self.inside_room = {}

        # Cooldown tracker — avoid marking same person multiple times
        # {student_id: last_detected_datetime}
        self.last_detected = {}

        # Already marked attendance this session
        self.already_marked = set()

        # Load face encodings from training
        self.encodings = self.load_encodings()

        # Session info (loaded from API)
        self.session_info = None
        if session_id:
            self.session_info = self.get_session_info(session_id)

    def load_encodings(self):
        # Load trained face embeddings from file
        if not os.path.exists(ENCODINGS_FILE):
            print(f"❌ No encodings found at {ENCODINGS_FILE}")
            print("   Run train.py first to register student faces")
            return None
        with open(ENCODINGS_FILE, "rb") as f:
            data = pickle.load(f)
        print(f"✅ Loaded {len(data['student_ids'])} trained faces")
        return data

    def get_session_info(self, session_id):
        # Get session details from backend API
        try:
            res = requests.get(
                f"{API_URL}/sessions/{session_id}",
                headers={"Authorization": f"Bearer {self.token}"}
            )
            if res.status_code == 200:
                info = res.json()
                print(f"✅ Session: {info['subject_name']} | {info['start_time']}–{info['end_time']}")
                return info
        except Exception as e:
            print(f"❌ Could not load session: {e}")
        return None

    def api_headers(self):
        # Return auth headers for API calls
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.token}"
        }

    def mark_attendance(self, student_id, name, status, confidence, entry_time):
        # Mark attendance in backend database
        if student_id in self.already_marked:
            return
        now_str = entry_time.strftime("%H:%M")
        try:
            res = requests.post(f"{API_URL}/attendance", json={
                "student_id": student_id,
                "session_id": self.session_id,
                "subject_id": self.session_info["subject_id"] if self.session_info else "",
                "status":     status,
                "confidence": round(confidence, 2),
                "time":       now_str,
                "marked_by":  "face",
            }, headers=self.api_headers())

            if res.status_code == 201:
                self.already_marked.add(student_id)
                tone = "success" if status == "Present" else "warning" if status == "Late" else "danger"
                print(f"  ✅ Marked {status}: {name} at {now_str}")
                # Add to live activity feed
                self.add_feed_event(f"{status} • {name} • {self.camera_name}", tone)
            elif res.status_code == 400:
                # Already marked — add to set to avoid retry
                self.already_marked.add(student_id)
        except Exception as e:
            print(f"  ❌ API error marking attendance: {e}")

    def update_attendance_status(self, student_id, new_status):
        # Update existing attendance record (e.g. change Present to Absent on early leave)
        try:
            res = requests.get(
                f"{API_URL}/attendance?student_id={student_id}&session_id={self.session_id}",
                headers=self.api_headers()
            )
            if res.status_code == 200:
                records = res.json()
                if records:
                    record_id = records[0]["id"]
                    requests.patch(
                        f"{API_URL}/attendance/{record_id}",
                        json={"status": new_status},
                        headers=self.api_headers()
                    )
                    print(f"  🔄 Updated {student_id} to {new_status}")
        except Exception as e:
            print(f"  ❌ Error updating attendance: {e}")

    def create_alert(self, alert_type, severity, camera=None):
        # Create security alert in backend
        try:
            requests.post(f"{API_URL}/alerts", json={
                "type":       alert_type,
                "severity":   severity,
                "camera":     camera or self.camera_name,
                "session_id": self.session_id,
            }, headers=self.api_headers())
        except Exception as e:
            print(f"  ❌ Alert error: {e}")

    def send_notification(self, user_id, title, body, ntype="info"):
        # Send notification to a user
        try:
            requests.post(f"{API_URL}/notifications", json={
                "user_id": user_id,
                "title":   title,
                "body":    body,
                "type":    ntype,
            }, headers=self.api_headers())
        except Exception as e:
            print(f"  ❌ Notification error: {e}")

    def add_feed_event(self, label, tone="primary"):
        # Add event to live activity feed on dashboard
        try:
            requests.post(f"{API_URL}/activity-feed", json={
                "label": label,
                "tone":  tone,
            }, headers=self.api_headers())
        except Exception:
            pass

    def get_attendance_status(self, entry_time):
        # Apply time rules to determine Present or Late
        if not self.session_info:
            return "Present"

        # Parse session start time
        start_str  = self.session_info["start_time"]   # "09:00"
        today      = date.today()
        start_dt   = datetime.combine(today, datetime.strptime(start_str, "%H:%M").time())

        # Minutes since session started
        diff_mins  = (entry_time - start_dt).total_seconds() / 60

        if diff_mins <= PRESENT_WINDOW_MINS:
            # Entered within 5 minutes of start → Present
            return "Present"
        else:
            # Entered after 5 minutes → Late
            return "Late"

    def is_session_active(self):
        # Check if session is currently running (not ended yet)
        if not self.session_info:
            return True
        end_str = self.session_info["end_time"]
        today   = date.today()
        end_dt  = datetime.combine(today, datetime.strptime(end_str, "%H:%M").time())
        return datetime.now() <= end_dt

    def is_session_ended(self):
        # Check if session has ended
        if not self.session_info:
            return False
        end_str = self.session_info["end_time"]
        today   = date.today()
        end_dt  = datetime.combine(today, datetime.strptime(end_str, "%H:%M").time())
        return datetime.now() > end_dt

    def handle_exit(self, student_id, name, exit_time):
        # Handle student leaving classroom — check early leave rule
        if student_id not in self.inside_room:
            return

        if not self.session_info:
            return

        # Parse session end time
        end_str = self.session_info["end_time"]
        today   = date.today()
        end_dt  = datetime.combine(today, datetime.strptime(end_str, "%H:%M").time())

        # Minutes before session end
        mins_before_end = (end_dt - exit_time).total_seconds() / 60

        if mins_before_end > EARLY_LEAVE_MINS:
            # Left more than 10 mins before end → mark Absent
            print(f"  ⚠️  {name} left {int(mins_before_end)} mins early → ABSENT")
            self.update_attendance_status(student_id, "Absent")
            self.add_feed_event(f"Early leave • {name} → Absent", "danger")
        else:
            # Left within 10 mins of end → still counts
            print(f"  ✅ {name} left {int(mins_before_end)} mins before end → still PRESENT")
            self.add_feed_event(f"Left near end • {name} → Present kept", "success")

        # Remove from inside room tracker
        del self.inside_room[student_id]

    def auto_mark_absent_at_end(self):
        # When session ends — mark all students still never came as Absent
        if not self.session_info:
            return
        print("\n⏰ Session ended — marking remaining absents...")

        # Students still inside = they stayed = keep their status
        # Students who left early = already handled by handle_exit
        # Students who never came = mark absent via API
        try:
            requests.post(
                f"{API_URL}/sessions/{self.session_id}/end",
                headers=self.api_headers()
            )
            print("✅ Session ended — auto-absent applied for missing students")
        except Exception as e:
            print(f"❌ Error ending session: {e}")

    def identify_face(self, face_encoding, face_img_rgb):
        # ── Algorithm 1: face_recognition (dlib HOG 128-point) ───────────────
        # Fast matching using euclidean distance
        fr_match_id   = None
        fr_confidence = 0.0

        if self.encodings and self.encodings["encodings_fr"]:
            known_fr = self.encodings["encodings_fr"]
            distances = face_recognition.face_distance(known_fr, face_encoding)
            best_idx  = np.argmin(distances)
            best_dist = distances[best_idx]

            # Distance < 0.5 = same person (lower = more similar)
            if best_dist < 0.5:
                fr_confidence = round(1 - best_dist, 2)
                fr_match_id   = self.encodings["student_ids"][best_idx]

        # ── Algorithm 2: DeepFace ArcFace (512-point deep embedding) ─────────
        # More accurate — uses neural network
        deep_match_id   = None
        deep_confidence = 0.0

        try:
            if self.encodings and self.encodings["encodings_deep"]:
                # Get ArcFace embedding for current face
                result = DeepFace.represent(
                    img_path=face_img_rgb,
                    model_name="ArcFace",
                    enforce_detection=False
                )
                if result:
                    current_embedding = np.array(result[0]["embedding"])

                    # Compare with all stored embeddings using cosine similarity
                    best_sim = -1
                    best_deep_idx = -1

                    for idx, stored_emb in enumerate(self.encodings["encodings_deep"]):
                        if stored_emb is None:
                            continue
                        # Cosine similarity — 1.0 = identical, 0.0 = different
                        sim = np.dot(current_embedding, stored_emb) / (
                            np.linalg.norm(current_embedding) * np.linalg.norm(stored_emb)
                        )
                        if sim > best_sim:
                            best_sim      = sim
                            best_deep_idx = idx

                    # Cosine similarity > 0.6 = same person
                    if best_sim > 0.6 and best_deep_idx >= 0:
                        deep_confidence = round(float(best_sim), 2)
                        deep_match_id   = self.encodings["student_ids"][best_deep_idx]

        except Exception as e:
            pass  # ArcFace failed — rely on face_recognition only

        # ── Combine both algorithms ────────────────────────────────────────────
        # Both agree = high confidence
        # Only one agrees = medium confidence
        if fr_match_id and deep_match_id and fr_match_id == deep_match_id:
            # Both algorithms matched same person — highest confidence
            final_id         = fr_match_id
            final_name       = self.encodings["names"][self.encodings["student_ids"].index(final_id)]
            final_confidence = max(fr_confidence, deep_confidence)
        elif fr_match_id and fr_confidence > 0.7:
            # Only face_recognition matched but high confidence
            final_id         = fr_match_id
            final_name       = self.encodings["names"][self.encodings["student_ids"].index(final_id)]
            final_confidence = fr_confidence
        elif deep_match_id and deep_confidence > 0.7:
            # Only DeepFace matched but high confidence
            final_id         = deep_match_id
            final_name       = self.encodings["names"][self.encodings["student_ids"].index(final_id)]
            final_confidence = deep_confidence
        else:
            # No confident match — unknown face
            return None, "Unknown", 0.0

        return final_id, final_name, final_confidence

    def process_frame_gate(self, frame, rgb_frame, face_locations, face_encodings):
        # Gate camera mode — log entry, show name, send notification
        now = datetime.now()

        for i, (location, encoding) in enumerate(zip(face_locations, face_encodings)):
            top, right, bottom, left = [v * 4 for v in location]

            # Extract face image for DeepFace
            face_img = rgb_frame[top:bottom, left:right]

            # Identify face using both algorithms
            student_id, name, confidence = self.identify_face(encoding, face_img)

            # Check cooldown — avoid repeating same person
            if student_id and student_id in self.last_detected:
                elapsed = (now - self.last_detected[student_id]).total_seconds()
                if elapsed < COOLDOWN_SECONDS:
                    # Still in cooldown — just draw box without processing
                    color = (0, 255, 0)
                    cv2.rectangle(frame, (left, top), (right, bottom), color, 2)
                    cv2.putText(frame, f"{name}", (left, top - 10),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
                    continue

            if student_id and confidence >= 0.65:
                # Known person entered gate
                self.last_detected[student_id] = now
                color = (0, 255, 0)  # green box

                time_str = now.strftime("%H:%M")
                print(f"  🚪 GATE: {name} entered at {time_str} ({int(confidence*100)}% confidence)")

                # Add to activity feed
                self.add_feed_event(
                    f"Gate entry • {name} • {self.camera_name} • {time_str}",
                    "primary"
                )

                # Draw green box with name
                cv2.rectangle(frame, (left, top), (right, bottom), color, 2)
                cv2.rectangle(frame, (left, bottom - 35), (right, bottom), color, cv2.FILLED)
                cv2.putText(frame, f"{name} ({int(confidence*100)}%)",
                            (left + 4, bottom - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)

            else:
                # Unknown face at gate
                color = (0, 0, 255)  # red box

                if not student_id or student_id not in self.last_detected:
                    # Create alert for unknown face
                    self.create_alert("Unknown face", "High", self.camera_name)
                    self.add_feed_event(
                        f"⚠️ Unknown face • {self.camera_name}",
                        "danger"
                    )
                    print(f"  🔴 GATE: Unknown face detected")
                    # Update cooldown to avoid spam
                    self.last_detected["unknown"] = now

                cv2.rectangle(frame, (left, top), (right, bottom), color, 2)
                cv2.putText(frame, "UNKNOWN", (left, top - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

        return frame

    def process_frame_class(self, frame, rgb_frame, face_locations, face_encodings, prev_faces):
        # Class camera mode — apply full attendance time rules
        now     = datetime.now()
        current_faces = set()  # track who is in frame right now

        for i, (location, encoding) in enumerate(zip(face_locations, face_encodings)):
            top, right, bottom, left = [v * 4 for v in location]

            # Extract face image for DeepFace
            face_img = rgb_frame[top:bottom, left:right]

            # Identify face using both algorithms
            student_id, name, confidence = self.identify_face(encoding, face_img)

            if student_id and confidence >= 0.65:
                current_faces.add(student_id)

                # Check if this is a new entry (not already inside)
                if student_id not in self.inside_room:

                    # Check if session has already ended
                    if self.is_session_ended():
                        # ── Rule 6: Session ended — IGNORE ────────────────
                        print(f"  🚫 {name} entered after session ended — IGNORED")
                        color = (128, 128, 128)  # gray box for ignored
                    else:
                        # Session still active — determine status
                        status = self.get_attendance_status(now)

                        # Check cooldown
                        if student_id in self.last_detected:
                            elapsed = (now - self.last_detected[student_id]).total_seconds()
                            if elapsed < COOLDOWN_SECONDS:
                                color = (0, 255, 0) if status == "Present" else (0, 165, 255)
                                cv2.rectangle(frame, (left, top), (right, bottom), color, 2)
                                cv2.putText(frame, f"{name} — {status}",
                                            (left, top - 10),
                                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)
                                continue

                        # Record entry
                        self.inside_room[student_id] = {
                            "entry_time": now,
                            "name":       name
                        }
                        self.last_detected[student_id] = now

                        if status == "Present":
                            # ── Rule 1: On time → PRESENT ─────────────────
                            color = (0, 255, 0)  # green
                            print(f"  ✅ CLASS: {name} PRESENT at {now.strftime('%H:%M')}")
                        else:
                            # ── Rule 2: Late arrival → LATE ───────────────
                            color = (0, 165, 255)  # orange
                            print(f"  ⚠️  CLASS: {name} LATE at {now.strftime('%H:%M')}")

                        # Mark attendance in database
                        Thread(target=self.mark_attendance, args=(
                            student_id, name, status, confidence, now
                        )).start()

                else:
                    # Person already inside — still there
                    status = self.inside_room[student_id].get("status", "Present")
                    color  = (0, 255, 0) if status == "Present" else (0, 165, 255)

                # Draw box with status
                cv2.rectangle(frame, (left, top), (right, bottom), color, 2)
                cv2.rectangle(frame, (left, bottom - 35), (right, bottom), color, cv2.FILLED)
                cv2.putText(frame, f"{name}",
                            (left + 4, bottom - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)

            else:
                # Unknown face in classroom
                color = (0, 0, 255)  # red
                cv2.rectangle(frame, (left, top), (right, bottom), color, 2)
                cv2.putText(frame, "UNKNOWN", (left, top - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

                if "unknown" not in self.last_detected or \
                   (now - self.last_detected.get("unknown", now)).total_seconds() > 60:
                    self.create_alert("Unknown face", "Medium", self.camera_name)
                    self.last_detected["unknown"] = now

        # ── Check who left the room ────────────────────────────────────────────
        # Compare previous frame faces vs current frame faces
        if prev_faces:
            left_room = prev_faces - current_faces
            for sid in left_room:
                if sid in self.inside_room:
                    info = self.inside_room[sid]
                    name = info["name"]
                    print(f"  🚶 {name} left the room at {now.strftime('%H:%M')}")
                    # Apply early leave rule
                    Thread(target=self.handle_exit, args=(sid, name, now)).start()

        return frame, current_faces

    def run(self):
        # Main recognition loop — opens camera and processes frames
        if self.encodings is None:
            print("❌ Cannot start — no trained faces")
            return

        print(f"\n📷 Starting camera: {self.camera_name}")
        print(f"   Mode: {self.mode.upper()}")
        if self.session_info:
            print(f"   Session: {self.session_info['subject_name']}")
            print(f"   Time: {self.session_info['start_time']}–{self.session_info['end_time']}")
        print("Press Q to quit\n")

        # Open camera — 0=webcam, 1=USB cam, "rtsp://..."=IP cam
        cap = cv2.VideoCapture(self.camera_id)
        if not cap.isOpened():
            print(f"❌ Cannot open camera {self.camera_id}")
            return

        # Set camera resolution
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

        frame_count = 0
        prev_faces  = set()
        session_ended_notified = False

        while True:
            ret, frame = cap.read()
            if not ret:
                print("❌ Camera disconnected")
                self.create_alert("Camera offline", "High")
                break

            frame_count += 1

            # Process every 3rd frame for performance
            if frame_count % 3 != 0:
                cv2.imshow(f"Smart Attendance — {self.camera_name}", frame)
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break
                continue

            # Resize frame for faster processing
            small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
            rgb_small   = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)
            rgb_full    = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            # Detect face locations using Algorithm 1 (HOG — fast)
            face_locations = face_recognition.face_locations(rgb_small, model="hog")
            face_encodings_list = face_recognition.face_encodings(rgb_small, face_locations)

            # Scale face locations back to full frame size
            face_locations = [(t*4, r*4, b*4, l*4) for t, r, b, l in face_locations]

            # Get full-size face encodings for better accuracy
            face_encodings_full = face_recognition.face_encodings(rgb_full, face_locations)
            if not face_encodings_full:
                face_encodings_full = face_encodings_list

            # Check if session ended — notify once
            if self.mode == "class" and self.is_session_ended() and not session_ended_notified:
                print("\n⏰ Session ended!")
                # Auto-mark absent for students who never came
                Thread(target=self.auto_mark_absent_at_end).start()
                session_ended_notified = True

            # Add session info overlay on frame
            if self.session_info:
                session_text = f"{self.session_info['subject_name']} | {self.session_info['start_time']}–{self.session_info['end_time']}"
                cv2.putText(frame, session_text, (10, 25),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

            # Add camera name overlay
            cv2.putText(frame, f"📷 {self.camera_name}", (10, frame.shape[0] - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)

            # Add time overlay
            time_text = datetime.now().strftime("%H:%M:%S")
            cv2.putText(frame, time_text, (frame.shape[1] - 100, 25),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

            # Process faces based on camera mode
            if self.mode == "gate":
                frame = self.process_frame_gate(
                    frame, rgb_full, face_locations, face_encodings_full
                )
            elif self.mode == "class":
                frame, prev_faces = self.process_frame_class(
                    frame, rgb_full, face_locations, face_encodings_full, prev_faces
                )

            # Show frame
            cv2.imshow(f"Smart Attendance — {self.camera_name}", frame)

            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

        cap.release()
        cv2.destroyAllWindows()
        print(f"\n👋 Camera {self.camera_name} stopped")


def main():
    parser = argparse.ArgumentParser(description="Smart Attendance Face Recognition")
    parser.add_argument("--camera",     default=0,      help="Camera index or RTSP URL")
    parser.add_argument("--mode",       default="gate", choices=["gate", "class"], help="Camera mode")
    parser.add_argument("--session_id", default=None,   help="Session ID for class mode")
    parser.add_argument("--name",       default="Camera", help="Camera display name")
    parser.add_argument("--token",      required=True,  help="JWT token for API access")
    args = parser.parse_args()

    # Convert camera to int if it's a number
    camera_id = int(args.camera) if str(args.camera).isdigit() else args.camera

    engine = FaceRecognitionEngine(
        camera_id=camera_id,
        camera_name=args.name,
        mode=args.mode,
        session_id=args.session_id,
        token=args.token
    )
    engine.run()


if __name__ == "__main__":
    main()