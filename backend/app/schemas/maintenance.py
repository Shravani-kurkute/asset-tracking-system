"""Pydantic schemas for maintenance APIs."""

from datetime import datetime

from pydantic import BaseModel

from app.models.maintenance import MaintenanceStatus
from app.schemas.asset import AssetResponse
from app.schemas.user import UserResponse


class MaintenanceCreate(BaseModel):
    asset_id: int
    issue_description: str


class MaintenanceStatusUpdate(BaseModel):
    status: MaintenanceStatus


class MaintenanceResponse(BaseModel):
    id: int
    asset_id: int
    user_id: int
    issue_description: str
    status: MaintenanceStatus
    created_at: datetime
    updated_at: datetime
    asset: AssetResponse
    user: UserResponse

    model_config = {"from_attributes": True}
