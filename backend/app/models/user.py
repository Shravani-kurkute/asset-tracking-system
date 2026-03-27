"""User model and role enum for authentication and authorization."""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class UserRole(str, enum.Enum):
    system_admin = "system_admin"
    dept_admin = "dept_admin"
    employee = "employee"
    management = "management"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String(50), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.employee)
    department = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    asset_requests = relationship("AssetRequest", back_populates="user")
    maintenance_requests = relationship("MaintenanceRequest", back_populates="user")
    notifications = relationship("Notification", back_populates="user")

    def __repr__(self):
        return f"<User {self.email} [{self.role}]>"
