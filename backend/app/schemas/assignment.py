from datetime import date
from typing import Optional

from pydantic import BaseModel

from app.schemas.asset import AssetResponse
from app.schemas.user import UserResponse


class AssignmentCreate(BaseModel):
    asset_id: int
    user_id: int
    assigned_date: date
    return_date: Optional[date] = None


class AssignmentResponse(BaseModel):
    id: int
    asset_id: int
    user_id: int
    assigned_date: date
    return_date: Optional[date] = None
    asset: AssetResponse
    user: UserResponse

    model_config = {"from_attributes": True}
