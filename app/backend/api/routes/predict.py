from fastapi import APIRouter, Depends, HTTPException, status
from app.backend.schemas.clinical import LabInput
from app.backend.schemas.response import EvaluationResponse
from app.backend.services.model_service import ModelService, ModelNotImplementedError
from app.backend.api.deps import get_model_service
from app.backend.config import settings

router = APIRouter(tags=["Inference"])


@router.post(
    "/predict",
    response_model=EvaluationResponse,
    status_code=status.HTTP_200_OK,
    responses={
        501: {
            "description": "Modelo de Machine Learning pendiente de entrenamiento o no encontrado.",
            "content": {
                "application/json": {
                    "example": {
                        "detail": {
                            "error": "MODELO_NO_IMPLEMENTADO",
                            "mensaje": "El modelo de Machine Learning no ha sido entrenado o no se encuentra en 'model/out/model_artifact.joblib'.",
                            "estado": "PENDIENTE_ENTRENAMIENTO",
                            "artefacto_esperado": "model/out/model_artifact.joblib",
                        }
                    }
                }
            },
        }
    },
)
def predict_clinical_risk(
    lab_data: LabInput,
    model_service: ModelService = Depends(get_model_service),
):
    """
    Evalúa una analítica clínica (Modo A aislada o Modo B con progresión).
    Si el artefacto del modelo no existe en disco, responde con HTTP 501 Not Implemented.
    """
    if not model_service.is_model_loaded():
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail={
                "error": "MODELO_NO_IMPLEMENTADO",
                "mensaje": f"El modelo de Machine Learning no ha sido entrenado o no se encuentra en '{settings.MODEL_PATH}'.",
                "estado": "PENDIENTE_ENTRENAMIENTO",
                "artefacto_esperado": str(settings.MODEL_PATH),
            },
        )

    try:
        return model_service.evaluate(lab_data)
    except ModelNotImplementedError as e:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail={
                "error": "MODELO_NO_IMPLEMENTADO",
                "mensaje": str(e),
                "estado": "PENDIENTE_ENTRENAMIENTO",
            },
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error durante la evaluación clínica: {str(e)}",
        )
