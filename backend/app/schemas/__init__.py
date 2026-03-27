"""Convenience exports for schema modules."""

# app/api/v1/__init__.py
from app.schemas.user import (
    LoginRequest,
    TokenData,
    TokenResponse,
    UserCreate,
    UserResponse,
    UserUpdate,
)
from app.schemas.asset import AssetCreate, AssetResponse, AssetUpdate
from app.schemas.assignment import AssignmentCreate, AssignmentResponse
from app.schemas.asset_request import AssetRequestCreate, AssetRequestResponse
from app.schemas.maintenance import (
    MaintenanceCreate,
    MaintenanceResponse,
    MaintenanceStatusUpdate,
)
from app.schemas.notification import NotificationCreate, NotificationResponse
