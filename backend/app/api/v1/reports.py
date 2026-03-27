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


def _pdf_text(
    x: int,
    y: int,
    text: str,
    font: str = "F1",
    size: int = 12,
    color: tuple[float, float, float] = (0.129, 0.161, 0.216),
) -> str:
    r, g, b = color
    return (
        f"BT {r:.3f} {g:.3f} {b:.3f} rg /{font} {size} Tf 1 0 0 1 "
        f"{x} {y} Tm ({_escape_pdf_text(text)}) Tj ET"
    )


def _pdf_rect(x: int, y: int, width: int, height: int, color: tuple[float, float, float]) -> str:
    r, g, b = color
    return f"{r:.3f} {g:.3f} {b:.3f} rg {x} {y} {width} {height} re f"


def _pdf_stroke_rect(
    x: int,
    y: int,
    width: int,
    height: int,
    color: tuple[float, float, float],
    line_width: float = 1.0,
) -> str:
    r, g, b = color
    return f"{line_width:.2f} w {r:.3f} {g:.3f} {b:.3f} RG {x} {y} {width} {height} re S"


def _pdf_line(
    x1: int,
    y1: int,
    x2: int,
    y2: int,
    color: tuple[float, float, float],
    line_width: float = 1.0,
) -> str:
    r, g, b = color
    return (
        f"{line_width:.2f} w {r:.3f} {g:.3f} {b:.3f} RG "
        f"{x1} {y1} m {x2} {y2} l S"
    )


def _draw_bar(
    commands: list[str],
    x: int,
    y: int,
    width: int,
    height: int,
    fill_width: int,
    base_color: tuple[float, float, float],
    track_color: tuple[float, float, float] = (0.902, 0.929, 0.961),
):
    # Track
    commands.append(_pdf_rect(x, y, width, height, track_color))
    # Subtle bottom shadow for a pseudo-3D bar style
    commands.append(_pdf_rect(x, y, width, max(2, height // 4), (0.820, 0.859, 0.914)))
    # Filled value
    commands.append(_pdf_rect(x, y, max(fill_width, 10), height, base_color))
    # Top highlight on filled value
    highlight = tuple(min(channel + 0.12, 1.0) for channel in base_color)
    commands.append(_pdf_rect(x, y + height - 3, max(fill_width, 10), 3, highlight))
    # Thin end cap shadow
    if fill_width > 14:
        shadow = tuple(max(channel - 0.10, 0.0) for channel in base_color)
        commands.append(_pdf_rect(x + fill_width - 4, y, 4, height, shadow))


def _build_pdf(summary: dict) -> bytes:
    category_data = summary.get("assets_by_category", [])
    status_data = summary.get("assets_by_status", [])
    max_category = max([entry["count"] for entry in category_data], default=1)
    max_status = max([entry["count"] for entry in status_data], default=1)
    generated_at = datetime.now().strftime("%d %b %Y, %I:%M %p")

    commands = []
    slate = (0.129, 0.161, 0.216)
    muted = (0.420, 0.467, 0.533)
    border = (0.851, 0.886, 0.933)
    panel = (1.0, 1.0, 1.0)
    page_bg = (0.965, 0.976, 0.992)
    brand = (0.051, 0.286, 0.494)
    brand_dark = (0.035, 0.192, 0.341)
    available = (0.078, 0.678, 0.420)
    assigned = (0.961, 0.620, 0.043)
    maintenance = (0.863, 0.227, 0.227)
    blue = (0.231, 0.510, 0.965)
    warning_bg = (1.000, 0.969, 0.886)
    success_bg = (0.918, 0.973, 0.941)
    danger_bg = (0.992, 0.929, 0.929)
    blue_bg = (0.925, 0.957, 0.996)

    commands.append(_pdf_rect(0, 0, 612, 842, page_bg))
    commands.append(_pdf_rect(0, 730, 612, 112, brand))
    commands.append(_pdf_rect(0, 718, 612, 12, brand_dark))
    commands.append(_pdf_text(48, 792, "ASSET TRACKING SYSTEM", "F2", 13, (0.820, 0.902, 0.980)))
    commands.append(_pdf_text(48, 758, "Executive Asset Summary", "F2", 24, (1.0, 1.0, 1.0)))
    commands.append(_pdf_text(48, 736, "Inventory, allocation, requests, and maintenance overview", "F1", 11, (0.847, 0.914, 0.969)))
    commands.append(_pdf_text(48, 720, f"Generated on {generated_at}", "F1", 10, (0.847, 0.914, 0.969)))
    commands.append(_pdf_rect(430, 770, 132, 28, (0.098, 0.349, 0.580)))
    commands.append(_pdf_stroke_rect(430, 770, 132, 28, (0.337, 0.576, 0.780), 0.8))
    commands.append(_pdf_text(449, 781, "INTERNAL USE ONLY", "F2", 10, (1.0, 1.0, 1.0)))
    commands.append(_pdf_text(414, 748, "Prepared for management review", "F1", 9, (0.847, 0.914, 0.969)))

    commands.append(_pdf_rect(36, 664, 540, 40, panel))
    commands.append(_pdf_stroke_rect(36, 664, 540, 40, border, 1.0))
    commands.append(_pdf_text(52, 688, "Report Scope", "F2", 12, brand_dark))
    commands.append(
        _pdf_text(
            52,
            672,
            "Snapshot of current asset inventory, allocation, requests, and maintenance workload.",
            "F1",
            10,
            muted,
        )
    )

    stat_cards = [
        ("Total Assets", str(summary["total_assets"]), blue, blue_bg),
        ("Available", str(summary["available_assets"]), available, success_bg),
        ("Assigned", str(summary["assigned_assets"]), assigned, warning_bg),
        ("Maintenance", str(summary["maintenance_assets"]), maintenance, danger_bg),
    ]

    card_positions = [(36, 560), (306, 560), (36, 472), (306, 472)]
    for (label, value, color, bg_color), (x, y) in zip(stat_cards, card_positions):
        commands.append(_pdf_rect(x + 4, y - 4, 240, 74, (0.882, 0.914, 0.957)))
        commands.append(_pdf_rect(x, y, 240, 74, panel))
        commands.append(_pdf_stroke_rect(x, y, 240, 74, border, 1.0))
        commands.append(_pdf_rect(x, y + 54, 240, 20, bg_color))
        commands.append(_pdf_rect(x + 16, y + 20, 8, 36, color))
        commands.append(_pdf_text(x + 34, y + 49, label, "F1", 12, muted))
        commands.append(_pdf_text(x + 34, y + 20, value, "F2", 22, slate))
        commands.append(_pdf_text(x + 182, y + 24, "Current", "F1", 9, color))

    commands.append(_pdf_rect(40, 388, 240, 58, (0.882, 0.914, 0.957)))
    commands.append(_pdf_rect(36, 392, 240, 58, panel))
    commands.append(_pdf_stroke_rect(36, 392, 240, 58, border, 1.0))
    commands.append(_pdf_rect(36, 392, 240, 58, warning_bg))
    commands.append(_pdf_text(52, 425, "Pending Requests", "F1", 12, slate))
    commands.append(_pdf_text(52, 403, str(summary["pending_requests"]), "F2", 20, slate))
    commands.append(_pdf_text(150, 406, "Awaiting approval workflow", "F1", 9, muted))

    commands.append(_pdf_rect(310, 388, 240, 58, (0.882, 0.914, 0.957)))
    commands.append(_pdf_rect(306, 392, 240, 58, panel))
    commands.append(_pdf_stroke_rect(306, 392, 240, 58, border, 1.0))
    commands.append(_pdf_rect(306, 392, 240, 58, blue_bg))
    commands.append(_pdf_text(322, 425, "Maintenance Pending", "F1", 12, slate))
    commands.append(_pdf_text(322, 403, str(summary["maintenance_pending"]), "F2", 20, slate))
    commands.append(_pdf_text(420, 406, "Assets awaiting action", "F1", 9, muted))

    commands.append(_pdf_rect(40, 158, 255, 208, (0.882, 0.914, 0.957)))
    commands.append(_pdf_rect(36, 162, 255, 208, panel))
    commands.append(_pdf_stroke_rect(36, 162, 255, 208, border, 1.0))
    commands.append(_pdf_text(52, 345, "Assets by Category", "F2", 16, brand_dark))
    commands.append(_pdf_text(52, 328, "Inventory mix across categories", "F1", 10, muted))
    commands.append(_pdf_line(52, 320, 275, 320, border, 1.0))

    category_y = 292
    for entry in category_data[:5]:
        count = entry["count"]
        width = int((count / max_category) * 122) if max_category else 0
        commands.append(_pdf_text(52, category_y, entry["category"], "F1", 11, slate))
        _draw_bar(commands, 144, category_y - 4, 128, 12, width, brand)
        commands.append(_pdf_text(282, category_y, str(count), "F2", 11, brand_dark))
        category_y -= 30

    commands.append(_pdf_rect(325, 158, 255, 208, (0.882, 0.914, 0.957)))
    commands.append(_pdf_rect(321, 162, 255, 208, panel))
    commands.append(_pdf_stroke_rect(321, 162, 255, 208, border, 1.0))
    commands.append(_pdf_text(337, 345, "Assets by Status", "F2", 16, brand_dark))
    commands.append(_pdf_text(337, 328, "Operational distribution snapshot", "F1", 10, muted))
    commands.append(_pdf_line(337, 320, 560, 320, border, 1.0))

    status_y = 292
    status_colors = {
        "Available": available,
        "Assigned": assigned,
        "Maintenance": maintenance,
    }
    for entry in status_data[:5]:
        count = entry["count"]
        width = int((count / max_status) * 122) if max_status else 0
        color = status_colors.get(entry["status"], muted)
        commands.append(_pdf_text(337, status_y, entry["status"], "F1", 11, slate))
        _draw_bar(commands, 430, status_y - 4, 128, 12, width, color)
        commands.append(_pdf_text(568, status_y, str(count), "F2", 11, brand_dark))
        status_y -= 30

    commands.append(_pdf_line(36, 108, 576, 108, border, 1.0))
    commands.append(_pdf_text(36, 88, f"Total Requests Logged: {summary['total_requests']}", "F2", 11, brand_dark))
    commands.append(_pdf_text(36, 72, "This document is system-generated for operational reporting.", "F1", 9, muted))
    commands.append(_pdf_text(405, 88, "Asset Tracking System", "F2", 11, brand_dark))
    commands.append(_pdf_text(434, 72, "Confidential company record", "F1", 9, muted))

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
