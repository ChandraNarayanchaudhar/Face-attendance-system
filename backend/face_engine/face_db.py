"""
face_db.py — Shared database storage for trained face encodings.

Trained face data now lives in the project's real SQLite database
(smart_attendance.db, table `face_encodings`) instead of a standalone
models/encodings.pkl file. train.py, manage_faces.py, and recognize.py
all use this module so they share exactly one source of truth.

If an old models/encodings.pkl exists and the database table is still
empty, its contents are imported automatically the first time this
module is used, so previously trained faces aren't lost.
"""

import os
import sys
import json
import pickle
from datetime import datetime

import numpy as np

# ── Make backend/ (parent of face_engine/) importable ───────────────────────
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from database import SessionLocal, engine, Base  # noqa: E402
import models  # noqa: E402

OLD_PICKLE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "encodings.pkl")

_ensured = False


def _to_json(vec):
    if vec is None:
        return None
    return json.dumps(np.asarray(vec, dtype=float).tolist())


def _from_json(s):
    if not s:
        return None
    return np.array(json.loads(s), dtype=float)


def ensure_table():
    """Create the face_encodings table if needed, and one-time-migrate any
    legacy pickle data into it."""
    global _ensured
    if _ensured:
        return
    Base.metadata.create_all(bind=engine, tables=[models.FaceEncoding.__table__])
    _migrate_pickle_if_needed()
    _ensured = True


def _migrate_pickle_if_needed():
    if not os.path.exists(OLD_PICKLE_FILE):
        return
    db = SessionLocal()
    try:
        if db.query(models.FaceEncoding).count() > 0:
            return  # DB already has data — nothing to migrate
        with open(OLD_PICKLE_FILE, "rb") as f:
            data = pickle.load(f)

        student_ids = data.get("student_ids", [])
        if not student_ids:
            return

        names    = data.get("names", [])
        hog_list = data.get("encodings_hog", data.get("encodings_fr", []))
        arc_list = data.get("encodings_arcface", data.get("encodings_deep", []))
        net_list = data.get("encodings_facenet", [])

        for i, sid in enumerate(student_ids):
            row = models.FaceEncoding(
                student_id=sid,
                name=names[i] if i < len(names) else sid,
                encoding_hog=_to_json(hog_list[i] if i < len(hog_list) else None),
                encoding_arcface=_to_json(arc_list[i] if i < len(arc_list) else None),
                encoding_facenet=_to_json(net_list[i] if i < len(net_list) else None),
                photo_count=0,
            )
            db.add(row)
        db.commit()
        print(f"  ℹ️  Migrated {len(student_ids)} student(s) from encodings.pkl into the database")
    except Exception as e:
        print(f"  ⚠️  Could not migrate old encodings.pkl: {e}")
    finally:
        db.close()


def save_encoding(student_id, name, hog=None, arcface=None, facenet=None, photo_count=0):
    """Insert or update one student's trained face data in the database."""
    ensure_table()
    db = SessionLocal()
    try:
        row = db.query(models.FaceEncoding).filter_by(student_id=student_id).first()
        if row is None:
            row = models.FaceEncoding(student_id=student_id)
            db.add(row)

        row.name             = name
        row.encoding_hog     = _to_json(hog)
        row.encoding_arcface = _to_json(arcface)
        row.encoding_facenet = _to_json(facenet)
        row.photo_count      = photo_count
        row.updated_at       = datetime.utcnow()

        # Best-effort: if this student_id matches a real registered user,
        # flip their face_data_status to Registered.
        try:
            user = db.query(models.User).filter_by(id=student_id).first()
            if user is not None:
                user.face_data_status = "Registered"
        except Exception:
            pass

        db.commit()
    finally:
        db.close()


def delete_encoding(student_id):
    """Remove one student's trained face data. Returns True if a row was deleted."""
    ensure_table()
    db = SessionLocal()
    try:
        row = db.query(models.FaceEncoding).filter_by(student_id=student_id).first()
        if row is None:
            return False
        db.delete(row)

        try:
            user = db.query(models.User).filter_by(id=student_id).first()
            if user is not None:
                user.face_data_status = "Missing"
        except Exception:
            pass

        db.commit()
        return True
    finally:
        db.close()


def clear_all():
    """Remove ALL trained face data. Returns number of rows deleted."""
    ensure_table()
    db = SessionLocal()
    try:
        rows = db.query(models.FaceEncoding).all()
        count = len(rows)
        for row in rows:
            try:
                user = db.query(models.User).filter_by(id=row.student_id).first()
                if user is not None:
                    user.face_data_status = "Missing"
            except Exception:
                pass
            db.delete(row)
        db.commit()
        return count
    finally:
        db.close()


def load_all():
    """
    Load every trained student from the database and return them in the
    same dict shape the face_engine scripts already used with the old
    pickle file, so callers don't need major rewrites.
    """
    ensure_table()
    db = SessionLocal()
    try:
        rows = (
            db.query(models.FaceEncoding)
            .order_by(models.FaceEncoding.created_at.asc())
            .all()
        )
        data = {
            "student_ids":       [],
            "names":             [],
            "encodings_hog":     [],
            "encodings_arcface": [],
            "encodings_facenet": [],
            "photo_counts":      [],
        }
        for row in rows:
            data["student_ids"].append(row.student_id)
            data["names"].append(row.name)
            data["encodings_hog"].append(_from_json(row.encoding_hog))
            data["encodings_arcface"].append(_from_json(row.encoding_arcface))
            data["encodings_facenet"].append(_from_json(row.encoding_facenet))
            data["photo_counts"].append(row.photo_count or 0)
        return data
    finally:
        db.close()