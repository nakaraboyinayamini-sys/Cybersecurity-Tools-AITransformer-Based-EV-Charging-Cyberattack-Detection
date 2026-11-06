"""
Intrusion Alerts API Endpoints
"""

from typing import Optional
from fastapi import APIRouter
from backend import database

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("")
async def get_alerts_list(limit: int = 50, severity: Optional[str] = None, station_id: Optional[str] = None):
    """Retrieve security alerts filtered by severity and station ID."""
    alerts = database.get_alerts(limit=limit, severity=severity, station_id=station_id)
    return {
        "status": "success",
        "total": len(alerts),
        "data": alerts
    }


@router.delete("/clear")
async def clear_all_alerts():
    """Clear all alerts and reset station threat statuses."""
    database.clear_security_logs()
    return {
        "status": "success",
        "message": "All intrusion alerts and security logs cleared."
    }

