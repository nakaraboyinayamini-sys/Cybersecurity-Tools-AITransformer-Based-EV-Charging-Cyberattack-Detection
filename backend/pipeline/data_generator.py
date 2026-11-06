"""
Realistic Synthetic EV Charging Telemetry and Attack Pattern Generator
Academic Prototype: Safe synthetic generation only - no real attacks or malware.
"""

import random
import time
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np

from backend.config import (
    STATIONS,
    ATTACK_CLASSES,
    CLASS_TO_CODE,
    PROTOCOL_MESSAGE_TYPES,
    NOMINAL_VOLTAGE_AC,
    NOMINAL_VOLTAGE_DC
)


class EVDataGenerator:
    """Generates synthetic EV charging telemetry records and attack patterns."""

    def __init__(self, seed: Optional[int] = 42):
        if seed is not None:
            random.seed(seed)
            np.random.seed(seed)
        self.station_ids = [s["id"] for s in STATIONS]
        self.ev_pool = [f"EV-{random.randint(1000, 9999)}" for _ in range(50)]
        self.normal_ips = [f"192.168.10.{i}" for i in range(10, 40)]
        self.rogue_ips = [f"10.0.{random.randint(50, 99)}.{random.randint(100, 250)}" for _ in range(10)]

    def generate_record(
        self,
        attack_type: Optional[str] = None,
        station_id: Optional[str] = None,
        timestamp: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate a single EV charging telemetry record."""
        if attack_type is None:
            # 60% Normal, 10% each attack for natural simulation distribution
            attack_type = random.choices(
                ATTACK_CLASSES,
                weights=[0.60, 0.10, 0.10, 0.10, 0.10],
                k=1
            )[0]

        if station_id is None:
            station_id = random.choice(self.station_ids)

        # Determine station type (AC or DC)
        st_meta = next((s for s in STATIONS if s["id"] == station_id), STATIONS[0])
        is_dc = "DC" in st_meta["type"]

        ev_id = random.choice(self.ev_pool)
        session_id = f"SES-{random.randint(10000, 99990)}"
        if timestamp is None:
            timestamp = datetime.now(timezone.utc).isoformat()

        charging_duration = round(random.uniform(5.0, 90.0), 1)

        # Baseline Physics & Network
        if is_dc:
            nominal_v = NOMINAL_VOLTAGE_DC
            current = round(random.uniform(60.0, 150.0), 1)
            power = round((nominal_v * current * 0.98) / 1000.0, 2)
        else:
            nominal_v = NOMINAL_VOLTAGE_AC
            current = round(random.uniform(16.0, 32.0), 1)
            power = round((nominal_v * current * 0.95) / 1000.0, 2)

        # Energy roughly Power * (Duration / 60)
        expected_energy = round(power * (charging_duration / 60.0), 2)
        energy_consumed = expected_energy

        # Base network values
        voltage = round(nominal_v + random.uniform(-3.5, 3.5), 1)
        packet_count = int(charging_duration * random.uniform(10, 30))
        request_frequency = round(random.uniform(0.8, 3.5), 2)
        response_time = round(random.uniform(22.0, 52.0), 1)
        authentication_status = 1
        command_frequency = round(random.uniform(1.0, 5.0), 1)
        data_integrity_score = round(random.uniform(0.96, 0.999), 3)
        ip_device = random.choice(self.normal_ips)
        protocol_message = random.choice([
            "OCPP_MeterValues",
            "OCPP_StatusNotification",
            "OCPP_Heartbeat",
            "OCPP_Authorize"
        ])
        session_status = "Charging"

        # Inject Synthetic Attack Patterns according to attack_type
        if attack_type == "DoS ATTACK":
            # High traffic spike, latency surge, massive packet count, high RPS
            request_frequency = round(random.uniform(180.0, 580.0), 2)
            packet_count = int(packet_count * random.uniform(25, 80)) + random.randint(12000, 45000)
            response_time = round(random.uniform(280.0, 850.0), 1)
            command_frequency = round(random.uniform(25.0, 85.0), 1)
            data_integrity_score = round(random.uniform(0.82, 0.94), 3)
            protocol_message = "OCPP_Heartbeat"  # Rapid heartbeat or meter flooding
            session_status = "Suspended"

        elif attack_type == "DATA TAMPERING":
            # Electrical telemetry mismatch, corrupted energy records, checksum drop
            tamper_mode = random.choice(["energy_skew", "voltage_spoof", "power_mismatch"])
            if tamper_mode == "energy_skew":
                energy_consumed = round(expected_energy * random.choice([0.15, 3.8]), 2)
            elif tamper_mode == "voltage_spoof":
                voltage = round(nominal_v * random.choice([0.65, 1.55]), 1)
            else:
                power = round(power * 4.5, 2)  # Inconsistent with V * I

            data_integrity_score = round(random.uniform(0.35, 0.72), 3)
            protocol_message = "OCPP_MeterValues"
            # Slight network lag due to packet manipulation/MITM proxy
            response_time = round(random.uniform(65.0, 140.0), 1)

        elif attack_type == "UNAUTHORIZED ACCESS":
            # Repeated failed authentication, rogue device ID / IP, unauthorized tokens
            authentication_status = 0
            ip_device = random.choice(self.rogue_ips)
            protocol_message = "OCPP_Authorize"
            session_status = "Handshake_Failed"
            request_frequency = round(random.uniform(12.0, 35.0), 2)  # credential stuffing
            command_frequency = round(random.uniform(8.0, 22.0), 1)
            data_integrity_score = round(random.uniform(0.70, 0.88), 3)

        elif attack_type == "MALWARE ACTIVITY":
            # Suspicious command sequence, out-of-order firmware update or remote relay tripping
            command_frequency = round(random.uniform(45.0, 140.0), 1)
            protocol_message = random.choice([
                "OCPP_FirmwareUpdate",
                "OCPP_RemoteStartTransaction",
                "OCPP_StatusNotification"
            ])
            data_integrity_score = round(random.uniform(0.60, 0.84), 3)
            response_time = round(random.uniform(90.0, 220.0), 1)
            request_frequency = round(random.uniform(8.0, 28.0), 2)
            # Unusual power fluctuation or relay flutter
            power = round(power * random.uniform(0.4, 1.3), 2)
            session_status = random.choice(["Fault", "Active", "Suspended"])

        return {
            "timestamp": timestamp,
            "charging_station_id": station_id,
            "ev_id": ev_id,
            "session_id": session_id,
            "voltage": float(voltage),
            "current": float(current),
            "power": float(power),
            "energy_consumed": float(energy_consumed),
            "charging_duration": float(charging_duration),
            "network_packet_count": int(packet_count),
            "request_frequency": float(request_frequency),
            "response_time": float(response_time),
            "authentication_status": int(authentication_status),
            "command_frequency": float(command_frequency),
            "data_integrity_score": float(data_integrity_score),
            "ip_device_identifier": ip_device,
            "protocol_message_type": protocol_message,
            "session_status": session_status,
            "attack_label": attack_type,
            "label_idx": CLASS_TO_CODE[attack_type]
        }

    def generate_dataset(self, n_samples: int = 4000) -> pd.DataFrame:
        """Generate balanced synthetic training/test dataset."""
        samples_per_class = n_samples // len(ATTACK_CLASSES)
        records = []
        base_time = datetime.now(timezone.utc) - timedelta(days=7)

        for class_idx, attack_class in enumerate(ATTACK_CLASSES):
            for i in range(samples_per_class):
                dt = base_time + timedelta(minutes=(class_idx * samples_per_class + i) * 2.5)
                rec = self.generate_record(attack_type=attack_class, timestamp=dt.isoformat())
                records.append(rec)

        # Shuffle
        random.shuffle(records)
        df = pd.DataFrame(records)
        return df


if __name__ == "__main__":
    generator = EVDataGenerator(seed=42)
    sample = generator.generate_record("DoS ATTACK")
    print("Sample DoS record:", sample)

