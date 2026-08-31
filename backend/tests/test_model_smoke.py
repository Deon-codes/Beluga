import os
import tempfile
from pathlib import Path
import numpy as np
from PIL import Image
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.schemas import DetectionResult, SurveyReport, JobStatus
from app.pipeline.detect import get_class_names, get_model, run_detection

client = TestClient(app)

EXPECTED_CLASSES = [
    "Pipeline", "Aircraft", "Fish", "Other", "Shipwreck",
    "MILCO", "NOMBO", "Tire", "Bottle", "Drink-carton",
    "Chain", "Can", "Valve", "Propeller", "Hook",
    "Shampoo-bottle", "Standing-bottle"
]

@pytest.fixture(scope="session")
def sample_image_path(tmp_path_factory):
    """Provide a real test scan or create a synthetic test image if not present."""
    fixtures_dir = Path(__file__).parent / "fixtures"
    sample_file = fixtures_dir / "sample_sonar.png"
    
    if sample_file.exists():
        return str(sample_file)
        
    # Generate synthetic 640x480 sonar-like test image
    temp_dir = tmp_path_factory.mktemp("sonar_data")
    temp_image_file = temp_dir / "synthetic_sonar.png"
    
    # Create grayscale noise resembling raw sonar acoustic return
    arr = np.random.randint(20, 180, (480, 640), dtype=np.uint8)
    img = Image.fromarray(arr)
    img.save(str(temp_image_file))
    
    return str(temp_image_file)

def test_class_names_match_spec():
    """Verify that the model checkpoint exposes all 17 target marine classes."""
    class_names = get_class_names()
    assert len(class_names) == 17, f"Expected 17 classes, got {len(class_names)}: {class_names}"
    assert class_names == EXPECTED_CLASSES, f"Class names mismatch: {class_names}"

def test_inference_execution_no_crash(sample_image_path):
    """Ensure YOLO detection executes on an image without exception."""
    results = run_detection(sample_image_path, conf=0.25)
    assert isinstance(results, list)
    for det in results:
        assert isinstance(det, DetectionResult)
        assert det.class_name in EXPECTED_CLASSES
        assert det.confidence_pct >= 0.0 and det.confidence_pct <= 100.0

def test_api_health():
    """Test the /health endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["model_loaded"] is True

def test_api_survey_lifecycle(sample_image_path):
    """Test complete upload -> analyze -> status round-trip via FastAPI test client."""
    # 1. Upload
    with open(sample_image_path, "rb") as f:
        response = client.post(
            "/survey/upload",
            files={"file": ("test_sonar.png", f, "image/png")},
            data={"metadata": '{"meters_per_pixel": 0.05, "sonar_altitude_m": 12.0}'}
        )
    assert response.status_code == 201
    upload_data = response.json()
    assert "survey_id" in upload_data
    survey_id = upload_data["survey_id"]
    assert upload_data["status"] == "INGESTION"

    # 2. Status before analysis
    status_resp = client.get(f"/survey/{survey_id}/status")
    assert status_resp.status_code == 200
    assert status_resp.json()["stage"] == "INGESTION"

    # 3. Analyze (Async BackgroundTasks returns 202)
    analyze_resp = client.post(f"/survey/{survey_id}/analyze")
    assert analyze_resp.status_code == 202
    analyze_data = analyze_resp.json()
    assert analyze_data["survey_id"] == survey_id
    assert analyze_data["status"] in ["PROCESSING", "COMPLETED"]

    # 4. Status after analysis
    status_resp2 = client.get(f"/survey/{survey_id}/status")
    assert status_resp2.status_code == 200
    assert status_resp2.json()["stage"] == "COMPLETED"

    # 5. Detections query
    det_resp = client.get(f"/survey/{survey_id}/detections")
    assert det_resp.status_code == 200
    assert det_resp.json()["survey_id"] == survey_id
