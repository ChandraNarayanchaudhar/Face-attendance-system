# routers/settings.py — System settings

from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
import models, schemas
from auth import require_role

router = APIRouter()


@router.get("", response_model=List[schemas.SettingOut])
def list_settings(db: Session = Depends(get_db), _=Depends(require_role("admin"))):
    return [schemas.SettingOut.model_validate(s) for s in db.query(models.SystemSetting).all()]


@router.put("", response_model=schemas.SettingOut)
def upsert(payload: schemas.SettingUpsert, db: Session = Depends(get_db), _=Depends(require_role("admin"))):
    s = db.query(models.SystemSetting).filter(models.SystemSetting.key == payload.key).first()
    if s:
        s.value = payload.value
    else:
        s = models.SystemSetting(key=payload.key, value=payload.value)
        db.add(s)
    db.commit()
    db.refresh(s)
    return schemas.SettingOut.model_validate(s)


@router.post("/bulk", response_model=List[schemas.SettingOut])
def bulk_upsert(payload: schemas.SettingsBulkUpsert, db: Session = Depends(get_db), _=Depends(require_role("admin"))):
    result = []
    for item in payload.settings:
        s = db.query(models.SystemSetting).filter(models.SystemSetting.key == item.key).first()
        if s:
            s.value = item.value
        else:
            s = models.SystemSetting(key=item.key, value=item.value)
            db.add(s)
        result.append(s)
    db.commit()
    return [schemas.SettingOut.model_validate(s) for s in result]


@router.get("/{key}", response_model=schemas.SettingOut)
def get_setting(key: str, db: Session = Depends(get_db), _=Depends(require_role("admin"))):
    s = db.query(models.SystemSetting).filter(models.SystemSetting.key == key).first()
    return schemas.SettingOut(key=key, value=s.value if s else None)


@router.delete("/{key}", status_code=204)
def delete_setting(key: str, db: Session = Depends(get_db), _=Depends(require_role("admin"))):
    s = db.query(models.SystemSetting).filter(models.SystemSetting.key == key).first()
    if s:
        db.delete(s)
        db.commit()