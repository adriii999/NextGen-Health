import json
import pytest
import joblib
from pathlib import Path
from unittest.mock import MagicMock
import numpy as np

from app.backend.schemas.clinical import LabInput, ProgressionDelta
from app.backend.services.model_service import ModelService, ModelNotImplementedError
from app.backend.services.file_service import FileService


def test_model_service_unloaded_raises_not_implemented():
    """Regla: Si el modelo no está cargado, evaluate() DEBE lanzar ModelNotImplementedError."""
    service = ModelService()
    service.load_artifacts("model/out/non_existent.joblib")
    assert service.is_model_loaded() is False

    lab = LabInput(
        edad=45,
        sexo=1,
        bmi=24.0,
        ap_hi=120,
        ap_lo=80,
        colesterol_total=180.0,
        fuma=0,
        diabetes=0,
        egfr=90.0,
        uacr=10.0,
    )
    # Debe fallar explícitamente y nunca inventar datos
    with pytest.raises(ModelNotImplementedError) as exc_info:
        service.evaluate(lab)
    assert "Se requiere entrenar el modelo" in str(exc_info.value)


def test_model_service_loads_complete_three_model_artifact(tmp_path):
    artifact_path = tmp_path / "model_artifact.joblib"
    risk_names = list(ModelService().thresholds)
    joblib.dump(
        {
            "models": {name: object() for name in risk_names},
            "explainers": {name: object() for name in risk_names},
            "thresholds": {name: 0.2 for name in risk_names},
            "feature_names": ModelService().feature_names,
        },
        artifact_path,
    )

    service = ModelService()

    assert service.load_artifacts(str(artifact_path)) is True
    assert service.is_model_loaded() is True
    assert set(service.models) == set(risk_names)


def test_model_service_rejects_incomplete_three_model_artifact(tmp_path):
    artifact_path = tmp_path / "incomplete.joblib"
    joblib.dump(
        {
            "models": {"riesgo_aterosclerotico": object()},
            "explainers": {},
            "thresholds": {},
            "feature_names": ModelService().feature_names,
        },
        artifact_path,
    )

    service = ModelService()

    assert service.load_artifacts(str(artifact_path)) is False
    assert service.is_model_loaded() is False


def test_model_service_with_trained_model_evaluates_correctly():
    """Verifica la evaluación cuando los tres clasificadores están inyectados."""
    service = ModelService()
    service.models = {}
    service.explainers = {}
    for risk_name in service.thresholds:
        model = MagicMock()
        model.predict_proba.return_value = np.array([[0.85, 0.15]])
        service.models[risk_name] = model
        explainer = MagicMock()
        explainer.shap_values.return_value = np.ones((1, len(service.feature_names)))
        service.explainers[risk_name] = explainer
    service.artifact_loaded = True

    lab = LabInput(
        edad=55,
        sexo=1,
        bmi=26.0,
        ap_hi=135,
        ap_lo=85,
        colesterol_total=210.0,
        fuma=0,
        diabetes=1,
        egfr=70.0,
        uacr=25.0,
    )
    result = service.evaluate(lab)
    assert result.hay_riesgo in [True, False]
    assert result.tipos_riesgo is not None
    assert all(model.predict_proba.called for model in service.models.values())


def test_model_service_uses_independent_models_and_thresholds():
    service = ModelService()
    model_probabilities = {
        "riesgo_aterosclerotico": 0.73,
        "riesgo_insuficiencia_cardiaca": 0.21,
        "riesgo_cardiorrenal": 0.11,
    }
    service.models = {}
    service.explainers = {}
    for risk_name, probability in model_probabilities.items():
        model = MagicMock()
        model.predict_proba.return_value = np.array([[1.0 - probability, probability]])
        service.models[risk_name] = model
        explainer = MagicMock()
        explainer.shap_values.return_value = np.ones((1, len(service.feature_names)))
        service.explainers[risk_name] = explainer
    service.thresholds = {
        "riesgo_aterosclerotico": 0.5,
        "riesgo_insuficiencia_cardiaca": 0.25,
        "riesgo_cardiorrenal": 0.1,
    }
    service.artifact_loaded = True

    lab = LabInput(
        edad=55, sexo=1, bmi=26, ap_hi=135, ap_lo=85,
        colesterol_total=210, fuma=0, diabetes=1, egfr=70, uacr=25,
    )
    result = service.evaluate(lab)

    assert result.tipos_riesgo.riesgo_aterosclerotico.valor == 0.73
    assert result.tipos_riesgo.riesgo_insuficiencia_cardiaca.valor == 0.21
    assert result.tipos_riesgo.riesgo_cardiorrenal.valor == 0.11
    assert result.tipos_riesgo.riesgo_aterosclerotico.alerta is True
    assert result.tipos_riesgo.riesgo_insuficiencia_cardiaca.alerta is False
    assert result.tipos_riesgo.riesgo_cardiorrenal.alerta is True
    assert all(model.predict_proba.called for model in service.models.values())
    assert result.factores_clave


def test_file_service_empty_folder(tmp_path):
    """FileService maneja carpetas vacías sin arrojar excepción."""
    fs = FileService(base_dir=tmp_path)
    items = fs.scan_folder()
    assert items == []


def test_file_service_parses_json_and_csv(tmp_path):
    """FileService parsea correctamente archivos JSON y CSV de analíticas."""
    fs = FileService(base_dir=tmp_path)

    json_path = tmp_path / "analitica_01.json"
    json_path.write_text(
        json.dumps(
            {
                "edad": 55,
                "sexo": 1,
                "bmi": 25.0,
                "ap_hi": 130,
                "ap_lo": 80,
                "colesterol_total": 200.0,
                "fuma": 0,
                "diabetes": 0,
                "egfr": 90.0,
                "uacr": 12.0,
            }
        ),
        encoding="utf-8",
    )

    csv_path = tmp_path / "analitica_02.csv"
    csv_path.write_text(
        "edad,sexo,bmi,ap_hi,ap_lo,colesterol_total,fuma,diabetes,egfr,uacr,delta_egfr\n"
        "60,2,28.0,140,88,220.0,1,1,65.0,40.0,-10.0\n",
        encoding="utf-8",
    )

    items = fs.scan_folder()
    assert len(items) == 2
    filenames = [item.archivo for item in items]
    assert "analitica_01.json" in filenames
    assert "analitica_02.csv" in filenames


def test_file_service_patient_folders_modo_a_and_modo_b(tmp_path):
    """
    Verifica que FileService soporte carpetas de pacientes con múltiples analíticas
    cronológicas y permita cargar tanto todo el seguimiento (Modo B con deltas calculados
    entre T-1 y T) como una analítica aislada (Modo A con progresion=None).
    """
    pac_dir = tmp_path / "paciente_02_trampa"
    pac_dir.mkdir()

    visita_1 = {
        "paciente_id": "paciente_02_trampa",
        "nombre": "Paciente 02 Trampa",
        "fecha_analitica": "2025-03-10",
        "edad": 55,
        "sexo": 1,
        "bmi": 25.7,
        "ap_hi": 120,
        "ap_lo": 78,
        "colesterol_total": 189.0,
        "fuma": 0,
        "diabetes": 1,
        "egfr": 91.0,
        "uacr": 6.0,
    }
    visita_2 = {
        "paciente_id": "paciente_02_trampa",
        "nombre": "Paciente 02 Trampa",
        "fecha_analitica": "2026-03-10",
        "edad": 56,
        "sexo": 1,
        "bmi": 26.5,
        "ap_hi": 128,
        "ap_lo": 82,
        "colesterol_total": 195.0,
        "fuma": 0,
        "diabetes": 1,
        "egfr": 82.0,
        "uacr": 28.0,
    }
    (pac_dir / "2025-03_basal.json").write_text(json.dumps(visita_1), encoding="utf-8")
    (pac_dir / "2026-03_control.json").write_text(json.dumps(visita_2), encoding="utf-8")

    fs = FileService(base_dir=tmp_path)
    items = fs.scan_folder()
    assert len(items) == 1
    folder_item = items[0]
    assert folder_item.archivo == "paciente_02_trampa"
    assert folder_item.es_carpeta is True
    assert folder_item.num_analiticas == 2
    assert folder_item.tiene_progresion is True
    assert len(folder_item.analiticas) == 2

    # Cargar en Modo B (Seguimiento completo -> calcula deltas entre 2025-03 y 2026-03)
    _, lab_b, raw_b = fs.load_single_item("paciente_02_trampa", modo="B")
    assert lab_b.progresion is not None
    assert lab_b.progresion.delta_egfr == pytest.approx(-9.0)
    assert lab_b.progresion.delta_uacr == pytest.approx(22.0)
    assert lab_b.progresion.delta_ap_hi == pytest.approx(8.0)
    assert lab_b.progresion.delta_colesterol == pytest.approx(6.0)
    assert lab_b.progresion.delta_bmi == pytest.approx(0.8)
    assert raw_b["modo_evaluacion"] == "MODO_B"

    # Cargar en Modo A (Analítica sola -> progresion debe ser None)
    _, lab_a, raw_a = fs.load_single_item(
        "paciente_02_trampa", modo="A", analitica_archivo="2026-03_control.json"
    )
    assert lab_a.progresion is None
    assert lab_a.egfr == pytest.approx(82.0)
    assert raw_a["modo_evaluacion"] == "MODO_A"

