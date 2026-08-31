import logging
from pathlib import Path
from typing import List, Optional, Union
import torch
from ultralytics import YOLO

from app.config import settings
from app.models.schemas import BoundingBox, DetectionResult

logger = logging.getLogger(__name__)

# Risk mapping by class ID / name
CLASS_RISK_MAP = {
    5: "CRITICAL",   # MILCO
    1: "HIGH",       # Aircraft
    4: "HIGH",       # Shipwreck
    6: "HIGH",       # NOMBO
    14: "HIGH",      # Hook
    0: "MEDIUM",     # Pipeline
    10: "MEDIUM",    # Chain
    12: "MEDIUM",    # Valve
    13: "MEDIUM",    # Propeller
}

_model: Optional[YOLO] = None
_device: str = "cpu"

def get_model() -> YOLO:
    """Lazy load or return singleton YOLO model."""
    global _model, _device
    if _model is None:
        model_path = settings.get_resolved_model_path()
        logger.info(f"Loading YOLO model from: {model_path}")
        if not model_path.exists():
            raise FileNotFoundError(f"Model checkpoint not found at {model_path}")
        
        _device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"YOLO detector initialized on device: {_device}")
        
        _model = YOLO(str(model_path))
    return _model

def model_loaded() -> bool:
    """Check if model can be or has been loaded."""
    try:
        m = get_model()
        return m is not None
    except Exception as e:
        logger.error(f"Model load check failed: {e}")
        return False

def get_class_names() -> List[str]:
    """Return list of class names from loaded checkpoint."""
    model = get_model()
    if hasattr(model, "names") and model.names:
        return [model.names[i] for i in range(len(model.names))]
    return []

def assign_risk(class_id: int, class_name: str) -> str:
    """Assign qualitative risk level based on class ID."""
    if class_id in CLASS_RISK_MAP:
        return CLASS_RISK_MAP[class_id]
    return "LOW"

def run_detection(
    image_path: Union[str, Path],
    conf: Optional[float] = None
) -> List[DetectionResult]:
    """Run YOLOv8 inference on a single image and return structured DetectionResults."""
    if conf is None:
        conf = settings.DEFAULT_CONF
        
    model = get_model()
    image_path_str = str(image_path)
    
    # Run YOLO inference
    results = model.predict(source=image_path_str, conf=conf, verbose=False)
    
    detections: List[DetectionResult] = []
    if not results or len(results) == 0:
        return detections

    boxes = results[0].boxes
    if boxes is None or len(boxes) == 0:
        return detections

    for box in boxes:
        cls_id = int(box.cls.item())
        confidence = float(box.conf.item())
        confidence_pct = round(confidence * 100.0, 2)
        
        # Bounding box xyxy format
        xyxy = box.xyxy[0].tolist()
        x1, y1, x2, y2 = map(float, xyxy)
        
        class_name = model.names.get(cls_id, f"Class_{cls_id}") if hasattr(model, "names") else f"Class_{cls_id}"
        risk_level = assign_risk(cls_id, class_name)
        
        detection = DetectionResult(
            class_name=class_name,
            class_id=cls_id,
            confidence_pct=confidence_pct,
            bbox_px=BoundingBox(x1=x1, y1=y1, x2=x2, y2=y2),
            risk=risk_level
        )
        detections.append(detection)
        
    return detections
