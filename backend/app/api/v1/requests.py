"""Asset request endpoints for request submission and admin decisions."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.dependencies import get_current_user, require_dept_admin_or_above
from app.core.notifications import create_notification, create_notifications_for_roles
from app.database import get_db
from app.models.asset import Asset, AssetStatus
from app.models.asset_request import AssetRequest, AssetRequestStatus
from app.models.assignment import Assignment
from app.models.user import User, UserRole
from app.schemas.asset import AssetResponse
from app.schemas.asset_request import AssetRequestCreate, AssetRequestResponse

router = APIRouter(tags=["Asset Requests"])


def _request_query(db: Session):
    return db.query(AssetRequest).options(
        joinedload(AssetRequest.asset).joinedload(Asset.assigned_user),
        joinedload(AssetRequest.user),
    )


@router.post("/requests", response_model=AssetRequestResponse, status_code=status.HTTP_201_CREATED)
def create_asset_request(
    payload: AssetRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    asset = db.query(Asset).filter(Asset.id == payload.asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    if asset.status != AssetStatus.Available:
        raise HTTPException(status_code=400, detail="Only available assets can be requested")

    existing_request = (
        db.query(AssetRequest)
        .filter(
            AssetRequest.asset_id == payload.asset_id,
            AssetRequest.user_id == current_user.id,
            AssetRequest.status == AssetRequestStatus.pending,
        )
        .first()
    )
    if existing_request:
        raise HTTPException(status_code=400, detail="You already have a pending request for this asset")

    asset_request = AssetRequest(
        user_id=current_user.id,
        asset_id=payload.asset_id,
        status=AssetRequestStatus.pending,
        request_date=date.today(),
    )
    db.add(asset_request)

    create_notifications_for_roles(
        db,
        roles=[UserRole.system_admin, UserRole.dept_admin],
        type="asset_request",
        title="New Asset Request",
        message=f"{current_user.full_name} requested {asset.name}.",
    )

    db.commit()

    return _request_query(db).filter(AssetRequest.id == asset_request.id).first()


@router.get("/requests", response_model=list[AssetRequestResponse])
def list_asset_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = _request_query(db)

    if current_user.role.value not in {"system_admin", "dept_admin"}:
        query = query.filter(AssetRequest.user_id == current_user.id)

    return query.order_by(AssetRequest.request_date.desc(), AssetRequest.id.desc()).all()


@router.get("/requests/assets", response_model=list[AssetResponse])
def list_requestable_assets(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return (
        db.query(Asset)
        .options(joinedload(Asset.assigned_user))
        .filter(Asset.status == AssetStatus.Available)
        .order_by(Asset.id.desc())
        .all()
    )


@router.put("/requests/{request_id}/approve", response_model=AssetRequestResponse)
def approve_asset_request(
    request_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_dept_admin_or_above),
):
    asset_request = _request_query(db).filter(AssetRequest.id == request_id).first()
    if not asset_request:
        raise HTTPException(status_code=404, detail="Asset request not found")

    if asset_request.status != AssetRequestStatus.pending:
        raise HTTPException(status_code=400, detail="Only pending requests can be approved")

    asset = db.query(Asset).filter(Asset.id == asset_request.asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    if asset.status != AssetStatus.Available:
        raise HTTPException(status_code=400, detail="This asset is no longer available")

    assignment = Assignment(
        asset_id=asset_request.asset_id,
        user_id=asset_request.user_id,
        assigned_date=date.today(),
        return_date=None,
    )
    db.add(assignment)

    asset.status = AssetStatus.Assigned
    asset.assigned_to = asset_request.user_id
    asset.return_date = None

    asset_request.status = AssetRequestStatus.approved
    asset_request.approval_date = date.today()
    create_notification(
        db,
        user_id=asset_request.user_id,
        type="asset_request",
        title="Asset Request Approved",
        message=f"Your request for {asset_request.asset.name} has been approved.",
    )

    db.commit()

    return _request_query(db).filter(AssetRequest.id == request_id).first()


@router.put("/requests/{request_id}/reject", response_model=AssetRequestResponse)
def reject_asset_request(
    request_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_dept_admin_or_above),
):
    asset_request = _request_query(db).filter(AssetRequest.id == request_id).first()
    if not asset_request:
        raise HTTPException(status_code=404, detail="Asset request not found")

    if asset_request.status != AssetRequestStatus.pending:
        raise HTTPException(status_code=400, detail="Only pending requests can be rejected")

    asset_request.status = AssetRequestStatus.rejected
    asset_request.approval_date = date.today()
    create_notification(
        db,
        user_id=asset_request.user_id,
        type="asset_request",
        title="Asset Request Rejected",
        message=f"Your request for {asset_request.asset.name} has been rejected.",
    )
    db.commit()

    return _request_query(db).filter(AssetRequest.id == request_id).first()
