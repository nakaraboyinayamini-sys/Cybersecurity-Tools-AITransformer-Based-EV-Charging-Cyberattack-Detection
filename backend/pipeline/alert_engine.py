"""
Intrusion Alert Engine for EV Charging Cyber Defense
Computes dynamic severity, explanatory feature rationale, and tactical mitigation responses.
"""

import random
from datetime import datetime, timezone
from typing import Dict, Any, List, Tuple
from backend.config import SEVERITY_LEVELS


class AlertEngine:
    """Evaluates cyber anomalies and generates actionable intrusion alerts."""

    @staticmethod
    def generate_alert_id() -> str:
        num = random.randint(1000, 9999)
        return f"ALT-2026-{num}"

    @staticmethod
    def evaluate(
        prediction: str,
        confidence: float,
        station_id: str,
        telemetry: Dict[str, Any],
        attention_weights: Dict[str, float]
    ) -> Tuple[str, str, str]:
        """
        Calculates:
        - Severity (LOW, MEDIUM, HIGH, CRITICAL)
        - Triggered Features narrative
        - Recommended Incident Response
        """
        req_freq = float(telemetry.get("request_frequency", 2.0))
        resp_time = float(telemetry.get("response_time", 40.0))
        integrity = float(telemetry.get("data_integrity_score", 0.98))
        auth_status = int(telemetry.get("authentication_status", 1))
        cmd_freq = float(telemetry.get("command_frequency", 5.0))
        proto = telemetry.get("protocol_message_type", "OCPP_MeterValues")
        voltage = float(telemetry.get("voltage", 230.0))

        # Severity determination
        if prediction == "DoS ATTACK":
            if req_freq > 200.0 or resp_time > 400.0 or confidence >= 90.0:
                severity = "CRITICAL"
            elif req_freq > 80.0 or resp_time > 200.0:
                severity = "HIGH"
            else:
                severity = "MEDIUM"

            triggered = (
                f"Abnormal traffic rate ({req_freq:.1f} req/s) + "
                f"packet surge + elevated response latency ({resp_time:.1f} ms)"
            )
            response = (
                "Deploy dynamic rate-limiting on station ingress port; "
                "isolate station OCPP WebSocket connection; throttle IP subnet at gateway."
            )

        elif prediction == "DATA TAMPERING":
            if integrity < 0.60 or confidence >= 90.0:
                severity = "HIGH"
            elif integrity < 0.80:
                severity = "MEDIUM"
            else:
                severity = "LOW"

            triggered = (
                f"Electrical telemetry violation (Integrity Score: {integrity:.3f}, "
                f"Voltage: {voltage:.1f}V) - power/energy conservation mismatch"
            )
            response = (
                "Lock EV contactor relay to prevent over-current hazard; "
                "reject signed meter values; request hardware re-calibration and HMAC re-signing."
            )

        elif prediction == "UNAUTHORIZED ACCESS":
            if auth_status == 0 and confidence >= 85.0:
                severity = "HIGH"
            else:
                severity = "MEDIUM"

            triggered = (
                f"Authentication handshake failure (Status: {auth_status}) + "
                f"unrecognized device ID ({telemetry.get('ip_device_identifier', 'Unknown')}) "
                f"via {proto}"
            )
            response = (
                "Revoke session RFID / OCPP authorization token; "
                "block device MAC/IP identifier in firewall; alert physical campus security."
            )

        elif prediction == "MALWARE ACTIVITY":
            if cmd_freq > 50.0 or confidence >= 90.0:
                severity = "CRITICAL"
            else:
                severity = "HIGH"

            triggered = (
                f"Anomalous command sequence ({cmd_freq:.1f} cmds/min) + "
                f"unexpected {proto} invocation outside established charging cycle"
            )
            response = (
                "Trigger station firmware safe-mode reboot; "
                "sever cloud management socket; initiate cryptographic firmware integrity audit."
            )

        else: # NORMAL
            severity = "LOW"
            triggered = "Nominal electrical and network parameters within safe operational bounds."
            response = "Continuous routine background monitoring."

        return severity, triggered, response

    @classmethod
    def create_alert(
        cls,
        prediction: str,
        confidence: float,
        station_id: str,
        telemetry: Dict[str, Any],
        attention_weights: Dict[str, float]
    ) -> Dict[str, Any]:
        """Creates complete Intrusion Alert structure."""
        alert_id = cls.generate_alert_id()
        severity, triggered, response = cls.evaluate(
            prediction, confidence, station_id, telemetry, attention_weights
        )
        now = datetime.now(timezone.utc).isoformat()

        return {
            "id": alert_id,
            "timestamp": now,
            "station_id": station_id,
            "detected_attack_type": prediction,
            "confidence_score": round(confidence, 2),
            "severity": severity,
            "triggered_features": triggered,
            "recommended_response": response,
            "status": "ACTIVE"
        }

