from sqlalchemy import Column, Integer, Date, Enum, ForeignKey
from sqlalchemy.orm import relationship
import enum

from app.database import Base


class AssetRequestStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class AssetRequest(Base):
    __tablename__ = "asset_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False, index=True)
    status = Column(
        Enum(AssetRequestStatus),
        nullable=False,
        default=AssetRequestStatus.pending,
    )
    request_date = Column(Date, nullable=False)
    approval_date = Column(Date, nullable=True)

    user = relationship("User", back_populates="asset_requests")
    asset = relationship("Asset", back_populates="asset_requests")
