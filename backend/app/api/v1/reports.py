"""Reporting endpoints for analytics summaries and PDF export."""

from datetime import datetime
from io import BytesIO

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_roles
from app.database import get_db
from app.models.asset import Asset, AssetStatus
from app.models.asset_request import AssetRequest, AssetRequestStatus
from app.models.maintenance import MaintenanceRequest, MaintenanceStatus
from app.models.user import User, UserRole

router = APIRouter(prefix="/reports", tags=["Reports"])


def _get_reports_summary_data(db: Session):
    total_assets = db.query(func.count(Asset.id)).scalar() or 0
    available_assets = (
        db.query(func.count(Asset.id))
        .filter(Asset.status == AssetStatus.Available)
        .scalar()
        or 0
    )
    assigned_assets = (
        db.query(func.count(Asset.id))
        .filter(Asset.status == AssetStatus.Assigned)
        .scalar()
        or 0
    )
    maintenance_assets = (
        db.query(func.count(Asset.id))
        .filter(Asset.status == AssetStatus.Maintenance)
        .scalar()
        or 0
    )

    total_requests = db.query(func.count(AssetRequest.id)).scalar() or 0
    pending_requests = (
        db.query(func.count(AssetRequest.id))
        .filter(AssetRequest.status == AssetRequestStatus.pending)
        .scalar()
        or 0
    )
    maintenance_pending = (
        db.query(func.count(MaintenanceRequest.id))
        .filter(MaintenanceRequest.status == MaintenanceStatus.pending)
        .scalar()
        or 0
    )

    assets_by_category_rows = (
        db.query(Asset.category, func.count(Asset.id))
        .group_by(Asset.category)
        .order_by(func.count(Asset.id).desc(), Asset.category.asc())
        .all()
    )
    assets_by_status_rows = (
        db.query(Asset.status, func.count(Asset.id))
        .group_by(Asset.status)
        .order_by(func.count(Asset.id).desc())
        .all()
    )

    return {
        "total_assets": total_assets,
        "available_assets": available_assets,
        "assigned_assets": assigned_assets,
        "maintenance_assets": maintenance_assets,
        "total_requests": total_requests,
        "pending_requests": pending_requests,
        "maintenance_pending": maintenance_pending,
        "assets_by_category": [
            {"category": category or "Uncategorized", "count": count}
            for category, count in assets_by_category_rows
        ],
        "assets_by_status": [
            {
                "status": status.value if hasattr(status, "value") else str(status),
                "count": count,
            }
            for status, count in assets_by_status_rows
        ],
    }


def _escape_pdf_text(value: str) -> str:
    return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def _pdf_text(x: int, y: int, text: str, font: str = "F1", size: int = 12) -> str:
    return f"BT /{font} {size} Tf 1 0 0 1 {x} {y} Tm ({_escape_pdf_text(text)}) Tj ET"


def _pdf_rect(x: int, y: int, width: int, height: int, color: tuple[float, float, float]) -> str:
    r, g, b = color
    return f"{r:.3f} {g:.3f} {b:.3f} rg {x} {y} {width} {height} re f"


def _build_pdf(summary: dict) -> bytes:
    category_data = summary.get("assets_by_category", [])
    status_data = summary.get("assets_by_status", [])
    max_category = max([entry["count"] for entry in category_data], default=1)
    max_status = max([entry["count"] for entry in status_data], default=1)

    commands = []

    commands.append(_pdf_rect(0, 0, 612, 842, (0.988, 0.992, 0.996)))
    commands.append(_pdf_rect(0, 742, 612, 100, (0.016, 0.518, 0.780)))
    commands.append(_pdf_text(48, 790, "Asset Tracking System Report", "F2", 24))
    commands.append(_pdf_text(48, 765, f"Generated on {datetime.now().strftime('%d %b %Y %I:%M %p')}", "F1", 12))

    stat_cards = [
        ("Total Assets", str(summary["total_assets"]), (0.231, 0.510, 0.965)),
        ("Available", str(summary["available_assets"]), (0.063, 0.725, 0.506)),
        ("Assigned", str(summary["assigned_assets"]), (0.961, 0.620, 0.043)),
        ("Maintenance", str(summary["maintenance_assets"]), (0.937, 0.267, 0.267)),
    ]

    card_positions = [(48, 640), (310, 640), (48, 550), (310, 550)]
    for (label, value, color), (x, y) in zip(stat_cards, card_positions):
        commands.append(_pdf_rect(x, y, 254, 72, (1.0, 1.0, 1.0)))
        commands.append(_pdf_rect(x, y + 66, 254, 6, color))
        commands.append(_pdf_text(x + 16, y + 42, label, "F1", 12))
        commands.append(_pdf_text(x + 16, y + 16, value, "F2", 22))

    commands.append(_pdf_rect(48, 474, 254, 58, (1.0, 1.0, 1.0)))
    commands.append(_pdf_rect(310, 474, 254, 58, (1.0, 1.0, 1.0)))
    commands.append(_pdf_text(64, 509, "Pending Requests", "F1", 12))
    commands.append(_pdf_text(64, 486, str(summary["pending_requests"]), "F2", 20))
    commands.append(_pdf_text(326, 509, "Maintenance Pending", "F1", 12))
    commands.append(_pdf_text(326, 486, str(summary["maintenance_pending"]), "F2", 20))

    commands.append(_pdf_text(48, 438, "Assets by Category", "F2", 16))
    category_y = 410
    for entry in category_data[:6]:
        count = entry["count"]
        width = int((count / max_category) * 170) if max_category else 0
        commands.append(_pdf_text(48, category_y, entry["category"], "F1", 11))
        commands.append(_pdf_rect(170, category_y - 2, 180, 10, (0.902, 0.929, 0.961)))
        commands.append(_pdf_rect(170, category_y - 2, max(width, 8), 10, (0.016, 0.518, 0.780)))
        commands.append(_pdf_text(360, category_y, str(count), "F2", 11))
        category_y -= 28

    commands.append(_pdf_text(48, 232, "Assets by Status", "F2", 16))
    status_y = 204
    status_colors = {
        "Available": (0.063, 0.725, 0.506),
        "Assigned": (0.961, 0.620, 0.043),
        "Maintenance": (0.937, 0.267, 0.267),
    }
    for entry in status_data[:6]:
        count = entry["count"]
        width = int((count / max_status) * 170) if max_status else 0
        color = status_colors.get(entry["status"], (0.392, 0.455, 0.545))
        commands.append(_pdf_text(48, status_y, entry["status"], "F1", 11))
        commands.append(_pdf_rect(170, status_y - 2, 180, 10, (0.902, 0.929, 0.961)))
        commands.append(_pdf_rect(170, status_y - 2, max(width, 8), 10, color))
        commands.append(_pdf_text(360, status_y, str(count), "F2", 11))
        status_y -= 28

    commands.append(_pdf_text(48, 56, f"Total Requests: {summary['total_requests']}", "F1", 11))
    commands.append(_pdf_text(240, 56, f"Exported from Asset Tracking System", "F1", 11))

    content_stream = "\n".join(commands).encode("latin-1", errors="replace")

    objects = [
        b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
        b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
        b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >> endobj",
        f"4 0 obj << /Length {len(content_stream)} >> stream\n".encode("latin-1")
        + content_stream
        + b"\nendstream endobj",
        b"5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
        b"6 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj",
    ]

    buffer = BytesIO()
    buffer.write(b"%PDF-1.4\n")
    offsets = [0]
    for obj in objects:
        offsets.append(buffer.tell())
        buffer.write(obj)
        buffer.write(b"\n")

    xref_offset = buffer.tell()
    buffer.write(f"xref\n0 {len(offsets)}\n".encode("latin-1"))
    buffer.write(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        buffer.write(f"{offset:010d} 00000 n \n".encode("latin-1"))
    buffer.write(
        (
            f"trailer << /Size {len(offsets)} /Root 1 0 R >>\n"
            f"startxref\n{xref_offset}\n%%EOF"
        ).encode("latin-1")
    )
    return buffer.getvalue()


@router.get("/summary")
def get_reports_summary(
    db: Session = Depends(get_db),
    _: User = Depends(
        require_roles(
            UserRole.system_admin,
            UserRole.dept_admin,
            UserRole.management,
        )
    ),
):
    return _get_reports_summary_data(db)


@router.get("/pdf")
def download_reports_pdf(
    db: Session = Depends(get_db),
    _: User = Depends(
        require_roles(
            UserRole.system_admin,
            UserRole.dept_admin,
            UserRole.management,
        )
    ),
):
    summary = _get_reports_summary_data(db)
    pdf_bytes = _build_pdf(summary)

    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": 'attachment; filename="asset-report-summary.pdf"'
        },
    )
