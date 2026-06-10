"""
seed.py  —  Populate the database with realistic demo data.

Run once:
    python seed.py

Re-seed (wipes everything first):
    python seed.py --reset
"""
import sys
from datetime import date, datetime, timedelta

from database import SessionLocal, engine, Base
from models import (
    User, Subject, Session, AttendanceRecord,
    Holiday, Alert, Notification, ActivityFeedEvent, SystemSetting
)
from auth import hash_password

Base.metadata.create_all(bind=engine)
db = SessionLocal()

RESET = "--reset" in sys.argv


def clear():
    for tbl in [
        Notification, ActivityFeedEvent, AttendanceRecord,
        Session, Subject, Holiday, Alert, SystemSetting, User,
    ]:
        db.query(tbl).delete()
    db.commit()
    print("  ✓  Cleared existing data")


def seed():
    if RESET or db.query(User).count() == 0:
        if RESET:
            clear()
    else:
        print("Database already has data. Run with --reset to re-seed.")
        return

    today = date.today()

    # ── Admin ─────────────────────────────────────────────────────────────────
    admin = User(
        id="ADMIN-001", name="System Admin", email="admin@demo.com",
        hashed_password=hash_password("admin123"), role="admin",
    )
    db.add(admin)

    # ── Teachers ──────────────────────────────────────────────────────────────
    teachers = [
        User(id="TCH-001", name="Dr. Ramesh Kumar",   email="ramesh.kumar@teacher.demo",
             hashed_password=hash_password("teacher123"), role="teacher", department="Computer Science"),
        User(id="TCH-002", name="Prof. Anjali Singh",  email="anjali.singh@teacher.demo",
             hashed_password=hash_password("teacher123"), role="teacher", department="Mathematics"),
        User(id="TCH-003", name="Dr. Vikram Patel",   email="vikram.patel@teacher.demo",
             hashed_password=hash_password("teacher123"), role="teacher", department="Physics"),
        User(id="TCH-004", name="S. Gurung",           email="s.gurung@teacher.demo",
             hashed_password=hash_password("teacher123"), role="teacher", department="Computer Science"),
        User(id="TCH-005", name="R. Acharya",          email="r.acharya@teacher.demo",
             hashed_password=hash_password("teacher123"), role="teacher", department="Mathematics"),
        User(id="TCH-006", name="N. Karki",            email="n.karki@teacher.demo",
             hashed_password=hash_password("teacher123"), role="teacher", department="Computer Science"),
        User(id="TCH-007", name="P. Shrestha",         email="p.shrestha@teacher.demo",
             hashed_password=hash_password("teacher123"), role="teacher", department="Computer Science"),
    ]
    db.add_all(teachers)

    # ── Students ──────────────────────────────────────────────────────────────
    students = [
        User(id="ST-1023", name="Sita Karki",    email="sita.karki@student.demo",
             hashed_password=hash_password("student123"), role="student",
             section="A", semester="8", face_data_status="Registered", overall_attendance_pct=82.0),
        User(id="ST-1048", name="Aayush Thapa",  email="aayush.thapa@student.demo",
             hashed_password=hash_password("student123"), role="student",
             section="A", semester="8", face_data_status="Pending", overall_attendance_pct=74.0),
        User(id="ST-1102", name="Nisha Rai",     email="nisha.rai@student.demo",
             hashed_password=hash_password("student123"), role="student",
             section="B", semester="8", face_data_status="Registered", overall_attendance_pct=91.0),
        User(id="ST-1127", name="Prakash Shah",  email="prakash.shah@student.demo",
             hashed_password=hash_password("student123"), role="student",
             section="B", semester="8", face_data_status="Missing", overall_attendance_pct=68.0),
        User(id="ST-1159", name="Meera Joshi",   email="meera.joshi@student.demo",
             hashed_password=hash_password("student123"), role="student",
             section="A", semester="8", face_data_status="Registered", overall_attendance_pct=79.0),
        User(id="ST-1201", name="Bikash Tamang", email="bikash.tamang@student.demo",
             hashed_password=hash_password("student123"), role="student",
             section="B", semester="8", face_data_status="Registered", overall_attendance_pct=88.0),
    ]
    db.add_all(students)
    db.commit()
    print("  ✓  Users created")

    # ── Subjects ──────────────────────────────────────────────────────────────
    subjects = [
        Subject(id="SUB-OS",   name="Operating Systems", code="CSC-302",
                teacher_id="TCH-004", schedule="Tue/Thu • 09:00–10:30",  avg_attendance_pct=79.0),
        Subject(id="SUB-MTH",  name="Mathematics",       code="MTH-201",
                teacher_id="TCH-005", schedule="Mon/Wed/Fri • 10:00–11:00", avg_attendance_pct=86.0),
        Subject(id="SUB-AI",   name="AI Fundamentals",   code="CSC-340",
                teacher_id="TCH-007", schedule="Mon/Thu • 13:00–14:30", avg_attendance_pct=83.0),
        Subject(id="SUB-DB",   name="Database Systems",  code="CSC-220",
                teacher_id="TCH-006", schedule="Wed/Fri • 12:00–13:30", avg_attendance_pct=88.0),
        Subject(id="SUB-NET",  name="Computer Networks", code="CSC-310",
                teacher_id="TCH-001", schedule="Tue/Thu • 14:00–15:30", avg_attendance_pct=81.0),
    ]
    db.add_all(subjects)
    db.commit()
    print("  ✓  Subjects created")

    # ── Sessions ──────────────────────────────────────────────────────────────
    sessions_data = [
        # Today
        Session(id="SES-1001", subject_id="SUB-OS",  teacher_id="TCH-004",
                room="Lab 2A",   start_time="09:00", end_time="10:30",
                session_date=today, status="Live", started_at=datetime.utcnow()),
        Session(id="SES-1002", subject_id="SUB-MTH", teacher_id="TCH-005",
                room="Room 301", start_time="10:00", end_time="11:00",
                session_date=today, status="Scheduled"),
        Session(id="SES-1003", subject_id="SUB-DB",  teacher_id="TCH-006",
                room="Room 204", start_time="12:00", end_time="13:30",
                session_date=today, status="Scheduled"),
        Session(id="SES-1004", subject_id="SUB-AI",  teacher_id="TCH-007",
                room="Room 105", start_time="13:00", end_time="14:30",
                session_date=today, status="Scheduled"),
        # Yesterday - completed
        Session(id="SES-0996", subject_id="SUB-AI",  teacher_id="TCH-007",
                room="Room 105", start_time="13:00", end_time="14:30",
                session_date=today - timedelta(days=1), status="Completed",
                started_at=datetime.utcnow() - timedelta(days=1, hours=2),
                ended_at=datetime.utcnow() - timedelta(days=1)),
        Session(id="SES-0997", subject_id="SUB-OS",  teacher_id="TCH-004",
                room="Lab 2A",   start_time="09:00", end_time="10:30",
                session_date=today - timedelta(days=2), status="Completed",
                started_at=datetime.utcnow() - timedelta(days=2, hours=2),
                ended_at=datetime.utcnow() - timedelta(days=2)),
        Session(id="SES-0998", subject_id="SUB-DB",  teacher_id="TCH-006",
                room="Room 204", start_time="12:00", end_time="13:30",
                session_date=today - timedelta(days=3), status="Completed",
                started_at=datetime.utcnow() - timedelta(days=3, hours=2),
                ended_at=datetime.utcnow() - timedelta(days=3)),
        Session(id="SES-0999", subject_id="SUB-NET", teacher_id="TCH-001",
                room="Lab 1B",   start_time="14:00", end_time="15:30",
                session_date=today - timedelta(days=4), status="Completed",
                started_at=datetime.utcnow() - timedelta(days=4, hours=2),
                ended_at=datetime.utcnow() - timedelta(days=4)),
    ]
    db.add_all(sessions_data)
    db.commit()
    print("  ✓  Sessions created")

    # ── Attendance Records ────────────────────────────────────────────────────
    # Today's live session (SES-1001 OS)
    att_today = [
        AttendanceRecord(student_id="ST-1023", session_id="SES-1001", subject_id="SUB-OS",
                         date=today, time="09:06", status="Late",    confidence=0.92, marked_by="face"),
        AttendanceRecord(student_id="ST-1048", session_id="SES-1001", subject_id="SUB-OS",
                         date=today, time="09:01", status="Present", confidence=0.86, marked_by="face"),
        AttendanceRecord(student_id="ST-1102", session_id="SES-1001", subject_id="SUB-OS",
                         date=today, time="09:01", status="Present", confidence=0.97, marked_by="face"),
        AttendanceRecord(student_id="ST-1201", session_id="SES-1001", subject_id="SUB-OS",
                         date=today, time="09:03", status="Present", confidence=0.94, marked_by="face"),
    ]
    db.add_all(att_today)

    # Yesterday's AI session (SES-0996)
    yesterday = today - timedelta(days=1)
    att_yest = [
        AttendanceRecord(student_id="ST-1023", session_id="SES-0996", subject_id="SUB-AI",
                         date=yesterday, time="13:00", status="Present", confidence=0.95, marked_by="face"),
        AttendanceRecord(student_id="ST-1102", session_id="SES-0996", subject_id="SUB-AI",
                         date=yesterday, time="13:02", status="Present", confidence=0.98, marked_by="face"),
        AttendanceRecord(student_id="ST-1159", session_id="SES-0996", subject_id="SUB-AI",
                         date=yesterday, time="13:00", status="Present", confidence=0.93, marked_by="face"),
        AttendanceRecord(student_id="ST-1048", session_id="SES-0996", subject_id="SUB-AI",
                         date=yesterday, time="13:18", status="Late",    confidence=0.88, marked_by="face"),
        AttendanceRecord(student_id="ST-1127", session_id="SES-0996", subject_id="SUB-AI",
                         date=yesterday, status="Absent", confidence=0.0, marked_by="auto"),
        AttendanceRecord(student_id="ST-1201", session_id="SES-0996", subject_id="SUB-AI",
                         date=yesterday, time="13:01", status="Present", confidence=0.91, marked_by="face"),
    ]
    db.add_all(att_yest)

    # Older sessions
    for session_id, subject_id, d, recs in [
        ("SES-0997", "SUB-OS",  today - timedelta(days=2), [
            ("ST-1023", "09:00", "Present", 0.95), ("ST-1048", "09:00", "Present", 0.90),
            ("ST-1102", "09:00", "Present", 0.97), ("ST-1127", "09:22", "Late", 0.85),
            ("ST-1159", "09:00", "Present", 0.93), ("ST-1201", None, "Absent", 0.0),
        ]),
        ("SES-0998", "SUB-DB",  today - timedelta(days=3), [
            ("ST-1023", "12:00", "Present", 0.96), ("ST-1048", None, "Absent", 0.0),
            ("ST-1102", "12:01", "Present", 0.98), ("ST-1127", "12:15", "Late", 0.87),
            ("ST-1159", "12:00", "Present", 0.92), ("ST-1201", "12:02", "Present", 0.94),
        ]),
        ("SES-0999", "SUB-NET", today - timedelta(days=4), [
            ("ST-1023", "14:00", "Present", 0.94), ("ST-1048", "14:12", "Late", 0.88),
            ("ST-1102", "14:00", "Present", 0.97), ("ST-1127", None, "Absent", 0.0),
            ("ST-1159", "14:00", "Present", 0.91), ("ST-1201", "14:01", "Present", 0.93),
        ]),
    ]:
        for sid, t, status, conf in recs:
            r = AttendanceRecord(
                student_id=sid, session_id=session_id, subject_id=subject_id,
                date=d, time=t, status=status, confidence=conf,
                marked_by="face" if status != "Absent" else "auto"
            )
            db.add(r)

    db.commit()
    print("  ✓  Attendance records created")

    # ── Holidays ──────────────────────────────────────────────────────────────
    holidays = [
        Holiday(id="HOL-01", date=date(today.year, today.month, 15) if today.day < 15 else date(today.year, today.month + 1, 15),
                name="Buddha Jayanti", tag="National"),
        Holiday(id="HOL-02", date=today + timedelta(days=10), name="College Sports Day", tag="Institution"),
        Holiday(id="HOL-03", date=today + timedelta(days=20), name="Environment Day", tag="National"),
        Holiday(id="HOL-04", date=today + timedelta(days=35), name="Dashain Break Begins", tag="National"),
    ]
    db.add_all(holidays)

    # ── Alerts ────────────────────────────────────────────────────────────────
    alerts = [
        Alert(id="AL-9001", type="Unknown face",   severity="High",   camera="Cam 1 • Gate",
              session_id="SES-1001",
              created_at=datetime.utcnow() - timedelta(minutes=20), status="Open"),
        Alert(id="AL-9002", type="Camera offline", severity="Medium", camera="Cam 3 • Corridor",
              created_at=datetime.utcnow() - timedelta(minutes=33), status="Open"),
        Alert(id="AL-9003", type="Spoof attempt",  severity="High",   camera="Cam 2 • Lab",
              session_id="SES-0997",
              created_at=datetime.utcnow() - timedelta(hours=28), status="Resolved",
              notes="Reviewed and confirmed false positive."),
        Alert(id="AL-9004", type="Duplicate face", severity="Low",    camera="Cam 1 • Gate",
              created_at=datetime.utcnow() - timedelta(hours=52), status="Ignored"),
    ]
    db.add_all(alerts)

    # ── Notifications ─────────────────────────────────────────────────────────
    notifs = [
        Notification(user_id="ST-1023", title="Late: Operating Systems",
                     body="You were marked late for Operating Systems today at 09:06.",
                     type="warning", is_read=False),
        Notification(user_id="ST-1023", title="⚠️ Low attendance: Mathematics",
                     body="Your attendance in Mathematics has dropped to 74%. Attend upcoming sessions.",
                     type="warning", is_read=False),
        Notification(user_id="ST-1023", title="Present: AI Fundamentals",
                     body="Your attendance was recorded for AI Fundamentals at 13:00.",
                     type="success", is_read=True),
        Notification(user_id="ST-1048", title="Late: AI Fundamentals",
                     body="You were marked late for AI Fundamentals yesterday.",
                     type="warning", is_read=False),
        Notification(user_id="ST-1127", title="Absent: AI Fundamentals",
                     body="You were marked absent for AI Fundamentals yesterday.",
                     type="warning", is_read=False),
        Notification(user_id="ST-1127", title="⚠️ Low attendance warning",
                     body="Your overall attendance is at 68%. Minimum required: 75%.",
                     type="warning", is_read=False),
    ]
    db.add_all(notifs)

    # ── Activity Feed ─────────────────────────────────────────────────────────
    feed_events = [
        ActivityFeedEvent(label="Session started • Operating Systems", tone="primary",
                          created_at=datetime.utcnow() - timedelta(minutes=45)),
        ActivityFeedEvent(label="Face recognized • Nisha Rai", tone="success",
                          created_at=datetime.utcnow() - timedelta(minutes=44)),
        ActivityFeedEvent(label="Face recognized • Aayush Thapa", tone="success",
                          created_at=datetime.utcnow() - timedelta(minutes=44)),
        ActivityFeedEvent(label="Late arrival • Sita Karki", tone="warning",
                          created_at=datetime.utcnow() - timedelta(minutes=39)),
        ActivityFeedEvent(label="Unknown face detected • Cam 1 • Gate", tone="danger",
                          created_at=datetime.utcnow() - timedelta(minutes=41)),
        ActivityFeedEvent(label="Session ended • AI Fundamentals", tone="primary",
                          created_at=datetime.utcnow() - timedelta(hours=24)),
        ActivityFeedEvent(label="Face recognized • Meera Joshi", tone="success",
                          created_at=datetime.utcnow() - timedelta(hours=24)),
    ]
    db.add_all(feed_events)

    # ── System Settings ───────────────────────────────────────────────────────
    settings = [
        SystemSetting(key="institution_name",        value="Himalayan College of Technology"),
        SystemSetting(key="confidence_threshold",    value="0.85"),
        SystemSetting(key="spoof_detection_enabled", value="true"),
        SystemSetting(key="late_threshold_minutes",  value="10"),
        SystemSetting(key="auto_absent_enabled",     value="true"),
        SystemSetting(key="email_alerts_enabled",    value="true"),
        SystemSetting(key="attendance_threshold",    value="75"),
    ]
    db.add_all(settings)

    db.commit()
    print("  ✓  Holidays, alerts, notifications, feed, settings created")
    print()
    print("━" * 54)
    print("  ✅  Seed complete!")
    print("━" * 54)
    print()
    print("  Demo accounts:")
    print("  ┌─────────┬──────────────────────────────┬────────────┐")
    print("  │ Role    │ Email                        │ Password   │")
    print("  ├─────────┼──────────────────────────────┼────────────┤")
    print("  │ admin   │ admin@demo.com               │ admin123   │")
    print("  │ teacher │ ramesh.kumar@teacher.demo    │ teacher123 │")
    print("  │ teacher │ anjali.singh@teacher.demo    │ teacher123 │")
    print("  │ student │ sita.karki@student.demo      │ student123 │")
    print("  │ student │ nisha.rai@student.demo       │ student123 │")
    print("  │ student │ aayush.thapa@student.demo    │ student123 │")
    print("  │ student │ prakash.shah@student.demo    │ student123 │")
    print("  └─────────┴──────────────────────────────┴────────────┘")
    print()
    print("  Run:  uvicorn main:app --reload --port 8000")
    print("  Docs: http://localhost:8000/docs")


if __name__ == "__main__":
    seed()
