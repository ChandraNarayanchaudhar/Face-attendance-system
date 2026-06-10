# routers/reports.py — Analytics and reports

from datetime import date, timedelta
from typing import List, Optional
import csv, io
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from database import get_db
import models, schemas
from auth import get_current_user, require_role

router = APIRouter()


@router.get("/dashboard", response_model=schemas.DashboardStats)
def dashboard(db: Session = Depends(get_db), _=Depends(require_role("admin","teacher"))):
    today = date.today()
    total_students  = db.query(models.User).filter(models.User.role == "student", models.User.is_active == True).count()
    total_teachers  = db.query(models.User).filter(models.User.role == "teacher", models.User.is_active == True).count()
    total_subjects  = db.query(models.Subject).count()
    live_sessions   = db.query(models.Session).filter(models.Session.status == "Live").count()
    open_alerts     = db.query(models.Alert).filter(models.Alert.status == "Open").count()

    today_recs      = db.query(models.AttendanceRecord).filter(models.AttendanceRecord.date == today).all()
    today_present   = sum(1 for r in today_recs if r.status == "Present")
    today_late      = sum(1 for r in today_recs if r.status == "Late")
    today_absent    = sum(1 for r in today_recs if r.status == "Absent")
    today_total     = len(today_recs)
    today_pct       = round(((today_present + today_late) / today_total) * 100, 1) if today_total else 0.0

    week_recs       = db.query(models.AttendanceRecord).filter(models.AttendanceRecord.date >= today - timedelta(days=7)).all()
    week_present    = sum(1 for r in week_recs if r.status in ("Present","Late"))
    avg_7d          = round((week_present / len(week_recs)) * 100, 1) if week_recs else 0.0

    return schemas.DashboardStats(
        total_students=total_students, total_teachers=total_teachers,
        total_subjects=total_subjects, live_sessions=live_sessions,
        today_present=today_present, today_late=today_late, today_absent=today_absent,
        today_attendance_pct=today_pct, open_alerts=open_alerts, avg_attendance_7d=avg_7d,
    )


@router.get("/attendance-summary", response_model=schemas.AttendanceSummary)
def attendance_summary(
    subject_id: Optional[str] = Query(None),
    student_id: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = db.query(models.AttendanceRecord)
    if current_user.role == "student":
        q = q.filter(models.AttendanceRecord.student_id == current_user.id)
    elif student_id:
        q = q.filter(models.AttendanceRecord.student_id == student_id)
    if subject_id: q = q.filter(models.AttendanceRecord.subject_id == subject_id)
    if date_from:  q = q.filter(models.AttendanceRecord.date >= date_from)
    if date_to:    q = q.filter(models.AttendanceRecord.date <= date_to)
    records = q.all()
    total   = len(records)
    present = sum(1 for r in records if r.status == "Present")
    late    = sum(1 for r in records if r.status == "Late")
    absent  = sum(1 for r in records if r.status == "Absent")
    pct     = round(((present + late) / total) * 100, 1) if total else 0.0
    return schemas.AttendanceSummary(
        total_records=total, total_students=len({r.student_id for r in records}),
        total_sessions=len({r.session_id for r in records}),
        overall_pct=pct, present_count=present, late_count=late, absent_count=absent,
    )


@router.get("/at-risk-students", response_model=List[schemas.StudentOut])
def at_risk(threshold: float = Query(75.0), db: Session = Depends(get_db), _=Depends(require_role("admin","teacher"))):
    students = db.query(models.User).filter(
        models.User.role == "student", models.User.is_active == True,
        models.User.overall_attendance_pct < threshold,
    ).order_by(models.User.overall_attendance_pct).all()
    return [schemas.StudentOut.model_validate(s) for s in students]


@router.get("/subject-attendance", response_model=List[schemas.SubjectAttendanceStat])
def subject_attendance(db: Session = Depends(get_db), _=Depends(require_role("admin","teacher"))):
    result = []
    for subj in db.query(models.Subject).all():
        records = db.query(models.AttendanceRecord).filter(models.AttendanceRecord.subject_id == subj.id).all()
        total   = len(records)
        present = sum(1 for r in records if r.status in ("Present","Late"))
        pct     = round((present / total) * 100, 1) if total else 0.0
        sessions_count = db.query(models.Session).filter(models.Session.subject_id == subj.id).count()
        result.append(schemas.SubjectAttendanceStat(
            subject_id=subj.id, name=subj.name, code=subj.code,
            avg_pct=pct, total_sessions=sessions_count,
        ))
    return result


@router.get("/attendance-trend", response_model=List[schemas.TrendPoint])
def attendance_trend(
    days: int = Query(7),
    subject_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    today = date.today()
    result = []
    for i in range(days - 1, -1, -1):
        d = today - timedelta(days=i)
        q = db.query(models.AttendanceRecord).filter(models.AttendanceRecord.date == d)
        if current_user.role == "student":
            q = q.filter(models.AttendanceRecord.student_id == current_user.id)
        if subject_id:
            q = q.filter(models.AttendanceRecord.subject_id == subject_id)
        records = q.all()
        total   = len(records)
        present = sum(1 for r in records if r.status in ("Present","Late"))
        pct     = round((present / total) * 100, 1) if total else 0.0
        result.append(schemas.TrendPoint(date=d.isoformat(), pct=pct, present=present, total=total))
    return result


@router.get("/activity-feed", response_model=List[schemas.ActivityFeedOut])
def activity_feed(limit: int = Query(20), db: Session = Depends(get_db), _=Depends(require_role("admin","teacher"))):
    events = db.query(models.ActivityFeedEvent).order_by(models.ActivityFeedEvent.created_at.desc()).limit(limit).all()
    return [schemas.ActivityFeedOut.model_validate(e) for e in events]


@router.get("/student-rankings", response_model=List[schemas.StudentAttendanceStat])
def student_rankings(limit: int = Query(20), db: Session = Depends(get_db), _=Depends(require_role("admin","teacher"))):
    students = db.query(models.User).filter(
        models.User.role == "student", models.User.is_active == True,
    ).order_by(models.User.overall_attendance_pct.desc()).limit(limit).all()
    result = []
    for s in students:
        records = db.query(models.AttendanceRecord).filter(models.AttendanceRecord.student_id == s.id).all()
        result.append(schemas.StudentAttendanceStat(
            student_id=s.id, student_name=s.name, overall_pct=s.overall_attendance_pct,
            present=sum(1 for r in records if r.status == "Present"),
            late=sum(1 for r in records if r.status == "Late"),
            absent=sum(1 for r in records if r.status == "Absent"),
        ))
    return result


@router.get("/export/csv")
def export_csv(
    subject_id: Optional[str] = Query(None),
    student_id: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(require_role("admin","teacher")),
):
    q = db.query(models.AttendanceRecord)
    if student_id: q = q.filter(models.AttendanceRecord.student_id == student_id)
    if subject_id: q = q.filter(models.AttendanceRecord.subject_id == subject_id)
    if date_from:  q = q.filter(models.AttendanceRecord.date >= date_from)
    if date_to:    q = q.filter(models.AttendanceRecord.date <= date_to)
    records = q.order_by(models.AttendanceRecord.date.desc()).all()
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Student ID","Name","Subject","Date","Time","Status","Confidence","Marked By"])
    for r in records:
        writer.writerow([
            r.student_id, r.student.name if r.student else "",
            r.subject.name if r.subject else "", r.date.isoformat(),
            r.time or "", r.status,
            f"{round(r.confidence * 100)}%" if r.confidence else "",
            r.marked_by or "",
        ])
    return Response(
        content=buf.getvalue(), media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=attendance.csv"},
    )