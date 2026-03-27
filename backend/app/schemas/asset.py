"""Pydantic schemas for asset create, update, and response payloads."""

from datetime import date
from typing import Optional

from pydantic import BaseModel

from app.models.asset import AssetStatus
from app.schemas.user import UserResponse


class AssetBase(BaseModel):
    name: str
    category: str
    purchase_date: date


class AssetCreate(AssetBase):
    status: AssetStatus = AssetStatus.Available
    assigned_to: Optional[int] = None
    return_date: Optional[date] = None


class AssetUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    status: Optional[AssetStatus] = None
    assigned_to: Optional[int] = None
    purchase_date: Optional[date] = None
    return_date: Optional[date] = None


class AssetResponse(BaseModel):
    id: int
    name: str
    category: str
    status: AssetStatus
    assigned_to: Optional[int] = None
    purchase_date: date
    return_date: Optional[date] = None
    assigned_user: Optional[UserResponse] = None

    model_config = {"from_attributes": True}
