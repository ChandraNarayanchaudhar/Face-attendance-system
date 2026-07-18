
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from database import get_db
import models, schemas
from auth import get_current_user, require_role, hash_password
from utils import validate_base64_image
from validation import parse_teacher_semesters, serialize_teacher_semesters, get_teacher_workload

router = APIRouter()


def _normalize_teacher_semesters(value):
    if value is None:
        return None
    if isinstance(value, list):
        if any(not isinstance(item, str) for item in value):
            raise HTTPException(400, "teacher_semesters must be a list of strings")
        return serialize_teacher_semesters(value)
    if isinstance(value, str):
        semesters = parse_teacher_semesters(value)
        return serialize_teacher_semesters(semesters)
    raise HTTPException(400, "teacher_semesters must be a list of strings or a JSON string")


def _teacher_out(teacher: models.User) -> schemas.TeacherOut:
    try:
        semesters = parse_teacher_semesters(teacher.teacher_semesters)
    except ValueError:
        semesters = []
    return schemas.TeacherOut.model_validate({
        "id": teacher.id,
        "name": teacher.name,
        "email": teacher.email,
        "department": teacher.department,
        "teacher_semesters": semesters,
    })


@router.get("", response_model=List[schemas.TeacherOut])
def list_teachers(db: Session = Depends(get_db), _=Depends(get_current_user)):
    teachers = db.query(models.User).filter(
        models.User.role == "teacher",
        or_(models.User.is_active == True, models.User.is_active.is_(None)),
    ).order_by(models.User.name).all()
    return [_teacher_out(t) for t in teachers]


@router.post("", response_model=schemas.TeacherOut, status_code=201)
def create_teacher(
    payload: schemas.TeacherCreate,
    db: Session = Depends(get_db),
    _=Depends(require_role("admin")),  # ADMIN ONLY
):
    if db.query(models.User).filter(func.lower(models.User.email) == payload.email.lower()).first():
        raise HTTPException(400, "Email already registered")
    
    teacher_semesters = None
    if payload.teacher_semesters is not None:
        teacher_semesters = _normalize_teacher_semesters(payload.teacher_semesters)

    teacher = models.User(
        name=payload.name,
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
        role="teacher",
        department=payload.department,
        teacher_semesters=teacher_semesters,
        is_active=True,
    )
    db.add(teacher)
    db.commit()
    db.refresh(teacher)
    return _teacher_out(teacher)


@router.get("/{teacher_id}", response_model=schemas.TeacherOut)
def get_teacher(teacher_id: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    t = db.query(models.User).filter(models.User.id == teacher_id, models.User.role == "teacher").first()
    if not t:
        raise HTTPException(404, "Teacher not found")
    return _teacher_out(t)


@router.patch("/{teacher_id}", response_model=schemas.TeacherOut)
def update_teacher(
    teacher_id: str,
    payload: schemas.TeacherUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    t = db.query(models.User).filter(models.User.id == teacher_id, models.User.role == "teacher").first()
    if not t:
        raise HTTPException(404, "Teacher not found")
    # Allow admins and teachers to edit teacher profiles (per admin policy)
    if current_user.role not in ("admin", "teacher") and current_user.id != teacher_id:
        raise HTTPException(403, "Access denied")
    
    for field, value in payload.model_dump(exclude_none=True).items():
        if field == "profile_image" and value is not None:
            try:
                validate_base64_image(value)
            except ValueError as e:
                raise HTTPException(400, str(e))
        elif field == "teacher_semesters":
            if value is not None:
                if isinstance(value, list):
                    if any(not isinstance(item, str) for item in value):
                        raise HTTPException(400, "teacher_semesters must be a list of strings")
                    value = serialize_teacher_semesters(value)
                elif isinstance(value, str):
                    try:
                        parse_teacher_semesters(value)
                    except ValueError:
                        raise HTTPException(400, "teacher_semesters must be a valid JSON list")
                else:
                    raise HTTPException(400, "teacher_semesters must be a list of strings")
        setattr(t, field, value)
    db.commit()
    db.refresh(t)
    return _teacher_out(t)


@router.delete("/{teacher_id}", status_code=204)
def delete_teacher(teacher_id: str, db: Session = Depends(get_db), _=Depends(require_role("admin"))):
    t = db.query(models.User).filter(models.User.id == teacher_id, models.User.role == "teacher").first()
    if not t:
        raise HTTPException(404, "Teacher not found")
    t.is_active = False
    db.commit()


@router.get("/{teacher_id}/workload", response_model=dict)
def get_teacher_workload_endpoint(
    teacher_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get teacher's current workload (subjects, sessions count)."""
    t = db.query(models.User).filter(models.User.id == teacher_id, models.User.role == "teacher").first()
    if not t:
        raise HTTPException(404, "Teacher not found")
    
    workload = get_teacher_workload(teacher_id, db)
    return {
        "teacher_id": teacher_id,
        "teacher_name": t.name,
        "department": t.department,
        "teacher_semesters": parse_teacher_semesters(t.teacher_semesters),
        **workload
    }
