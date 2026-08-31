import json
import logging
import shutil
from pathlib import Path
from typing import Dict, Any, Optional
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from PIL import Image

from app.models.schemas import JobStatus, SurveyMetadata, SurveyReport
from app.pipeline.detect import run_detection
from app.pipeline.filter import apply_noise_filter
from app.pipeline.geotag import geotag_detections
from app.pipeline.shadow_size import compute_metric_dimensions
from app.pipeline.uncertainty import run_mc_dropout

logger = logging.getLogger(__name__)

router = APIRouter()

# In-memory storage for jobs and reports
JOBS: Dict[str, Dict[str, Any]] = {}

STORAGE_BASE = Path(__file__).parent.parent / "storage"
STORAGE_BASE.mkdir(parents=True, exist_ok=True)

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_survey(
    file: UploadFile = File(...),
    metadata: Optional[str] = Form(None)
):
    """Upload a raw sonar scan with optional survey metadata (altitude, resolution, anchors)."""
    survey_id = f"SUR-{uuid4().hex[:8].upper()}"
    survey_dir = STORAGE_BASE / survey_id
    survey_dir.mkdir(parents=True, exist_ok=True)

    # Sanitize and save image
    file_path = survey_dir / file.filename
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        logger.error(f"Failed to save uploaded file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not save uploaded survey file: {str(e)}"
        )

    # Parse metadata if provided
    parsed_metadata = None
    if metadata:
        try:
            metadata_dict = json.loads(metadata)
            parsed_metadata = SurveyMetadata(**metadata_dict)
        except Exception as e:
            logger.warning(f"Could not parse survey metadata JSON: {e}")

    # Register in-memory job
    job_status = JobStatus(
        survey_id=survey_id,
        stage="INGESTION",
        progress_pct=10
    )

    JOBS[survey_id] = {
        "status": job_status,
        "metadata": parsed_metadata,
        "image_path": file_path,
        "image_filename": file.filename,
        "report": None
    }

    return {
        "survey_id": survey_id,
        "status": "INGESTION",
        "filename": file.filename
    }

@router.post("/{survey_id}/analyze", response_model=SurveyReport)
async def analyze_survey(survey_id: str):
    """Trigger full AI hydrographic detection, sizing, geotagging, and uncertainty pipeline on an uploaded survey."""
    if survey_id not in JOBS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Survey ID {survey_id} not found."
        )

    job_entry = JOBS[survey_id]
    image_path: Path = job_entry["image_path"]
    metadata: Optional[SurveyMetadata] = job_entry.get("metadata")

    if not image_path.exists():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image file for survey {survey_id} does not exist on disk."
        )

    try:
        # 1. Base YOLOv8 Inference
        job_entry["status"].stage = "YOLO_INFERENCE"
        job_entry["status"].progress_pct = 30
        raw_detections = run_detection(image_path=image_path)

        # 2. False-Positive, Stripe Noise, and Tile-IoU Filter
        job_entry["status"].stage = "FILTERING"
        job_entry["status"].progress_pct = 45
        filtered_detections = apply_noise_filter(raw_detections, metadata=metadata)

        # 3. Read image dimensions
        with Image.open(image_path) as img:
            img_w, img_h = img.size

        # 4. Physical Dimensions & Shadow Height Geometry
        job_entry["status"].stage = "SHADOW_SIZING"
        job_entry["status"].progress_pct = 60
        for d in filtered_detections:
            d.dimensions_m = compute_metric_dimensions(
                bbox=d.bbox_px,
                metadata=metadata,
                image_width_px=img_w
            )

        # 5. Monte Carlo Dropout Uncertainty Estimation
        job_entry["status"].stage = "MC_DROPOUT"
        job_entry["status"].progress_pct = 80
        enriched_detections = run_mc_dropout(
            image_path=image_path,
            base_detections=filtered_detections
        )

        # 6. WGS84 Geotagging & Geodesic Projection
        job_entry["status"].stage = "GEOTAGGING"
        job_entry["status"].progress_pct = 95
        final_detections = geotag_detections(
            detections=enriched_detections,
            metadata=metadata,
            image_width_px=img_w,
            image_height_px=img_h
        )

        # Build SurveyReport
        report = SurveyReport(
            survey_id=survey_id,
            image_filename=job_entry["image_filename"],
            detections=final_detections,
            processing_stage="COMPLETED"
        )

        job_entry["report"] = report
        job_entry["status"].stage = "COMPLETED"
        job_entry["status"].progress_pct = 100

        return report

    except Exception as e:
        logger.error(f"Analysis failed for {survey_id}: {e}")
        job_entry["status"].stage = "ERROR"
        job_entry["status"].error = str(e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Detection pipeline failed: {str(e)}"
        )

@router.get("/{survey_id}/status", response_model=JobStatus)
async def get_survey_status(survey_id: str):
    """Retrieve the current processing status of a survey."""
    if survey_id not in JOBS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Survey ID {survey_id} not found."
        )
    return JOBS[survey_id]["status"]

@router.get("/{survey_id}/detections", response_model=SurveyReport)
async def get_survey_detections(survey_id: str):
    """Retrieve the detections and report for an analyzed survey."""
    if survey_id not in JOBS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Survey ID {survey_id} not found."
        )
    
    report = JOBS[survey_id].get("report")
    if report is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Survey has not been analyzed yet. Call /survey/{id}/analyze first."
        )
    return report
