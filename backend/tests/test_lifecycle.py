import csv
import io
import json
import pytest
from pathlib import Path
from fastapi.testclient import TestClient

from app.main import app
from app.routers.survey import JOBS, STORAGE_BASE


def test_full_survey_lifecycle(test_client: TestClient, sample_sonar_bytes: bytes):
    """
    Test end-to-end lifecycle:
    1. Upload sonar scan + metadata -> 201 Created
    2. Dispatch async analyze -> 202 Accepted
    3. Status check -> COMPLETED (100%)
    4. Fetch detections -> SurveyReport matching contract
    5. Download report.json -> Structured JSON
    6. Download report.csv -> Tabular CSV
    7. Disk persistence verification -> storage/{survey_id}/report.json exists
    """
    # 1. Upload
    metadata = {
        "sonar_altitude_m": 6.5,
        "meters_per_pixel": 0.05,
        "anchor_start": {"lat": 13.0827, "lon": 80.2707},
        "anchor_end": {"lat": 13.0900, "lon": 80.2750}
    }
    upload_resp = test_client.post(
        "/survey/upload",
        files={"file": ("mission_scan_01.png", sample_sonar_bytes, "image/png")},
        data={"metadata": json.dumps(metadata)}
    )
    assert upload_resp.status_code == 201
    upload_data = upload_resp.json()
    survey_id = upload_data["survey_id"]
    assert survey_id.startswith("SUR-")
    assert upload_data["status"] == "INGESTION"

    # 2. Async Analyze
    analyze_resp = test_client.post(f"/survey/{survey_id}/analyze")
    assert analyze_resp.status_code == 202
    analyze_data = analyze_resp.json()
    assert analyze_data["survey_id"] == survey_id
    assert analyze_data["status"] in ["PROCESSING", "COMPLETED"]

    # 3. Status Poll
    status_resp = test_client.get(f"/survey/{survey_id}/status")
    assert status_resp.status_code == 200
    status_data = status_resp.json()
    assert status_data["survey_id"] == survey_id
    assert status_data["stage"] == "COMPLETED"
    assert status_data["progress_pct"] == 100
    assert status_data["error"] is None

    # 4. Fetch Detections
    det_resp = test_client.get(f"/survey/{survey_id}/detections")
    assert det_resp.status_code == 200
    report = det_resp.json()
    assert report["survey_id"] == survey_id
    assert report["processing_stage"] == "COMPLETED"
    assert "detections" in report
    assert isinstance(report["detections"], list)

    # 5. Download report.json
    json_resp = test_client.get(f"/survey/{survey_id}/report.json")
    assert json_resp.status_code == 200
    assert json_resp.headers["content-type"].startswith("application/json")
    report_json = json_resp.json()
    assert report_json["survey_id"] == survey_id
    assert "generated_at" in report_json

    # 6. Download report.csv
    csv_resp = test_client.get(f"/survey/{survey_id}/report.csv")
    assert csv_resp.status_code == 200
    assert csv_resp.headers["content-type"].startswith("text/csv")
    assert f'filename="report_{survey_id}.csv"' in csv_resp.headers["content-disposition"]
    
    # Verify CSV structure
    csv_text = csv_resp.text
    reader = csv.reader(io.StringIO(csv_text))
    headers = next(reader)
    assert "detection_id" in headers
    assert "class_name" in headers
    assert "confidence_pct" in headers
    assert "lat" in headers
    assert "lon" in headers
    assert "risk" in headers
    assert "height_m" in headers

    # 7. Check physical disk persistence
    persisted_file = STORAGE_BASE / survey_id / "report.json"
    assert persisted_file.exists()
    persisted_content = json.loads(persisted_file.read_text(encoding="utf-8"))
    assert persisted_content["survey_id"] == survey_id


def test_report_404_unknown_survey(test_client: TestClient):
    """Unknown survey returns 404 for status, detections, report.json, and report.csv."""
    fake_id = "SUR-NONEXISTENT"
    assert test_client.get(f"/survey/{fake_id}/status").status_code == 404
    assert test_client.get(f"/survey/{fake_id}/detections").status_code == 404
    assert test_client.get(f"/survey/{fake_id}/report.json").status_code == 404
    assert test_client.get(f"/survey/{fake_id}/report.csv").status_code == 404


def test_report_before_analysis_400(test_client: TestClient, sample_sonar_bytes: bytes):
    """Uploading without analyzing should return 400 when attempting to fetch completed reports."""
    upload_resp = test_client.post(
        "/survey/upload",
        files={"file": ("unprocessed.png", sample_sonar_bytes, "image/png")}
    )
    survey_id = upload_resp.json()["survey_id"]

    # Before analyze is called, detections, report.json, report.csv should return 400
    assert test_client.get(f"/survey/{survey_id}/detections").status_code == 400
    assert test_client.get(f"/survey/{survey_id}/report.json").status_code == 400
    assert test_client.get(f"/survey/{survey_id}/report.csv").status_code == 400


def test_persistence_disk_fallback(test_client: TestClient, sample_sonar_bytes: bytes):
    """If memory cache is cleared, disk report.json seamlessly re-hydrates on demand."""
    upload_resp = test_client.post(
        "/survey/upload",
        files={"file": ("persist_test.png", sample_sonar_bytes, "image/png")}
    )
    survey_id = upload_resp.json()["survey_id"]
    test_client.post(f"/survey/{survey_id}/analyze")

    # Clear in-memory JOBS
    assert survey_id in JOBS
    del JOBS[survey_id]

    # Status, detections, and reports should reload automatically from disk
    status_resp = test_client.get(f"/survey/{survey_id}/status")
    assert status_resp.status_code == 200
    assert status_resp.json()["stage"] == "COMPLETED"

    json_resp = test_client.get(f"/survey/{survey_id}/report.json")
    assert json_resp.status_code == 200
    assert json_resp.json()["survey_id"] == survey_id

    csv_resp = test_client.get(f"/survey/{survey_id}/report.csv")
    assert csv_resp.status_code == 200
    assert "class_name" in csv_resp.text


def test_health_check_endpoint(test_client: TestClient):
    """Health check confirms service status and active job registry."""
    resp = test_client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["service"] == "sonar-ai-backend"
    assert "active_jobs_count" in data
