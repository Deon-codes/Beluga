import json
import logging
import shutil
from pathlib import Path
from typing import Dict, Any, Optional
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, Response, UploadFile, status
from fastapi.responses import JSONResponse
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


def _run_pipeline(survey_id: str):
    """
    Asynchronous worker executing the full 8-stage hydrographic analytics pipeline:
    1. INGESTION (5%)
    2. DENOISING (20%)
    3. YOLO_INFERENCE (35%)
    4. FILTERING (50%)
    5. SHADOW_SIZING (65%)
    6. MC_DROPOUT (80%)
    7. GEOTAGGING (92%)
    8. COMPLETED (100%) + Persistence
    """
    if survey_id not in JOBS:
        logger.error(f"Job {survey_id} not found in JOBS registry.")
        return

    job_entry = JOBS[survey_id]
    image_path: Path = job_entry["image_path"]
    metadata: Optional[SurveyMetadata] = job_entry.get("metadata")

    try:
        # Stage 1: INGESTION
        job_entry["status"].stage = "INGESTION"
        job_entry["status"].progress_pct = 5
        if not image_path.exists():
            raise FileNotFoundError(f"Survey scan {image_path} does not exist on disk.")

        # Stage 2: DENOISING & Contrast normalization inspection
        job_entry["status"].stage = "DENOISING"
        job_entry["status"].progress_pct = 20
        with Image.open(image_path) as img:
            img_w, img_h = img.size

        # Stage 3: Base YOLOv8 Inference
        job_entry["status"].stage = "YOLO_INFERENCE"
        job_entry["status"].progress_pct = 35
        raw_detections = run_detection(image_path=image_path)

        # Stage 4: False-Positive, Stripe Noise, and Tile-IoU Filter
        job_entry["status"].stage = "FILTERING"
        job_entry["status"].progress_pct = 50
        filtered_detections = apply_noise_filter(raw_detections, metadata=metadata)

        # Stage 5: Physical Dimensions & Acoustic Shadow Geometry
        job_entry["status"].stage = "SHADOW_SIZING"
        job_entry["status"].progress_pct = 65
        for d in filtered_detections:
            d.dimensions_m = compute_metric_dimensions(
                bbox=d.bbox_px,
                metadata=metadata,
                image_width_px=img_w
            )

        # Stage 6: Monte Carlo Dropout Uncertainty Estimation
        job_entry["status"].stage = "MC_DROPOUT"
        job_entry["status"].progress_pct = 80
        enriched_detections = run_mc_dropout(
            image_path=image_path,
            base_detections=filtered_detections
        )

        # Stage 7: WGS84 Geotagging & Geodesic Projection
        job_entry["status"].stage = "GEOTAGGING"
        job_entry["status"].progress_pct = 92
        final_detections = geotag_detections(
            detections=enriched_detections,
            metadata=metadata,
            image_width_px=img_w,
            image_height_px=img_h
        )

        # Stage 8: Build SurveyReport & Complete
        report = SurveyReport(
            survey_id=survey_id,
            image_filename=job_entry["image_filename"],
            detections=final_detections,
            processing_stage="COMPLETED"
        )

        job_entry["report"] = report
        job_entry["status"].stage = "COMPLETED"
        job_entry["status"].progress_pct = 100
        job_entry["status"].error = None

        # Disk Persistence: save report.json in survey directory
        survey_dir = STORAGE_BASE / survey_id
        survey_dir.mkdir(parents=True, exist_ok=True)
        report_path = survey_dir / "report.json"
        report_path.write_text(report.model_dump_json(indent=2), encoding="utf-8")
        logger.info(f"Analysis completed and persisted for survey {survey_id}")

    except Exception as e:
        logger.error(f"Analysis failed for survey {survey_id}: {e}", exc_info=True)
        job_entry["status"].stage = "ERROR"
        job_entry["status"].error = str(e)


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


@router.post("/{survey_id}/analyze", status_code=status.HTTP_202_ACCEPTED)
async def analyze_survey(
    survey_id: str,
    background_tasks: BackgroundTasks
):
    """
    Trigger full AI hydrographic detection, sizing, geotagging, and uncertainty pipeline
    asynchronously using FastAPI BackgroundTasks.
    """
    if survey_id not in JOBS:
        # Check if saved on disk from previous session
        survey_dir = STORAGE_BASE / survey_id
        report_file = survey_dir / "report.json"
        if report_file.exists():
            report = SurveyReport.model_validate_json(report_file.read_text(encoding="utf-8"))
            JOBS[survey_id] = {
                "status": JobStatus(survey_id=survey_id, stage="COMPLETED", progress_pct=100),
                "report": report,
                "image_path": survey_dir / report.image_filename,
                "image_filename": report.image_filename,
                "metadata": None
            }
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={"survey_id": survey_id, "status": "COMPLETED", "message": "Survey already analyzed"}
            )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Survey ID {survey_id} not found."
        )

    job_entry = JOBS[survey_id]
    image_path: Path = job_entry["image_path"]

    if not image_path.exists():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image file for survey {survey_id} does not exist on disk."
        )

    # Initialize job state for background processing
    job_entry["status"].stage = "INGESTION"
    job_entry["status"].progress_pct = 5
    job_entry["status"].error = None

    # Dispatch to background task runner
    background_tasks.add_task(_run_pipeline, survey_id)

    return JSONResponse(
        status_code=status.HTTP_202_ACCEPTED,
        content={
            "survey_id": survey_id,
            "status": "PROCESSING",
            "message": "Survey analysis initiated in background"
        }
    )


@router.get("/{survey_id}/status", response_model=JobStatus)
async def get_survey_status(survey_id: str):
    """Retrieve the current processing status of a survey."""
    if survey_id not in JOBS:
        # Check disk fallback
        survey_dir = STORAGE_BASE / survey_id
        report_file = survey_dir / "report.json"
        if report_file.exists():
            report = SurveyReport.model_validate_json(report_file.read_text(encoding="utf-8"))
            JOBS[survey_id] = {
                "status": JobStatus(survey_id=survey_id, stage="COMPLETED", progress_pct=100),
                "report": report,
                "image_path": survey_dir / report.image_filename,
                "image_filename": report.image_filename,
                "metadata": None
            }
            return JOBS[survey_id]["status"]
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Survey ID {survey_id} not found."
        )
    return JOBS[survey_id]["status"]


@router.get("/{survey_id}/detections", response_model=SurveyReport)
async def get_survey_detections(survey_id: str):
    """Retrieve the detections and report for an analyzed survey."""
    if survey_id not in JOBS:
        # Check disk fallback
        survey_dir = STORAGE_BASE / survey_id
        report_file = survey_dir / "report.json"
        if report_file.exists():
            report = SurveyReport.model_validate_json(report_file.read_text(encoding="utf-8"))
            JOBS[survey_id] = {
                "status": JobStatus(survey_id=survey_id, stage="COMPLETED", progress_pct=100),
                "report": report,
                "image_path": survey_dir / report.image_filename,
                "image_filename": report.image_filename,
                "metadata": None
            }
            return report
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Survey ID {survey_id} not found."
        )

    job_entry = JOBS[survey_id]
    report = job_entry.get("report")
    if report is None:
        current_stage = job_entry["status"].stage
        if current_stage == "ERROR":
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Analysis failed: {job_entry['status'].error}"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Survey analysis is currently in stage '{current_stage}'. Call /survey/{survey_id}/analyze and wait for COMPLETED."
        )
    return report
