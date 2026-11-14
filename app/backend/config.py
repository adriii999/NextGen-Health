import os
from pathlib import Path
from typing import List


class Settings:
    PROJECT_NAME: str = "NextGen-Health Backend API"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"

    # Rutas del repositorio
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    ANALITICAS_DIR: Path = BASE_DIR / "data" / "analiticas"
    MODEL_DIR: Path = BASE_DIR / "model" / "out"
    MODEL_PATH: Path = MODEL_DIR / "model_artifact.joblib"
    FRONTEND_DIR: Path = BASE_DIR / "app" / "frontend"
    FRONTEND_DIST_DIR: Path = FRONTEND_DIR / "dist"

    # Red y CORS
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]


settings = Settings()
