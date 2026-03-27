"""Reusable FastAPI dependencies for auth and role checks."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.security import decode_token
from app.models.user import User, UserRole

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    token = credentials.credentials
    payload = decode_token(token)

    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )

    return user


def require_roles(*roles: UserRole):
    """Generic role guard — pass any combination of UserRole values."""
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {[r.value for r in roles]}",
            )
        return current_user
    return role_checker


# ── Convenience dependency shortcuts ──────────────────────────────────────────
def require_system_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    if current_user.role != UserRole.system_admin:
        raise HTTPException(status_code=403, detail="System admin access required")
    return current_user


def require_dept_admin_or_above(
    current_user: User = Depends(get_current_user)
) -> User:
    allowed = {UserRole.system_admin, UserRole.dept_admin}
    if current_user.role not in allowed:
        raise HTTPException(status_code=403, detail="Department admin access required")
    return current_user


def require_management_or_above(
    current_user: User = Depends(get_current_user)
) -> User:
    allowed = {UserRole.system_admin, UserRole.management}
    if current_user.role not in allowed:
        raise HTTPException(status_code=403, detail="Management access required")
    return current_user
