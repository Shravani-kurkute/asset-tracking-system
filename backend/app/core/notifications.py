from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.models.user import User, UserRole


def create_notification(
    db: Session,
    *,
    user_id: int,
    type: str,
    title: str,
    message: str,
) -> Notification:
    notification = Notification(
        user_id=user_id,
        type=type,
        title=title,
        message=message,
        is_read=False,
    )
    db.add(notification)
    return notification


def create_notifications_for_roles(
    db: Session,
    *,
    roles: list[UserRole],
    type: str,
    title: str,
    message: str,
):
    users = db.query(User).filter(User.role.in_(roles), User.is_active.is_(True)).all()
    for user in users:
        create_notification(
            db,
            user_id=user.id,
            type=type,
            title=title,
            message=message,
        )
