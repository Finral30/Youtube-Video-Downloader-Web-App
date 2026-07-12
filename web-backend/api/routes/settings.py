"""
api/routes/settings.py
-----------------------
User preferences stored in SQLite as a JSON blob.
"""

import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.database import get_db_dep, SettingsRecord
from core.models import AppSettings, MessageResponse

router = APIRouter(prefix="/api/settings", tags=["settings"])


def _get_record(db: Session) -> SettingsRecord:
    record = db.query(SettingsRecord).filter(SettingsRecord.id == 1).first()
    if not record:
        record = SettingsRecord(id=1, data="{}")
        db.add(record)
        db.commit()
    return record


@router.get("", response_model=AppSettings)
async def get_settings(db: Session = Depends(get_db_dep)):
    record = _get_record(db)
    data = json.loads(record.data or "{}")
    return AppSettings(**data)


@router.put("", response_model=AppSettings)
async def update_settings(settings: AppSettings, db: Session = Depends(get_db_dep)):
    record = _get_record(db)
    record.data = settings.model_dump_json()
    db.commit()
    return settings
