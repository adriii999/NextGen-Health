from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from app.backend.schemas.response import AnaliticaItem, AnaliticaEvaluadaItem
from app.backend.services.file_service import FileService
from app.backend.services.model_service import ModelService, ModelNotImplementedError
from app.backend.api.deps import get_file_service, get_model_service
from app.backend.config import settings

router = APIRouter(prefix="/analiticas", tags=["Analíticas de Carpeta"])


@router.get("", response_model=List[AnaliticaItem], status_code=status.HTTP_200_OK)
def list_analiticas(file_service: FileService = Depends(get_file_service)):
    """Lista las analíticas encontradas en la carpeta de datos (totalmente implementado e independiente del modelo)."""
    return file_service.scan_folder()


@router.post(
    "/analizar-carpeta",
    response_model=List[AnaliticaEvaluadaItem],
    status_code=status.HTTP_200_OK,
    responses={
        501: {
            "description": "Modelo de Machine Learning pendiente de entrenamiento o no encontrado.",
        }
    },
)
def analyze_folder_analiticas(
    file_service: FileService = Depends(get_file_service),
    model_service: ModelService = Depends(get_model_service),
):
    """
    Flujo principal en 1 Clic:
    Carga todas las analíticas de la carpeta y ejecuta la evaluación clínica.
    Si el artefacto del modelo no se encuentra en disco, devuelve HTTP 501 Not Implemented.
    """
    if not model_service.is_model_loaded():
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail={
                "error": "MODELO_NO_IMPLEMENTADO",
                "mensaje": f"No se pueden analizar las analíticas de la carpeta porque el modelo de ML no se encuentra en '{settings.MODEL_PATH}'.",
                "estado": "PENDIENTE_ENTRENAMIENTO",
                "artefacto_esperado": str(settings.MODEL_PATH),
            },
        )

    try:
        items = file_service.load_all_analiticas()
        if not items:
            return []

        evaluated_list: List[AnaliticaEvaluadaItem] = []
        for filename, lab_input, raw_data in items:
            evaluation = model_service.evaluate(lab_input)
            evaluated_list.append(
                AnaliticaEvaluadaItem(
                    archivo=filename,
                    evaluacion=evaluation,
                    datos_entrada=raw_data,
                )
            )

        # Ordenar por severidad: Prioridad ALTA > MEDIA > BAJA y riesgo máximo descendente
        priority_order = {"ALTA": 3, "MEDIA": 2, "BAJA": 1}

        def sort_key(item: AnaliticaEvaluadaItem):
            prio_val = priority_order.get(item.evaluacion.nivel_prioridad, 0)
            max_risk = max(
                item.evaluacion.tipos_riesgo.riesgo_aterosclerotico.valor,
                item.evaluacion.tipos_riesgo.riesgo_insuficiencia_cardiaca.valor,
                item.evaluacion.tipos_riesgo.riesgo_cardiorrenal.valor,
            )
            return (prio_val, max_risk)

        evaluated_list.sort(key=sort_key, reverse=True)
        return evaluated_list

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
            detail=f"Error al procesar el lote de analíticas de la carpeta: {str(e)}",
        )
