"""
Feature Extraction and Data Preprocessing Pipeline for EV Telemetry
"""

import pickle
from typing import Dict, Any, List, Union
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler

from backend.config import (
    FEATURE_COLUMNS,
    PROTOCOL_MESSAGE_TYPES,
    NOMINAL_VOLTAGE_AC,
    NOMINAL_VOLTAGE_DC,
    WEIGHTS_DIR
)

SCALER_PATH = WEIGHTS_DIR / "scaler.pkl"


class EVFeatureExtractor:
    """Extracts cybersecurity and physical electrical features from raw EV telemetry."""

    def __init__(self):
        self.scaler = None
        self.protocol_map = {proto: idx for idx, proto in enumerate(PROTOCOL_MESSAGE_TYPES)}

    def extract_features_single(self, record: Dict[str, Any]) -> Dict[str, float]:
        """Extract the 16 features from a single raw telemetry dictionary."""
        # Detect AC vs DC nominal voltage based on station type or raw voltage reading
        v_raw = float(record.get("voltage", 230.0))
        nominal_v = NOMINAL_VOLTAGE_DC if v_raw > 300.0 else NOMINAL_VOLTAGE_AC

        current = float(record.get("current", 32.0))
        power = float(record.get("power", 7.4))
        energy = float(record.get("energy_consumed", 15.0))
        duration = max(1.0, float(record.get("charging_duration", 30.0)))
        packets = float(record.get("network_packet_count", 150))
        req_freq = float(record.get("request_frequency", 2.0))
        resp_time = float(record.get("response_time", 40.0))
        auth_status = int(record.get("authentication_status", 1))
        cmd_freq = float(record.get("command_frequency", 5.0))
        integrity = float(record.get("data_integrity_score", 0.98))
        proto = record.get("protocol_message_type", "OCPP_MeterValues")

        # 1. Voltage deviation: |V - V_nominal| / V_nominal
        voltage_dev = abs(v_raw - nominal_v) / nominal_v

        # 2. Energy consistency deviation: |(Power * Duration/60) - Energy| / (Energy + 1e-3)
        expected_energy = power * (duration / 60.0)
        energy_rate_dev = abs(expected_energy - energy) / (max(energy, expected_energy) + 0.1)

        # 3. Packet rate (packets/sec approx across duration)
        packet_rate = packets / (duration * 60.0 + 1.0)

        # 4. Auth failure indicator
        auth_fail_rate = 1.0 if auth_status == 0 else 0.0

        # 5. Composite traffic intensity
        traffic_intensity = (req_freq / 25.0) + (resp_time / 250.0) + (packet_rate / 15.0)

        # 6. Station load factor (assuming 150 kW max rating)
        station_load_factor = min(1.5, power / 150.0)

        # 7. Protocol index
        proto_idx = float(self.protocol_map.get(proto, 0))

        # Normalized representations of basic measurements
        norm_voltage = v_raw / 450.0
        norm_current = current / 200.0
        norm_power = power / 150.0
        norm_energy = energy / 100.0

        features = {
            "norm_voltage": float(norm_voltage),
            "norm_current": float(norm_current),
            "norm_power": float(norm_power),
            "norm_energy": float(norm_energy),
            "voltage_dev": float(voltage_dev),
            "energy_rate_dev": float(energy_rate_dev),
            "packet_rate": float(packet_rate),
            "request_freq": float(req_freq),
            "response_time_ms": float(resp_time),
            "auth_fail_rate": float(auth_fail_rate),
            "command_freq": float(cmd_freq),
            "integrity_score": float(integrity),
            "traffic_intensity": float(traffic_intensity),
            "session_duration": float(duration),
            "protocol_type_idx": float(proto_idx),
            "station_load_factor": float(station_load_factor)
        }
        return features

    def extract_features_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        """Extract features from an entire dataframe."""
        feature_rows = []
        for _, row in df.iterrows():
            feat = self.extract_features_single(row.to_dict())
            feature_rows.append(feat)
        return pd.DataFrame(feature_rows)[FEATURE_COLUMNS]

    def fit_scaler(self, feature_df: pd.DataFrame):
        """Fit standard scaler and persist it."""
        self.scaler = StandardScaler()
        self.scaler.fit(feature_df[FEATURE_COLUMNS].values)
        with open(SCALER_PATH, "wb") as f:
            pickle.dump(self.scaler, f)

    def load_scaler(self):
        """Load fitted scaler from disk."""
        if SCALER_PATH.exists():
            with open(SCALER_PATH, "rb") as f:
                self.scaler = pickle.load(f)
        else:
            self.scaler = None

    def transform(self, feature_matrix: Union[np.ndarray, pd.DataFrame]) -> np.ndarray:
        """Standardize feature matrix."""
        if self.scaler is None:
            self.load_scaler()
        if self.scaler is not None:
            if isinstance(feature_matrix, pd.DataFrame):
                return self.scaler.transform(feature_matrix[FEATURE_COLUMNS].values)
            return self.scaler.transform(feature_matrix)
        else:
            # Fallback simple standardizer
            if isinstance(feature_matrix, pd.DataFrame):
                vals = feature_matrix[FEATURE_COLUMNS].values
            else:
                vals = np.array(feature_matrix)
            return (vals - np.mean(vals, axis=0)) / (np.std(vals, axis=0) + 1e-6)

