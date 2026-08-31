"""Class-targeted Grad-CAM for model_a_unified_v2's YOLO detection head.

Replaces an earlier EigenCAM version. EigenCAM needs no class-specific
gradients, which sidesteps YOLO's non-standard multi-tensor output neatly --
but it's a variance-maximizing saliency method with no notion of "class",
so on sonar images (highly textured background, comparatively smooth
objects) it consistently lit up background clutter instead of the detected
object. Verified across 4 sample images: hot color always landed on
noisy background/edges, never on the object itself.

This version backprops the model's own highest-confidence (class, anchor)
pair for the image -- real Grad-CAM -- so the heatmap explains a specific
detection instead of "where is activation variance highest". The target is
picked from the same forward pass used for the CAM itself (not a separate
yolo.predict() call): calling predict() first was tried and silently breaks
autograd on a later manual forward through the same model (ultralytics
caches some inference-mode-tainted state internally), and doing it in one
pass also guarantees the heatmap and the picked box use identical
preprocessing.
"""
import glob
import os
import random

import cv2
import numpy as np
import torch
import torch.nn.functional as F
from ultralytics import YOLO

BEST_PT = "/home/nial-rojan/SIH 2026/sonar-debris/runs/detect/model_a_unified_v2/weights/best.pt"
OUT_DIR = "/home/nial-rojan/SIH 2026/sonar-debris/runs/detect/model_a_unified_v2/gradcam"
IMG_SIZE = 640

os.makedirs(OUT_DIR, exist_ok=True)


def find_positive_samples(n=6):
    """Prefer tiles that actually have a label (non-empty .txt) so the heatmap has
    something meaningful to highlight."""
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
    random.seed(0)
    return random.sample(positives, min(n, len(positives)))


def preprocess(path, size=IMG_SIZE):
    img_bgr = cv2.imread(path)
    img_bgr = cv2.resize(img_bgr, (size, size))
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    img_float = img_rgb.astype(np.float32) / 255.0
    tensor = torch.from_numpy(np.transpose(img_float, (2, 0, 1))).unsqueeze(0)
    return img_float, tensor


# YOLOv8's Detect head reads 3 separate C2f outputs, one per scale (P3/P4/P5 --
# strides 8/16/32), each responsible for a disjoint slice of the 8400 anchors.
# They're independent branches until Detect concatenates them, so a layer from
# the wrong scale has EXACTLY zero gradient w.r.t. an anchor from another scale
# -- confirmed empirically (grad min/max/mean all 0.0) when this script hooked
# only the P5 layer (model.model[-2]) and the winning anchor was P3/P4. Must
# hook all three and pick the one that actually feeds the winning anchor.
NECK_LAYER_INDICES = (15, 18, 21)  # C2f outputs -> Detect, in P3, P4, P5 order
STRIDES = (8, 16, 32)


class GradCAM:
    """Direct Grad-CAM via hooks: no dependency on pytorch_grad_cam's assumptions
    about output shape, which is what forced the EigenCAM workaround originally --
    YOLO's forward returns (preds_tensor, dict), not a plain classifier tensor."""

    def __init__(self, model, layer_indices=NECK_LAYER_INDICES):
        self.model = model
        self.layer_indices = layer_indices
        self.activations = {}
        self.gradients = {}
        for idx in layer_indices:
            layer = model.model[idx]
            layer.register_forward_hook(self._make_activation_hook(idx))
            layer.register_full_backward_hook(self._make_gradient_hook(idx))

    def _make_activation_hook(self, idx):
        def hook(module, inp, out):
            self.activations[idx] = out
        return hook

    def _make_gradient_hook(self, idx):
        def hook(module, grad_in, grad_out):
            self.gradients[idx] = grad_out[0]
        return hook

    def explain_top_detection(self, tensor, img_size=IMG_SIZE):
        """Forward once, find the single highest-confidence (class, anchor) pair
        across the whole image, and backprop that score for Grad-CAM. Returns
        (cam, class_id, confidence)."""
        self.model.zero_grad()
        preds, _ = self.model(tensor)  # (1, 4+nc, num_anchors)
        class_scores = preds[0, 4:, :]  # (nc, num_anchors)
        num_anchors = class_scores.shape[1]
        flat_idx = int(class_scores.argmax())
        class_id, anchor_idx = divmod(flat_idx, num_anchors)
        score = class_scores[class_id, anchor_idx]
        conf = float(score.detach())

        counts = [(img_size // s) ** 2 for s in STRIDES]
        boundaries = np.cumsum([0] + counts)
        scale = int(np.searchsorted(boundaries, anchor_idx, side="right") - 1)
        layer_idx = self.layer_indices[scale]

        score.backward()
        activations = self.activations[layer_idx]
        gradients = self.gradients[layer_idx]
        weights = gradients.mean(dim=(2, 3), keepdim=True)
        cam = F.relu((weights * activations).sum(dim=1, keepdim=True))
        cam = cam[0, 0].detach().cpu().numpy()
        cam -= cam.min()
        if cam.max() > 0:
            cam /= cam.max()
        return cam, class_id, conf


def overlay_heatmap(img_float, cam, size=IMG_SIZE):
    cam_resized = cv2.resize(cam, (size, size))
    heatmap = cv2.applyColorMap(np.uint8(255 * cam_resized), cv2.COLORMAP_JET)
    heatmap = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
    overlay = np.clip(0.55 * img_float + 0.45 * heatmap, 0, 1)
    return (overlay * 255).astype(np.uint8)


print("Loading model...")
yolo = YOLO(BEST_PT)
model = yolo.model
model.eval()

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model.to(device)
# Ultralytics loads inference checkpoints with requires_grad=False on every
# parameter (it's optimized for pure forward-pass inference) -- Grad-CAM needs
# an actual autograd graph, so re-enable it.
for p in model.parameters():
    p.requires_grad_(True)

gradcam = GradCAM(model)

samples = find_positive_samples(6)
print(f"Running Grad-CAM on {len(samples)} labeled validation tiles...")

for path in samples:
    img_float, tensor = preprocess(path)
    cam, class_id, conf = gradcam.explain_top_detection(tensor.to(device))
    class_name = yolo.names[class_id]
    overlay = overlay_heatmap(img_float, cam)

    name = os.path.splitext(os.path.basename(path))[0]
    out_path = os.path.join(OUT_DIR, f"{name}_cam.png")
    cv2.imwrite(out_path, cv2.cvtColor(overlay, cv2.COLOR_RGB2BGR))
    flag = "" if conf >= 0.25 else "  (below normal 0.25 confidence threshold)"
    print(f"  saved {out_path}  -- explaining: {class_name} ({conf*100:.0f}% confidence){flag}")

print(f"\nDone. Heatmaps saved to {OUT_DIR}")
