# models.py — All database tables
# FIXED: camera column on Session (not User), added entry_time/exit_time

import uuid
from datetime import datetime, date
from sqlalchemy import (
    Column, String, Float, Boolean, Integer,
    DateTime, Date, ForeignKey, Text,
    Enum as SAEnum,
)
from sqlalchemy.orm import relationship
from database import Base


def _uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"
    id                     = Column(String, primary_key=True, default=_uuid)
    name                   = Column(String, nullable=False)
    email                  = Column(String, unique=True, nullable=False, index=True)
    hashed_password        = Column(String, nullable=False)
    phone_number           = Column(String, nullable=True)
    profile_image          = Column(Text, nullable=True)  # base64 encoded image
    role                   = Column(SAEnum("student","teacher","admin", name="user_role"), nullable=False)
    is_active              = Column(Boolean, default=True)
    created_at             = Column(DateTime, default=datetime.utcnow)
    # student
    section                = Column(String, nullable=True)
    semester               = Column(String, nullable=True)
    face_data_status       = Column(SAEnum("Registered","Pending","Missing", name="face_status"), default="Pending")
    overall_attendance_pct = Column(Float, default=0.0)
    # teacher
    department             = Column(String, nullable=True)
    teacher_semesters      = Column(String, nullable=True)  # JSON list of assigned semesters: '["Sem1", "Sem2"]'
    # relationships
    attendance_records = relationship("AttendanceRecord", back_populates="student", foreign_keys="AttendanceRecord.student_id")
    notifications      = relationship("Notification", back_populates="user")
    taught_sessions    = relationship("Session", back_populates="teacher", foreign_keys="Session.teacher_id")
    taught_subjects    = relationship("Subject", back_populates="teacher", foreign_keys="Subject.teacher_id")


class Subject(Base):
    __tablename__ = "subjects"
    id                 = Column(String, primary_key=True, default=_uuid)
    name               = Column(String, nullable=False)
    code               = Column(String, unique=True, nullable=False)
    teacher_id         = Column(String, ForeignKey("users.id"), nullable=True)
    schedule           = Column(String, nullable=True)
    avg_attendance_pct = Column(Float, default=0.0)
    teacher            = relationship("User", back_populates="taught_subjects", foreign_keys=[teacher_id])
    sessions           = relationship("Session", back_populates="subject", cascade="all, delete-orphan")
    attendance_records = relationship("AttendanceRecord", back_populates="subject")


class Session(Base):
    __tablename__ = "sessions"
    id           = Column(String, primary_key=True, default=_uuid)
    subject_id   = Column(String, ForeignKey("subjects.id"), nullable=False)
    teacher_id   = Column(String, ForeignKey("users.id"), nullable=True)
    room         = Column(String, nullable=True)
    camera       = Column(String, nullable=True)  # CCTV camera name or RTSP URL
    start_time   = Column(String, nullable=False)
    end_time     = Column(String, nullable=False)
    session_date = Column(Date, default=date.today)
    semester     = Column(String, nullable=True)
    status       = Column(SAEnum("Scheduled","Live","Completed", name="session_status"), default="Scheduled")
    started_at   = Column(DateTime, nullable=True)
    ended_at     = Column(DateTime, nullable=True)
    subject            = relationship("Subject", back_populates="sessions")
    teacher            = relationship("User", back_populates="taught_sessions", foreign_keys=[teacher_id])
    attendance_records = relationship("AttendanceRecord", back_populates="session", cascade="all, delete-orphan")


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"
    id         = Column(String, primary_key=True, default=_uuid)
    student_id = Column(String, ForeignKey("users.id"), nullable=False)
    session_id = Column(String, ForeignKey("sessions.id"), nullable=False)
    subject_id = Column(String, ForeignKey("subjects.id"), nullable=False)
    date       = Column(Date, default=date.today)
    time       = Column(String, nullable=True)      # "09:06"
    entry_time = Column(DateTime, nullable=True)    # full entry datetime
    exit_time  = Column(DateTime, nullable=True)    # full exit datetime
    status     = Column(SAEnum("Present","Late","Absent", name="attendance_status"), default="Absent")
    confidence = Column(Float, default=0.0)
    marked_by  = Column(String, nullable=True)      # face | manual | auto
    student = relationship("User", back_populates="attendance_records", foreign_keys=[student_id])
    session = relationship("Session", back_populates="attendance_records")
    subject = relationship("Subject", back_populates="attendance_records")


class Holiday(Base):
    __tablename__ = "holidays"
    id   = Column(String, primary_key=True, default=_uuid)
    date = Column(Date, nullable=False, unique=True)
    name = Column(String, nullable=False)
    tag  = Column(SAEnum("National","Institution", name="holiday_tag"), default="National")


class Alert(Base):
    __tablename__ = "alerts"
    id         = Column(String, primary_key=True, default=_uuid)
    type       = Column(SAEnum("Unknown face","Duplicate face","Spoof attempt","Camera offline", name="alert_type"), nullable=False)
    severity   = Column(SAEnum("Low","Medium","High", name="alert_severity"), nullable=False)
    camera     = Column(String, nullable=True)
    session_id = Column(String, ForeignKey("sessions.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    status     = Column(SAEnum("Open","Resolved","Ignored", name="alert_status"), default="Open")
    notes      = Column(Text, nullable=True)


class Notification(Base):
    __tablename__ = "notifications"
    id         = Column(String, primary_key=True, default=_uuid)
    user_id    = Column(String, ForeignKey("users.id"), nullable=False)
    title      = Column(String, nullable=False)
    body       = Column(Text, nullable=True)
    type       = Column(String, default="info")
    is_read    = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", back_populates="notifications")


class ActivityFeedEvent(Base):
    __tablename__ = "activity_feed"
    id         = Column(String, primary_key=True, default=_uuid)
    label      = Column(String, nullable=False)
    tone       = Column(String, default="primary")
    created_at = Column(DateTime, default=datetime.utcnow)
    meta       = Column(Text, nullable=True)


class SystemSetting(Base):
    __tablename__ = "system_settings"
    key   = Column(String, primary_key=True)
    value = Column(Text, nullable=True)


class FaceEncoding(Base):
    """Trained face recognition data — one row per student.

    Replaces the old models/encodings.pkl file so training data lives in the
    same database as everything else and recognition reads live from here.
    Encodings are stored as JSON-encoded arrays of floats (SQLite has no
    native array/vector type).
    """
    __tablename__ = "face_encodings"
    id               = Column(String, primary_key=True, default=_uuid)
    student_id       = Column(String, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    name             = Column(String, nullable=False)
    encoding_hog     = Column(Text, nullable=True)   # JSON list[128] — face_recognition HOG
    encoding_arcface = Column(Text, nullable=True)   # JSON list[512] — DeepFace ArcFace
    encoding_facenet = Column(Text, nullable=True)   # JSON list[512] — DeepFace Facenet512
    photo_count      = Column(Integer, default=0)
    created_at       = Column(DateTime, default=datetime.utcnow)
    updated_at       = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)