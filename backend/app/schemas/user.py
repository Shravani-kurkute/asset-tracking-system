"""Pydantic schemas for user records and authentication payloads."""

from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from app.models.user import UserRole


class UserBase(BaseModel):
    full_name: str
    email: EmailStr
    role: UserRole = UserRole.employee   # ← lowercase fixed
    department: Optional[str] = None
    employee_id: Optional[str] = None


class UserCreate(UserBase):
    employee_id: str                     # required on create
    password: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    department: Optional[str] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}  # Pydantic v2 style


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenData(BaseModel):
    user_id: Optional[int] = None
    role: Optional[str] = None
