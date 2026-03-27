"""Asset assignment endpoints and assignment history management."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.dependencies import get_current_user, require_dept_admin_or_above
from app.core.notifications import create_notification
from app.database import get_db
from app.models.asset import Asset, AssetStatus
from app.models.assignment import Assignment
from app.models.user import User
from app.schemas.assignment import AssignmentCreate, AssignmentResponse

router = APIRouter(tags=["Assignments"])


@router.post("/assign", response_model=AssignmentResponse, status_code=status.HTTP_201_CREATED)
def assign_asset(
    payload: AssignmentCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_dept_admin_or_above),
):
    asset = db.query(Asset).filter(Asset.id == payload.asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if asset.status != AssetStatus.Available:
        raise HTTPException(
            status_code=400,
            detail="Only available assets can be assigned",
        )

    assignment = Assignment(
        asset_id=payload.asset_id,
        user_id=payload.user_id,
        assigned_date=payload.assigned_date,
        return_date=payload.return_date,
    )
    db.add(assignment)

    asset.status = AssetStatus.Assigned
    asset.assigned_to = payload.user_id
    asset.return_date = payload.return_date

    if payload.return_date:
        create_notification(
            db,
            user_id=payload.user_id,
            type="return_reminder",
            title="Asset Return Reminder",
            message=(
                f"{asset.name} is assigned to you and should be returned by "
                f"{payload.return_date.strftime('%d %b %Y')}."
            ),
        )

    db.commit()
    return (
        db.query(Assignment)
        .options(
            joinedload(Assignment.asset).joinedload(Asset.assigned_user),
            joinedload(Assignment.user),
        )
        .filter(Assignment.id == assignment.id)
        .first()
    )


@router.get("/assignments", response_model=list[AssignmentResponse])
def list_assignments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Assignment).options(
        joinedload(Assignment.asset).joinedload(Asset.assigned_user),
        joinedload(Assignment.user),
    )

    if current_user.role.value not in {"system_admin", "dept_admin"}:
        query = query.filter(Assignment.user_id == current_user.id)

    return query.order_by(Assignment.assigned_date.desc(), Assignment.id.desc()).all()
