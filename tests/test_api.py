import json
import pytest
from unittest.mock import MagicMock
import numpy as np
import httpx

from app.backend.main import app
from app.backend.config import settings


# ==============================================================================
# 1. PRUEBAS EN SERVIDOR INSTANCIADO: ESTADO NO IMPLEMENTADO (501)
# ==============================================================================

def test_api_root_endpoint_provides_frontend_guide(http_client: httpx.Client):
    """GET / en el servidor instanciado responde 200 con la guía de conexión del frontend o el SPA."""
    response = http_client.get("/")
    assert response.status_code == 200
    # Si aún no hay dist/index.html, devuelve JSON de integración
    if "application/json" in response.headers.get("content-type", ""):
        data = response.json()
        assert "frontend_connection_guide" in data
        assert "http://localhost:5173" in str(data)


def test_api_health_shows_model_pending(http_client: httpx.Client):
    """GET /api/health en el servidor instanciado refleja que el modelo está pendiente."""
    response = http_client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["modelo_cargado"] is False
    assert data["estado_modelo"] == "PENDIENTE_ENTRENAMIENTO"
    assert "model_artifact.joblib" in data["artefacto_esperado"]


def test_api_predict_returns_501_not_implemented_without_model(http_client: httpx.Client):
    """REGLA ESTRICTA: POST /api/predict en el servidor instanciado responde 501 si no hay modelo."""
    payload = {
        "edad": 52,
        "sexo": 1,
        "bmi": 26.0,
        "ap_hi": 135,
        "ap_lo": 85,
        "colesterol_total": 210.0,
        "fuma": 0,
        "diabetes": 0,
        "egfr": 75.0,
        "uacr": 20.0,
        "progresion": None,
    }
    response = http_client.post("/api/predict", json=payload)
    assert response.status_code == 501, f"Esperado 501 Not Implemented pero el servidor devolvió {response.status_code}"
    data = response.json()["detail"]
    assert data["error"] == "MODELO_NO_IMPLEMENTADO"
    assert data["estado"] == "PENDIENTE_ENTRENAMIENTO"
    assert "model_artifact.joblib" in data["artefacto_esperado"]


def test_api_analizar_carpeta_returns_501_not_implemented_without_model(http_client: httpx.Client):
    """REGLA ESTRICTA: POST /api/analiticas/analizar-carpeta responde 501 si no hay modelo."""
    response = http_client.post("/api/analiticas/analizar-carpeta")
    assert response.status_code == 501
    data = response.json()["detail"]
    assert data["error"] == "MODELO_NO_IMPLEMENTADO"
    assert data["estado"] == "PENDIENTE_ENTRENAMIENTO"


def test_api_analiticas_list_works_independently(http_client: httpx.Client):
    """GET /api/analiticas responde 200 OK (listar archivos no depende de ML)."""
    response = http_client.get("/api/analiticas")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_api_predict_invalid_blood_pressure(http_client: httpx.Client):
    """La validación fisiológica Pydantic (422) ocurre en el servidor antes del modelo."""
    payload = {
        "edad": 50,
        "sexo": 1,
        "bmi": 25.0,
        "ap_hi": 120,
        "ap_lo": 125,  # Diastólica >= Sistólica
        "colesterol_total": 190.0,
        "fuma": 0,
        "diabetes": 0,
        "egfr": 90.0,
        "uacr": 15.0,
    }
    response = http_client.post("/api/predict", json=payload)
    assert response.status_code == 422


# ==============================================================================
# 2. PRUEBAS EN SERVIDOR INSTANCIADO CON MODELO INYECTADO (200 OK)
# ==============================================================================

def test_api_predict_returns_200_when_model_is_loaded(http_client: httpx.Client):
    """Verifica que con un modelo cargado en el servidor, responde con 200 OK y el contrato completo."""
    model_service = app.state.model_service
    model_service.models = {}
    model_service.explainers = {}
    for risk_name in model_service.thresholds:
        mock_model = MagicMock()
        mock_model.predict_proba.return_value = np.array([[0.80, 0.20]])
        model_service.models[risk_name] = mock_model
        explainer = MagicMock()
        explainer.shap_values.return_value = np.ones(
            (1, len(model_service.feature_names))
        )
        model_service.explainers[risk_name] = explainer
    model_service.artifact_loaded = True

    payload = {
        "edad": 58,
        "sexo": 1,
        "bmi": 27.2,
        "ap_hi": 138,
        "ap_lo": 86,
        "colesterol_total": 218.0,
        "fuma": 0,
        "diabetes": 1,
        "egfr": 68.0,
        "uacr": 38.5,
        "progresion": {
            "delta_egfr": -14.0,
            "delta_uacr": 22.0,
            "delta_ap_hi": 8.0,
            "delta_colesterol": 12.0,
            "delta_bmi": 1.1,
        },
    }
    try:
        response = http_client.post("/api/predict", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "hay_riesgo" in data
        assert "tipos_riesgo" in data
        assert "conclusion_diagnostica" in data
    finally:
        # Restaurar estado original sin modelo
        model_service.models = {}
        model_service.explainers = {}
        model_service.model = None
        model_service.artifact_loaded = False


# ==============================================================================
# 3. TEST ESPECIAL DE INTEGRACIÓN PARA AGENTES (SALTO EXPLICITO HASTA ENTRENAR)
# ==============================================================================

def test_status_modelo_real_en_disco(http_client: httpx.Client):
    """
    Test especial de integración:
    - Si el archivo model/out/model_artifact.joblib NO existe: SKIPPED con aviso para el agente integrador.
    - Si existe: realiza una llamada HTTP real al servidor instanciado verificando 200 OK.
    """
    if not settings.MODEL_PATH.exists():
        pytest.skip(
            f"ESTADO_INTEGRACION: Pendiente de modelo real en '{settings.MODEL_PATH}' por el equipo de ML."
        )

    # Con artefacto presente en disco
    app.state.model_service.load_artifacts(str(settings.MODEL_PATH))
    payload = {
        "edad": 50,
        "sexo": 1,
        "bmi": 24.0,
        "ap_hi": 125,
        "ap_lo": 80,
        "colesterol_total": 190.0,
        "fuma": 0,
        "diabetes": 0,
        "egfr": 90.0,
        "uacr": 12.0,
    }
    response = http_client.post("/api/predict", json=payload)
    assert response.status_code == 200
    assert "tipos_riesgo" in response.json()
