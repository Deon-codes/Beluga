import pytest
from fastapi.testclient import TestClient
import json
import time

import sys
from pathlib import Path

# Add backend directory to path so it can import app
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

try:
    from app.main import app
except ImportError as e:
    print(f"Skipping FastAPI test import due to missing deps: {e}")
    app = None

@pytest.fixture
def client():
    if app is None:
        pytest.skip("FastAPI not available")
    return TestClient(app)

def test_full_pipeline(client, tmp_path):
    if client is None:
        return
        
    # Mock image file
    test_img_path = tmp_path / "test.jpg"
    test_img_path.write_bytes(b"\x00\x01\x02") # fake image

    # 1. Upload Survey
    with open(test_img_path, "rb") as f:
        res_upload = client.post("/survey/upload", files={"file": f})
        
    assert res_upload.status_code == 200, f"Upload failed: {res_upload.text}"
    survey_data = res_upload.json()
    assert "survey_id" in survey_data
    survey_id = survey_data["survey_id"]

    # 2. Analyze Survey (Start Pipeline)
    nav_data = {
        "timestamp": "2026-08-31T10:00:00Z",
        "lat": 15.2993,
        "lon": 73.9691,
        "depth": 14.2,
        "speed_knots": 4.1
    }
    res_analyze = client.post(
        f"/survey/{survey_id}/analyze", 
        data={"nav_metadata": json.dumps(nav_data)}
    )
    assert res_analyze.status_code == 200, f"Analyze start failed: {res_analyze.text}"

    # 3. Poll Stepper Status
    max_retries = 20
    is_completed = False
    for _ in range(max_retries):
        res_status = client.get(f"/survey/{survey_id}/status")
        assert res_status.status_code == 200
        status_data = res_status.json()
        
        if status_data["stage"] == "COMPLETED":
            is_completed = True
            break
        elif status_data["stage"] == "FAILED":
            pytest.fail("Pipeline failed during processing")
            
        time.sleep(0.5)

    assert is_completed, "Pipeline timed out"

    # 4. Canvas Bounding Boxes (Detections)
    res_det = client.get(f"/survey/{survey_id}/detections")
    assert res_det.status_code == 200
    det_data = res_det.json()
    assert "detections" in det_data

    # 5. Geotags & CSV/JSON Export
    res_report_json = client.get(f"/survey/{survey_id}/report.json")
    assert res_report_json.status_code == 200
    report_json = res_report_json.json()
    assert report_json["survey_id"] == survey_id
    
    res_report_csv = client.get(f"/survey/{survey_id}/report.csv")
    assert res_report_csv.status_code == 200
    assert "text/csv" in res_report_csv.headers.get("content-type", "")

