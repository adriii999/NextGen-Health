from fastapi import APIRouter, Depends
from app.backend.api.deps import get_model_service
from app.backend.services.model_service import ModelService
from app.backend.config import settings

router = APIRouter(tags=["Health"])


@router.get("/health")
def check_health(model_service: ModelService = Depends(get_model_service)):
    """Verifica el estado del servicio y si el modelo de ML está implementado y cargado."""
    is_loaded = model_service.is_model_loaded()
    return {
        "status": "ok",
        "proyecto": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "modelo_cargado": is_loaded,
        "estado_modelo": "LISTO" if is_loaded else "PENDIENTE_ENTRENAMIENTO",
        "artefacto_esperado": str(settings.MODEL_PATH),
    }
