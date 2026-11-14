from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.backend.schemas.response import (
    AnaliticaItem,
    AnaliticaEvaluadaItem,
    AnaliticaLoteItem,
    EvaluarAnaliticaRequest,
)
from app.backend.services.file_service import FileService
from app.backend.services.model_service import ModelService, ModelNotImplementedError
from app.backend.api.deps import get_file_service, get_model_service
from app.backend.config import settings
from app.backend.schemas.upload import PatientUpload
from app.backend.schemas.clinical import LabInput
from pydantic import ValidationError

router = APIRouter(prefix="/analiticas", tags=["Analíticas de Carpeta"])


@router.post("/validar-carga")
def validate_uploaded_patient(request: PatientUpload):
    """Valida las visitas enviadas desde el navegador sin almacenarlas en disco."""
    try:
        return request.clinical_data()
    except ValidationError:
        raise HTTPException(422, detail="La progresión calculada está fuera de los rangos admitidos. Revisa fechas y valores.")


@router.post("/evaluar-carga", response_model=AnaliticaEvaluadaItem)
def evaluate_uploaded_patient(
    request: PatientUpload,
    model_service: ModelService = Depends(get_model_service),
):
    raw = validate_uploaded_patient(request)
    try:
        evaluation = model_service.evaluate(LabInput(**raw))
    except ModelNotImplementedError as exc:
        raise HTTPException(501, detail=str(exc))
    return AnaliticaEvaluadaItem(
        archivo=raw["analitica_evaluada"], evaluacion=evaluation, datos_entrada=raw
    )


@router.get("", response_model=List[AnaliticaItem], status_code=status.HTTP_200_OK)
def list_analiticas(file_service: FileService = Depends(get_file_service)):
    """Lista las carpetas de seguimiento de pacientes y analíticas en data/analiticas/."""
    return file_service.scan_folder()


@router.get("/version-fuentes")
def source_version(file_service: FileService = Depends(get_file_service)):
    return {"version": file_service.source_fingerprint()}


@router.post(
    "/evaluar",
    response_model=AnaliticaEvaluadaItem,
    status_code=status.HTTP_200_OK,
    responses={
        501: {
            "description": "Modelo de Machine Learning pendiente de entrenamiento o no encontrado.",
        },
        404: {
            "description": "Paciente o analítica no encontrada en data/analiticas/.",
        },
    },
)
def evaluate_single_patient_or_lab(
    request: EvaluarAnaliticaRequest,
    file_service: FileService = Depends(get_file_service),
    model_service: ModelService = Depends(get_model_service),
):
    """
    Evalúa un seguimiento de paciente completo (Modo B, calculando la progresión entre visitas)
    o una analítica individual aislada (Modo A, sin historial de progresión).
    """
    if not model_service.is_model_loaded():
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail={
                "error": "MODELO_NO_IMPLEMENTADO",
                "mensaje": f"No se puede evaluar la analítica porque el modelo de ML no se encuentra en '{settings.MODEL_PATH}'.",
                "estado": "PENDIENTE_ENTRENAMIENTO",
                "artefacto_esperado": str(settings.MODEL_PATH),
            },
        )

    if request.analiticas_archivos is not None:
        try:
            visits = file_service.load_selected_visits(request.paciente_id, request.analiticas_archivos)
            upload = PatientUpload(visitas=visits, modo="B" if len(visits) > 1 else "A")
        except FileNotFoundError as exc:
            raise HTTPException(404, detail=str(exc))
        except (ValueError, ValidationError) as exc:
            raise HTTPException(422, detail=str(exc))
        return evaluate_uploaded_patient(upload, model_service)

    parsed = file_service.load_single_item(
        paciente_id=request.paciente_id,
        modo=request.modo,
        analitica_archivo=request.analitica_archivo,
    )
    if parsed is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontró el seguimiento o analítica '{request.paciente_id}' en '{settings.ANALITICAS_DIR}'.",
        )

    filename, lab_input, raw_data = parsed
    try:
        evaluation = model_service.evaluate(lab_input)
        return AnaliticaEvaluadaItem(
            archivo=filename,
            evaluacion=evaluation,
            datos_entrada=raw_data,
        )
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
            detail=f"Error al evaluar '{request.paciente_id}': {str(e)}",
        )


@router.post(
    "/analizar-carpeta",
    response_model=List[AnaliticaLoteItem],
    status_code=status.HTTP_200_OK,
    responses={
        501: {
            "description": "Modelo de Machine Learning pendiente de entrenamiento o no encontrado.",
        }
    },
)
def analyze_folder_analiticas(
    modo: Optional[str] = Query("B", description="'B' para seguimiento completo, 'A' para analítica aislada"),
    file_service: FileService = Depends(get_file_service),
    model_service: ModelService = Depends(get_model_service),
):
    """
    Flujo principal en 1 Clic:
    Carga todas las carpetas de pacientes en data/analiticas/ y ejecuta la evaluación clínica
    (por defecto en Modo B de seguimiento longitudinal si existen >=2 analíticas por paciente,
    o Modo A si se solicita modo='A' o el paciente tiene una única analítica).
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
        items = file_service.load_all_analiticas(modo=modo or "B")
        if not items:
            return []

        evaluated_list: List[AnaliticaLoteItem] = []
        pending_list: List[AnaliticaLoteItem] = []
        for item in items:
            if item.lab_input is None:
                pending_list.append(AnaliticaLoteItem(
                    archivo=item.archivo,
                    estado=item.estado,
                    campos_pendientes=item.campos_pendientes,
                    errores_datos=item.errores_datos,
                    datos_entrada=item.datos_entrada,
                ))
                continue
            evaluation = model_service.evaluate(item.lab_input)
            evaluated_list.append(AnaliticaLoteItem(
                archivo=item.archivo,
                estado="EVALUADA",
                evaluacion=evaluation,
                datos_entrada=item.datos_entrada,
            ))

        # Ordenar por severidad: Prioridad ALTA > MEDIA > BAJA y riesgo máximo descendente
        priority_order = {"ALTA": 3, "MEDIA": 2, "BAJA": 1}

        def sort_key(item: AnaliticaLoteItem):
            prio_val = priority_order.get(item.evaluacion.nivel_prioridad, 0)
            max_risk = max(
                item.evaluacion.tipos_riesgo.riesgo_aterosclerotico.valor,
                item.evaluacion.tipos_riesgo.riesgo_insuficiencia_cardiaca.valor,
                item.evaluacion.tipos_riesgo.riesgo_cardiorrenal.valor,
            )
            return (prio_val, max_risk)

        evaluated_list.sort(key=sort_key, reverse=True)
        return evaluated_list + pending_list

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
