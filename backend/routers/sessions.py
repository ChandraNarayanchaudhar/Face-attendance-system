# routers/sessions.py
# ADMIN ONLY: create, edit, delete, start, end, assign camera
# ALL ROLES: view sessions

from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from database import get_db
import models, schemas
from auth import get_current_user, require_role
from utils import enrich_session, enrich_attendance, add_feed_event, push_notification, recalc_student_attendance, recalc_subject_attendance
from validation import (
    validate_teacher_exists,
    check_teacher_time_conflict,
    validate_teacher_semester_assignment,
)

router = APIRouter()


@router.get("", response_model=List[schemas.SessionOut])
def list_sessions(
    status: Optional[str] = Query(None),
    subject_id: Optional[str] = Query(None),
    teacher_id: Optional[str] = Query(None),
    session_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = db.query(models.Session)
    if status:
        q = q.filter(models.Session.status == status)
    if subject_id:
        q = q.filter(models.Session.subject_id == subject_id)
    if teacher_id:
        q = q.filter(models.Session.teacher_id == teacher_id)
    if session_date:
        q = q.filter(models.Session.session_date == session_date)

    if current_user.role == "student":
        if current_user.semester:
            q = q.filter(
                or_(
                    models.Session.semester == current_user.semester,
                    models.Session.semester.is_(None),
                )
            )
        else:
            q = q.filter(models.Session.semester.is_(None))

    return [enrich_session(s) for s in q.order_by(models.Session.session_date.desc(), models.Session.start_time).all()]


@router.post("", response_model=schemas.SessionOut, status_code=201)
def create_session(payload: schemas.SessionCreate, db: Session = Depends(get_db), _=Depends(require_role("admin"))):
    # Validate subject exists
    subject = db.query(models.Subject).filter(models.Subject.id == payload.subject_id).first()
    if not subject:
        raise HTTPException(404, "Subject not found")
    
    # Validate time format
    try:
        start_h, start_m = map(int, payload.start_time.split(":"))
        end_h, end_m = map(int, payload.end_time.split(":"))
        start_minutes = start_h * 60 + start_m
        end_minutes = end_h * 60 + end_m
        if start_minutes >= end_minutes:
            raise HTTPException(400, "Start time must be before end time")
    except (ValueError, AttributeError):
        raise HTTPException(400, "Invalid time format. Use HH:MM")
    
    # If teacher is assigned, validate semester and availability
    if payload.teacher_id:
        teacher = validate_teacher_exists(payload.teacher_id, db)

        if not payload.semester:
            raise HTTPException(400, "Session semester is required when assigning a teacher")

        validate_teacher_semester_assignment(payload.teacher_id, payload.semester, db)

        conflicts = check_teacher_time_conflict(
            payload.teacher_id,
            str(payload.session_date or date.today()),
            payload.start_time,
            payload.end_time,
            db=db
        )

        if conflicts:
            conflict_details = "; ".join([
                f"{c['subject_name']} ({c['start_time']}-{c['end_time']})"
                for c in conflicts
            ])
            raise HTTPException(
                409,
                f"Time conflict: Teacher has overlapping session(s): {conflict_details}"
            )
    
    s = models.Session(
        subject_id=payload.subject_id,
        teacher_id=payload.teacher_id,
        room=payload.room,
        camera=payload.camera,
        semester=payload.semester,
        start_time=payload.start_time,
        end_time=payload.end_time,
        session_date=payload.session_date or date.today(),
    )
    db.add(s)
    add_feed_event(f"Session scheduled • {subject.name}", "primary", db)
    db.commit()
    db.refresh(s)
    return enrich_session(s)


@router.get("/{session_id}", response_model=schemas.SessionOut)
def get_session(session_id: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    s = db.query(models.Session).filter(models.Session.id == session_id).first()
    if not s:
        raise HTTPException(404, "Session not found")
    return enrich_session(s)


@router.patch("/{session_id}", response_model=schemas.SessionOut)
def update_session(session_id: str, payload: dict, db: Session = Depends(get_db), _=Depends(require_role("admin"))):
    s = db.query(models.Session).filter(models.Session.id == session_id).first()
    if not s:
        raise HTTPException(404, "Session not found")
    
    # Validate updates
    if s.teacher_id or "teacher_id" in payload or "semester" in payload:
        new_teacher_id = payload.get("teacher_id", s.teacher_id)
        new_semester = payload.get("semester", s.semester)

        if new_teacher_id:
            teacher = validate_teacher_exists(new_teacher_id, db)
            if not new_semester:
                raise HTTPException(400, "Session semester is required when assigning a teacher")
            validate_teacher_semester_assignment(new_teacher_id, new_semester, db)

            # Check time conflicts (exclude current session)
            new_start_time = payload.get("start_time", s.start_time)
            new_end_time = payload.get("end_time", s.end_time)
            new_session_date = payload.get("session_date", s.session_date)
        
        # Validate time format
        try:
            start_h, start_m = map(int, new_start_time.split(":"))
            end_h, end_m = map(int, new_end_time.split(":"))
            start_minutes = start_h * 60 + start_m
            end_minutes = end_h * 60 + end_m
            if start_minutes >= end_minutes:
                raise HTTPException(400, "Start time must be before end time")
        except (ValueError, AttributeError):
            raise HTTPException(400, "Invalid time format. Use HH:MM")
        
        conflicts = check_teacher_time_conflict(
            payload["teacher_id"],
            str(new_session_date),
            new_start_time,
            new_end_time,
            exclude_session_id=session_id,
            db=db
        )
        
        if conflicts:
            conflict_details = "; ".join([
                f"{c['subject_name']} ({c['start_time']}-{c['end_time']})"
                for c in conflicts
            ])
            raise HTTPException(
                409,
                f"Time conflict: Teacher has overlapping session(s): {conflict_details}"
            )
    
    # Validate time fields if being updated
    if "start_time" in payload or "end_time" in payload:
        new_start = payload.get("start_time", s.start_time)
        new_end = payload.get("end_time", s.end_time)
        try:
            start_h, start_m = map(int, new_start.split(":"))
            end_h, end_m = map(int, new_end.split(":"))
            start_minutes = start_h * 60 + start_m
            end_minutes = end_h * 60 + end_m
            if start_minutes >= end_minutes:
                raise HTTPException(400, "Start time must be before end time")
        except (ValueError, AttributeError):
            raise HTTPException(400, "Invalid time format. Use HH:MM")
    
    # Apply updates
    for k, v in payload.items():
        if k in {"room", "camera", "start_time", "end_time", "session_date", "teacher_id", "semester"}:
            setattr(s, k, v)
    db.commit()
    db.refresh(s)
    return enrich_session(s)


@router.delete("/{session_id}", status_code=204)
def delete_session(session_id: str, db: Session = Depends(get_db), _=Depends(require_role("admin"))):
    s = db.query(models.Session).filter(models.Session.id == session_id).first()
    if not s:
        raise HTTPException(404, "Session not found")
    db.delete(s)
    db.commit()


@router.patch("/{session_id}/status", response_model=schemas.SessionOut)
def update_session_status(session_id: str, payload: schemas.SessionStatusUpdate, db: Session = Depends(get_db), _=Depends(require_role("admin"))):
    s = db.query(models.Session).filter(models.Session.id == session_id).first()
    if not s:
        raise HTTPException(404, "Session not found")
    old = s.status
    s.status = payload.status
    name = s.subject.name if s.subject else "Session"
    if payload.status == "Live" and old != "Live":
        s.started_at = datetime.utcnow()
        add_feed_event(f"Session started • {name}", "primary", db)
    elif payload.status == "Completed" and old == "Live":
        s.ended_at = datetime.utcnow()
        add_feed_event(f"Session ended • {name}", "primary", db)
        _auto_mark_absent(s, db)
    db.commit()
    db.refresh(s)
    return enrich_session(s)


@router.post("/{session_id}/end", response_model=schemas.SessionOut)
def end_session(session_id: str, db: Session = Depends(get_db), _=Depends(require_role("admin"))):
    s = db.query(models.Session).filter(models.Session.id == session_id).first()
    if not s:
        raise HTTPException(404, "Session not found")
    if s.status == "Completed":
        return enrich_session(s)
    s.status = "Completed"
    s.ended_at = datetime.utcnow()
    add_feed_event(f"Session ended • {s.subject.name if s.subject else 'Session'}", "primary", db)
    _auto_mark_absent(s, db)
    db.commit()
    db.refresh(s)
    return enrich_session(s)


@router.get("/{session_id}/attendance", response_model=List[schemas.AttendanceOut])
def session_attendance(session_id: str, db: Session = Depends(get_db), _=Depends(require_role("admin","teacher"))):
    records = db.query(models.AttendanceRecord).filter(models.AttendanceRecord.session_id == session_id).all()
    return [enrich_attendance(r) for r in records]


def _auto_mark_absent(session: models.Session, db: Session):
    already = {r.student_id for r in db.query(models.AttendanceRecord).filter(models.AttendanceRecord.session_id == session.id).all()}
    student_q = db.query(models.User).filter(
        models.User.role == "student",
        or_(models.User.is_active == True, models.User.is_active.is_(None)),
    )
    if session.semester:
        student_q = student_q.filter(models.User.semester == session.semester)
    students = student_q.all()
    for student in students:
        if student.id not in already:
            db.add(models.AttendanceRecord(
                student_id=student.id, session_id=session.id,
                subject_id=session.subject_id, date=session.session_date,
                status="Absent", confidence=0.0, marked_by="auto",
            ))
            push_notification(
                user_id=student.id,
                title=f"❌ Absent: {session.subject.name if session.subject else 'class'}",
                body=f"You were marked absent on {session.session_date}.",
                ntype="warning", db=db,
            )
    db.flush()
    for student in students:
        recalc_student_attendance(student.id, db)
    recalc_subject_attendance(session.subject_id, db)