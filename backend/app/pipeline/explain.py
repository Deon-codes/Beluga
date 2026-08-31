import os
import cv2
import numpy as np
import torch
import torch.nn.functional as F
import base64
from pathlib import Path
from ultralytics import YOLO

from app.pipeline.detect import get_model

# Layer indices for YOLOv8s (P3, P4, P5 C2f outputs)
NECK_LAYER_INDICES = (15, 18, 21)
STRIDES = (8, 16, 32)
IMG_SIZE = 640

class GradCAM:
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

    def explain_top_detection(self, tensor, target_class_id=None, img_size=IMG_SIZE):
        self.model.zero_grad()
        preds, _ = self.model(tensor)
        class_scores = preds[0, 4:, :]
        num_anchors = class_scores.shape[1]
        
        if target_class_id is not None:
            # We want to explain the maximum activation for a specific class
            scores_for_class = class_scores[target_class_id, :]
            anchor_idx = int(scores_for_class.argmax())
            score = scores_for_class[anchor_idx]
            class_id = target_class_id
        else:
            flat_idx = int(class_scores.argmax())
            class_id, anchor_idx = divmod(flat_idx, num_anchors)
            score = class_scores[class_id, anchor_idx]

        conf = float(score.detach())

        counts = [(img_size // s) ** 2 for s in STRIDES]
        boundaries = np.cumsum([0] + counts)
        scale = int(np.searchsorted(boundaries, anchor_idx, side="right") - 1)
        layer_idx = self.layer_indices[scale]

        score.backward(retain_graph=True)
        activations = self.activations[layer_idx]
        gradients = self.gradients[layer_idx]
        weights = gradients.mean(dim=(2, 3), keepdim=True)
        cam = F.relu((weights * activations).sum(dim=1, keepdim=True))
        cam = cam[0, 0].detach().cpu().numpy()
        cam -= cam.min()
        if cam.max() > 0:
            cam /= cam.max()
        return cam, class_id, conf

def generate_heatmap_base64(image_path: Path, class_id: int):
    """
    Generates a Grad-CAM heatmap for the specified class_id and returns it as a base64 encoded PNG.
    """
    img_bgr = cv2.imread(str(image_path))
    original_shape = img_bgr.shape[:2]
    img_resized = cv2.resize(img_bgr, (IMG_SIZE, IMG_SIZE))
    img_rgb = cv2.cvtColor(img_resized, cv2.COLOR_BGR2RGB)
    img_float = img_rgb.astype(np.float32) / 255.0
    tensor = torch.from_numpy(np.transpose(img_float, (2, 0, 1))).unsqueeze(0)

    yolo = get_model()
    model = yolo.model
    device = next(model.parameters()).device
    tensor = tensor.to(device)
    
    model.eval()
    for p in model.parameters():
        p.requires_grad_(True)

    try:
        gradcam = GradCAM(model)
        cam, _, _ = gradcam.explain_top_detection(tensor, target_class_id=class_id)
        
        cam_resized = cv2.resize(cam, (IMG_SIZE, IMG_SIZE))
        heatmap = cv2.applyColorMap(np.uint8(255 * cam_resized), cv2.COLORMAP_JET)
        heatmap = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
        overlay = np.clip(0.55 * img_float + 0.45 * heatmap, 0, 1)
        overlay_uint8 = (overlay * 255).astype(np.uint8)
        
        overlay_final = cv2.resize(overlay_uint8, (original_shape[1], original_shape[0]))
        overlay_bgr = cv2.cvtColor(overlay_final, cv2.COLOR_RGB2BGR)
        
        _, buffer = cv2.imencode('.png', overlay_bgr)
        encoded = base64.b64encode(buffer).decode('utf-8')
        return f"data:image/png;base64,{encoded}"
    finally:
        pass
