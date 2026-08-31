from __future__ import annotations
from datetime import datetime, timezone
from typing import List, Literal, Optional
from pydantic import BaseModel, Field
from uuid import uuid4

class GeoPoint(BaseModel):
    lat: float
    lon: float

class SurveyMetadata(BaseModel):
    vehicle_speed_mps: Optional[float] = None       # m/s — along-track resolution
    sonar_altitude_m: Optional[float] = None        # m — shadow height formula
    meters_per_pixel: float = 0.05                  # across-track resolution default
    anchor_start: Optional[GeoPoint] = None         # GPS start (Option B geotag)
    anchor_end: Optional[GeoPoint] = None           # GPS end (Option B geotag)

class BoundingBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float  # pixel coords

class MetricDimensions(BaseModel):
    length_m: Optional[float] = None
    width_m: Optional[float] = None
    height_m: Optional[float] = None

class GeoTag(BaseModel):
    lat: Optional[float] = None
    lon: Optional[float] = None
    geo_confidence: Literal["measured", "estimated", "none"] = "none"

class DetectionResult(BaseModel):
    id: str = Field(default_factory=lambda: f"D-{uuid4().hex[:6].upper()}")
    class_name: str
    class_id: int
    confidence_pct: float                        # 0.0–100.0
    uncertainty_std: Optional[float] = None
    certainty: Optional[Literal["HIGH", "MODERATE", "LOW"]] = None
    bbox_px: BoundingBox
    dimensions_m: MetricDimensions = Field(default_factory=MetricDimensions)
    location: GeoTag = Field(default_factory=GeoTag)
    risk: Literal["CRITICAL", "HIGH", "MEDIUM", "LOW"] = "LOW"

class SurveyReport(BaseModel):
    survey_id: str
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    image_filename: str
    detections: List[DetectionResult] = Field(default_factory=list)
    processing_stage: str = "COMPLETED"

class JobStatus(BaseModel):
    survey_id: str
    stage: str                                   # INGESTION | YOLO_INFERENCE | COMPLETED | ERROR
    progress_pct: int = 0
    error: Optional[str] = None
