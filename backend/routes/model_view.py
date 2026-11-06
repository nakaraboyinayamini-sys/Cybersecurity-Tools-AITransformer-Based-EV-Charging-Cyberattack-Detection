"""
AI Model Architecture, Evaluation Metrics, and Retraining Endpoints
"""

import json
from pathlib import Path
from fastapi import APIRouter, BackgroundTasks, HTTPException

from backend.config import WEIGHTS_DIR, EVALUATION_DISCLOSURE
from backend.models.train import train_model, METRICS_PATH
from backend.pipeline.inference import get_inference_pipeline

router = APIRouter(prefix="/api/model", tags=["model"])


@router.get("/info")
async def get_model_info():
    """Returns AI model architecture specs, confusion matrix, training curve, and feature attention."""
    if not METRICS_PATH.exists():
        raise HTTPException(status_code=404, detail="Model metrics not found. Train the model first.")

    with open(METRICS_PATH, "r") as f:
        metrics = json.load(f)

    return {
        "status": "success",
        "data": metrics
    }


@router.post("/retrain")
async def trigger_retraining(epochs: int = 15, samples: int = 3500):
    """Trigger prototype retraining on synthetic dataset."""
    metrics = train_model(n_samples=samples, epochs=epochs)
    # Reload inference pipeline
    pipeline = get_inference_pipeline()
    pipeline.model = None
    pipeline.ensure_ready()

    return {
        "status": "success",
        "message": "Transformer classifier successfully retrained on synthetic dataset.",
        "metrics": metrics
    }

