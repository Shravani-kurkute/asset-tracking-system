from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.dependencies import get_current_user, require_dept_admin_or_above
from app.core.notifications import create_notification, create_notifications_for_roles
from app.database import get_db
from app.models.asset import Asset, AssetStatus
from app.models.assignment import Assignment
from app.models.maintenance import MaintenanceRequest, MaintenanceStatus
from app.models.user import User, UserRole
from app.schemas.maintenance import (
    MaintenanceCreate,
    MaintenanceResponse,
    MaintenanceStatusUpdate,
)

router = APIRouter(prefix="/maintenance", tags=["Maintenance"])


def _maintenance_query(db: Session):
    return db.query(MaintenanceRequest).options(
        joinedload(MaintenanceRequest.asset).joinedload(Asset.assigned_user),
        joinedload(MaintenanceRequest.user),
    )


@router.post("", response_model=MaintenanceResponse, status_code=status.HTTP_201_CREATED)
def create_maintenance_request(
    payload: MaintenanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    asset = db.query(Asset).filter(Asset.id == payload.asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    if asset.assigned_to != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only report maintenance for assets assigned to you",
        )

    issue_description = payload.issue_description.strip()
    if not issue_description:
        raise HTTPException(status_code=400, detail="Issue description is required")

    active_request = (
        db.query(MaintenanceRequest)
        .filter(
            MaintenanceRequest.asset_id == payload.asset_id,
            MaintenanceRequest.status.in_(
                [MaintenanceStatus.pending, MaintenanceStatus.in_progress]
            ),
        )
        .first()
    )
    if active_request:
        raise HTTPException(
            status_code=400,
            detail="An active maintenance request already exists for this asset",
        )

    maintenance_request = MaintenanceRequest(
        asset_id=payload.asset_id,
        user_id=current_user.id,
        issue_description=issue_description,
        status=MaintenanceStatus.pending,
    )
    db.add(maintenance_request)

    active_assignment = (
        db.query(Assignment)
        .filter(
            Assignment.asset_id == asset.id,
            Assignment.user_id == current_user.id,
            Assignment.return_date.is_(None),
        )
        .order_by(Assignment.assigned_date.desc(), Assignment.id.desc())
        .first()
    )
    if active_assignment:
        active_assignment.return_date = date.today()

    asset.status = AssetStatus.Maintenance
    asset.assigned_to = None
    create_notifications_for_roles(
        db,
        roles=[UserRole.system_admin, UserRole.dept_admin],
        type="maintenance_update",
        title="New Maintenance Request",
        message=f"{current_user.full_name} reported an issue for {asset.name}.",
    )

    db.commit()

    return (
        _maintenance_query(db)
        .filter(MaintenanceRequest.id == maintenance_request.id)
        .first()
    )


@router.get("", response_model=list[MaintenanceResponse])
def list_maintenance_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = _maintenance_query(db)

    if current_user.role.value not in {"system_admin", "dept_admin"}:
        query = query.filter(MaintenanceRequest.user_id == current_user.id)

    return query.order_by(MaintenanceRequest.created_at.desc(), MaintenanceRequest.id.desc()).all()


@router.put("/{maintenance_id}/status", response_model=MaintenanceResponse)
def update_maintenance_status(
    maintenance_id: int,
    payload: MaintenanceStatusUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_dept_admin_or_above),
):
    maintenance_request = (
        _maintenance_query(db)
        .filter(MaintenanceRequest.id == maintenance_id)
        .first()
    )
    if not maintenance_request:
        raise HTTPException(status_code=404, detail="Maintenance request not found")

    if payload.status == MaintenanceStatus.pending:
        raise HTTPException(
            status_code=400,
            detail="Maintenance status can only be updated to in_progress or completed",
        )

    maintenance_request.status = payload.status

    asset = db.query(Asset).filter(Asset.id == maintenance_request.asset_id).first()
    if payload.status == MaintenanceStatus.completed and asset:
        asset.status = AssetStatus.Available
        asset.assigned_to = None
        asset.return_date = None
    elif asset:
        asset.status = AssetStatus.Maintenance

    create_notification(
        db,
        user_id=maintenance_request.user_id,
        type="maintenance_update",
        title="Maintenance Status Updated",
        message=(
            f"Maintenance for {maintenance_request.asset.name} is now "
            f"{payload.status.value.replace('_', ' ')}."
        ),
    )

    db.commit()

    return (
        _maintenance_query(db)
        .filter(MaintenanceRequest.id == maintenance_id)
        .first()
    )
