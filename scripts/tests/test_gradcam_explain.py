import os

import cv2
import numpy as np
import pytest
import torch
from ultralytics import YOLO

import gradcam_explain as ge

VAL_LABEL_DIR = "/home/nial-rojan/SIH 2026/sonar-debris/model_a_unified/val/labels"
VAL_IMG_DIR = "/home/nial-rojan/SIH 2026/sonar-debris/model_a_unified/val/images"


def test_preprocess_shape_and_range(tmp_path):
    img_path = tmp_path / "sample.png"
    cv2.imwrite(str(img_path), np.random.randint(0, 255, (300, 400, 3), dtype=np.uint8))

    img_float, tensor = ge.preprocess(str(img_path), size=64)

    assert img_float.shape == (64, 64, 3)
    assert img_float.min() >= 0.0 and img_float.max() <= 1.0
    assert tensor.shape == (1, 3, 64, 64)
    assert tensor.dtype == torch.float32


def test_overlay_heatmap_shape_and_dtype():
    img_float = np.random.rand(64, 64, 3).astype(np.float32)
    cam = np.random.rand(20, 20).astype(np.float32)

    overlay = ge.overlay_heatmap(img_float, cam, size=64)

    assert overlay.shape == (64, 64, 3)
    assert overlay.dtype == np.uint8


@pytest.fixture(scope="module")
def fresh_yolo_model():
    """Untrained yolov8n architecture -- fast to build (no weight download,
    the .yaml ships with ultralytics), enough to exercise the Grad-CAM hook
    mechanism on the real YOLOv8 neck layer indices without needing the
    trained checkpoint or GPU."""
    yolo = YOLO("yolov8n.yaml")
    model = yolo.model
    model.eval()
    for p in model.parameters():
        p.requires_grad_(True)
    return yolo, model


def test_gradcam_explain_top_detection_produces_valid_cam(fresh_yolo_model):
    yolo, model = fresh_yolo_model
    gradcam = ge.GradCAM(model)

    tensor = torch.rand(1, 3, ge.IMG_SIZE, ge.IMG_SIZE)
    cam, class_id, conf = gradcam.explain_top_detection(tensor)

    assert cam.ndim == 2
    assert cam.min() >= 0.0 and cam.max() <= 1.0 + 1e-6
    assert 0 <= class_id < len(yolo.names)
    assert 0.0 <= conf <= 1.0


def test_gradcam_hooks_populate_all_three_scales(fresh_yolo_model):
    _, model = fresh_yolo_model
    gradcam = ge.GradCAM(model)
    tensor = torch.rand(1, 3, ge.IMG_SIZE, ge.IMG_SIZE)

    _, _, conf = gradcam.explain_top_detection(tensor)

    # activations are recorded on every forward hook regardless of which
    # scale ends up winning the argmax
    assert set(gradcam.activations.keys()) == set(ge.NECK_LAYER_INDICES)
    # Detect's concat backward splits the incoming gradient across all three
    # original per-scale tensors, so every hook fires. With random untrained
    # weights the "wrong" branches carry nonzero floating-point noise rather
    # than a bit-exact 0.0 (unlike the trained-model case the module
    # docstring describes), so the robust invariant here is just that the
    # winning scale's gradient magnitude dominates the other two.
    assert set(gradcam.gradients.keys()) == set(ge.NECK_LAYER_INDICES)
    magnitudes = {idx: g.abs().sum().item() for idx, g in gradcam.gradients.items()}
    winning_idx = max(magnitudes, key=magnitudes.get)
    others = [mag for idx, mag in magnitudes.items() if idx != winning_idx]
    assert all(magnitudes[winning_idx] > mag for mag in others)


@pytest.mark.skipif(
    not os.path.isdir(VAL_LABEL_DIR), reason="validation dataset not available in this environment"
)
def test_find_positive_samples_returns_labeled_images():
    samples = ge.find_positive_samples(3)
    assert 0 < len(samples) <= 3
    for path in samples:
        assert os.path.exists(path)
        stem = os.path.splitext(os.path.basename(path))[0]
        lbl_path = os.path.join(VAL_LABEL_DIR, stem + ".txt")
        assert os.path.getsize(lbl_path) > 0
