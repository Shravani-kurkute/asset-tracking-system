"""Health endpoints for simple uptime checks."""

from fastapi import APIRouter
from app.database import check_db_connection
from app.config import settings

router = APIRouter()

@router.get("/health", tags=["System"])
def health_check():
    db_status = check_db_connection()
    return {
        "status": "healthy" if db_status else "degraded",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "database": "connected" if db_status else "unreachable",
    }
