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
    assert set(result.motivos_prioridad) == {
        "ALERTA_CIRCULACION", "ALERTA_RINON_CORAZON", "PUNTUACION_ALTA"
    }
    assert all(model.predict_proba.called for model in service.models.values())
    assert result.factores_clave


def test_priority_reasons_reflect_actual_triggers():
    service = ModelService()
    renal = service._compute_kdigo_profile({"egfr": 50, "uacr": 100})
    reasons = service._priority_reasons(
        True, True, True,
        {"ap_hi": 170, "ap_lo": 80, "delta_egfr": -6},
        {"a": 0.5}, renal,
    )
    assert set(reasons) == {
        "ALERTA_CIRCULACION", "ALERTA_CORAZON", "ALERTA_RINON_CORAZON",
        "DESCENSO_RAPIDO", "RIESGO_RENAL_ALTO", "PRESION_ALTA",
        "PUNTUACION_ALTA", "TRES_ALERTAS",
    }
    assert service._priority_reasons(False, False, False, {}, {}, renal) == [
        "SIN_ALERTAS", "RIESGO_RENAL_ALTO"
    ]


@pytest.mark.parametrize(
    ("changes", "expected"),
    [
        ({"egfr": 35, "uacr": 340}, "RIESGO_RENAL_ALTO"),
        ({"ap_hi": 170}, "PRESION_ALTA"),
        ({"progresion": ProgressionDelta(delta_egfr=-6)}, "DESCENSO_RAPIDO"),
    ],
)
def test_observed_signals_are_not_hidden_by_no_model_alert(changes, expected):
    service = ModelService()
    service.models, service.explainers = {}, {}
    for name in service.thresholds:
        model, explainer = MagicMock(), MagicMock()
        model.predict_proba.return_value = np.array([[0.99, 0.01]])
        explainer.shap_values.return_value = np.zeros((1, len(service.feature_names)))
        service.models[name], service.explainers[name] = model, explainer
    service.artifact_loaded = True
    values = dict(edad=55, sexo=1, bmi=26, ap_hi=130, ap_lo=80,
                  colesterol_total=200, fuma=0, diabetes=0, egfr=90, uacr=10)
    result = service.evaluate(LabInput(**{**values, **changes}))
    assert result.hay_riesgo is False
    assert result.nivel_prioridad == "ALTA"
    assert expected in result.motivos_prioridad
    assert "sin riesgo cardiovascular" not in result.conclusion_diagnostica.lower()
    assert "iSGLT2" not in result.recomendacion_preventiva


def test_source_fingerprint_detects_file_content_changes(tmp_path):
    source = tmp_path / "paciente.json"
    source.write_text('{"egfr": 90}', encoding="utf-8")
    service = FileService(base_dir=tmp_path)
    before = service.source_fingerprint()
    assert before == service.source_fingerprint()
    source.write_text('{"egfr": 80}', encoding="utf-8")
    assert before != service.source_fingerprint()


def test_model_service_executes_shap_even_when_low_risk_and_describes_protective_factors():
    """
    En un entorno real de Atención Primaria, incluso cuando hay_riesgo=False,
    el modelo debe ejecutar TreeSHAP para mostrar factores protectores o limítrofes,
    y las descripciones médicas deben reflejar el estado real del paciente (ej. diabetes=0 -> Ausencia de diabetes).
    """
    service = ModelService()
    service.models = {}
    service.explainers = {}
    for risk_name in service.thresholds:
        model = MagicMock()
        model.predict_proba.return_value = np.array([[0.94, 0.06]])
        service.models[risk_name] = model
        explainer = MagicMock()
        # Valores SHAP negativos (protectores) en probabilidad
        shap_row = np.full((1, len(service.feature_names)), -0.02)
        # Hacer que egfr y diabetes tengan mayor magnitud protectora
        shap_row[0, service.feature_names.index("egfr")] = -0.06
        shap_row[0, service.feature_names.index("diabetes")] = -0.05
        explainer.shap_values.return_value = shap_row
        service.explainers[risk_name] = explainer

    service.thresholds = {
        "riesgo_aterosclerotico": 0.25,
        "riesgo_insuficiencia_cardiaca": 0.25,
        "riesgo_cardiorrenal": 0.25,
    }
    service.artifact_loaded = True

    lab = LabInput(
        edad=42, sexo=1, bmi=22.0, ap_hi=115, ap_lo=75,
        colesterol_total=170, fuma=0, diabetes=0, egfr=102, uacr=7,
    )
    result = service.evaluate(lab)

    assert result.hay_riesgo is False
    assert len(result.factores_clave) > 0, "Debe ejecutar SHAP incluso cuando hay_riesgo es False"
    diabetes_factor = next((f for f in result.factores_clave if f.variable == "diabetes"), None)
    assert diabetes_factor is not None
    assert diabetes_factor.impacto.startswith("-")
    assert "ausencia" in diabetes_factor.descripcion.lower() or "sin diabetes" in diabetes_factor.descripcion.lower()


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


def test_file_service_keeps_incomplete_patients_for_review(tmp_path):
    """An incomplete clinical record remains visible instead of disappearing or failing the batch."""
    complete = {
        "edad": 55, "sexo": 1, "bmi": 25.0, "ap_hi": 130, "ap_lo": 80,
        "colesterol_total": 200.0, "fuma": 0, "diabetes": 0, "egfr": 90.0, "uacr": 12.0,
    }
    (tmp_path / "completo.json").write_text(json.dumps(complete), encoding="utf-8")
    incomplete = {**complete, "uacr": None}
    (tmp_path / "pendiente.json").write_text(json.dumps(incomplete), encoding="utf-8")
    invalid = {**complete, "egfr": -1}
    (tmp_path / "invalido.json").write_text(json.dumps(invalid), encoding="utf-8")

    records = FileService(base_dir=tmp_path).load_all_analiticas()

    assert len(records) == 3
    by_file = {record.archivo: record for record in records}
    assert by_file["completo.json"].estado == "DATOS_VALIDOS"
    assert by_file["pendiente.json"].estado == "DATOS_INSUFICIENTES"
    assert by_file["pendiente.json"].lab_input is None
    assert by_file["pendiente.json"].campos_pendientes == ["uacr"]
    assert by_file["pendiente.json"].datos_entrada["uacr"] is None
    assert by_file["invalido.json"].estado == "DATOS_NO_VALIDOS"
    assert by_file["invalido.json"].lab_input is None
    assert "egfr" in by_file["invalido.json"].errores_datos


def test_file_service_keeps_csv_rows_with_missing_data(tmp_path):
    csv_path = tmp_path / "cupo.csv"
    csv_path.write_text(
        "edad,sexo,bmi,ap_hi,ap_lo,colesterol_total,fuma,diabetes,egfr,uacr\n"
        "62,1,27,132,82,198,0,1,72,\n",
        encoding="utf-8",
    )

    records = FileService(base_dir=tmp_path).load_all_analiticas()

    assert len(records) == 1
    assert records[0].archivo == "cupo.csv (fila 1)"
    assert records[0].estado == "DATOS_INSUFICIENTES"
    assert records[0].campos_pendientes == ["uacr"]
    assert records[0].lab_input is None


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


def test_model_service_assigns_high_priority_in_modo_a_for_severe_kdigo_or_high_risk():
    """
    En consulta real de Atención Primaria, un paciente de primera visita (Modo A, sin deltas)
    con daño renal severo (KDIGO ALTO/MUY_ALTO, ej. eGFR 35 y uACR 350) o riesgo elevado
    DEBE recibir nivel_prioridad == 'ALTA', no 'MEDIA'.
    """
    service = ModelService()
    service.models = {}
    service.explainers = {}
    for risk_name in service.thresholds:
        model = MagicMock()
        model.predict_proba.return_value = np.array([[0.25, 0.75]])
        service.models[risk_name] = model
        explainer = MagicMock()
        explainer.shap_values.return_value = np.full((1, len(service.feature_names)), 0.12)
        service.explainers[risk_name] = explainer
    service.artifact_loaded = True

    lab_modo_a_severo = LabInput(
        edad=67, sexo=2, bmi=31.0, ap_hi=168, ap_lo=96,
        colesterol_total=255.0, fuma=1, diabetes=1, egfr=35.0, uacr=340.0,
        progresion=None,
    )
    res = service.evaluate(lab_modo_a_severo)
    assert res.hay_riesgo is True
    assert res.nivel_prioridad == "ALTA"


def test_file_service_annualizes_deltas_when_visits_are_six_months_apart(tmp_path):
    """
    Si dos analíticas de seguimiento están separadas por 6 meses (ej. 2025-09-10 a 2026-03-10),
    la caída de -5.0 mL/min en medio año equivale a una tasa anualizada de ~ -10.0 mL/min/año.
    """
    pac_dir = tmp_path / "paciente_semestral"
    pac_dir.mkdir()
    v1 = {
        "fecha_analitica": "2025-09-10",
        "edad": 60, "sexo": 1, "bmi": 26.0, "ap_hi": 130, "ap_lo": 80,
        "colesterol_total": 190.0, "fuma": 0, "diabetes": 1, "egfr": 80.0, "uacr": 20.0,
    }
    v2 = {
        "fecha_analitica": "2026-03-10",
        "edad": 60.5, "sexo": 1, "bmi": 26.5, "ap_hi": 136, "ap_lo": 82,
        "colesterol_total": 196.0, "fuma": 0, "diabetes": 1, "egfr": 75.0, "uacr": 32.0,
    }
    (pac_dir / "2025-09_basal.json").write_text(json.dumps(v1), encoding="utf-8")
    (pac_dir / "2026-03_control.json").write_text(json.dumps(v2), encoding="utf-8")

    fs = FileService(base_dir=tmp_path)
    _, lab_b, _ = fs.load_single_item("paciente_semestral", modo="B")
    assert lab_b.progresion is not None
    # -5 mL/min en ~0.495 años -> ~ -10.1 mL/min/año
    assert lab_b.progresion.delta_egfr <= -9.5


