from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_dept_admin_or_above
from app.core.notifications import create_notification, create_notifications_for_roles
from app.database import get_db
from app.models.notification import Notification
from app.models.user import User, UserRole
from app.schemas.notification import NotificationCreate, NotificationResponse

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=list[NotificationResponse])
def list_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc(), Notification.id.desc())
        .all()
    )


@router.put("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
        .first()
    )
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification


@router.put("/read-all", status_code=status.HTTP_204_NO_CONTENT)
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id, Notification.is_read.is_(False))
        .update({"is_read": True}, synchronize_session=False)
    )
    db.commit()


@router.post("/system-alerts", status_code=status.HTTP_201_CREATED)
def create_system_alert(
    payload: NotificationCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_dept_admin_or_above),
):
    title = payload.title.strip()
    message = payload.message.strip()
    if not title or not message:
        raise HTTPException(status_code=400, detail="Title and message are required")

    if payload.target_role:
        try:
            target_role = UserRole(payload.target_role)
        except ValueError as error:
            raise HTTPException(status_code=400, detail="Invalid target role") from error

        create_notifications_for_roles(
            db,
            roles=[target_role],
            type="system_alert",
            title=title,
            message=message,
        )
    else:
        users = db.query(User).filter(User.is_active.is_(True)).all()
        for user in users:
            create_notification(
                db,
                user_id=user.id,
                type="system_alert",
                title=title,
                message=message,
            )

    db.commit()
    return {"message": "System alert created"}
