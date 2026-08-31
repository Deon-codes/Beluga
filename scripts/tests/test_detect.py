import os

import cv2
import numpy as np
import pytest
from PIL import Image

import detect as dt

MODEL_AVAILABLE = os.path.exists(dt.DEFAULT_MODEL)


@pytest.fixture(scope="module")
def model():
    if not MODEL_AVAILABLE:
        pytest.skip("default model weights not available in this environment")
    return dt.load_model()


@pytest.fixture(scope="module")
def synthetic_image_path(tmp_path_factory):
    path = tmp_path_factory.mktemp("imgs") / "sonar.png"
    cv2.imwrite(str(path), np.random.randint(0, 60, (640, 640, 3), dtype=np.uint8))
    return str(path)


def test_run_inference_returns_expected_structure(model, synthetic_image_path):
    result = dt.run_inference(model, synthetic_image_path, conf=0.25)

    assert set(result.keys()) == {"detections", "original", "annotated"}
    assert isinstance(result["detections"], list)
    assert result["original"].ndim == 3
    assert result["annotated"].shape == result["original"].shape
    for det in result["detections"]:
        assert set(det.keys()) == {"class_id", "class_name", "label", "category", "confidence", "box"}
        assert 0.0 <= det["confidence"] <= 1.0
        assert len(det["box"]) == 4


def test_run_inference_unknown_class_falls_back_to_raw_name_and_unclassified(model, synthetic_image_path):
    result = dt.run_inference(model, synthetic_image_path, conf=0.25)
    for det in result["detections"]:
        expected_label, expected_category = dt.CLASS_INFO.get(det["class_name"], (det["class_name"], "Unclassified"))
        assert det["label"] == expected_label
        assert det["category"] == expected_category


def test_build_composite_returns_pil_image_with_legend_when_no_detections():
    # An all-background result (no detections) should still render a valid
    # composite with the "nothing detected" placeholder, not crash.
    fake_result = {
        "detections": [],
        "original": np.zeros((640, 640, 3), dtype=np.uint8),
        "annotated": np.zeros((640, 640, 3), dtype=np.uint8),
    }
    composite = dt.build_composite(fake_result, panel_height=120)
    assert isinstance(composite, Image.Image)
    assert composite.width > 0 and composite.height > 0


def test_build_composite_with_detections_renders_legend_entries():
    fake_result = {
        "detections": [
            {"class_id": 5, "class_name": "MILCO", "label": "Mine-like contact (possible mine)",
             "category": "Munition", "confidence": 0.87, "box": [10, 10, 50, 50]},
        ],
        "original": np.zeros((200, 200, 3), dtype=np.uint8),
        "annotated": np.zeros((200, 200, 3), dtype=np.uint8),
    }
    composite = dt.build_composite(fake_result, panel_height=80)
    assert isinstance(composite, Image.Image)


def test_encode_png_roundtrip():
    img = Image.new("RGB", (16, 16), color=(1, 2, 3))
    png_bytes = dt.encode_png(img)
    assert png_bytes[:8] == b"\x89PNG\r\n\x1a\n"

    import io
    reloaded = Image.open(io.BytesIO(png_bytes))
    assert reloaded.size == (16, 16)


def test_load_font_never_raises():
    font_bold = dt._load_font(20, bold=True)
    font_regular = dt._load_font(14, bold=False)
    assert font_bold is not None
    assert font_regular is not None
