"""
Charging Station Status and Detail Endpoints
"""

from fastapi import APIRouter, HTTPException
from backend import database

router = APIRouter(prefix="/api/stations", tags=["stations"])


@router.get("")
async def list_stations():
    """List all charging stations with real-time operational and threat statuses."""
    stations = database.get_all_stations()
    # Enrich with latest alerts count
    alerts = database.get_alerts(limit=100)
    for st in stations:
        st_alerts = [a for a in alerts if a["station_id"] == st["id"]]
        st["active_alerts_count"] = len(st_alerts)
        st["recent_alert"] = st_alerts[0] if st_alerts else None
    return {
        "status": "success",
        "data": stations
    }


@router.get("/{station_id}")
async def get_station_detail(station_id: str):
    """Retrieve in-depth telemetry, session history, and alert trail for a specific station."""
    station = database.get_station_by_id(station_id.upper())
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")

    station_alerts = database.get_alerts(limit=20, station_id=station_id.upper())
    station_logs = database.get_security_logs(limit=25, station_id=station_id.upper())

    return {
        "status": "success",
        "data": {
            "station": station,
            "alerts": station_alerts,
            "recent_logs": station_logs
        }
    }

