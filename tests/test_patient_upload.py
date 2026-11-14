from copy import deepcopy

import pytest

from app.backend.main import app


def payload():
    lab = dict(nombre="Paciente prueba", fecha_analitica="2025-03-01",
               edad=60, sexo=1, bmi=25, ap_hi=125, ap_lo=80,
               colesterol_total=190, fuma=0, diabetes=0, egfr=90, uacr=10)
    return {"visitas": [
        {"archivo": "a_actual.json", "datos": {**lab, "fecha_analitica": "2026-03-01", "egfr": 82}},
        {"archivo": "z_previa.json", "datos": lab},
    ], "modo": "B"}


def test_upload_orders_by_clinical_date_and_calculates_progression(http_client):
    response = http_client.post("/api/analiticas/validar-carga", json=payload())
    assert response.status_code == 200
    data = response.json()
    assert data["analitica_evaluada"] == "a_actual.json"
    assert data["progresion"]["delta_egfr"] == -8
    assert data["historial_visitas"][0]["nombre_archivo"] == "z_previa.json"


def test_upload_isolated_visit_ignores_progression(http_client):
    body = payload()
    body.update(modo="A", analitica_archivo="z_previa.json")
    response = http_client.post("/api/analiticas/validar-carga", json=body)
    assert response.status_code == 200
    assert response.json()["egfr"] == 90
    assert response.json()["progresion"] is None


@pytest.mark.parametrize("case", ["missing", "mixed", "date", "duplicate", "pressure", "empty", "unknown"])
def test_invalid_upload_is_rejected(http_client, case):
    body = deepcopy(payload())
    if case == "missing":
        del body["visitas"][0]["datos"]["egfr"]
    elif case == "mixed":
        body["visitas"][0]["datos"]["nombre"] = "Otro paciente"
    elif case == "date":
        body["visitas"][0]["datos"]["fecha_analitica"] = "ayer"
    elif case == "duplicate":
        body["visitas"][0]["datos"]["fecha_analitica"] = "2025-03-01"
    elif case == "pressure":
        body["visitas"][0]["datos"]["ap_lo"] = 130
    elif case == "empty":
        body["visitas"] = []
    else:
        body.update(modo="A", analitica_archivo="inexistente.json")
    assert http_client.post("/api/analiticas/validar-carga", json=body).status_code == 422


def test_upload_evaluates_with_real_model(http_client):
    if not app.state.model_service.is_model_loaded():
        pytest.skip("Artefacto real no cargado")
    response = http_client.post("/api/analiticas/evaluar-carga", json=payload())
    assert response.status_code == 200
    data = response.json()
    assert data["datos_entrada"]["modo_evaluacion"] == "MODO_B"
    assert len(data["evaluacion"]["tipos_riesgo"]) == 3
    assert data["evaluacion"]["factores_clave"]


def test_upload_without_model_returns_501(http_client, monkeypatch):
    monkeypatch.setattr(app.state.model_service, "artifact_loaded", False)
    response = http_client.post("/api/analiticas/evaluar-carga", json=payload())
    assert response.status_code == 501
