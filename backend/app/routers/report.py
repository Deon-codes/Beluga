import csv
import io
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Response, status
from fastapi.responses import JSONResponse, StreamingResponse

from app.models.schemas import JobStatus, SurveyReport
from app.routers.survey import JOBS, STORAGE_BASE

logger = logging.getLogger(__name__)

router = APIRouter()

CSV_FIELDNAMES = [
    "detection_id",
    "class_name",
    "class_id",
    "confidence_pct",
    "uncertainty_std",
    "certainty",
    "bbox_x1",
    "bbox_y1",
    "bbox_x2",
    "bbox_y2",
    "length_m",
    "width_m",
    "height_m",
    "lat",
    "lon",
    "geo_confidence",
    "risk",
    "survey_id",
    "generated_at"
]


def _get_survey_report_or_raise(survey_id: str) -> SurveyReport:
    """Helper to fetch completed survey report from in-memory cache or disk fallback."""
    if survey_id not in JOBS:
        # Check disk persistence fallback
        survey_dir = STORAGE_BASE / survey_id
        report_file = survey_dir / "report.json"
        if report_file.exists():
            try:
                report = SurveyReport.model_validate_json(report_file.read_text(encoding="utf-8"))
                JOBS[survey_id] = {
                    "status": JobStatus(survey_id=survey_id, stage="COMPLETED", progress_pct=100),
                    "report": report,
                    "image_path": survey_dir / report.image_filename,
                    "image_filename": report.image_filename,
                    "metadata": None
                }
                return report
            except Exception as e:
                logger.error(f"Failed to read persisted report from {report_file}: {e}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Could not load persisted report for {survey_id}: {str(e)}"
                )

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Survey ID {survey_id} not found."
        )

    job_entry = JOBS[survey_id]
    report: Optional[SurveyReport] = job_entry.get("report")

    if report is None:
        stage = job_entry["status"].stage
        if stage == "ERROR":
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Survey analysis failed with error: {job_entry['status'].error}"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Survey {survey_id} analysis is not complete yet (current stage: '{stage}')."
        )

    return report


@router.get("/{survey_id}/report.json", response_model=SurveyReport)
async def get_survey_report_json(survey_id: str):
    """Download full structured JSON report matching the SurveyReport contract."""
    report = _get_survey_report_or_raise(survey_id)
    return report


@router.get("/{survey_id}/report.csv")
async def get_survey_report_csv(survey_id: str):
    """
    Download tabular CSV export of all detected seabed hazards, acoustic metrics,
    WGS84 geotags, uncertainty ratings, and qualitative risk classifications.
    """
    report = _get_survey_report_or_raise(survey_id)

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=CSV_FIELDNAMES)
    writer.writeheader()

    gen_time_str = report.generated_at.isoformat()

    for d in report.detections:
        row = {
            "detection_id": d.id,
            "class_name": d.class_name,
            "class_id": d.class_id,
            "confidence_pct": d.confidence_pct,
            "uncertainty_std": d.uncertainty_std if d.uncertainty_std is not None else "",
            "certainty": d.certainty or "",
            "bbox_x1": d.bbox_px.x1,
            "bbox_y1": d.bbox_px.y1,
            "bbox_x2": d.bbox_px.x2,
            "bbox_y2": d.bbox_px.y2,
            "length_m": d.dimensions_m.length_m if d.dimensions_m and d.dimensions_m.length_m is not None else "",
            "width_m": d.dimensions_m.width_m if d.dimensions_m and d.dimensions_m.width_m is not None else "",
            "height_m": d.dimensions_m.height_m if d.dimensions_m and d.dimensions_m.height_m is not None else "",
            "lat": d.location.lat if d.location and d.location.lat is not None else "",
            "lon": d.location.lon if d.location and d.location.lon is not None else "",
            "geo_confidence": d.location.geo_confidence if d.location else "none",
            "risk": d.risk,
            "survey_id": survey_id,
            "generated_at": gen_time_str
        }
        writer.writerow(row)

    csv_content = output.getvalue()
    output.close()

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="report_{survey_id}.csv"'
        }
    )
