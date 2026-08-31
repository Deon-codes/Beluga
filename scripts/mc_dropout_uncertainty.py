"""Test-time-augmentation (TTA) uncertainty scoring for model_a_unified_v2.

NOTE: this model has zero nn.Dropout layers (trained with dropout=0.0 -- standard
YOLOv8 detection architectures don't include Dropout unless explicitly added), so
literal MC Dropout (Gal & Ghahramani) isn't available without a retrain. This uses
the standard substitute: N stochastic forward passes under different augmentations,
tracked per anchor like MC Dropout would be, then NMS on the mean prediction with
per-detection confidence mean +/- std as the uncertainty estimate.

Only VALUE-preserving augmentations are used (brightness/gamma/noise jitter) -- no
flips or crops. A flip changes which anchor index covers which spatial region
(YOLO's 8400 anchors are a fixed raster grid), so naively averaging anchor i across
a flipped and unflipped pass mixes unrelated image locations unless the anchor grid
itself is remapped. Value-only jitter keeps every anchor spatially aligned across
passes, so simple mean/std across passes is valid.

Preprocessing uses a proper letterbox (aspect-preserving resize + pad) matching
Ultralytics' own inference pipeline -- tiles here are 1000x500 (2:1), and a plain
square resize badly distorts the elongated Pipeline class.
"""
import glob
import os
import random

import cv2
import numpy as np
import torch
import torchvision
from ultralytics import YOLO

BEST_PT = "/home/nial-rojan/SIH 2026/sonar-debris/runs/detect/model_a_unified_v2/weights/best.pt"
CLASSES = [
    "Pipeline", "Aircraft", "Fish", "Other", "Shipwreck", "MILCO", "NOMBO",
    "Tire", "Bottle", "Drink-carton", "Chain", "Can", "Valve", "Propeller",
    "Hook", "Shampoo-bottle", "Standing-bottle",
]
IMG_SIZE = 640
N_PASSES = 20
CONF_THRES = 0.25
IOU_THRES = 0.5


def letterbox(img, size=IMG_SIZE, pad_value=114):
    h, w = img.shape[:2]
    scale = size / max(h, w)
    nh, nw = int(round(h * scale)), int(round(w * scale))
    resized = cv2.resize(img, (nw, nh))
    canvas = np.full((size, size, 3), pad_value, dtype=np.uint8)
    top = (size - nh) // 2
    left = (size - nw) // 2
    canvas[top:top + nh, left:left + nw] = resized
    return canvas


def augment(img_float):
    """Value-only jitter -- brightness, gamma, and additive noise. No spatial
    transform, so anchor alignment across passes is preserved."""
    out = img_float.copy()
    brightness = random.uniform(0.85, 1.15)
    gamma = random.uniform(0.85, 1.15)
    out = np.clip(out * brightness, 0, 1) ** gamma
    noise = np.random.normal(0, 0.02, out.shape).astype(np.float32)
    out = np.clip(out + noise, 0, 1)
    return out


def preprocess_base(path, size=IMG_SIZE):
    img = cv2.imread(path)
    img = letterbox(img, size)
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
    return img


def to_tensor(img_float):
    return torch.from_numpy(np.transpose(img_float, (2, 0, 1))).unsqueeze(0)


def xywh_to_xyxy(boxes):
    x, y, w, h = boxes[:, 0], boxes[:, 1], boxes[:, 2], boxes[:, 3]
    return torch.stack([x - w / 2, y - h / 2, x + w / 2, y + h / 2], dim=1)


def find_positive_samples(n=5):
    label_dir = "/home/nial-rojan/SIH 2026/sonar-debris/model_a_unified/val/labels"
    img_dir = "/home/nial-rojan/SIH 2026/sonar-debris/model_a_unified/val/images"
    positives = []
    for lbl in glob.glob(f"{label_dir}/*.txt"):
        if os.path.getsize(lbl) > 0:
            stem = os.path.splitext(os.path.basename(lbl))[0]
            for ext in (".png", ".jpg", ".jpeg"):
                img_path = os.path.join(img_dir, stem + ext)
                if os.path.exists(img_path):
                    positives.append(img_path)
                    break
    random.seed(1)
    return random.sample(positives, min(n, len(positives)))


print("Loading model...")
yolo = YOLO(BEST_PT)
model = yolo.model
model.eval()
device = torch.device("cpu")
model = model.to(device)
print(f"Using device: {device}")

samples = find_positive_samples(5)

for path in samples:
    base_img = preprocess_base(path)
    pass_outputs = []
    with torch.no_grad():
        for _ in range(N_PASSES):
            aug_img = augment(base_img)
            tensor = to_tensor(aug_img).to(device)
            out = model(tensor)
            if isinstance(out, (tuple, list)):
                out = out[0]
            pass_outputs.append(out[0])  # (21, 8400)

    stacked = torch.stack(pass_outputs, dim=0)  # (N, 21, 8400)
    boxes_mean = stacked[:, :4, :].mean(dim=0).T  # (8400, 4)
    class_scores = stacked[:, 4:, :]  # (N, 17, 8400)
    conf_per_pass = class_scores.max(dim=1).values  # (N, 8400)
    class_id_mean = class_scores.mean(dim=0).argmax(dim=0)
    conf_mean = conf_per_pass.mean(dim=0)
    conf_std = conf_per_pass.std(dim=0)

    keep_mask = conf_mean > CONF_THRES
    if keep_mask.sum() == 0:
        print(f"\n{os.path.basename(path)}: no detections above conf={CONF_THRES}")
        continue

    boxes_xyxy = xywh_to_xyxy(boxes_mean[keep_mask])
    scores = conf_mean[keep_mask]
    classes = class_id_mean[keep_mask]
    stds = conf_std[keep_mask]

    nms_idx = torchvision.ops.nms(boxes_xyxy, scores, IOU_THRES)

    print(f"\n{os.path.basename(path)}: {len(nms_idx)} detection(s) after NMS "
          f"(from {int(keep_mask.sum())} candidate anchors)")
    for i in nms_idx:
        cls_name = CLASSES[classes[i].item()]
        print(f"  class={cls_name:16s} conf={scores[i].item():.3f} +/- {stds[i].item():.3f} "
              f"(uncertainty={'HIGH' if stds[i].item() > 0.05 else 'low'})")

print(f"\nDone. {N_PASSES} TTA passes per image (brightness/gamma/noise jitter, anchor-aligned).")
