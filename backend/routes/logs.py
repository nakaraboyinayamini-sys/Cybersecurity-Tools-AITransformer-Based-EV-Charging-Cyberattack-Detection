"""
Security Event Log Endpoints and CSV Export
"""

import io
import csv
from typing import Optional
from fastapi import APIRouter
from fastapi.responses import Response
from backend import database

router = APIRouter(prefix="/api/logs", tags=["logs"])


@router.get("")
async def get_logs(
    limit: int = 100,
    search: Optional[str] = None,
    severity: Optional[str] = None,
    station_id: Optional[str] = None
):
    """Query security logs with full-text search, severity and station filtering."""
    logs = database.get_security_logs(
        limit=limit,
        search=search,
        severity=severity,
        station_id=station_id
    )
    return {
        "status": "success",
        "total": len(logs),
        "data": logs
    }


@router.get("/export-csv")
async def export_logs_as_csv():
    """Export all security logs to downloadable CSV format."""
    logs = database.get_security_logs(limit=2000)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Log ID", "Timestamp", "Station ID", "Event Type",
        "Transformer Prediction", "Confidence (%)", "Severity", "Status", "Details"
    ])

    for row in logs:
        writer.writerow([
            row.get("id"),
            row.get("timestamp"),
            row.get("station_id"),
            row.get("event_type"),
            row.get("prediction"),
            row.get("confidence"),
            row.get("severity"),
            row.get("status"),
            row.get("details")
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=ev_security_event_log.csv"}
    )


@router.delete("/clear")
async def clear_logs():
    """Clear all security events and reset stations to normal."""
    database.clear_security_logs()
    return {
        "status": "success",
        "message": "Security logs cleared successfully."
    }

