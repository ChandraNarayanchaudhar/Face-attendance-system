# utils.py — Shared helpers used across all routers

from sqlalchemy.orm import Session
import models
from routers.websocket import broadcast_sync


def recalc_student_attendance(student_id: str, db: Session):
    # Recalculate overall_attendance_pct for one student
    total = db.query(models.AttendanceRecord).filter(
        models.AttendanceRecord.student_id == student_id
    ).count()
    pct = 0.0
    if total > 0:
        present = db.query(models.AttendanceRecord).filter(
            models.AttendanceRecord.student_id == student_id,
            models.AttendanceRecord.status.in_(["Present","Late"]),
        ).count()
        pct = round((present / total) * 100, 1)
    student = db.query(models.User).filter(models.User.id == student_id).first()
    if student:
        student.overall_attendance_pct = pct


def recalc_subject_attendance(subject_id: str, db: Session):
    # Recalculate avg_attendance_pct for one subject
    total = db.query(models.AttendanceRecord).filter(
        models.AttendanceRecord.subject_id == subject_id
    ).count()
    pct = 0.0
    if total > 0:
        present = db.query(models.AttendanceRecord).filter(
            models.AttendanceRecord.subject_id == subject_id,
            models.AttendanceRecord.status.in_(["Present","Late"]),
        ).count()
        pct = round((present / total) * 100, 1)
    subject = db.query(models.Subject).filter(models.Subject.id == subject_id).first()
    if subject:
        subject.avg_attendance_pct = pct


def add_feed_event(label: str, tone: str, db: Session, meta: str = None):
    # Add to live activity feed on dashboard, and push it to any connected
    # WebSocket clients right away — no need to wait for a page refresh.
    event = models.ActivityFeedEvent(label=label, tone=tone, meta=meta)
    db.add(event)
    broadcast_sync({
        "type": "feed_event",
        "data": {"label": label, "tone": tone},
        "timestamp": None,  # created_at isn't set until commit; timestamp is illustrative only
    })


def push_notification(user_id: str, title: str, body: str, ntype: str, db: Session):
    # Create notification for a user, and broadcast it live so an open
    # dashboard/portal for that user can show it immediately.
    n = models.Notification(user_id=user_id, title=title, body=body, type=ntype)
    db.add(n)
    broadcast_sync({
        "type": "notification",
        "data": {"user_id": user_id, "title": title, "body": body, "ntype": ntype},
        "timestamp": None,
    })


def push_low_attendance_warning(student: models.User, subject: models.Subject, pct: float, db: Session):
    # Warn student if attendance drops below 75%
    if pct < 75:
        push_notification(
            user_id=student.id,
            title=f"⚠️ Low attendance: {subject.name}",
            body=f"Your attendance in {subject.name} dropped to {pct}%. Minimum: 75%.",
            ntype="warning",
            db=db,
        )


def enrich_session(session: models.Session) -> dict:
    # Convert Session ORM to dict — includes camera field
    return {
        "id":           session.id,
        "subject_id":   session.subject_id,
        "subject_name": session.subject.name if session.subject else None,
        "subject_code": session.subject.code if session.subject else None,
        "teacher_id":   session.teacher_id,
        "teacher_name": session.teacher.name if session.teacher else None,
        "room":         session.room,
        "camera":       session.camera,
        "semester":     session.semester,
        "start_time":   session.start_time,
        "end_time":     session.end_time,
        "session_date": session.session_date,
        "status":       session.status,
        "started_at":   session.started_at,
        "ended_at":     session.ended_at,
    }


def enrich_attendance(r: models.AttendanceRecord) -> dict:
    # Convert AttendanceRecord ORM to dict
    return {
        "id":           r.id,
        "student_id":   r.student_id,
        "student_name": r.student.name if r.student else None,
        "session_id":   r.session_id,
        "subject_id":   r.subject_id,
        "subject_name": r.subject.name if r.subject else None,
        "date":         r.date,
        "time":         r.time,
        "status":       r.status,
        "confidence":   r.confidence,
        "marked_by":    r.marked_by,
    }


def validate_base64_image(data: str, max_bytes: int = 5 * 1024 * 1024) -> None:
    """Validate a base64 data URL or raw base64 image string.

    Raises ValueError on failure.
    """
    import base64
    from io import BytesIO

    if not data:
        raise ValueError("Empty image data")

    # strip data URL prefix if present
    if data.startswith("data:"):
        try:
            header, b64 = data.split(",", 1)
        except ValueError:
            raise ValueError("Invalid data URL")
    else:
        b64 = data

    try:
        raw = base64.b64decode(b64, validate=True)
    except Exception:
        raise ValueError("Image is not valid base64")

    if len(raw) > max_bytes:
        raise ValueError(f"Image exceeds maximum size of {max_bytes} bytes")

    # quick magic-bytes check for common image types
    if raw.startswith(b"\xff\xd8\xff"):
        return  # JPEG
    if raw.startswith(b"\x89PNG\r\n\x1a\n"):
        return  # PNG
    if raw[:6] in (b"GIF87a", b"GIF89a"):
        return  # GIF

    raise ValueError("Unsupported or unknown image format")