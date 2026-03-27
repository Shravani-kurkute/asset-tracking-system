"""Asset inventory model and asset status enum."""

from sqlalchemy import Column, Integer, String, Date, Enum, ForeignKey
from sqlalchemy.orm import relationship
import enum

from app.database import Base


class AssetStatus(str, enum.Enum):
    Available = "Available"
    Assigned = "Assigned"
    Maintenance = "Maintenance"


class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    category = Column(String(100), nullable=False)
    status = Column(Enum(AssetStatus), nullable=False, default=AssetStatus.Available)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    purchase_date = Column(Date, nullable=False)
    return_date = Column(Date, nullable=True)

    assigned_user = relationship("User", foreign_keys=[assigned_to])
    assignments = relationship("Assignment", back_populates="asset")
    asset_requests = relationship("AssetRequest", back_populates="asset")
    maintenance_requests = relationship("MaintenanceRequest", back_populates="asset")
