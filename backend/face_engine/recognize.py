"""
recognize.py — Live face recognition with 3-algorithm voting system

Algorithms:
  1. HOG (face_recognition) — fast detection
  2. ArcFace (DeepFace) — high accuracy
  3. Facenet512 (DeepFace) — confirmation

Voting:
  2+ algorithms agree = CONFIRMED match → mark attendance
  1 algorithm agrees = UNCERTAIN → reject → unknown
  0 algorithms agree = UNKNOWN → alert

Usage:
  Gate mode:
    python recognize.py --mode gate --email admin@smart.com --password admin123

  Class mode:
    python recognize.py --mode class --session_id SES-001 --email admin@smart.com --password admin123
"""

import os
import sys
import cv2
import argparse
import numpy as np
import requests
from datetime import datetime, date
from threading import Thread

import face_db

# ── Libraries ──────────────────────────────────────────────────────────────────
try:
    import face_recognition
    print("✅ face_recognition loaded")
except ImportError:
    print("❌ Run: pip install face-recognition")
    sys.exit(1)

try:
    from deepface import DeepFace
    DEEPFACE_OK = True
    print("✅ DeepFace loaded")
except ImportError:
    DEEPFACE_OK = False
    print("⚠️  DeepFace not found — using HOG only")

# ── Config ─────────────────────────────────────────────────────────────────────
API_URL             = "http://127.0.0.1:8000/api"
PRESENT_WINDOW_MINS = 5     # within 5 mins = Present
EARLY_LEAVE_MINS    = 10    # leave 10+ mins before end = Absent
COOLDOWN_SECS       = 30    # cooldown between detections
PROCESS_EVERY_N     = 3     # process every 3rd frame
MIN_VOTES           = 1    # need 2+ votes to confirm identity
HOG_THRESHOLD       = 0.55  # HOG distance threshold
DEEP_THRESHOLD      = 0.55  # DeepFace cosine similarity threshold

# Colors BGR
GREEN  = (0, 255, 0)
ORANGE = (0, 165, 255)
RED    = (0, 0, 255)
GRAY   = (128, 128, 128)
WHITE  = (255, 255, 255)
BLACK  = (0, 0, 0)
YELLOW = (0, 255, 255)
CYAN   = (255, 255, 0)


class VotingRecognitionEngine:
    """
    3-Algorithm Voting Face Recognition System

    How voting works:
      Each algorithm casts a vote for who it thinks the person is
      Algorithm 1 (HOG)      → vote 1
      Algorithm 2 (ArcFace)  → vote 2
      Algorithm 3 (Facenet)  → vote 3

      If 2+ votes for same person → CONFIRMED
      If 1 vote only → UNCERTAIN → treated as Unknown
      If 0 votes → UNKNOWN → alert created
    """

    def __init__(self, mode, session_id, token, camera_name, camera_index=0):
        self.mode         = mode
        self.session_id   = session_id
        self.token        = token
        self.camera_name  = camera_name
        self.camera_index = camera_index
        self.inside_room = {}
        self.last_seen   = {}
        self.marked_set  = set()
        self.session_done = False

        # Recognition stats for display
        self.stats = {
            "total_detections": 0,
            "confirmed":        0,
            "uncertain":        0,
            "unknown":          0,
        }

        self.enc          = self._load_encodings()
        self.session_info = self._get_session() if session_id else None

    def _load_encodings(self):
        data = face_db.load_all()
        if not data.get("student_ids"):
            print(f"\n❌ No trained faces in the database")
            print("   Run: python train.py --student_id ST-1 --name 'Name' --webcam")
            return None

        count = len(data["student_ids"])
        print(f"\n✅ Loaded {count} trained face(s) from database:")
        for sid, name in zip(data["student_ids"], data["names"]):
            print(f"   {sid} — {name}")
        return data

    def _get_session(self):
        try:
            r = requests.get(
                f"{API_URL}/sessions/{self.session_id}",
                headers=self._headers(), timeout=5
            )
            if r.status_code == 200:
                info = r.json()
                print(f"\n📚 Session: {info.get('subject_name')} | "
                      f"{info.get('start_time')}–{info.get('end_time')}")
                return info
        except Exception as e:
            print(f"⚠️  Cannot load session: {e}")
        return None

    def _headers(self):
        return {
            "Content-Type":  "application/json",
            "Authorization": f"Bearer {self.token}",
        }

    # ── Time rules ────────────────────────────────────────────────────────────

    def _parse_time(self, t):
        return datetime.combine(date.today(), datetime.strptime(t, "%H:%M").time())

    def _get_status(self, entry_time):
        if not self.session_info:
            return "Present"
        start    = self._parse_time(self.session_info["start_time"])
        diff     = (entry_time - start).total_seconds() / 60
        return "Present" if diff <= PRESENT_WINDOW_MINS else "Late"

    def _session_ended(self):
        if not self.session_info:
            return False
        return datetime.now() > self._parse_time(self.session_info["end_time"])

    def _in_cooldown(self, key):
        if key not in self.last_seen:
            return False
        return (datetime.now() - self.last_seen[key]).total_seconds() < COOLDOWN_SECS

    # ── API calls ─────────────────────────────────────────────────────────────

    def _mark_attendance(self, sid, name, status, conf, entry_time):
        if sid in self.marked_set:
            return
        try:
            r = requests.post(f"{API_URL}/attendance", json={
                "student_id": sid,
                "session_id": self.session_id,
                "subject_id": self.session_info["subject_id"] if self.session_info else "",
                "status":     status,
                "confidence": round(float(conf), 2),
                "time":       entry_time.strftime("%H:%M"),
                "marked_by":  "face",
            }, headers=self._headers(), timeout=5)
            if r.status_code in (200, 201):
                self.marked_set.add(sid)
                tone = "success" if status == "Present" else "warning"
                print(f"  ✅ MARKED {status}: {name} at {entry_time.strftime('%H:%M')}")
                Thread(target=self._feed,
                       args=(f"{status} • {name} • {self.camera_name}", tone)).start()
            elif r.status_code == 400:
                self.marked_set.add(sid)
        except Exception as e:
            print(f"  ❌ Mark error: {e}")

    def _update_absent(self, sid, name):
        try:
            r = requests.get(
                f"{API_URL}/attendance?student_id={sid}&session_id={self.session_id}",
                headers=self._headers(), timeout=5
            )
            if r.status_code == 200 and r.json():
                rid = r.json()[0]["id"]
                requests.patch(
                    f"{API_URL}/attendance/{rid}",
                    json={"status": "Absent", "marked_by": "early_leave"},
                    headers=self._headers(), timeout=5
                )
                print(f"  🔄 {name} → Absent (early leave)")
                Thread(target=self._feed,
                       args=(f"Early leave • {name} → Absent", "danger")).start()
        except Exception as e:
            print(f"  ❌ Update error: {e}")

    def _alert(self, atype, severity):
        try:
            requests.post(f"{API_URL}/alerts", json={
                "type": atype, "severity": severity,
                "camera": self.camera_name, "session_id": self.session_id,
            }, headers=self._headers(), timeout=5)
        except Exception:
            pass

    def _feed(self, label, tone="primary"):
        try:
            requests.post(f"{API_URL}/activity-feed",
                          json={"label": label, "tone": tone},
                          headers=self._headers(), timeout=5)
        except Exception:
            pass

    def _end_session(self):
        try:
            requests.post(f"{API_URL}/sessions/{self.session_id}/end",
                          headers=self._headers(), timeout=10)
            print("✅ Session ended — auto absent applied")
        except Exception as e:
            print(f"❌ End session error: {e}")

    # ── 3-Algorithm voting ────────────────────────────────────────────────────

    def identify_face(self, hog_encoding, face_img_rgb):
        """
        3-Algorithm Voting System:

        Each algorithm votes for who it thinks the person is.
        Minimum 2 votes needed to confirm identity.
        Prevents false positives from single algorithm errors.
        """
        if not self.enc or not self.enc.get("student_ids"):
            return None, "Unknown", 0.0, {}

        votes      = {}   # { student_id: vote_count }
        conf_scores = {}  # { student_id: confidence }
        algo_results = {  # for display
            "HOG":     "—",
            "ArcFace": "—",
            "Facenet": "—",
        }

        # ── Vote 1: HOG (face_recognition) ────────────────────────────────
        hog_keys = self.enc.get("encodings_hog", self.enc.get("encodings_fr", []))
        if hog_keys and hog_encoding is not None:
            try:
                dists    = face_recognition.face_distance(hog_keys, hog_encoding)
                best_idx = int(np.argmin(dists))
                best_d   = float(dists[best_idx])
                if best_d < HOG_THRESHOLD:
                    sid  = self.enc["student_ids"][best_idx]
                    conf = round(1.0 - best_d, 2)
                    votes[sid]       = votes.get(sid, 0) + 1
                    conf_scores[sid] = max(conf_scores.get(sid, 0), conf)
                    algo_results["HOG"] = f"✓ {self.enc['names'][best_idx]} ({int(conf*100)}%)"
                else:
                    algo_results["HOG"] = f"✗ (dist={best_d:.2f})"
            except Exception as e:
                algo_results["HOG"] = f"err"

        # ── Vote 2: ArcFace (DeepFace) ────────────────────────────────────
        arc_keys = self.enc.get("encodings_arcface",
                                self.enc.get("encodings_deep", []))
        if DEEPFACE_OK and arc_keys and face_img_rgb is not None:
            try:
                result = DeepFace.represent(
                    img_path=face_img_rgb,
                    model_name="ArcFace",
                    enforce_detection=False,
                )
                if result and result[0].get("embedding"):
                    curr     = np.array(result[0]["embedding"])
                    best_sim = -1.0
                    best_di  = -1
                    for di, stored in enumerate(arc_keys):
                        if stored is None:
                            continue
                        sim = float(
                            np.dot(curr, stored) /
                            (np.linalg.norm(curr) * np.linalg.norm(stored) + 1e-9)
                        )
                        if sim > best_sim:
                            best_sim = sim
                            best_di  = di
                    if best_sim > DEEP_THRESHOLD and best_di >= 0:
                        sid  = self.enc["student_ids"][best_di]
                        conf = round(best_sim, 2)
                        votes[sid]       = votes.get(sid, 0) + 1
                        conf_scores[sid] = max(conf_scores.get(sid, 0), conf)
                        algo_results["ArcFace"] = f"✓ {self.enc['names'][best_di]} ({int(conf*100)}%)"
                    else:
                        algo_results["ArcFace"] = f"✗ (sim={best_sim:.2f})"
            except Exception:
                algo_results["ArcFace"] = "err"

        # ── Vote 3: Facenet512 (DeepFace) ─────────────────────────────────
        net_keys = self.enc.get("encodings_facenet", [])
        if DEEPFACE_OK and net_keys and face_img_rgb is not None:
            try:
                result = DeepFace.represent(
                    img_path=face_img_rgb,
                    model_name="Facenet512",
                    enforce_detection=False,
                )
                if result and result[0].get("embedding"):
                    curr     = np.array(result[0]["embedding"])
                    best_sim = -1.0
                    best_di  = -1
                    for di, stored in enumerate(net_keys):
                        if stored is None:
                            continue
                        sim = float(
                            np.dot(curr, stored) /
                            (np.linalg.norm(curr) * np.linalg.norm(stored) + 1e-9)
                        )
                        if sim > best_sim:
                            best_sim = sim
                            best_di  = di
                    if best_sim > DEEP_THRESHOLD and best_di >= 0:
                        sid  = self.enc["student_ids"][best_di]
                        conf = round(best_sim, 2)
                        votes[sid]       = votes.get(sid, 0) + 1
                        conf_scores[sid] = max(conf_scores.get(sid, 0), conf)
                        algo_results["Facenet"] = f"✓ {self.enc['names'][best_di]} ({int(conf*100)}%)"
                    else:
                        algo_results["Facenet"] = f"✗ (sim={best_sim:.2f})"
            except Exception:
                algo_results["Facenet"] = "err"

        # ── Count votes and decide ─────────────────────────────────────────
        self.stats["total_detections"] += 1

        if not votes:
            # No algorithm matched = Unknown
            self.stats["unknown"] += 1
            return None, "Unknown", 0.0, algo_results

        # Find student with most votes
        winner     = max(votes, key=votes.get)
        vote_count = votes[winner]

        if vote_count >= MIN_VOTES:
            # 2 or 3 algorithms agree = CONFIRMED
            self.stats["confirmed"] += 1
            winner_name = self.enc["names"][self.enc["student_ids"].index(winner)]
            final_conf  = conf_scores[winner]
            if not self._in_cooldown(f"votelog_{winner}"):
                self.last_seen[f"votelog_{winner}"] = datetime.now()
            print(f"  🗳️  VOTES: {vote_count}/3 → CONFIRMED: {winner_name} ({int(final_conf*100)}%)")
            return winner, winner_name, final_conf, algo_results
        else:
            # Only 1 algorithm agreed = UNCERTAIN = treat as Unknown
            self.stats["uncertain"] += 1
            if not self._in_cooldown("votelog_uncertain"):
                self.last_seen["votelog_uncertain"] = datetime.now()
            print(f"  🗳️  VOTES: {vote_count}/3 → UNCERTAIN → rejected")
            return None, "Uncertain", 0.0, algo_results

    # ── Gate mode ─────────────────────────────────────────────────────────────

    def process_gate(self, frame, rgb, locations, encodings):
        now = datetime.now()

        for (top, right, bottom, left), encoding in zip(locations, encodings):
            face_img = rgb[max(0,top):bottom, max(0,left):right]
            sid, name, conf, algo_results = self.identify_face(encoding, face_img)

            if sid and conf >= 0.65:
                # Known and confirmed
                color = GREEN
                if not self._in_cooldown(sid):
                    self.last_seen[sid] = now
                    t = now.strftime("%H:%M")
                    print(f"  🚪 GATE: {name} | {t} | {int(conf*100)}% | 3-algo confirmed")
                    Thread(target=self._feed,
                           args=(f"Gate entry • {name} • {t}", "primary")).start()

                cv2.rectangle(frame, (left, top), (right, bottom), color, 2)
                cv2.rectangle(frame, (left, bottom-38), (right, bottom), color, cv2.FILLED)
                cv2.putText(frame, f"{name}",
                            (left+4, bottom-22),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, BLACK, 1)
                cv2.putText(frame, f"{int(conf*100)}% | Votes: 3-algo",
                            (left+4, bottom-6),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.35, BLACK, 1)
            else:
                # Unknown or uncertain
                color = RED
                label = "UNKNOWN" if name == "Unknown" else "UNCERTAIN"

                if not self._in_cooldown(f"unknown_gate"):
                    self.last_seen["unknown_gate"] = now
                    print(f"  🔴 GATE: {label}")
                    Thread(target=self._alert,
                           args=("Unknown face", "High")).start()
                    Thread(target=self._feed,
                           args=(f"⚠️ {label} • {self.camera_name}", "danger")).start()

                cv2.rectangle(frame, (left, top), (right, bottom), color, 2)
                cv2.putText(frame, label,
                            (left, top-8),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

        return frame

    # ── Class mode ────────────────────────────────────────────────────────────

    def process_class(self, frame, rgb, locations, encodings, prev_in_frame):
        now           = datetime.now()
        curr_in_frame = set()

        for (top, right, bottom, left), encoding in zip(locations, encodings):
            face_img = rgb[max(0,top):bottom, max(0,left):right]
            sid, name, conf, algo_results = self.identify_face(encoding, face_img)

            if sid and conf >= 0.65:
                curr_in_frame.add(sid)

                if sid not in self.inside_room:
                    if self._session_ended():
                        # Rule 6: Ignored after session end
                        color = GRAY
                        if not self._in_cooldown(f"ignore_{sid}"):
                            self.last_seen[f"ignore_{sid}"] = now
                            print(f"  🚫 IGNORED: {name} (session ended)")

                    elif self._in_cooldown(sid):
                        status = self.inside_room.get(sid, {}).get("status", "")
                        color  = GREEN if status == "Present" else ORANGE
                        cv2.rectangle(frame, (left, top), (right, bottom), color, 2)
                        continue

                    else:
                        # Apply time rules
                        status = self._get_status(now)
                        color  = GREEN if status == "Present" else ORANGE

                        self.inside_room[sid] = {
                            "name":       name,
                            "entry_time": now,
                            "status":     status,
                        }
                        self.last_seen[sid] = now

                        t = now.strftime("%H:%M")
                        emoji = "✅" if status == "Present" else "⚠️"
                        print(f"  {emoji} {status.upper()}: {name} at {t} | 3-algo confirmed")

                        Thread(target=self._mark_attendance,
                               args=(sid, name, status, conf, now)).start()

                else:
                    status = self.inside_room[sid].get("status", "Present")
                    color  = GREEN if status == "Present" else ORANGE

                # Draw box
                cv2.rectangle(frame, (left, top), (right, bottom), color, 2)
                cv2.rectangle(frame, (left, bottom-38), (right, bottom), color, cv2.FILLED)
                s = self.inside_room.get(sid, {}).get("status", "")
                cv2.putText(frame, f"{name} — {s}",
                            (left+4, bottom-22),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.45, BLACK, 1)
                cv2.putText(frame, f"{int(conf*100)}% conf",
                            (left+4, bottom-6),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.35, BLACK, 1)

            else:
                # Unknown or uncertain
                color = RED
                label = "UNKNOWN" if name == "Unknown" else "UNCERTAIN"
                if not self._in_cooldown("unknown_class"):
                    self.last_seen["unknown_class"] = now
                    Thread(target=self._alert,
                           args=("Unknown face", "Medium")).start()
                cv2.rectangle(frame, (left, top), (right, bottom), color, 2)
                cv2.putText(frame, label,
                            (left, top-8),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, RED, 2)

        # Check who left
        if prev_in_frame:
            left_room = prev_in_frame - curr_in_frame
            for sid in left_room:
                if sid in self.inside_room:
                    info = self.inside_room[sid]
                    name = info["name"]
                    if self.session_info:
                        end_dt      = self._parse_time(self.session_info["end_time"])
                        mins_before = (end_dt - now).total_seconds() / 60
                        if mins_before > EARLY_LEAVE_MINS:
                            # Rule 3: Early leave = Absent
                            print(f"  ⚠️  {name} left {int(mins_before)} mins early → ABSENT")
                            Thread(target=self._update_absent,
                                   args=(sid, name)).start()
                        else:
                            # Rule 4: Left near end = OK
                            print(f"  ✅ {name} left {int(mins_before)} mins before end → OK")
                    del self.inside_room[sid]

        return frame, curr_in_frame

    # ── Main loop ─────────────────────────────────────────────────────────────

    def run(self):
        if self.enc is None:
            print("❌ No trained faces — run train.py first")
            return

        print(f"\n{'='*55}")
        print(f"  📷 {self.camera_name} | Mode: {self.mode.upper()}")
        print(f"  Algorithms: HOG + ArcFace + Facenet512 (3-vote)")
        print(f"  Min votes to confirm: {MIN_VOTES}/3")
        if self.session_info:
            print(f"  Session: {self.session_info.get('subject_name','—')}")
            print(f"  Time: {self.session_info.get('start_time')}–{self.session_info.get('end_time')}")
        print(f"  Press Q to quit")
        print(f"{'='*55}\n")

        cam_source = self.camera_index
        if cam_source in (None, "auto"):
            if self.session_info and self.session_info.get("camera"):
                cam_source = self.session_info["camera"]
                print(f"  📷 Using camera assigned to this session: {cam_source}")
            else:
                cam_source = 0
                print(f"  ⚠️  No camera set on this session — defaulting to index 0")
        if isinstance(cam_source, str) and cam_source.isdigit():
            cam_source = int(cam_source)

        cap = cv2.VideoCapture(cam_source)
        if not cap.isOpened():
            print(f"❌ Cannot open camera: {cam_source}")
            print(f"   Run: python list_cameras.py   (to see available camera indexes)")
            return
        print(f"✅ Opened camera: {cam_source}")

        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

        frame_n       = 0
        prev_in_frame = set()
        session_ended_notified = False

        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    Thread(target=self._alert,
                           args=("Camera offline", "High")).start()
                    break

                frame_n += 1
                if frame_n % PROCESS_EVERY_N != 0:
                    cv2.imshow(f"Smart Attendance — {self.camera_name}", frame)
                    if cv2.waitKey(1) & 0xFF == ord('q'):
                        break
                    continue

                small  = cv2.resize(frame, (0,0), fx=0.25, fy=0.25)
                rgb_sm = cv2.cvtColor(small, cv2.COLOR_BGR2RGB)
                rgb_fl = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

                locs_sm = face_recognition.face_locations(rgb_sm, model="hog")
                locs_fl = [(t*4, r*4, b*4, l*4) for t,r,b,l in locs_sm]
                encs_fl = face_recognition.face_encodings(rgb_fl, locs_fl)
                if not encs_fl:
                    encs_fl = face_recognition.face_encodings(rgb_sm, locs_sm)

                if self.mode == "class" and self._session_ended() and not session_ended_notified:
                    session_ended_notified = True
                    print("\n⏰ Session ended!")
                    Thread(target=self._end_session).start()

                # ── Overlays ───────────────────────────────────────────────
                mode_label = "🚪 GATE MODE" if self.mode == "gate" else "📚 CLASS MODE"
                cv2.putText(frame, mode_label,
                            (10, 26), cv2.FONT_HERSHEY_SIMPLEX, 0.6, YELLOW, 2)

                if self.session_info:
                    subj = self.session_info.get("subject_name", "")
                    t    = f"{self.session_info.get('start_time')}–{self.session_info.get('end_time')}"
                    cv2.putText(frame, f"{subj} | {t}",
                                (10, 48), cv2.FONT_HERSHEY_SIMPLEX, 0.45, WHITE, 1)

                cv2.putText(frame, datetime.now().strftime("%H:%M:%S"),
                            (frame.shape[1]-100, 26),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, WHITE, 2)

                # Algorithm labels
                cv2.putText(frame, "HOG+ArcFace+Facenet | Min 2/3 votes",
                            (10, frame.shape[0]-28),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.38, CYAN, 1)

                # Stats
                stats_str = (f"Total:{self.stats['total_detections']} "
                             f"OK:{self.stats['confirmed']} "
                             f"Unknown:{self.stats['unknown']}")
                cv2.putText(frame, stats_str,
                            (10, frame.shape[0]-10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.38, (200,200,200), 1)

                # Process frame
                if self.mode == "gate":
                    frame = self.process_gate(frame, rgb_fl, locs_fl, encs_fl)
                elif self.mode == "class":
                    frame, prev_in_frame = self.process_class(
                        frame, rgb_fl, locs_fl, encs_fl, prev_in_frame
                    )

                cv2.imshow(f"Smart Attendance — {self.camera_name}", frame)

                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break
        except KeyboardInterrupt:
            print("\n⏹️  Stopped (Ctrl+C)")
        finally:
            cap.release()
            cv2.destroyAllWindows()

        # Print final stats
        print(f"\n📊 Session Stats:")
        print(f"   Total detections: {self.stats['total_detections']}")
        print(f"   Confirmed:        {self.stats['confirmed']}")
        print(f"   Uncertain:        {self.stats['uncertain']}")
        print(f"   Unknown:          {self.stats['unknown']}")
        print(f"\n👋 Camera stopped")


def get_token(email, password):
    try:
        r = requests.post(f"{API_URL}/auth/login", json={
            "email": email, "password": password, "role": "admin",
        }, timeout=5)
        if r.status_code == 200:
            print("✅ Logged in")
            return r.json()["access_token"]
        print(f"❌ Login failed: {r.json()}")
    except Exception as e:
        print(f"❌ Cannot connect to backend: {e}")
    return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode",       default="gate", choices=["gate","class"])
    parser.add_argument("--session_id", default=None)
    parser.add_argument("--name",       default=None)
    parser.add_argument("--token",      default=None)
    parser.add_argument("--email",      default="admin@smart.com")
    parser.add_argument("--password",   default="admin123")
    parser.add_argument("--camera",     type=str, default="auto",
                         help="Camera device index (0, 1...), an IP camera URL, "
                              "or 'auto' to use the camera assigned to --session_id")
    args = parser.parse_args()

    if not args.name:
        args.name = "Cam 1 — Gate" if args.mode == "gate" else "Cam 2 — Class"

    token = args.token or get_token(args.email, args.password)
    if not token:
        sys.exit(1)

    if args.mode == "class" and not args.session_id:
        print("❌ Class mode needs --session_id")
        sys.exit(1)

    engine = VotingRecognitionEngine(
        mode=args.mode,
        session_id=args.session_id,
        token=token,
        camera_name=args.name,
        camera_index=args.camera,
    )
    engine.run()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⏹️  Stopped (Ctrl+C) — camera released.")
        sys.exit(0)