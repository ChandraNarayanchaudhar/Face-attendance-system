# routers/students.py — Student management

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
import models, schemas
from auth import get_current_user, require_role, hash_password
from utils import recalc_student_attendance, enrich_attendance

router = APIRouter()


@router.get("", response_model=List[schemas.StudentOut])
def list_students(
    section: Optional[str] = Query(None),
    semester: Optional[str] = Query(None),
    face_status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(require_role("teacher","admin")),
):
    q = db.query(models.User).filter(models.User.role == "student")
    if section:     q = q.filter(models.User.section == section)
    if semester:    q = q.filter(models.User.semester == semester)
    if face_status: q = q.filter(models.User.face_data_status == face_status)
    if search:      q = q.filter(models.User.name.ilike(f"%{search}%"))
    return [schemas.StudentOut.model_validate(s) for s in q.order_by(models.User.name).all()]


@router.post("", response_model=schemas.StudentOut, status_code=201)
def create_student(
    payload: schemas.StudentCreate,
    db: Session = Depends(get_db),
    _=Depends(require_role("admin")),
):
    if db.query(models.User).filter(models.User.email == payload.email.lower()).first():
        raise HTTPException(400, "Email already registered")
    student = models.User(
        name=payload.name,
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
        role="student",
        section=payload.section,
        semester=payload.semester,
        is_active=True,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return schemas.StudentOut.model_validate(student)


@router.get("/{student_id}", response_model=schemas.StudentOut)
def get_student(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    student = db.query(models.User).filter(
        models.User.id == student_id, models.User.role == "student"
    ).first()
    if not student:
        raise HTTPException(404, "Student not found")
    if current_user.role == "student" and current_user.id != student_id:
        raise HTTPException(403, "Access denied")
    return schemas.StudentOut.model_validate(student)


@router.patch("/{student_id}", response_model=schemas.StudentOut)
def update_student(
    student_id: str,
    payload: schemas.StudentUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    student = db.query(models.User).filter(
        models.User.id == student_id, models.User.role == "student"
    ).first()
    if not student:
        raise HTTPException(404, "Student not found")
    if current_user.role == "student" and current_user.id != student_id:
        raise HTTPException(403, "Access denied")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(student, field, value)
    db.commit()
    db.refresh(student)
    return schemas.StudentOut.model_validate(student)


@router.delete("/{student_id}", status_code=204)
def delete_student(student_id: str, db: Session = Depends(get_db), _=Depends(require_role("admin"))):
    student = db.query(models.User).filter(
        models.User.id == student_id, models.User.role == "student"
    ).first()
    if not student:
        raise HTTPException(404, "Student not found")
    student.is_active = False
    db.commit()


@router.put("/{student_id}/face", response_model=schemas.StudentOut)
def update_face_status(
    student_id: str,
    body: dict,
    db: Session = Depends(get_db),
    _=Depends(require_role("admin","teacher")),
):
    student = db.query(models.User).filter(
        models.User.id == student_id, models.User.role == "student"
    ).first()
    if not student:
        raise HTTPException(404, "Student not found")
    status = body.get("face_data_status", "Registered")
    if status not in ("Registered","Pending","Missing"):
        raise HTTPException(400, "Invalid face_data_status")
    student.face_data_status = status
    db.commit()
    db.refresh(student)
    return schemas.StudentOut.model_validate(student)


@router.get("/{student_id}/attendance", response_model=List[schemas.AttendanceOut])
def student_attendance(
    student_id: str,
    subject_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role == "student" and current_user.id != student_id:
        raise HTTPException(403, "Access denied")
    q = db.query(models.AttendanceRecord).filter(
        models.AttendanceRecord.student_id == student_id
    )
    if subject_id:
        q = q.filter(models.AttendanceRecord.subject_id == subject_id)
    return [enrich_attendance(r) for r in q.order_by(models.AttendanceRecord.date.desc()).all()]


@router.get("/{student_id}/subject-stats")
def student_subject_stats(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role == "student" and current_user.id != student_id:
        raise HTTPException(403, "Access denied")
    subjects = db.query(models.Subject).all()
    result = []
    for subj in subjects:
        records = db.query(models.AttendanceRecord).filter(
            models.AttendanceRecord.student_id == student_id,
            models.AttendanceRecord.subject_id == subj.id,
        ).all()
        total   = len(records)
        present = sum(1 for r in records if r.status in ("Present","Late"))
        absent  = total - present
        pct     = round((present / total) * 100, 1) if total else 0.0
        result.append({
            "subject_id":   subj.id,
            "subject_name": subj.name,
            "subject_code": subj.code,
            "total":        total,
            "present":      present,
            "absent":       absent,
            "pct":          pct,
        })
    return result