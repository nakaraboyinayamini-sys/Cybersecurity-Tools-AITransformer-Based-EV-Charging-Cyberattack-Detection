"""
EV Charging Cyber Attack Detection - Master Launcher
Starts the FastAPI server with auto-detection of trained weights.
"""

import sys
import os
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import uvicorn
from backend.config import WEIGHTS_DIR
from backend.models.train import train_model, MODEL_WEIGHTS_PATH


def main():
    print("=" * 70)
    print("  TRANSFORMER-BASED EV CHARGING CYBER ATTACK DETECTION PROTOTYPE")
    print("  AI-Powered Security Monitoring for Electric Vehicle Infrastructure")
    print("=" * 70)

    # Check if weights exist; if not, train immediately
    if not MODEL_WEIGHTS_PATH.exists():
        print("[Launcher] Pretrained model weights not detected. Training prototype model...")
        train_model(n_samples=3500, epochs=15)
    else:
        print(f"[Launcher] Found existing trained model weights at: {MODEL_WEIGHTS_PATH}")

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    public_url = os.getenv("PUBLIC_URL", "")
    print(f"\n[Launcher] Starting Uvicorn Web Server on http://{host}:{port}")
    if public_url:
        print(f"[Launcher] Public HTTPS Deployed Endpoint: {public_url}")
    print("[Launcher] Press CTRL+C to stop.\n")

    uvicorn.run("backend.app:app", host=host, port=port, reload=False, log_level="info")


if __name__ == "__main__":
    main()

