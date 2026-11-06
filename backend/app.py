"""
FastAPI Application Entrypoint for
Transformer-Based EV Charging Cyber Attack Detection Prototype
"""

import os
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse

from backend.config import STATIC_DIR, TEMPLATES_DIR, EVALUATION_DISCLOSURE, SYSTEM_MODE_LABEL
from backend import database
from backend.routes import telemetry, stations, alerts, logs, model_view, analytics
from backend.pipeline.inference import get_inference_pipeline
from backend.pipeline.data_generator import EVDataGenerator


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Initialize SQLite Database
    print("[Startup] Initializing SQLite database schema...")
    database.init_db()

    # 2. Seed initial telemetry events if empty so dashboard is immediately active
    conn = database.get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) as count FROM telemetry_records")
    count = cursor.fetchone()["count"]
    conn.close()

    if count == 0:
        print("[Startup] Pre-populating baseline EV charging telemetry & initial demo alerts...")
        generator = EVDataGenerator(seed=101)
        pipeline = get_inference_pipeline()
        # Seed 20 baseline records (15 normal, 1 DoS, 1 Data Tampering, 1 Unauthorized, 1 Malware)
        seed_plan = (
            ["NORMAL"] * 14 +
            ["DoS ATTACK", "DATA TAMPERING", "UNAUTHORIZED ACCESS", "MALWARE ACTIVITY", "NORMAL", "NORMAL"]
        )
        for atk in seed_plan:
            rec = generator.generate_record(attack_type=atk)
            pipeline.process_telemetry(rec, persist=True)
        print(f"[Startup] Successfully seeded {len(seed_plan)} initial telemetry records.")
    else:
        print(f"[Startup] Database already contains {count} telemetry records.")

    # 3. Ensure inference pipeline is ready
    pipeline = get_inference_pipeline()
    pipeline.ensure_ready()
    print("[Startup] AI Transformer Inference Engine is ONLINE.")

    yield
    print("[Shutdown] Cleaning up resources...")


app = FastAPI(
    title="Transformer-Based EV Charging Cyber Attack Detection",
    description="AI-Powered Security Monitoring for Electric Vehicle Infrastructure (Prototype)",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware configured for production & cross-origin access
cors_origins_env = os.getenv("CORS_ORIGINS", "*")
allowed_origins = [orig.strip() for orig in cors_origins_env.split(",") if orig.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if "*" not in allowed_origins else ["*"],
    allow_origin_regex=r"^https?://.*" if "*" in allowed_origins else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Static Files and Templates
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))

# Register API Routers
app.include_router(telemetry.router)
app.include_router(stations.router)
app.include_router(alerts.router)
app.include_router(logs.router)
app.include_router(model_view.router)
app.include_router(analytics.router)


@app.get("/")
async def serve_index(request: Request):
    """Serve Main Cybersecurity Dashboard SPA."""
    api_url = os.getenv("API_URL", "").strip()
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={"api_base_url": api_url}
    )


@app.get("/api/status")
async def get_system_status():
    """System health check and mode disclosure."""
    pipeline = get_inference_pipeline()
    return {
        "status": "ONLINE",
        "ai_engine": "ONLINE",
        "model_loaded": pipeline.model is not None,
        "mode": SYSTEM_MODE_LABEL,
        "evaluation_disclosure": EVALUATION_DISCLOSURE,
        "supported_attacks": [
            "DoS ATTACK",
            "DATA TAMPERING",
            "UNAUTHORIZED ACCESS",
            "MALWARE ACTIVITY"
        ]
    }
