"""
End-to-End System Integration Test
Starts server in thread, tests all REST endpoints, simulations, alerts, and DB persistence.
"""

import os
import sys
import time
import json
import threading
import urllib.request
import urllib.parse
from pathlib import Path

# Add project root to path
PROJECT_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(PROJECT_ROOT))


def is_server_listening(url):
    try:
        req = urllib.request.Request(f"{url}/api/status", headers={"User-Agent": "HealthCheck/1.0"})
        with urllib.request.urlopen(req, timeout=3) as resp:
            return resp.status == 200
    except Exception:
        return False


def run_server():
    import uvicorn
    from backend.app import app
    config = uvicorn.Config(app, host="127.0.0.1", port=8000, log_level="warning")
    server = uvicorn.Server(config)
    server.run()


def test_pipeline(target_url=None):
    if target_url:
        base_url = target_url.rstrip("/")
    elif os.getenv("TEST_BASE_URL"):
        base_url = os.getenv("TEST_BASE_URL").rstrip("/")
    elif os.getenv("PUBLIC_URL"):
        base_url = os.getenv("PUBLIC_URL").rstrip("/")
    else:
        base_url = "http://127.0.0.1:8000"

    print("=" * 60)
    print(f"Testing EV Charging Cyber Attack Detection at: {base_url}")
    print("=" * 60)

    # Check if target is already running
    if not is_server_listening(base_url) and ("127.0.0.1" in base_url or "localhost" in base_url):
        print("Launching local test server in background thread...")
        server_thread = threading.Thread(target=run_server, daemon=True)
        server_thread.start()
        time.sleep(3)  # Give time to bind
    else:
        print(f"Target server at {base_url} is active and ready.")

    # 1. Test Root HTML
    print("\n[1/6] Testing GET / (Root HTML)...")
    with urllib.request.urlopen(f"{base_url}/") as response:
        assert response.status == 200
        html = response.read().decode("utf-8")
        assert "transformer-based ev charging" in html.lower()
        print(" Root HTML served successfully (200 OK)")

    # 2. Test /api/status
    print("\n[2/6] Testing GET /api/status...")
    with urllib.request.urlopen(f"{base_url}/api/status") as response:
        assert response.status == 200
        data = json.loads(response.read().decode("utf-8"))
        print(f" Status: {data.get('status')} | AI Engine: {data.get('ai_engine')} | Mode: {data.get('mode')}")
        assert data.get("status") == "ONLINE"

    # 3. Test Attack Simulations for all 4 attack types + Normal
    print("\n[3/6] Testing POST /api/telemetry/simulate for all attack categories...")
    test_attacks = [
        "NORMAL",
        "DoS ATTACK",
        "DATA TAMPERING",
        "UNAUTHORIZED ACCESS",
        "MALWARE ACTIVITY"
    ]

    for atk in test_attacks:
        url = f"{base_url}/api/telemetry/simulate?attack_type={urllib.parse.quote(atk)}&station_id=EV-CS-04"
        req = urllib.request.Request(url, data=b"", method="POST")
        with urllib.request.urlopen(req) as response:
            assert response.status == 200
            res_json = json.loads(response.read().decode("utf-8"))
            data = res_json.get("data", {})
            pred = data.get("prediction")
            conf = data.get("confidence")
            sev = data.get("severity")
            print(f" Simulated [{atk}] -> Predicted: {pred} | Confidence: {conf}% | Severity: {sev}")
            assert pred == atk, f"Expected {atk}, got {pred}"

    # 4. Test Analytics Overview
    print("\n[4/6] Testing GET /api/analytics/overview...")
    with urllib.request.urlopen(f"{base_url}/api/analytics/overview") as response:
        assert response.status == 200
        res = json.loads(response.read().decode("utf-8"))
        kpis = res["data"]["kpis"]
        print(f" Total Stations: {kpis['total_stations']} | Total Events: {kpis['network_events']} | Threats: {kpis['threats_detected']}")
        assert kpis["threats_detected"] > 0

    # 5. Test Alerts List
    print("\n[5/6] Testing GET /api/alerts...")
    with urllib.request.urlopen(f"{base_url}/api/alerts?limit=5") as response:
        assert response.status == 200
        res = json.loads(response.read().decode("utf-8"))
        alerts = res["data"]
        print(f" Fetched {len(alerts)} alerts. Latest Alert ID: {alerts[0]['id']} | Type: {alerts[0]['detected_attack_type']} | Severity: {alerts[0]['severity']}")
        assert len(alerts) > 0

    # 6. Test Model Info
    print("\n[6/6] Testing GET /api/model/info...")
    with urllib.request.urlopen(f"{base_url}/api/model/info") as response:
        assert response.status == 200
        res = json.loads(response.read().decode("utf-8"))
        model_data = res["data"]
        print(f" Model: {model_data['model_name']} | Accuracy: {model_data['overall_metrics']['accuracy']}%")
        print(f" Disclosure: {model_data['evaluation_mode']}")
        assert model_data["overall_metrics"]["accuracy"] >= 95.0

    print("\n" + "=" * 60)
    print(" ALL END-TO-END PIPELINE INTEGRATION TESTS PASSED (100% SUCCESS)!")
    print("=" * 60)


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else None
    test_pipeline(target)
