import io
import math
import pytest
from PIL import Image
from fastapi.testclient import TestClient

from app.main import app
from app.models.schemas import BoundingBox, DetectionResult, GeoPoint, SurveyMetadata
from app.pipeline.filter import apply_noise_filter, compute_iou, nms_detections
from app.pipeline.geotag import compute_bearing, geodesic_project, geotag_detections
from app.pipeline.shadow_size import compute_metric_dimensions
from app.pipeline.uncertainty import run_mc_dropout

client = TestClient(app)

def test_compute_bearing():
    # Due North: 0 deg
    bearing_n = compute_bearing(0.0, 0.0, 1.0, 0.0)
    assert abs(bearing_n - 0.0) < 1e-4

    # Due East: 90 deg
    bearing_e = compute_bearing(0.0, 0.0, 0.0, 1.0)
    assert abs(bearing_e - 90.0) < 1e-4

    # Due South: 180 deg
    bearing_s = compute_bearing(1.0, 0.0, 0.0, 0.0)
    assert abs(bearing_s - 180.0) < 1e-4

def test_geodesic_project():
    lat, lon = 13.0, 80.0
    # Project 1000m north (bearing 0)
    lat_proj, lon_proj = geodesic_project(lat, lon, 0.0, 1000.0)
    # Latitude delta for 1000m is approx 1000 / 6371000 * (180 / pi) = 0.008993 deg
    expected_delta = 1000.0 / 6371000.0 * (180.0 / math.pi)
    assert abs((lat_proj - lat) - expected_delta) < 1e-5
    assert abs(lon_proj - lon) < 1e-5

def test_geotag_dual_anchor():
    meta = SurveyMetadata(
        meters_per_pixel=0.05,
        anchor_start=GeoPoint(lat=13.0, lon=80.0),
        anchor_end=GeoPoint(lat=13.01, lon=80.0)  # Heading due north
    )

    # Box exactly in image center (nadir line, 50% along track)
    det = DetectionResult(
        class_name="Shipwreck",
        class_id=4,
        confidence_pct=95.0,
        bbox_px=BoundingBox(x1=450, y1=450, x2=550, y2=550)
    )

    geotag_detections([det], meta, image_width_px=1000, image_height_px=1000)

    assert det.location.geo_confidence == "measured"
    assert det.location.lat is not None
    assert det.location.lon is not None
    # 50% along track -> latitude halfway between 13.0 and 13.01 (13.005)
    assert abs(det.location.lat - 13.005) < 1e-4
    assert abs(det.location.lon - 80.0) < 1e-4

def test_geotag_no_anchor():
    meta = SurveyMetadata(meters_per_pixel=0.05)
    det = DetectionResult(
        class_name="Tire",
        class_id=2,
        confidence_pct=88.0,
        bbox_px=BoundingBox(x1=10, y1=10, x2=50, y2=50)
    )

    geotag_detections([det], meta, image_width_px=500, image_height_px=500)
    assert det.location.geo_confidence == "none"
    assert det.location.lat is None
    assert det.location.lon is None

def test_shadow_size_with_altitude():
    meta = SurveyMetadata(
        meters_per_pixel=0.1,
        sonar_altitude_m=5.0
    )
    # Image width 1000 -> nadir at x=500
    # Box from x1=580 to x2=620 (cx=600, width=40px, slant_range_px = 100px)
    # shadow_len = 40px, altitude = 5.0m
    # H = (40 * 5.0) / (100 + 40) = 200 / 140 = 1.429 m
    bbox = BoundingBox(x1=580, y1=100, x2=620, y2=160)
    dims = compute_metric_dimensions(bbox, meta, image_width_px=1000)

    assert dims.width_m == 4.0  # 40 * 0.1
    assert dims.length_m == 6.0 # 60 * 0.1
    assert dims.height_m is not None
    assert abs(dims.height_m - 1.429) < 0.02

def test_shadow_size_no_altitude():
    meta = SurveyMetadata(meters_per_pixel=0.05)
    bbox = BoundingBox(x1=10, y1=20, x2=50, y2=80)
    dims = compute_metric_dimensions(bbox, meta, image_width_px=500)

    assert dims.width_m == 2.0  # 40 * 0.05
    assert dims.length_m == 3.0 # 60 * 0.05
    assert dims.height_m is None

def test_filter_aspect_ratio():
    # Sliver detection: width = 200px, height = 5px (aspect ratio = 40)
    sliver = DetectionResult(
        class_name="Cable",
        class_id=3,
        confidence_pct=70.0,
        bbox_px=BoundingBox(x1=10, y1=10, x2=210, y2=15)
    )
    valid = DetectionResult(
        class_name="Container",
        class_id=7,
        confidence_pct=85.0,
        bbox_px=BoundingBox(x1=10, y1=10, x2=60, y2=60)
    )

    filtered = apply_noise_filter([sliver, valid], max_aspect_ratio=15.0)
    assert len(filtered) == 1
    assert filtered[0].class_name == "Container"

def test_filter_nms_duplicates():
    # Two heavily overlapping boxes for the same class
    box1 = DetectionResult(
        class_name="Mine",
        class_id=5,
        confidence_pct=92.0,
        bbox_px=BoundingBox(x1=100, y1=100, x2=200, y2=200)
    )
    box2 = DetectionResult(
        class_name="Mine",
        class_id=5,
        confidence_pct=75.0,
        bbox_px=BoundingBox(x1=105, y1=105, x2=195, y2=195)
    )

    filtered = apply_noise_filter([box1, box2], iou_threshold=0.45)
    assert len(filtered) == 1
    assert filtered[0].confidence_pct == 92.0

def test_filter_area_threshold():
    tiny = DetectionResult(
        class_name="Debris",
        class_id=8,
        confidence_pct=60.0,
        bbox_px=BoundingBox(x1=10, y1=10, x2=14, y2=14)  # 16 px²
    )
    filtered = apply_noise_filter([tiny], min_area_px=64.0)
    assert len(filtered) == 0

def test_full_pipeline_upload_analyze():
    # Create test image in memory
    img = Image.new("RGB", (640, 640), color=(20, 40, 60))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    # 1. Upload survey with metadata
    meta_json = '{"sonar_altitude_m": 4.0, "meters_per_pixel": 0.05, "anchor_start": {"lat": 12.95, "lon": 80.15}, "anchor_end": {"lat": 12.96, "lon": 80.15}}'
    response = client.post(
        "/survey/upload",
        files={"file": ("sonar_test.png", buf, "image/png")},
        data={"metadata": meta_json}
    )
    assert response.status_code == 201
    survey_id = response.json()["survey_id"]

    # 2. Analyze survey (Async BackgroundTasks returns 202)
    analyze_resp = client.post(f"/survey/{survey_id}/analyze")
    assert analyze_resp.status_code in [200, 202]
    
    # 3. Check status & completed detections
    status_resp = client.get(f"/survey/{survey_id}/status")
    assert status_resp.status_code == 200
    assert status_resp.json()["stage"] == "COMPLETED"
    assert status_resp.json()["progress_pct"] == 100

    det_resp = client.get(f"/survey/{survey_id}/detections")
    assert det_resp.status_code == 200
    report = det_resp.json()
    assert report["survey_id"] == survey_id
    assert report["processing_stage"] == "COMPLETED"
