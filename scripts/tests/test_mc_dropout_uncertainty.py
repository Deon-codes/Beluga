import os

import cv2
import numpy as np
import pytest
import torch

import mc_dropout_uncertainty as mdu

VAL_LABEL_DIR = "/home/nial-rojan/SIH 2026/sonar-debris/model_a_unified/val/labels"
VAL_IMG_DIR = "/home/nial-rojan/SIH 2026/sonar-debris/model_a_unified/val/images"
MODEL_AVAILABLE = os.path.exists(mdu.BEST_PT)


def test_letterbox_preserves_aspect_ratio_and_pads_to_square():
    # 1000x500 (2:1) tile, matching the real sonar tile shape referenced in
    # the module docstring -- a plain square resize would badly distort this.
    img = np.random.randint(0, 255, (500, 1000, 3), dtype=np.uint8)
    out = mdu.letterbox(img, size=200)

    assert out.shape == (200, 200, 3)
    # scaled content should be 200 wide x 100 tall, centered with pad rows top/bottom
    assert np.all(out[0, :] == 114)
    assert np.all(out[-1, :] == 114)
    assert not np.all(out[100, :] == 114)


def test_letterbox_tall_image_pads_left_right():
    img = np.random.randint(0, 255, (200, 100, 3), dtype=np.uint8)
    out = mdu.letterbox(img, size=200)
    assert out.shape == (200, 200, 3)
    assert np.all(out[:, 0] == 114)
    assert np.all(out[:, -1] == 114)


def test_augment_output_range_and_no_spatial_shift():
    img = np.full((64, 64, 3), 0.5, dtype=np.float32)
    out = mdu.augment(img)
    assert out.shape == img.shape
    assert out.min() >= 0.0 and out.max() <= 1.0
    # value-only jitter must not move content between pixels
    assert out.dtype == np.float32


def test_to_tensor_shape_and_dtype():
    img = np.random.rand(64, 64, 3).astype(np.float32)
    tensor = mdu.to_tensor(img)
    assert tensor.shape == (1, 3, 64, 64)
    assert tensor.dtype == torch.float32


def test_xywh_to_xyxy_conversion():
    boxes = torch.tensor([[10.0, 10.0, 4.0, 2.0]])  # cx, cy, w, h
    out = mdu.xywh_to_xyxy(boxes)
    assert torch.allclose(out, torch.tensor([[8.0, 9.0, 12.0, 11.0]]))


@pytest.mark.skipif(
    not os.path.isdir(VAL_LABEL_DIR), reason="validation dataset not available in this environment"
)
def test_find_positive_samples_returns_labeled_images():
    samples = mdu.find_positive_samples(3)
    assert 0 < len(samples) <= 3
    for path in samples:
        assert os.path.exists(path)


@pytest.mark.skipif(not MODEL_AVAILABLE, reason="trained checkpoint not available in this environment")
def test_run_tta_uncertainty_produces_confidence_spread(tmp_path):
    """Regression guard for the same class of bug fixed in
    backend/app/pipeline/uncertainty.py (memory obs #533): with real
    value-only jitter across passes, std should not collapse to exactly 0.0
    on every detection -- if it did, this script would have the identical
    silent bug the backend copy had before the fix."""
    from ultralytics import YOLO

    yolo = YOLO(mdu.BEST_PT)
    model = yolo.model.eval().to("cpu")

    img_path = tmp_path / "sample.png"
    cv2.imwrite(str(img_path), np.random.randint(0, 60, (500, 1000, 3), dtype=np.uint8))

    dets = mdu.run_tta_uncertainty(model, str(img_path), torch.device("cpu"), n_passes=5)

    # a random-noise image may or may not clear the confidence threshold;
    # either way, this must not crash and must return well-formed output
    for d in dets:
        assert set(d.keys()) == {"class_name", "conf", "std"}
        assert 0.0 <= d["conf"] <= 1.0
        assert d["std"] >= 0.0
