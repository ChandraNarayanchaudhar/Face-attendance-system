# routers/teachers.py — Admin creates teacher accounts (no self-register)

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models, schemas
from auth import get_current_user, require_role, hash_password

router = APIRouter()


@router.get("", response_model=List[schemas.TeacherOut])
def list_teachers(db: Session = Depends(get_db), _=Depends(get_current_user)):
    teachers = db.query(models.User).filter(
        models.User.role == "teacher", models.User.is_active == True
    ).order_by(models.User.name).all()
    return [schemas.TeacherOut.model_validate(t) for t in teachers]


@router.post("", response_model=schemas.TeacherOut, status_code=201)
def create_teacher(
    payload: schemas.TeacherCreate,
    db: Session = Depends(get_db),
    _=Depends(require_role("admin")),  # ADMIN ONLY
):
    if db.query(models.User).filter(models.User.email == payload.email.lower()).first():
        raise HTTPException(400, "Email already registered")
    teacher = models.User(
        name=payload.name,
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
        role="teacher",
        department=payload.department,
        is_active=True,
    )
    db.add(teacher)
    db.commit()
    db.refresh(teacher)
    return schemas.TeacherOut.model_validate(teacher)


@router.get("/{teacher_id}", response_model=schemas.TeacherOut)
def get_teacher(teacher_id: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    t = db.query(models.User).filter(models.User.id == teacher_id, models.User.role == "teacher").first()
    if not t:
        raise HTTPException(404, "Teacher not found")
    return schemas.TeacherOut.model_validate(t)


@router.patch("/{teacher_id}", response_model=schemas.TeacherOut)
def update_teacher(teacher_id: str, payload: dict, db: Session = Depends(get_db), _=Depends(require_role("admin"))):
    t = db.query(models.User).filter(models.User.id == teacher_id, models.User.role == "teacher").first()
    if not t:
        raise HTTPException(404, "Teacher not found")
    for k, v in payload.items():
        if k in {"name", "department"}:
            setattr(t, k, v)
    db.commit()
    db.refresh(t)
    return schemas.TeacherOut.model_validate(t)


@router.delete("/{teacher_id}", status_code=204)
def delete_teacher(teacher_id: str, db: Session = Depends(get_db), _=Depends(require_role("admin"))):
    t = db.query(models.User).filter(models.User.id == teacher_id, models.User.role == "teacher").first()
    if not t:
        raise HTTPException(404, "Teacher not found")
    t.is_active = False
    db.commit()