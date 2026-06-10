# routers/alerts.py — Security alerts from CCTV cameras

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
import models, schemas
from auth import require_role

router = APIRouter()


@router.get("", response_model=List[schemas.AlertOut])
def list_alerts(
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(require_role("admin","teacher")),
):
    q = db.query(models.Alert)
    if status:   q = q.filter(models.Alert.status == status)
    if severity: q = q.filter(models.Alert.severity == severity)
    return [schemas.AlertOut.model_validate(a) for a in q.order_by(models.Alert.created_at.desc()).all()]


@router.post("", response_model=schemas.AlertOut, status_code=201)
def create_alert(payload: schemas.AlertCreate, db: Session = Depends(get_db), _=Depends(require_role("admin","teacher"))):
    a = models.Alert(**payload.model_dump())
    db.add(a)
    db.commit()
    db.refresh(a)
    return schemas.AlertOut.model_validate(a)


@router.get("/{alert_id}", response_model=schemas.AlertOut)
def get_alert(alert_id: str, db: Session = Depends(get_db), _=Depends(require_role("admin","teacher"))):
    a = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if not a:
        raise HTTPException(404, "Alert not found")
    return schemas.AlertOut.model_validate(a)


@router.patch("/{alert_id}/status", response_model=schemas.AlertOut)
def update_status(alert_id: str, payload: schemas.AlertStatusUpdate, db: Session = Depends(get_db), _=Depends(require_role("admin","teacher"))):
    a = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if not a:
        raise HTTPException(404, "Alert not found")
    a.status = payload.status
    if payload.notes:
        a.notes = payload.notes
    db.commit()
    db.refresh(a)
    return schemas.AlertOut.model_validate(a)


@router.delete("/{alert_id}", status_code=204)
def delete_alert(alert_id: str, db: Session = Depends(get_db), _=Depends(require_role("admin"))):
    a = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if not a:
        raise HTTPException(404, "Alert not found")
    db.delete(a)
    db.commit()