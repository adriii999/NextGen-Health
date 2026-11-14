"""Script de inicio automático del servidor backend FastAPI."""
import sys
import uvicorn
from pathlib import Path

# Asegurar que el directorio raíz esté en sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from app.backend.config import settings


def main():
    print("=" * 65)
    print("   NEXTGEN-HEALTH | Servidor Backend de Atención Primaria")
    print("=" * 65)
    print(f" * Documentación Swagger: http://localhost:{settings.PORT}/docs")
    print(f" * Documentación ReDoc:   http://localhost:{settings.PORT}/redoc")
    print(f" * Verificación Health:   http://localhost:{settings.PORT}/api/health")
    print(f" * Inferencia Predict:    http://localhost:{settings.PORT}/api/predict")
    print(f" * Analíticas de Carpeta: http://localhost:{settings.PORT}/api/analiticas")
    print("=" * 65)

    uvicorn.run(
        "app.backend.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
        log_level="info",
    )


if __name__ == "__main__":
    main()
