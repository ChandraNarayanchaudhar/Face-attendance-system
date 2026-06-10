# routers/subjects.py — Subject management

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models, schemas
from auth import get_current_user, require_role

router = APIRouter()


def _out(s: models.Subject) -> schemas.SubjectOut:
    d = schemas.SubjectOut.model_validate(s)
    d.teacher_name = s.teacher.name if s.teacher else None
    return d


@router.get("", response_model=List[schemas.SubjectOut])
def list_subjects(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return [_out(s) for s in db.query(models.Subject).order_by(models.Subject.name).all()]


@router.post("", response_model=schemas.SubjectOut, status_code=201)
def create_subject(payload: schemas.SubjectCreate, db: Session = Depends(get_db), _=Depends(require_role("admin","teacher"))):
    if db.query(models.Subject).filter(models.Subject.code == payload.code).first():
        raise HTTPException(400, "Subject code already exists")
    s = models.Subject(**payload.model_dump())
    db.add(s)
    db.commit()
    db.refresh(s)
    return _out(s)


@router.get("/{subject_id}", response_model=schemas.SubjectOut)
def get_subject(subject_id: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    s = db.query(models.Subject).filter(models.Subject.id == subject_id).first()
    if not s:
        raise HTTPException(404, "Subject not found")
    return _out(s)


@router.patch("/{subject_id}", response_model=schemas.SubjectOut)
def update_subject(subject_id: str, payload: schemas.SubjectUpdate, db: Session = Depends(get_db), _=Depends(require_role("admin","teacher"))):
    s = db.query(models.Subject).filter(models.Subject.id == subject_id).first()
    if not s:
        raise HTTPException(404, "Subject not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(s, k, v)
    db.commit()
    db.refresh(s)
    return _out(s)


@router.delete("/{subject_id}", status_code=204)
def delete_subject(subject_id: str, db: Session = Depends(get_db), _=Depends(require_role("admin"))):
    s = db.query(models.Subject).filter(models.Subject.id == subject_id).first()
    if not s:
        raise HTTPException(404, "Subject not found")
    db.delete(s)
    db.commit()