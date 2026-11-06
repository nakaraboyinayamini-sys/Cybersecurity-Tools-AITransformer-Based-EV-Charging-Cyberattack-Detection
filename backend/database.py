"""
Database Management and SQLite Schema for EV Cyber Defense System
"""

import sqlite3
import json
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from backend.config import DB_PATH, STATIONS


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initialize database tables and seed baseline charging stations."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Charging Stations Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS stations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        station_type TEXT NOT NULL,
        max_power REAL NOT NULL,
        current_power REAL DEFAULT 0.0,
        current_voltage REAL DEFAULT 230.0,
        current_current REAL DEFAULT 0.0,
        status TEXT DEFAULT 'NORMAL',  -- NORMAL, SUSPICIOUS, UNDER_ATTACK
        active_sessions INTEGER DEFAULT 1,
        total_energy_kwh REAL DEFAULT 120.5,
        network_packets_total INTEGER DEFAULT 1540,
        last_attack_type TEXT DEFAULT 'NONE',
        updated_at TEXT NOT NULL
    )
    """)

    # Telemetry Records Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS telemetry_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        charging_station_id TEXT NOT NULL,
        ev_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        voltage REAL NOT NULL,
        current REAL NOT NULL,
        power REAL NOT NULL,
        energy_consumed REAL NOT NULL,
        charging_duration REAL NOT NULL,
        network_packet_count INTEGER NOT NULL,
        request_frequency REAL NOT NULL,
        response_time REAL NOT NULL,
        authentication_status INTEGER NOT NULL,
        command_frequency REAL NOT NULL,
        data_integrity_score REAL NOT NULL,
        ip_device_identifier TEXT NOT NULL,
        protocol_message_type TEXT NOT NULL,
        session_status TEXT NOT NULL,
        attack_label TEXT NOT NULL,
        predicted_attack TEXT,
        confidence REAL,
        features_json TEXT,
        created_at TEXT NOT NULL
    )
    """)

    # Intrusion Alerts Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS alerts (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        station_id TEXT NOT NULL,
        detected_attack_type TEXT NOT NULL,
        confidence_score REAL NOT NULL,
        severity TEXT NOT NULL,           -- LOW, MEDIUM, HIGH, CRITICAL
        triggered_features TEXT NOT NULL,
        recommended_response TEXT NOT NULL,
        status TEXT DEFAULT 'ACTIVE',     -- ACTIVE, ACKNOWLEDGED, RESOLVED
        created_at TEXT NOT NULL
    )
    """)

    # Security Event Logs Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS security_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        station_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        prediction TEXT NOT NULL,
        confidence REAL NOT NULL,
        severity TEXT NOT NULL,
        status TEXT NOT NULL,
        details TEXT
    )
    """)

    conn.commit()

    # Seed Stations if empty
    cursor.execute("SELECT COUNT(*) as count FROM stations")
    if cursor.fetchone()["count"] == 0:
        now = datetime.now(timezone.utc).isoformat()
        for idx, s in enumerate(STATIONS):
            cursor.execute("""
            INSERT INTO stations (
                id, name, station_type, max_power, current_power, current_voltage, current_current,
                status, active_sessions, total_energy_kwh, network_packets_total, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                s["id"],
                s["name"],
                s["type"],
                s["max_power"],
                round(22.0 + idx * 8.5, 1),
                230.5 if "AC" in s["type"] else 398.2,
                round(32.0 + idx * 4.2, 1),
                "NORMAL",
                1 if idx % 2 == 0 else 2,
                round(145.2 + idx * 37.8, 1),
                1200 + idx * 350,
                now
            ))
        conn.commit()

    conn.close()


def get_all_stations() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM stations ORDER BY id ASC")
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows


def get_station_by_id(station_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM stations WHERE id = ?", (station_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def update_station_status(
    station_id: str,
    status: str,
    last_attack: str,
    current_power: float,
    current_voltage: float,
    current_current: float,
    packets_delta: int = 10
):
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now(timezone.utc).isoformat()
    cursor.execute("""
    UPDATE stations
    SET status = ?,
        last_attack_type = ?,
        current_power = ?,
        current_voltage = ?,
        current_current = ?,
        network_packets_total = network_packets_total + ?,
        updated_at = ?
    WHERE id = ?
    """, (status, last_attack, current_power, current_voltage, current_current, packets_delta, now, station_id))
    conn.commit()
    conn.close()


def insert_telemetry_record(record: Dict[str, Any]) -> int:
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now(timezone.utc).isoformat()
    cursor.execute("""
    INSERT INTO telemetry_records (
        timestamp, charging_station_id, ev_id, session_id,
        voltage, current, power, energy_consumed, charging_duration,
        network_packet_count, request_frequency, response_time,
        authentication_status, command_frequency, data_integrity_score,
        ip_device_identifier, protocol_message_type, session_status,
        attack_label, predicted_attack, confidence, features_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        record.get("timestamp", now),
        record.get("charging_station_id", "EV-CS-01"),
        record.get("ev_id", "EV-1001"),
        record.get("session_id", "SES-001"),
        record.get("voltage", 230.0),
        record.get("current", 32.0),
        record.get("power", 7.4),
        record.get("energy_consumed", 15.2),
        record.get("charging_duration", 45.0),
        record.get("network_packet_count", 150),
        record.get("request_frequency", 2.0),
        record.get("response_time", 40.0),
        record.get("authentication_status", 1),
        record.get("command_frequency", 5.0),
        record.get("data_integrity_score", 0.99),
        record.get("ip_device_identifier", "192.168.1.10"),
        record.get("protocol_message_type", "OCPP_MeterValues"),
        record.get("session_status", "Active"),
        record.get("attack_label", "NORMAL"),
        record.get("predicted_attack", "NORMAL"),
        record.get("confidence", 98.0),
        json.dumps(record.get("features", {})),
        now
    ))
    record_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return record_id


def insert_alert(alert: Dict[str, Any]) -> str:
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now(timezone.utc).isoformat()
    cursor.execute("""
    INSERT INTO alerts (
        id, timestamp, station_id, detected_attack_type,
        confidence_score, severity, triggered_features, recommended_response,
        status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        alert["id"],
        alert.get("timestamp", now),
        alert["station_id"],
        alert["detected_attack_type"],
        alert["confidence_score"],
        alert["severity"],
        alert["triggered_features"],
        alert["recommended_response"],
        alert.get("status", "ACTIVE"),
        now
    ))
    conn.commit()
    conn.close()
    return alert["id"]


def insert_security_log(
    station_id: str,
    event_type: str,
    prediction: str,
    confidence: float,
    severity: str,
    status: str = "LOGGED",
    details: str = ""
) -> int:
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now(timezone.utc).isoformat()
    cursor.execute("""
    INSERT INTO security_logs (
        timestamp, station_id, event_type, prediction, confidence, severity, status, details
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (now, station_id, event_type, prediction, confidence, severity, status, details))
    log_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return log_id


def get_alerts(limit: int = 50, severity: Optional[str] = None, station_id: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    query = "SELECT * FROM alerts"
    params = []
    conditions = []
    if severity and severity.upper() != "ALL":
        conditions.append("severity = ?")
        params.append(severity.upper())
    if station_id and station_id.upper() != "ALL":
        conditions.append("station_id = ?")
        params.append(station_id.upper())

    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY timestamp DESC LIMIT ?"
    params.append(limit)

    cursor.execute(query, params)
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows


def get_security_logs(limit: int = 100, search: Optional[str] = None, severity: Optional[str] = None, station_id: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    query = "SELECT * FROM security_logs"
    params = []
    conditions = []

    if search:
        search_pattern = f"%{search}%"
        conditions.append("(station_id LIKE ? OR event_type LIKE ? OR prediction LIKE ? OR details LIKE ?)")
        params.extend([search_pattern, search_pattern, search_pattern, search_pattern])

    if severity and severity.upper() != "ALL":
        conditions.append("severity = ?")
        params.append(severity.upper())

    if station_id and station_id.upper() != "ALL":
        conditions.append("station_id = ?")
        params.append(station_id.upper())

    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY id DESC LIMIT ?"
    params.append(limit)

    cursor.execute(query, params)
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows


def clear_security_logs():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM security_logs")
    cursor.execute("DELETE FROM alerts")
    cursor.execute("UPDATE stations SET status = 'NORMAL', last_attack_type = 'NONE'")
    conn.commit()
    conn.close()

