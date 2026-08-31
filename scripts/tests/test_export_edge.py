import os

import numpy as np
import pytest

import export_edge as ee
import verify_edge_export as vee

BEST_PT_AVAILABLE = os.path.exists(ee.BEST_PT)


def test_onnx_detections_counts_above_threshold():
    # (1, 6, 3) -> transpose -> (3 anchors, 6) = [x,y,w,h, 2 class scores]
    raw = np.zeros((1, 6, 3), dtype=np.float32)
    raw[0, 4, 0] = 0.9  # anchor 0: class0 conf 0.9 -> above threshold
    raw[0, 5, 1] = 0.1  # anchor 1: class1 conf 0.1 -> below threshold
    # anchor 2: all zero -> below threshold

    class FakeSession:
        def get_inputs(self):
            return [type("Input", (), {"name": "images"})()]

        def run(self, output_names, feed):
            return [raw]

    count, max_conf = vee.onnx_detections(FakeSession(), img=np.zeros((1, 3, 640, 640)), conf_thres=0.25)

    assert count == 1
    assert abs(max_conf - 0.9) < 1e-6


def test_preprocess_shape_normalized_and_chw(tmp_path):
    import cv2
    img_path = tmp_path / "img.png"
    cv2.imwrite(str(img_path), np.random.randint(0, 255, (200, 300, 3), dtype=np.uint8))

    out = vee.preprocess(str(img_path), size=64)

    assert out.shape == (1, 3, 64, 64)
    assert out.dtype == np.float32
    assert out.min() >= 0.0 and out.max() <= 1.0


@pytest.mark.skipif(not BEST_PT_AVAILABLE, reason="trained checkpoint not available in this environment")
def test_export_edge_produces_smaller_int8_model(tmp_path):
    fp32_path, int8_path = ee.export_edge(best_pt=ee.BEST_PT, edge_dir=tmp_path, verbose=False)

    assert fp32_path.exists()
    assert int8_path.exists()
    fp32_size = fp32_path.stat().st_size
    int8_size = int8_path.stat().st_size
    assert 0 < int8_size < fp32_size


@pytest.mark.skipif(not BEST_PT_AVAILABLE, reason="trained checkpoint not available in this environment")
def test_run_verification_onnx_detects_objects(tmp_path):
    fp32_path, int8_path = ee.export_edge(best_pt=ee.BEST_PT, edge_dir=tmp_path, verbose=False)

    results = vee.run_verification(
        best_pt=ee.BEST_PT,
        fp32_onnx=str(fp32_path),
        int8_onnx=str(int8_path),
        val_images_glob="/home/nial-rojan/SIH 2026/sonar-debris/model_a_unified/val/images/*",
        n_samples=3,
        verbose=False,
    )

    assert len(results) == 3
    for r in results:
        assert r["pt_dets"] >= 0
        assert r["onnx32_dets"] >= 0
        assert r["onnx8_dets"] >= 0
        assert 0.0 <= r["onnx8_maxconf"] <= 1.0
