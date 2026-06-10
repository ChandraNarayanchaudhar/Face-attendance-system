# schemas.py — All Pydantic request/response models

from __future__ import annotations
from datetime import date, datetime
from typing import List, Optional, Literal
from pydantic import BaseModel, Field


# ── Auth ──────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str = Field(min_length=6)
    role: Literal["student", "teacher", "admin"]
    section: Optional[str] = None
    semester: Optional[str] = None
    department: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str
    role: Literal["student", "teacher", "admin"]


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: str
    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ── Students ──────────────────────────────────────────────────────────────────

class StudentOut(BaseModel):
    id: str
    name: str
    email: str
    section: Optional[str]
    semester: Optional[str]
    overall_attendance_pct: float
    face_data_status: str
    is_active: bool
    model_config = {"from_attributes": True}


class StudentCreate(BaseModel):
    name: str
    email: str
    password: str
    section: Optional[str] = None
    semester: Optional[str] = None


class StudentUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    section: Optional[str] = None
    semester: Optional[str] = None
    face_data_status: Optional[Literal["Registered","Pending","Missing"]] = None


# ── Teachers ──────────────────────────────────────────────────────────────────

class TeacherOut(BaseModel):
    id: str
    name: str
    email: str
    department: Optional[str]
    model_config = {"from_attributes": True}


class TeacherCreate(BaseModel):
    name: str
    email: str
    password: str
    department: Optional[str] = None


# ── Subjects ──────────────────────────────────────────────────────────────────

class SubjectCreate(BaseModel):
    name: str
    code: str
    teacher_id: Optional[str] = None
    schedule: Optional[str] = None


class SubjectOut(BaseModel):
    id: str
    name: str
    code: str
    teacher_id: Optional[str]
    teacher_name: Optional[str] = None
    schedule: Optional[str]
    avg_attendance_pct: float
    model_config = {"from_attributes": True}


class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    schedule: Optional[str] = None
    teacher_id: Optional[str] = None


# ── Sessions ──────────────────────────────────────────────────────────────────

class SessionCreate(BaseModel):
    subject_id: str
    teacher_id: Optional[str] = None
    room: Optional[str] = None
    camera: Optional[str] = None
    start_time: str
    end_time: str
    session_date: Optional[date] = None


class SessionOut(BaseModel):
    id: str
    subject_id: str
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    teacher_id: Optional[str]
    teacher_name: Optional[str] = None
    room: Optional[str]
    camera: Optional[str] = None
    start_time: str
    end_time: str
    session_date: date
    status: str
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    model_config = {"from_attributes": True}


class SessionStatusUpdate(BaseModel):
    status: Literal["Scheduled","Live","Completed"]


# ── Attendance ────────────────────────────────────────────────────────────────

class AttendanceCreate(BaseModel):
    student_id: str
    session_id: str
    subject_id: str
    status: Literal["Present","Late","Absent"] = "Present"
    confidence: float = 1.0
    time: Optional[str] = None
    marked_by: Optional[str] = "manual"


class AttendanceOut(BaseModel):
    id: str
    student_id: str
    student_name: Optional[str] = None
    session_id: str
    subject_id: str
    subject_name: Optional[str] = None
    date: date
    time: Optional[str]
    status: str
    confidence: float
    marked_by: Optional[str]
    model_config = {"from_attributes": True}


class AttendanceUpdate(BaseModel):
    status: Literal["Present","Late","Absent"]
    marked_by: Optional[str] = "manual"


# ── Holidays ──────────────────────────────────────────────────────────────────

class HolidayCreate(BaseModel):
    date: date
    name: str
    tag: Literal["National","Institution"] = "National"


class HolidayOut(BaseModel):
    id: str
    date: date
    name: str
    tag: str
    model_config = {"from_attributes": True}


# ── Alerts ────────────────────────────────────────────────────────────────────

class AlertCreate(BaseModel):
    type: Literal["Unknown face","Duplicate face","Spoof attempt","Camera offline"]
    severity: Literal["Low","Medium","High"]
    camera: Optional[str] = None
    session_id: Optional[str] = None
    notes: Optional[str] = None


class AlertOut(BaseModel):
    id: str
    type: str
    severity: str
    camera: Optional[str]
    session_id: Optional[str]
    created_at: datetime
    status: str
    notes: Optional[str]
    model_config = {"from_attributes": True}


class AlertStatusUpdate(BaseModel):
    status: Literal["Open","Resolved","Ignored"]
    notes: Optional[str] = None


# ── Notifications ─────────────────────────────────────────────────────────────

class NotificationOut(BaseModel):
    id: str
    title: str
    body: Optional[str]
    type: str
    is_read: bool
    created_at: datetime
    model_config = {"from_attributes": True}


class NotificationCreate(BaseModel):
    user_id: str
    title: str
    body: Optional[str] = None
    type: str = "info"


# ── Activity Feed ─────────────────────────────────────────────────────────────

class ActivityFeedOut(BaseModel):
    id: str
    label: str
    tone: str
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Reports ───────────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_students: int
    total_teachers: int
    total_subjects: int
    live_sessions: int
    today_present: int
    today_late: int
    today_absent: int
    today_attendance_pct: float
    open_alerts: int
    avg_attendance_7d: float


class AttendanceSummary(BaseModel):
    total_records: int
    total_students: int
    total_sessions: int
    overall_pct: float
    present_count: int
    late_count: int
    absent_count: int


class SubjectAttendanceStat(BaseModel):
    subject_id: str
    name: str
    code: str
    avg_pct: float
    total_sessions: int


class StudentAttendanceStat(BaseModel):
    student_id: str
    student_name: str
    overall_pct: float
    present: int
    late: int
    absent: int


class TrendPoint(BaseModel):
    date: str
    pct: float
    present: int
    total: int


# ── Settings ──────────────────────────────────────────────────────────────────

class SettingUpsert(BaseModel):
    key: str
    value: str


class SettingOut(BaseModel):
    key: str
    value: Optional[str]
    model_config = {"from_attributes": True}


class SettingsBulkUpsert(BaseModel):
    settings: List[SettingUpsert]