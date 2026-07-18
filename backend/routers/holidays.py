# routers/holidays.py — Holiday management

from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
import models, schemas
from auth import get_current_user, require_role
from routers.websocket import broadcast

router = APIRouter()


@router.get("", response_model=List[schemas.HolidayOut])
def list_holidays(tag: Optional[str] = Query(None), db: Session = Depends(get_db), _=Depends(get_current_user)):
    q = db.query(models.Holiday)
    if tag:
        q = q.filter(models.Holiday.tag == tag)
    return [schemas.HolidayOut.model_validate(h) for h in q.order_by(models.Holiday.date).all()]


@router.post("", response_model=schemas.HolidayOut, status_code=201)
async def add_holiday(payload: schemas.HolidayCreate, db: Session = Depends(get_db), _=Depends(require_role("admin"))):
    if db.query(models.Holiday).filter(models.Holiday.date == payload.date).first():
        raise HTTPException(400, "Holiday already exists on this date")
    h = models.Holiday(**payload.model_dump())
    db.add(h)
    db.commit()
    db.refresh(h)
    holiday_out = schemas.HolidayOut.model_validate(h)
    await broadcast({
        "type": "holidays_updated",
        "message": "Holiday added",
        "data": holiday_out.model_dump(),
    })
    return holiday_out


@router.post("/today", response_model=schemas.HolidayOut, status_code=201)
async def mark_today(db: Session = Depends(get_db), _=Depends(require_role("admin"))):
    today = date.today()
    existing = db.query(models.Holiday).filter(models.Holiday.date == today).first()
    if existing:
        return schemas.HolidayOut.model_validate(existing)
    h = models.Holiday(date=today, name="Holiday", tag="Institution")
    db.add(h)
    db.commit()
    db.refresh(h)
    holiday_out = schemas.HolidayOut.model_validate(h)
    await broadcast({
        "type": "holidays_updated",
        "message": "Today holiday added",
        "data": holiday_out.model_dump(),
    })
    return holiday_out


@router.delete("/{holiday_id}", status_code=204)
async def delete_holiday(holiday_id: str, db: Session = Depends(get_db), _=Depends(require_role("admin"))):
    h = db.query(models.Holiday).filter(models.Holiday.id == holiday_id).first()
    if not h:
        raise HTTPException(404, "Holiday not found")
    db.delete(h)
    db.commit()
    await broadcast({
        "type": "holidays_updated",
        "message": "Holiday deleted",
        "data": {"id": holiday_id},
    })