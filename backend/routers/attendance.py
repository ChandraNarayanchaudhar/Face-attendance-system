# routers/attendance.py — Attendance management

from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
import models, schemas
from auth import get_current_user, require_role
from utils import (
    enrich_attendance, recalc_student_attendance,
    recalc_subject_attendance, add_feed_event,
    push_notification, push_low_attendance_warning,
)

router = APIRouter()


@router.get("", response_model=List[schemas.AttendanceOut])
def list_attendance(
    student_id: Optional[str] = Query(None),
    subject_id: Optional[str] = Query(None),
    session_id: Optional[str] = Query(None),
    teacher_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = db.query(models.AttendanceRecord)
    # Students only see their own records
    if current_user.role == "student":
        q = q.filter(models.AttendanceRecord.student_id == current_user.id)
    elif student_id:
        q = q.filter(models.AttendanceRecord.student_id == student_id)
    if teacher_id:
        q = q.join(models.Session).filter(models.Session.teacher_id == teacher_id)
    if subject_id:
        q = q.filter(models.AttendanceRecord.subject_id == subject_id)
    if session_id:
        q = q.filter(models.AttendanceRecord.session_id == session_id)
    if status:
        q = q.filter(models.AttendanceRecord.status == status)
    if date_from:
        q = q.filter(models.AttendanceRecord.date >= date_from)
    if date_to:
        q = q.filter(models.AttendanceRecord.date <= date_to)
    return [enrich_attendance(r) for r in q.order_by(models.AttendanceRecord.date.desc()).all()]


@router.post("", response_model=schemas.AttendanceOut, status_code=201)
def mark_attendance(
    payload: schemas.AttendanceCreate,
    db: Session = Depends(get_db),
    _=Depends(require_role("admin","teacher")),
):
    # Prevent duplicate for same student + session
    dup = db.query(models.AttendanceRecord).filter(
        models.AttendanceRecord.student_id == payload.student_id,
        models.AttendanceRecord.session_id == payload.session_id,
    ).first()
    if dup:
        raise HTTPException(400, "Attendance already recorded")

    record = models.AttendanceRecord(**payload.model_dump())
    db.add(record)
    db.flush()
    _post_mark(record, db)
    db.commit()
    db.refresh(record)
    return enrich_attendance(record)


@router.post("/bulk", response_model=List[schemas.AttendanceOut], status_code=201)
def bulk_mark(
    records: List[schemas.AttendanceCreate],
    db: Session = Depends(get_db),
    _=Depends(require_role("admin","teacher")),
):
    created = []
    touched_students = set()
    touched_subjects = set()
    for payload in records:
        dup = db.query(models.AttendanceRecord).filter(
            models.AttendanceRecord.student_id == payload.student_id,
            models.AttendanceRecord.session_id == payload.session_id,
        ).first()
        if dup:
            continue
        r = models.AttendanceRecord(**payload.model_dump())
        db.add(r)
        created.append(r)
        touched_students.add(payload.student_id)
        touched_subjects.add(payload.subject_id)
    db.flush()
    for r in created:
        _post_mark(r, db)
    for sid in touched_students:
        recalc_student_attendance(sid, db)
    for subj in touched_subjects:
        recalc_subject_attendance(subj, db)
    db.commit()
    result = []
    for r in created:
        db.refresh(r)
        result.append(enrich_attendance(r))
    return result


@router.get("/{record_id}", response_model=schemas.AttendanceOut)
def get_record(record_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    r = db.query(models.AttendanceRecord).filter(models.AttendanceRecord.id == record_id).first()
    if not r:
        raise HTTPException(404, "Record not found")
    if current_user.role == "student" and r.student_id != current_user.id:
        raise HTTPException(403, "Access denied")
    return enrich_attendance(r)


@router.patch("/{record_id}", response_model=schemas.AttendanceOut)
def update_attendance(
    record_id: str,
    payload: schemas.AttendanceUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_role("admin","teacher")),
):
    r = db.query(models.AttendanceRecord).filter(models.AttendanceRecord.id == record_id).first()
    if not r:
        raise HTTPException(404, "Record not found")
    r.status    = payload.status
    r.marked_by = payload.marked_by or "manual"
    add_feed_event(
        f"Status updated • {r.student.name if r.student else ''} → {payload.status}",
        "warning", db,
    )
    recalc_student_attendance(r.student_id, db)
    recalc_subject_attendance(r.subject_id, db)
    db.commit()
    db.refresh(r)
    return enrich_attendance(r)


@router.delete("/{record_id}", status_code=204)
def delete_attendance(record_id: str, db: Session = Depends(get_db), _=Depends(require_role("admin"))):
    r = db.query(models.AttendanceRecord).filter(models.AttendanceRecord.id == record_id).first()
    if not r:
        raise HTTPException(404, "Record not found")
    sid    = r.student_id
    sub_id = r.subject_id
    db.delete(r)
    db.flush()
    recalc_student_attendance(sid, db)
    recalc_subject_attendance(sub_id, db)
    db.commit()


def _post_mark(record: models.AttendanceRecord, db: Session):
    # Feed event + notification + recalc after marking
    student      = db.query(models.User).filter(models.User.id == record.student_id).first()
    subject      = db.query(models.Subject).filter(models.Subject.id == record.subject_id).first()
    student_name = student.name if student else "Student"
    subject_name = subject.name if subject else "Subject"

    if record.status == "Present":
        tone = "success"
        add_feed_event(f"Present • {student_name} • {subject_name}", tone, db)
        push_notification(record.student_id, f"✅ Present: {subject_name}",
                          f"Attendance recorded at {record.time or 'this session'}.", "success", db)
    elif record.status == "Late":
        tone = "warning"
        add_feed_event(f"Late • {student_name} • {subject_name}", tone, db)
        push_notification(record.student_id, f"⚠️ Late: {subject_name}",
                          f"You were marked late.", "warning", db)
    else:
        tone = "danger"
        add_feed_event(f"Absent • {student_name} • {subject_name}", tone, db)
        push_notification(record.student_id, f"❌ Absent: {subject_name}",
                          f"You were marked absent on {record.date}.", "warning", db)

    recalc_student_attendance(record.student_id, db)
    recalc_subject_attendance(record.subject_id, db)

    # Low attendance warning
    if student and subject:
        push_low_attendance_warning(student, subject, student.overall_attendance_pct, db)