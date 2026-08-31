import json
import os

import cv2
import numpy as np
import pytest

import detect as dt
import visualize_detections as vd

MODEL_AVAILABLE = os.path.exists(dt.DEFAULT_MODEL)


def test_print_summary_no_detections(capsys):
    vd.print_summary("img.png", [])
    out = capsys.readouterr().out
    assert "img.png" in out
    assert "nothing detected" in out


def test_print_summary_with_detections(capsys):
    vd.print_summary("img.png", [
        {"label": "Tire", "category": "Debris", "confidence": 0.7},
    ])
    out = capsys.readouterr().out
    assert "1 object(s) detected" in out
    assert "Tire" in out
    assert "70%" in out


@pytest.mark.skipif(not MODEL_AVAILABLE, reason="default model weights not available in this environment")
def test_process_one_saves_composite_and_json(tmp_path):
    img_path = tmp_path / "sample.png"
    cv2.imwrite(str(img_path), np.random.randint(0, 60, (640, 640, 3), dtype=np.uint8))

    out_dir = tmp_path / "out"
    out_dir.mkdir()
    model = dt.load_model()

    out_path = vd.process_one(model, img_path, conf=0.25, out_dir=out_dir)

    assert out_path.exists()
    assert out_path.name == "sample_side_by_side.png"

    json_path = out_dir / "sample_detections.json"
    assert json_path.exists()
    detections = json.loads(json_path.read_text())
    assert isinstance(detections, list)
