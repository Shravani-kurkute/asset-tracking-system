from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.dependencies import get_current_user, require_dept_admin_or_above
from app.database import get_db
from app.models.asset import Asset, AssetStatus
from app.models.assignment import Assignment
from app.models.maintenance import MaintenanceRequest
from app.models.user import User
from app.schemas.asset import AssetCreate, AssetResponse, AssetUpdate

router = APIRouter(prefix="/assets", tags=["Assets"])


@router.post("", response_model=AssetResponse, status_code=status.HTTP_201_CREATED)
def create_asset(
    payload: AssetCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_dept_admin_or_above),
):
    assigned_user = None
    if payload.assigned_to is not None:
        assigned_user = db.query(User).filter(User.id == payload.assigned_to).first()
        if not assigned_user:
            raise HTTPException(status_code=404, detail="Assigned user not found")

    asset = Asset(
        name=payload.name,
        category=payload.category,
        status=payload.status,
        assigned_to=payload.assigned_to,
        purchase_date=payload.purchase_date,
        return_date=payload.return_date,
    )

    if asset.assigned_to is not None and asset.status == AssetStatus.Available:
        asset.status = AssetStatus.Assigned

    if asset.status == AssetStatus.Assigned and asset.assigned_to is None:
        raise HTTPException(
            status_code=400,
            detail="Assigned assets must include an assigned_to user",
        )

    if asset.status != AssetStatus.Assigned:
        asset.assigned_to = None

    db.add(asset)
    db.commit()
    db.refresh(asset)

    if asset.status == AssetStatus.Assigned:
        assignment = Assignment(
            asset_id=asset.id,
            user_id=asset.assigned_to,
            assigned_date=date.today(),
            return_date=asset.return_date,
        )
        db.add(assignment)
        db.commit()
        db.refresh(asset)

    return (
        db.query(Asset)
        .options(joinedload(Asset.assigned_user))
        .filter(Asset.id == asset.id)
        .first()
    )


@router.get("", response_model=list[AssetResponse])
def list_assets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Asset).options(joinedload(Asset.assigned_user))

    if current_user.role.value not in {"system_admin", "dept_admin"}:
        query = query.filter(Asset.assigned_to == current_user.id)

    return query.order_by(Asset.id.desc()).all()


@router.put("/{asset_id}", response_model=AssetResponse)
def update_asset(
    asset_id: int,
    payload: AssetUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_dept_admin_or_above),
):
    asset = (
        db.query(Asset)
        .options(joinedload(Asset.assigned_user))
        .filter(Asset.id == asset_id)
        .first()
    )
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    data = payload.model_dump(exclude_unset=True)
    new_assigned_to = data.get("assigned_to", asset.assigned_to)
    new_status = data.get("status", asset.status)

    if new_assigned_to is not None:
        assigned_user = db.query(User).filter(User.id == new_assigned_to).first()
        if not assigned_user:
            raise HTTPException(status_code=404, detail="Assigned user not found")

    if new_status == AssetStatus.Assigned and new_assigned_to is None:
        raise HTTPException(
            status_code=400,
            detail="Assigned assets must include an assigned_to user",
        )

    if new_status == AssetStatus.Available and asset.status == AssetStatus.Assigned:
        active_assignment = (
            db.query(Assignment)
            .filter(
                Assignment.asset_id == asset.id,
                Assignment.return_date.is_(None),
            )
            .order_by(Assignment.assigned_date.desc(), Assignment.id.desc())
            .first()
        )
        effective_return_date = data.get("return_date") or date.today()
        if active_assignment:
            active_assignment.return_date = effective_return_date
        asset.assigned_to = None
        asset.return_date = effective_return_date

    for field in ("name", "category", "purchase_date"):
        if field in data:
            setattr(asset, field, data[field])

    if "status" in data:
        asset.status = data["status"]

    if "assigned_to" in data and asset.status == AssetStatus.Assigned:
        asset.assigned_to = data["assigned_to"]

    if "return_date" in data and asset.status != AssetStatus.Available:
        asset.return_date = data["return_date"]

    if asset.status != AssetStatus.Assigned:
        asset.assigned_to = None

    db.commit()
    db.refresh(asset)
    return (
        db.query(Asset)
        .options(joinedload(Asset.assigned_user))
        .filter(Asset.id == asset.id)
        .first()
    )


@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_dept_admin_or_above),
):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    active_assignment = (
        db.query(Assignment)
        .filter(
            Assignment.asset_id == asset.id,
            Assignment.return_date.is_(None),
        )
        .first()
    )
    if active_assignment:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete an asset while it is actively assigned",
        )

    assignment_count = db.query(Assignment).filter(Assignment.asset_id == asset.id).count()
    if assignment_count:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete an asset with assignment history",
        )

    maintenance_count = (
        db.query(MaintenanceRequest).filter(MaintenanceRequest.asset_id == asset.id).count()
    )
    if maintenance_count:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete an asset with maintenance history",
        )

    db.delete(asset)
    db.commit()
