# routers/notifications.py — User notifications

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models, schemas
from auth import get_current_user

router = APIRouter()


@router.get("", response_model=List[schemas.NotificationOut])
def my_notifications(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    notifs = (
        db.query(models.Notification)
        .filter(models.Notification.user_id == current_user.id)
        .order_by(models.Notification.created_at.desc())
        .all()
    )
    return [schemas.NotificationOut.model_validate(n) for n in notifs]


@router.post("", status_code=201)
def create_notification(payload: schemas.NotificationCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    n = models.Notification(user_id=payload.user_id, title=payload.title, body=payload.body, type=payload.type)
    db.add(n)
    db.commit()
    return {"status": "ok"}


@router.patch("/{notif_id}/read", response_model=schemas.NotificationOut)
def mark_read(notif_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    n = db.query(models.Notification).filter(
        models.Notification.id == notif_id,
        models.Notification.user_id == current_user.id,
    ).first()
    if not n:
        raise HTTPException(404, "Notification not found")
    n.is_read = True
    db.commit()
    db.refresh(n)
    return schemas.NotificationOut.model_validate(n)


@router.post("/read-all", status_code=204)
def mark_all_read(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.is_read == False,
    ).update({"is_read": True})
    db.commit()


@router.delete("/{notif_id}", status_code=204)
def delete_notification(notif_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    n = db.query(models.Notification).filter(
        models.Notification.id == notif_id,
        models.Notification.user_id == current_user.id,
    ).first()
    if not n:
        raise HTTPException(404, "Notification not found")
    db.delete(n)
    db.commit()