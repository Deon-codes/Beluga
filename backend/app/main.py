import logging
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.models.schemas import JobStatus, SurveyReport
from app.pipeline.detect import model_loaded
from app.routers import report, survey
from app.routers.survey import JOBS, STORAGE_BASE

# Setup basic logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("sonar_ai")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifecycle manager:
    - On startup: re-hydrate in-memory JOBS cache from any persisted report.json files.
    - On shutdown: cleanup or log final status.
    """
    logger.info("Initializing SONAR-AI engine...")
    restored_count = 0
    try:
        for report_file in STORAGE_BASE.glob("*/report.json"):
            survey_id = report_file.parent.name
            if survey_id not in JOBS:
                try:
                    loaded_report = SurveyReport.model_validate_json(
                        report_file.read_text(encoding="utf-8")
                    )
                    image_path = report_file.parent / loaded_report.image_filename
                    JOBS[survey_id] = {
                        "status": JobStatus(
                            survey_id=survey_id,
                            stage="COMPLETED",
                            progress_pct=100
                        ),
                        "report": loaded_report,
                        "image_path": image_path,
                        "image_filename": loaded_report.image_filename,
                        "metadata": None
                    }
                    restored_count += 1
                except Exception as e:
                    logger.warning(f"Could not load persisted survey report from {report_file}: {e}")
        if restored_count > 0:
            logger.info(f"Successfully re-hydrated {restored_count} persisted survey(s) from disk.")
    except Exception as e:
        logger.error(f"Error during survey persistence re-hydration: {e}")

    yield

    logger.info("Shutting down SONAR-AI engine...")


app = FastAPI(
    title="SONAR-AI Inference & Reporting Engine",
    description="Automated sonar seabed anomaly detection, hydrographic measurement, and survey reporting for MoES / NIOT (SIH 26057).",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(survey.router, prefix="/survey", tags=["Survey Ingestion & Analysis"])
app.include_router(report.router, prefix="/survey", tags=["Reports & Structured Exports"])

# Mount static storage for image inspection
app.mount("/storage", StaticFiles(directory=str(STORAGE_BASE)), name="storage")


@app.get("/health", tags=["Health & Diagnostics"])
def health_check():
    """Health check endpoint confirming API status, loaded jobs, and model readiness."""
    is_loaded = model_loaded()
    return {
        "status": "ok",
        "service": "sonar-ai-backend",
        "model_loaded": is_loaded,
        "default_conf": settings.DEFAULT_CONF,
        "active_jobs_count": len(JOBS)
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True
    )
