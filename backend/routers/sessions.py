# routers/sessions.py
# ADMIN ONLY: create, edit, delete, start, end, assign camera
# ALL ROLES: view sessions

from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
import models, schemas
from auth import get_current_user, require_role
from utils import enrich_session, enrich_attendance, add_feed_event, push_notification, recalc_student_attendance, recalc_subject_attendance

router = APIRouter()


@router.get("", response_model=List[schemas.SessionOut])
def list_sessions(
    status: Optional[str] = Query(None),
    subject_id: Optional[str] = Query(None),
    teacher_id: Optional[str] = Query(None),
    session_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    q = db.query(models.Session)
    if status:       q = q.filter(models.Session.status == status)
    if subject_id:   q = q.filter(models.Session.subject_id == subject_id)
    if teacher_id:   q = q.filter(models.Session.teacher_id == teacher_id)
    if session_date: q = q.filter(models.Session.session_date == session_date)
    return [enrich_session(s) for s in q.order_by(models.Session.session_date.desc(), models.Session.start_time).all()]


@router.post("", response_model=schemas.SessionOut, status_code=201)
def create_session(payload: schemas.SessionCreate, db: Session = Depends(get_db), _=Depends(require_role("admin"))):
    subject = db.query(models.Subject).filter(models.Subject.id == payload.subject_id).first()
    if not subject:
        raise HTTPException(404, "Subject not found")
    s = models.Session(
        subject_id=payload.subject_id,
        teacher_id=payload.teacher_id,
        room=payload.room,
        camera=payload.camera,
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
    for k, v in payload.items():
        if k in {"room", "camera", "start_time", "end_time", "session_date", "teacher_id"}:
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
    students = db.query(models.User).filter(models.User.role == "student", models.User.is_active == True).all()
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