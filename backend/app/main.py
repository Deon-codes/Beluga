import logging
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.routers import survey
from app.pipeline.detect import model_loaded

# Setup basic logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("sonar_ai")

STORAGE_DIR = Path(__file__).parent / "storage"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="SONAR-AI Inference & Reporting Engine",
    description="Automated sonar seabed anomaly detection, hydrographic measurement, and survey reporting for MoES / NIOT (SIH 26057).",
    version="1.0.0"
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

# Mount static storage for image inspection
app.mount("/storage", StaticFiles(directory=str(STORAGE_DIR)), name="storage")

@app.get("/health", tags=["Health & Diagnostics"])
def health_check():
    """Health check endpoint confirming API status and model readiness."""
    is_loaded = model_loaded()
    return {
        "status": "ok",
        "service": "sonar-ai-backend",
        "model_loaded": is_loaded,
        "default_conf": settings.DEFAULT_CONF
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True
    )
