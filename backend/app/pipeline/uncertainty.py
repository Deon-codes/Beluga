import logging
from pathlib import Path
from typing import List, Optional, Union
import numpy as np
import torch
from app.config import settings
from app.models.schemas import BoundingBox, DetectionResult
from app.pipeline.detect import get_model
from app.pipeline.filter import compute_iou

logger = logging.getLogger(__name__)

def enable_dropout(model_torch):
    """Enable dropout layers during inference for Monte Carlo uncertainty estimation."""
    for m in model_torch.modules():
        if isinstance(m, torch.nn.Dropout):
            m.train()

def run_mc_dropout(
    image_path: Union[str, Path],
    base_detections: List[DetectionResult],
    n_passes: Optional[int] = None,
    iou_match_threshold: float = 0.4,
    conf_threshold: Optional[float] = None
) -> List[DetectionResult]:
    """
    Perform Monte Carlo Dropout uncertainty estimation over N forward passes.
    Enriches each DetectionResult with uncertainty_std and certainty ('HIGH' | 'MODERATE' | 'LOW').
    """
    if not base_detections:
        return []

    if n_passes is None:
        n_passes = settings.MC_DROPOUT_PASSES or 15
    if conf_threshold is None:
        conf_threshold = 0.15  # Lower threshold during MC passes to catch low-prob activations

    model = get_model()
    image_path_str = str(image_path)

    # Dictionary mapping detection index to list of collected confidence scores across passes
    scores_by_det = {i: [base_detections[i].confidence_pct / 100.0] for i in range(len(base_detections))}

    try:
        # Enable dropout in underlying PyTorch model
        if hasattr(model, "model") and model.model is not None:
            model.model.train()
            enable_dropout(model.model)

        for pass_idx in range(n_passes - 1):
            results = model.predict(source=image_path_str, conf=conf_threshold, verbose=False)
            if not results or len(results) == 0 or results[0].boxes is None:
                continue

            pass_boxes = results[0].boxes
            for i, base_det in enumerate(base_detections):
                best_iou = 0.0
                best_conf = 0.0

                for box in pass_boxes:
                    cls_id = int(box.cls.item())
                    # Match on same class or spatial overlap
                    if cls_id == base_det.class_id:
                        xyxy = box.xyxy[0].tolist()
                        cand_box = BoundingBox(x1=xyxy[0], y1=xyxy[1], x2=xyxy[2], y2=xyxy[3])
                        iou_val = compute_iou(base_det.bbox_px, cand_box)
                        if iou_val > best_iou:
                            best_iou = iou_val
                            best_conf = float(box.conf.item())

                if best_iou >= iou_match_threshold:
                    scores_by_det[i].append(best_conf)
                else:
                    # Detection dropped in this stochastic pass
                    scores_by_det[i].append(0.0)

    except Exception as e:
        logger.warning(f"MC-Dropout pass experienced an issue: {e}. Falling back to single-pass confidence.")
    finally:
        # Guarantee model is set back to evaluation mode
        if hasattr(model, "model") and model.model is not None:
            model.model.eval()

    # Assign uncertainty metrics
    for i, det in enumerate(base_detections):
        scores = scores_by_det.get(i, [det.confidence_pct / 100.0])
        std_val = float(np.std(scores))
        mean_val = float(np.mean(scores))

        # Classify certainty bands
        if std_val < 0.08:
            certainty_band = "HIGH"
        elif std_val < 0.16:
            certainty_band = "MODERATE"
        else:
            certainty_band = "LOW"

        det.uncertainty_std = round(std_val, 4)
        det.certainty = certainty_band

    return base_detections
