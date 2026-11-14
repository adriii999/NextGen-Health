"""
Pruebas de Verificación Clínica a través de las Rutas de la API (/api/predict).
Evalúa las dos modalidades clínicas esenciales del proyecto:
1. Modo A (Analítica sola / corte transversal): sin histórico longitudinal (progresion = None).
2. Modo B (Seguimiento longitudinal): con deltas interanuales (progresion = {...}).
Incluye evaluación de casos reales extraídos del dataset.csv (sin variables target).
"""
import pytest
import httpx
import pandas as pd
from pathlib import Path

from app.backend.main import app
from app.backend.config import settings


@pytest.fixture(autouse=True)
def ensure_model_loaded():
    """Asegura que el artefacto entrenado esté cargado para los tests de API clínica."""
    if not settings.MODEL_PATH.exists():
        pytest.skip(f"Artefacto {settings.MODEL_PATH} no encontrado en disco.")
    app.state.model_service.load_artifacts(str(settings.MODEL_PATH))


# ==============================================================================
# 1. PRUEBAS MODO A: ANALÍTICA AISLADA (SIN DELTAS / CORTE TRANSVERSAL)
# ==============================================================================

def test_api_predict_modo_a_control_sano(http_client: httpx.Client):
    """
    Modo A - Paciente Sano:
    Valores dentro de normalidad estricta y sin historial previo.
    Resultado esperado:
    - HTTP 200
    - hay_riesgo: False
    - nivel_prioridad: "BAJA"
    - Sin alertas activas en ningún fenotipo
    - Perfil KDIGO en riesgo BAJO y progresor_rapido: False
    """
    payload = {
        "edad": 42.0,
        "sexo": 1,
        "bmi": 22.5,
        "ap_hi": 115.0,
        "ap_lo": 75.0,
        "colesterol_total": 170.0,
        "fuma": 0,
        "diabetes": 0,
        "egfr": 102.0,
        "uacr": 7.0,
        "progresion": None,
    }
    response = http_client.post("/api/predict", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["hay_riesgo"] is False
    assert data["nivel_prioridad"] == "BAJA"
    assert data["perfil_renal"]["cuadrante_kdigo"] == "BAJO"
    assert data["perfil_renal"]["progresor_rapido"] is False

    tipos = data["tipos_riesgo"]
    assert tipos["riesgo_aterosclerotico"]["alerta"] is False
    assert tipos["riesgo_insuficiencia_cardiaca"]["alerta"] is False
    assert tipos["riesgo_cardiorrenal"]["alerta"] is False
    # Incluso en control sano debe ejecutar SHAP y devolver factores clave (protectores/basales)
    assert len(data["factores_clave"]) > 0


def test_api_predict_modo_a_alto_riesgo_franco(http_client: httpx.Client):
    """
    Modo A - Paciente con Alto Riesgo Franco:
    HTA Grado 2 (165/100), dislipidemia (260 mg/dL), diabetes, tabaquismo activo,
    filtrado renal deprimido (eGFR 50) y microalbuminuria franca (uACR 95).
    Resultado esperado:
    - HTTP 200
    - hay_riesgo: True
    - nivel_prioridad: "MEDIA" o "ALTA"
    - Alertas activas en fenotipos aterosclerótico y cardiorrenal
    - Factores clave con explicaciones SHAP reales (egfr, uacr o colesterol)
    """
    payload = {
        "edad": 65.0,
        "sexo": 2,
        "bmi": 32.0,
        "ap_hi": 165.0,
        "ap_lo": 98.0,
        "colesterol_total": 260.0,
        "fuma": 1,
        "diabetes": 1,
        "egfr": 50.0,
        "uacr": 95.0,
        "progresion": None,
    }
    response = http_client.post("/api/predict", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["hay_riesgo"] is True
    assert data["nivel_prioridad"] == "ALTA"

    tipos = data["tipos_riesgo"]
    assert tipos["riesgo_aterosclerotico"]["alerta"] is True
    assert tipos["riesgo_cardiorrenal"]["alerta"] is True

    # Comprobar explicabilidad SHAP real
    factores = data["factores_clave"]
    assert len(factores) > 0
    vars_explicadas = [f["variable"] for f in factores]
    assert any(v in vars_explicadas for v in ["egfr", "uacr", "colesterol_total", "ap_hi"])


# ==============================================================================
# 2. PRUEBAS MODO B: SEGUIMIENTO LONGITUDINAL (CON DELTAS TEMPORALES)
# ==============================================================================

def test_api_predict_modo_b_seguimiento_estable(http_client: httpx.Client):
    """
    Modo B - Paciente Estable en Seguimiento:
    Seguimiento a 1 año con fluctuaciones fisiológicas benignas (caída eGFR < 1 mL/min/año).
    Resultado esperado:
    - HTTP 200
    - hay_riesgo: False
    - nivel_prioridad: "BAJA"
    - progresor_rapido: False
    """
    payload = {
        "edad": 53.0,
        "sexo": 1,
        "bmi": 24.5,
        "ap_hi": 122.0,
        "ap_lo": 78.0,
        "colesterol_total": 182.0,
        "fuma": 0,
        "diabetes": 0,
        "egfr": 94.0,
        "uacr": 9.0,
        "progresion": {
            "delta_egfr": -0.8,
            "delta_uacr": 0.5,
            "delta_ap_hi": 1.0,
            "delta_colesterol": -2.0,
            "delta_bmi": 0.1,
        },
    }
    response = http_client.post("/api/predict", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["hay_riesgo"] is False
    assert data["nivel_prioridad"] == "BAJA"
    assert data["perfil_renal"]["progresor_rapido"] is False


def test_api_predict_modo_b_trampa_rango_normal_deterioro_silente(http_client: httpx.Client):
    """
    Modo B - 'La Trampa del Rango Normal':
    Valores estáticos dentro de rangos habituales de laboratorio:
    eGFR 82 mL/min (G2 'leve'), uACR 28 mg/g (A1 normal-alto < 30), PAS 128 mmHg.
    PERO con deterioro longitudinal acelerado en 1 año:
    delta_egfr: -9.0 mL/min/año (umbral patológico KDIGO: -5.0), delta_uacr: +22.0 mg/g.
    Resultado esperado:
    - HTTP 200
    - hay_riesgo: True
    - nivel_prioridad: "ALTA" (por progresión acelerada)
    - alerta en riesgo_cardiorrenal: True
    - perfil_renal.progresor_rapido: True con descripción de alerta
    - Factores SHAP identifican delta_egfr o delta_uacr en primer lugar
    """
    payload = {
        "edad": 56.0,
        "sexo": 1,
        "bmi": 26.5,
        "ap_hi": 128.0,
        "ap_lo": 82.0,
        "colesterol_total": 195.0,
        "fuma": 0,
        "diabetes": 1,
        "egfr": 82.0,
        "uacr": 28.0,
        "progresion": {
            "delta_egfr": -9.0,
            "delta_uacr": 22.0,
            "delta_ap_hi": 8.0,
            "delta_colesterol": 6.0,
            "delta_bmi": 0.8,
        },
    }
    response = http_client.post("/api/predict", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["hay_riesgo"] is True
    assert data["nivel_prioridad"] == "ALTA"
    assert data["tipos_riesgo"]["riesgo_cardiorrenal"]["alerta"] is True
    assert data["perfil_renal"]["progresor_rapido"] is True
    assert "ALERTA NEFROLÓGICA" in data["perfil_renal"]["descripcion_clinica"]

    # Factores SHAP deben incluir las variables dinámicas del deterioro
    factores = data["factores_clave"]
    assert len(factores) > 0
    vars_explicadas = [f["variable"] for f in factores]
    assert "delta_egfr" in vars_explicadas or "delta_uacr" in vars_explicadas


# ==============================================================================
# 3. PRUEBAS CON CASOS REALES EXTRAÍDOS DEL DATASET (SIN ETIQUETA TARGET)
# ==============================================================================

def test_api_predict_casos_reales_extraidos_del_dataset(http_client: httpx.Client):
    """
    Extrae casos reales directamente de data/processed/dataset.csv, elimina las
    columnas target y valida que la API responda conforme al perfil clínico real.
    """
    dataset_path = Path("data/processed/dataset.csv")
    if not dataset_path.exists():
        dataset_path = Path("data/raw/dataset.csv")
    assert dataset_path.exists(), "dataset.csv no encontrado!"

    df = pd.read_csv(dataset_path)

    # 1. Caso Real Modo A Control (target_cardio == 0, sin deltas y constantes en rango óptimo)
    row_ctrl = df[
        (df["target_cardio"] == 0)
        & (df["delta_egfr"].isna())
        & (df["ap_hi"] <= 125.0)
        & (df["bmi"] <= 25.0)
        & (df["colesterol_total"] <= 200.0)
    ].iloc[0]
    payload_ctrl = {
        "edad": float(row_ctrl["edad"]),
        "sexo": int(row_ctrl["sexo"]),
        "bmi": float(row_ctrl["bmi"]),
        "ap_hi": float(row_ctrl["ap_hi"]),
        "ap_lo": float(row_ctrl["ap_lo"]),
        "colesterol_total": float(row_ctrl["colesterol_total"]),
        "fuma": int(row_ctrl["fuma"]),
        "diabetes": int(row_ctrl["diabetes"]),
        "egfr": float(row_ctrl["egfr"]),
        "uacr": float(row_ctrl["uacr"]),
        "progresion": None,
    }
    res_ctrl = http_client.post("/api/predict", json=payload_ctrl)
    assert res_ctrl.status_code == 200
    data_ctrl = res_ctrl.json()
    assert data_ctrl["hay_riesgo"] is False
    assert data_ctrl["nivel_prioridad"] == "BAJA"

    # 2. Caso Real Modo B Progresor Rápido (eGFR basal >= 60 pero delta_egfr <= -6.0)
    row_trampa = df[(df["egfr"] >= 60.0) & (df["delta_egfr"] <= -6.0)].iloc[0]
    payload_trampa = {
        "edad": float(row_trampa["edad"]),
        "sexo": int(row_trampa["sexo"]),
        "bmi": float(row_trampa["bmi"]),
        "ap_hi": float(row_trampa["ap_hi"]),
        "ap_lo": float(row_trampa["ap_lo"]),
        "colesterol_total": float(row_trampa["colesterol_total"]),
        "fuma": int(row_trampa["fuma"]),
        "diabetes": int(row_trampa["diabetes"]),
        "egfr": float(row_trampa["egfr"]),
        "uacr": float(row_trampa["uacr"]),
        "progresion": {
            "delta_egfr": float(row_trampa["delta_egfr"]),
            "delta_uacr": float(row_trampa["delta_uacr"]),
            "delta_ap_hi": float(row_trampa["delta_ap_hi"]),
            "delta_colesterol": float(row_trampa["delta_colesterol"]),
            "delta_bmi": float(row_trampa["delta_bmi"]),
        },
    }
    res_trampa = http_client.post("/api/predict", json=payload_trampa)
    assert res_trampa.status_code == 200
    data_trampa = res_trampa.json()
    assert data_trampa["hay_riesgo"] is True
    assert data_trampa["nivel_prioridad"] == "ALTA"
    assert data_trampa["perfil_renal"]["progresor_rapido"] is True
    assert len(data_trampa["factores_clave"]) > 0


# ==============================================================================
# 4. PRUEBAS DE CARPETAS DE PACIENTES EN /api/analiticas (MODO A Y MODO B)
# ==============================================================================

def test_api_analiticas_carpetas_pacientes_modo_a_y_modo_b(http_client: httpx.Client):
    """
    Verifica que GET /api/analiticas devuelva las carpetas de seguimiento de pacientes
    con sus analíticas individuales, y que POST /api/analiticas/evaluar permita
    ejecutar tanto el seguimiento completo (Modo B) como una analítica aislada (Modo A).
    """
    res_list = http_client.get("/api/analiticas")
    assert res_list.status_code == 200
    carpetas = res_list.json()
    assert len(carpetas) >= 4

    # Buscar la carpeta del paciente con deterioro silente ("Trampa del Rango Normal")
    trampa_folder = next(
        (c for c in carpetas if "trampa" in c["archivo"].lower()),
        None,
    )
    assert trampa_folder is not None, "Debe existir la carpeta de seguimiento de trampa del rango normal"
    assert trampa_folder["es_carpeta"] is True
    assert trampa_folder["num_analiticas"] >= 2
    assert trampa_folder["tiene_progresion"] is True
    assert len(trampa_folder["analiticas"]) >= 2

    paciente_id = trampa_folder["archivo"]
    ultima_visita = trampa_folder["analiticas"][-1]["nombre_archivo"]

    # 1. Evaluar en Modo A (Analítica sola / aislada sin deltas históricos)
    res_modo_a = http_client.post(
        "/api/analiticas/evaluar",
        json={
            "paciente_id": paciente_id,
            "modo": "A",
            "analitica_archivo": ultima_visita,
        },
    )
    assert res_modo_a.status_code == 200
    item_a = res_modo_a.json()
    assert item_a["datos_entrada"]["modo_evaluacion"] == "MODO_A"
    assert item_a["datos_entrada"]["progresion"] is None
    assert item_a["evaluacion"]["perfil_renal"]["progresor_rapido"] is False

    # 2. Evaluar en Modo B (Seguimiento longitudinal completo de la carpeta)
    res_modo_b = http_client.post(
        "/api/analiticas/evaluar",
        json={
            "paciente_id": paciente_id,
            "modo": "B",
        },
    )
    assert res_modo_b.status_code == 200
    item_b = res_modo_b.json()
    assert item_b["datos_entrada"]["modo_evaluacion"] == "MODO_B"
    assert item_b["datos_entrada"]["progresion"] is not None
    assert item_b["evaluacion"]["hay_riesgo"] is True
    assert item_b["evaluacion"]["nivel_prioridad"] == "ALTA"
    assert item_b["evaluacion"]["perfil_renal"]["progresor_rapido"] is True

