# utils.py — Shared helpers used across all routers

from sqlalchemy.orm import Session
import models


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
    # Add to live activity feed on dashboard
    event = models.ActivityFeedEvent(label=label, tone=tone, meta=meta)
    db.add(event)


def push_notification(user_id: str, title: str, body: str, ntype: str, db: Session):
    # Create notification for a user
    n = models.Notification(user_id=user_id, title=title, body=body, type=ntype)
    db.add(n)


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