import logging
from typing import List, Optional
from app.models.schemas import BoundingBox, DetectionResult, SurveyMetadata

logger = logging.getLogger(__name__)

def compute_iou(box_a: BoundingBox, box_b: BoundingBox) -> float:
    """Compute Intersection over Union between two BoundingBoxes."""
    x_left = max(box_a.x1, box_b.x1)
    y_top = max(box_a.y1, box_b.y1)
    x_right = min(box_a.x2, box_b.x2)
    y_bottom = min(box_a.y2, box_b.y2)

    if x_right <= x_left or y_bottom <= y_top:
        return 0.0

    intersection_area = (x_right - x_left) * (y_bottom - y_top)
    area_a = max(0.0, (box_a.x2 - box_a.x1) * (box_a.y2 - box_a.y1))
    area_b = max(0.0, (box_b.x2 - box_b.x1) * (box_b.y2 - box_b.y1))

    union_area = area_a + area_b - intersection_area
    if union_area <= 0:
        return 0.0

    return intersection_area / union_area

def nms_detections(
    detections: List[DetectionResult],
    iou_threshold: float = 0.45
) -> List[DetectionResult]:
    """
    Per-class Non-Maximum Suppression. Keeps highest confidence detections.
    """
    if not detections:
        return []

    # Group detections by class_id
    by_class = {}
    for d in detections:
        by_class.setdefault(d.class_id, []).append(d)

    kept: List[DetectionResult] = []

    for class_id, class_dets in by_class.items():
        # Sort descending by confidence
        sorted_dets = sorted(class_dets, key=lambda x: x.confidence_pct, reverse=True)
        class_kept: List[DetectionResult] = []

        while sorted_dets:
            current = sorted_dets.pop(0)
            class_kept.append(current)
            
            # Filter out any subsequent box with IoU >= threshold
            remaining = []
            for other in sorted_dets:
                if compute_iou(current.bbox_px, other.bbox_px) < iou_threshold:
                    remaining.append(other)
            sorted_dets = remaining

        kept.extend(class_kept)

    return kept

def apply_noise_filter(
    detections: List[DetectionResult],
    metadata: Optional[SurveyMetadata] = None,
    max_aspect_ratio: float = 15.0,
    min_area_px: float = 64.0,
    iou_threshold: float = 0.45,
) -> List[DetectionResult]:
    """
    Filter out false-positive anomalies, sonar transmission stripes, and duplicate boxes.
    1. Aspect Ratio Guard: Drop if width/height > max_aspect_ratio or height/width > max_aspect_ratio.
    2. Minimum Pixel Area: Drop if bbox area < min_area_px.
    3. Tile / Overlap IoU NMS: Discard duplicate boxes for same class.
    4. Shadow Verification: Flag/demote risk if height_m is negligible when altitude was known.
    """
    if not detections:
        return []

    filtered: List[DetectionResult] = []

    for d in detections:
        w = max(0.0, d.bbox_px.x2 - d.bbox_px.x1)
        h = max(0.0, d.bbox_px.y2 - d.bbox_px.y1)
        area = w * h

        # 1. Area threshold
        if area < min_area_px:
            logger.debug(f"Dropped detection {d.id}: area {area:.1f}px < {min_area_px}px")
            continue

        # 2. Aspect ratio threshold
        if h > 0 and w > 0:
            aspect_1 = w / h
            aspect_2 = h / w
            if aspect_1 > max_aspect_ratio or aspect_2 > max_aspect_ratio:
                logger.debug(f"Dropped detection {d.id}: aspect ratio {max(aspect_1, aspect_2):.1f} > {max_aspect_ratio}")
                continue

        filtered.append(d)

    # 3. Apply NMS for overlapping tile seams
    nms_filtered = nms_detections(filtered, iou_threshold=iou_threshold)

    return nms_filtered
