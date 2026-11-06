"""
System Configuration and Constants for
Transformer-Based EV Charging Cyber Attack Detection Prototype
"""

import os
from pathlib import Path

# Paths
BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent
DATA_DIR = PROJECT_ROOT / "data"
WEIGHTS_DIR = BACKEND_DIR / "models" / "weights"
STATIC_DIR = PROJECT_ROOT / "frontend" / "static"
TEMPLATES_DIR = PROJECT_ROOT / "frontend" / "templates"
DB_PATH = DATA_DIR / "cyber_defense.db"

# Ensure directories exist
DATA_DIR.mkdir(parents=True, exist_ok=True)
WEIGHTS_DIR.mkdir(parents=True, exist_ok=True)

# Attack Categories (5 Classes: 0=Normal, 1=DoS, 2=Data Tampering, 3=Unauthorized Access, 4=Malware Activity)
ATTACK_CLASSES = [
    "NORMAL",
    "DoS ATTACK",
    "DATA TAMPERING",
    "UNAUTHORIZED ACCESS",
    "MALWARE ACTIVITY"
]

ATTACK_CODES = {
    0: "NORMAL",
    1: "DoS ATTACK",
    2: "DATA TAMPERING",
    3: "UNAUTHORIZED ACCESS",
    4: "MALWARE ACTIVITY"
}

CLASS_TO_CODE = {v: k for k, v in ATTACK_CODES.items()}

# Charging Stations
STATIONS = [
    {"id": "EV-CS-01", "name": "Station 01 (North Campus)", "max_power": 150.0, "type": "DC Fast Charger"},
    {"id": "EV-CS-02", "name": "Station 02 (Fleet Depot)", "max_power": 120.0, "type": "DC Fast Charger"},
    {"id": "EV-CS-03", "name": "Station 03 (Commercial Hub)", "max_power": 50.0, "type": "AC Level 2"},
    {"id": "EV-CS-04", "name": "Station 04 (Express Plaza)", "max_power": 150.0, "type": "DC Fast Charger"},
    {"id": "EV-CS-05", "name": "Station 05 (Tech Park)", "max_power": 50.0, "type": "AC Level 2"},
    {"id": "EV-CS-06", "name": "Station 06 (Terminal Grid)", "max_power": 100.0, "type": "DC Fast Charger"}
]

# OCPP 1.6J / 2.0.1 Protocol Message Types
PROTOCOL_MESSAGE_TYPES = [
    "OCPP_MeterValues",
    "OCPP_StatusNotification",
    "OCPP_Authorize",
    "OCPP_StartTransaction",
    "OCPP_StopTransaction",
    "OCPP_Heartbeat",
    "OCPP_FirmwareUpdate",
    "OCPP_RemoteStartTransaction"
]

# Nominal Electrical Baseline Values
NOMINAL_VOLTAGE_AC = 230.0   # V (single phase)
NOMINAL_VOLTAGE_DC = 400.0   # V (fast DC)
NOMINAL_INTEGRITY_SCORE = 0.98

# Feature list used for Transformer input
FEATURE_COLUMNS = [
    "norm_voltage",
    "norm_current",
    "norm_power",
    "norm_energy",
    "voltage_dev",
    "energy_rate_dev",
    "packet_rate",
    "request_freq",
    "response_time_ms",
    "auth_fail_rate",
    "command_freq",
    "integrity_score",
    "traffic_intensity",
    "session_duration",
    "protocol_type_idx",
    "station_load_factor"
]

FEATURE_NAMES_PRETTY = [
    "Normalized Voltage",
    "Normalized Current",
    "Active Power",
    "Energy Consumed",
    "Voltage Deviation",
    "Energy Consistency Dev",
    "Packet Rate (pkts/s)",
    "Request Frequency (req/s)",
    "Response Latency (ms)",
    "Auth Failure Indicator",
    "Command Frequency (cmd/m)",
    "Data Integrity Score",
    "Traffic Intensity Index",
    "Session Duration (min)",
    "OCPP Protocol Type",
    "Station Load Factor"
]

# Severity definitions
SEVERITY_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]

# Honest Disclosure Label
EVALUATION_DISCLOSURE = "Prototype evaluation on synthetic dataset"
SYSTEM_MODE_LABEL = "Prototype / Simulated Data"

