"""
Telemetry and Data Injection API Endpoints
"""

import io
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Response
from fastapi.responses import FileResponse, StreamingResponse
import pandas as pd

from backend.config import DATA_DIR, ATTACK_CLASSES, STATIONS
from backend.pipeline.data_generator import EVDataGenerator
from backend.pipeline.inference import get_inference_pipeline

router = APIRouter(prefix="/api/telemetry", tags=["telemetry"])
generator = EVDataGenerator(seed=None)  # stochastic for live simulations


@router.post("/simulate")
async def simulate_event(attack_type: Optional[str] = None, station_id: Optional[str] = None):
    """
    Simulates a single safe synthetic EV charging network telemetry event.
    Optionally specify attack_type ('NORMAL', 'DoS ATTACK', 'DATA TAMPERING', etc.)
    and station_id ('EV-CS-01', etc.).
    """
    if attack_type and attack_type.upper() != "RANDOM" and attack_type not in ATTACK_CLASSES:
        raise HTTPException(status_code=400, detail=f"Invalid attack type. Choose from {ATTACK_CLASSES}")

    chosen_attack = None if (not attack_type or attack_type.upper() == "RANDOM") else attack_type
    raw_record = generator.generate_record(attack_type=chosen_attack, station_id=station_id)

    pipeline = get_inference_pipeline()
    result = pipeline.process_telemetry(raw_record, persist=True)
    return {
        "status": "success",
        "data": result
    }


@router.post("/inject")
async def inject_custom_record(record: Dict[str, Any]):
    """
    Inject custom raw telemetry record from user or testing script.
    Processes through complete feature extraction -> Transformer -> alert pipeline.
    """
    pipeline = get_inference_pipeline()
    result = pipeline.process_telemetry(record, persist=True)
    return {
        "status": "success",
        "data": result
    }


@router.post("/upload-csv")
async def upload_csv_telemetry(file: UploadFile = File(...)):
    """
    Upload CSV dataset and process records through the Transformer inference pipeline.
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")

    contents = await file.read()
    try:
        df = pd.read_csv(io.StringIO(contents.decode("utf-8")))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")

    pipeline = get_inference_pipeline()
    processed_count = 0
    threats_detected = 0
    predictions_summary = {c: 0 for c in ATTACK_CLASSES}

    # Process up to 250 records to ensure swift web response
    records_to_process = df.head(250).to_dict(orient="records")

    for rec in records_to_process:
        # Fill missing default values if necessary
        rec.setdefault("charging_station_id", "EV-CS-01")
        rec.setdefault("voltage", 230.0)
        rec.setdefault("current", 32.0)
        rec.setdefault("power", 7.4)
        rec.setdefault("energy_consumed", 15.0)
        rec.setdefault("charging_duration", 30.0)
        rec.setdefault("network_packet_count", 200)
        rec.setdefault("request_frequency", 2.0)
        rec.setdefault("response_time", 40.0)
        rec.setdefault("authentication_status", 1)
        rec.setdefault("command_frequency", 5.0)
        rec.setdefault("data_integrity_score", 0.98)
        rec.setdefault("protocol_message_type", "OCPP_MeterValues")
        rec.setdefault("session_status", "Active")
        rec.setdefault("attack_label", "NORMAL")

        res = pipeline.process_telemetry(rec, persist=True)
        pred = res["prediction"]
        predictions_summary[pred] = predictions_summary.get(pred, 0) + 1
        if pred != "NORMAL":
            threats_detected += 1
        processed_count += 1

    return {
        "status": "success",
        "filename": file.filename,
        "processed_records": processed_count,
        "threats_detected": threats_detected,
        "breakdown": predictions_summary
    }


@router.get("/download-dataset")
async def download_synthetic_dataset():
    """Download the full 4000-sample synthetic EV charging dataset."""
    csv_path = DATA_DIR / "synthetic_ev_dataset.csv"
    if not csv_path.exists():
        # Generate on demand
        df = generator.generate_dataset(n_samples=2000)
        df.to_csv(csv_path, index=False)
    return FileResponse(
        str(csv_path),
        media_type="text/csv",
        filename="ev_charging_synthetic_cyber_dataset.csv"
    )


@router.get("/download-sample")
async def download_sample_test():
    """Download a 100-row sample CSV for demonstration upload testing."""
    csv_path = DATA_DIR / "sample_attack_test.csv"
    if not csv_path.exists():
        df = generator.generate_dataset(n_samples=100)
        df.to_csv(csv_path, index=False)
    return FileResponse(
        str(csv_path),
        media_type="text/csv",
        filename="ev_attack_sample_test.csv"
    )

