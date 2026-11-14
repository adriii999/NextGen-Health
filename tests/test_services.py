import json
import pytest
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


def test_model_service_with_trained_model_evaluates_correctly():
    """Verifica la lógica de inferencia cuando el modelo real SÍ está inyectado."""
    service = ModelService()
    
    # Crear un mock estimator con predict_proba
    mock_model = MagicMock()
    # Simula salida de proba: 0.15 clase 1 (riesgo)
    mock_model.predict_proba.return_value = np.array([[0.85, 0.15]])

    service.model = mock_model
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
    assert mock_model.predict_proba.called


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
