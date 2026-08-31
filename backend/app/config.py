import os
from pathlib import Path
from typing import List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    MODEL_WEIGHTS_PATH: str = "../models/model_a_unified_v2.pt"
    DEFAULT_CONF: float = 0.25
    MC_DROPOUT_PASSES: int = 15
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).parent.parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    def get_resolved_model_path(self) -> Path:
        """Resolve model weights path robustly whether running from backend/ or repo root."""
        p = Path(self.MODEL_WEIGHTS_PATH)
        if p.is_absolute() and p.exists():
            return p
        
        # Check relative to backend/ (where .env is)
        backend_dir = Path(__file__).parent.parent
        p_from_backend = (backend_dir / self.MODEL_WEIGHTS_PATH).resolve()
        if p_from_backend.exists():
            return p_from_backend
        
        # Check relative to repo root
        repo_root = backend_dir.parent
        p_from_root = (repo_root / self.MODEL_WEIGHTS_PATH).resolve()
        if p_from_root.exists():
            return p_from_root

        # Check standard models/ folder at repo root
        p_models = (repo_root / "models" / "model_a_unified_v2.pt").resolve()
        if p_models.exists():
            return p_models

        return p_from_backend

settings = Settings()
