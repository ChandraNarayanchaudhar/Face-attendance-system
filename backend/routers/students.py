# routers/students.py — Student management

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from database import get_db
import models, schemas
from auth import get_current_user, require_role, hash_password
from utils import recalc_student_attendance, enrich_attendance, validate_base64_image
from routers.websocket import broadcast_sync

router = APIRouter()


@router.get("")
def list_students(
    section: Optional[str] = Query(None),
    semester: Optional[str] = Query(None),
    face_status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(12, ge=1, le=200),
    sort_by: Optional[str] = Query("name"),
    order: Optional[str] = Query("asc"),
    db: Session = Depends(get_db),
    _=Depends(require_role("teacher","admin")),
):
    q = db.query(models.User).filter(models.User.role == "student")
    if section:
        q = q.filter(models.User.section == section)
    if semester:
        q = q.filter(models.User.semester == semester)
    if face_status:
        q = q.filter(models.User.face_data_status == face_status)
    if search:
        term = f"%{search}%"
        q = q.filter(
            or_(
                models.User.name.ilike(term),
                models.User.section.ilike(term),
                models.User.semester.ilike(term),
                models.User.email.ilike(term),
                models.User.id.ilike(term),
            )
        )

    # Sorting
    allowed_sorts = {
        "name": models.User.name,
        "id": models.User.id,
        "attendance": models.User.overall_attendance_pct,
        "created": models.User.created_at,
    }
    sort_col = allowed_sorts.get(sort_by, models.User.name)
    if order == "desc":
        q = q.order_by(sort_col.desc())
    else:
        q = q.order_by(sort_col.asc())

    total = q.count()
    items = q.offset((page - 1) * per_page).limit(per_page).all()
    return {"items": [schemas.StudentOut.model_validate(s) for s in items], "total": total}


@router.post("", response_model=schemas.StudentOut, status_code=201)
def create_student(
    payload: schemas.StudentCreate,
    db: Session = Depends(get_db),
    _=Depends(require_role("admin")),
):
    if db.query(models.User).filter(func.lower(models.User.email) == payload.email.lower()).first():
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
        if field == "profile_image" and value is not None:
            try:
                validate_base64_image(value)
            except ValueError as e:
                raise HTTPException(400, str(e))
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
    # Broadcast live update so connected dashboards can refresh
    try:
        broadcast_sync({
            "type": "student_updated",
            "data": {"id": student.id, "face_data_status": student.face_data_status, "name": student.name},
        })
    except Exception:
        pass
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