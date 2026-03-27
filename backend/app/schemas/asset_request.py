from datetime import date

from pydantic import BaseModel

from app.models.asset_request import AssetRequestStatus
from app.schemas.asset import AssetResponse
from app.schemas.user import UserResponse


class AssetRequestCreate(BaseModel):
    asset_id: int


class AssetRequestResponse(BaseModel):
    id: int
    user_id: int
    asset_id: int
    status: AssetRequestStatus
    request_date: date
    approval_date: date | None = None
    user: UserResponse
    asset: AssetResponse

    model_config = {"from_attributes": True}
