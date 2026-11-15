import pytest
from pydantic import ValidationError

from app.backend.schemas.clinical import LabInput, ProgressionDelta
from app.backend.schemas.response import (
    EvaluationResponse,
    TiposRiesgo,
    RiesgoItem,
    FactorClave,
)


def test_lab_input_valid_mode_a():
    """Modo A: Analítica aislada sin datos previos (progresion=None)."""
    data = {
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
        "progresion": None,
    }
    model = LabInput(**data)
    assert model.edad == 58
    assert model.progresion is None
    assert model.colesterol_total == 218.0


def test_lab_input_valid_mode_b():
    """Modo B: Analítica con progresión temporal (deltas)."""
    data = {
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
    model = LabInput(**data)
    assert model.progresion is not None
    assert model.progresion.delta_egfr == -14.0
    assert model.progresion.delta_uacr == 22.0


def test_blood_pressure_cross_validation():
    """Valida que ap_lo >= ap_hi arroje un error de validación fisiológico."""
    invalid_data = {
        "edad": 50,
        "sexo": 1,
        "bmi": 24.0,
        "ap_hi": 110,
        "ap_lo": 120,  # Diastólica mayor que sistólica (imposible)
        "colesterol_total": 180.0,
        "fuma": 0,
        "diabetes": 0,
        "egfr": 95.0,
        "uacr": 10.0,
    }
    with pytest.raises(ValidationError) as exc_info:
        LabInput(**invalid_data)
    assert "diastólica" in str(exc_info.value).lower()


def test_boundary_validations():
    """Valida que valores fuera de rango fisiológico fallen."""
    base_data = {
        "edad": 15,  # Menor de 18
        "sexo": 1,
        "bmi": 24.0,
        "ap_hi": 120,
        "ap_lo": 80,
        "colesterol_total": 180.0,
        "fuma": 0,
        "diabetes": 0,
        "egfr": 90.0,
        "uacr": 12.0,
    }
    with pytest.raises(ValidationError):
        LabInput(**base_data)


def test_evaluation_response_schema():
    """Valida que la respuesta multidimensional cumpla el contrato."""
    response_data = {
        "hay_riesgo": True,
        "conclusion_diagnostica": "Riesgo detectado: sospecha de deterioro cardiorrenal.",
        "nivel_prioridad": "ALTA",
        "tipos_riesgo": {
            "riesgo_aterosclerotico": {
                "valor": 0.08,
                "umbral": 0.25,
                "alerta": False,
                "interpretacion": "Bajo",
            },
            "riesgo_insuficiencia_cardiaca": {
                "valor": 0.34,
                "umbral": 0.28,
                "alerta": True,
                "interpretacion": "Moderado-Alto",
            },
            "riesgo_cardiorrenal": {
                "valor": 0.52,
                "umbral": 0.30,
                "alerta": True,
                "interpretacion": "Alto",
            },
            "riesgo_microvascular": {
                "valor": 0.41,
                "umbral": 0.28,
                "alerta": True,
                "interpretacion": "Alto",
            },
            "riesgo_cardiometabolico": {
                "valor": 0.12,
                "umbral": 0.30,
                "alerta": False,
                "interpretacion": "Bajo",
            },
        },
        "factores_clave": [
            {
                "variable": "delta_egfr",
                "valor_actual": "-14.0 mL/min",
                "impacto": "+18%",
                "descripcion": "Pérdida acelerada de función renal.",
                "fuente": "Evolución Longitudinal",
            }
        ],
        "recomendacion_preventiva": "Solicitar confirmación en 3 meses.",
    }
    resp = EvaluationResponse(**response_data)
    assert resp.hay_riesgo is True
    assert resp.tipos_riesgo.riesgo_cardiorrenal.alerta is True
    assert len(resp.factores_clave) == 1


def test_lab_input_accepts_severe_macroalbuminuria_a3():
    """En Atención Primaria real, pacientes con nefropatía diabética pueden presentar uACR > 500 mg/g (estadio A3)."""
    data = {
        "edad": 64,
        "sexo": 2,
        "bmi": 29.5,
        "ap_hi": 155,
        "ap_lo": 92,
        "colesterol_total": 215.0,
        "fuma": 0,
        "diabetes": 1,
        "egfr": 34.0,
        "uacr": 850.0,
        "progresion": None,
    }
    model = LabInput(**data)
    assert model.uacr == 850.0
    assert model.egfr == 34.0


def test_perfil_renal_kdigo_schema():
    """Valida la inclusión de la estratificación renal oficial KDIGO 2024."""
    from app.backend.schemas.response import PerfilRenalKDIGO

    kdigo_data = {
        "estadio_gfr": "G2",
        "estadio_uacr": "A2",
        "cuadrante_kdigo": "ALTO",
        "progresor_rapido": True,
        "descripcion_clinica": "Filtrado 68 mL/min (G2) con albuminuria A2 y progresión acelerada.",
    }
    perfil = PerfilRenalKDIGO(**kdigo_data)
    assert perfil.estadio_gfr == "G2"
    assert perfil.estadio_uacr == "A2"
    assert perfil.progresor_rapido is True
    assert perfil.cuadrante_kdigo == "ALTO"

