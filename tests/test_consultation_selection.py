import pytest

from app.backend.main import app


@pytest.fixture(autouse=True)
def real_model(http_client):
    if not app.state.model_service.is_model_loaded():
        pytest.skip("Requiere el artefacto real cargado")


def test_evaluates_only_selected_patient_visits(http_client):
    response = http_client.post("/api/analiticas/evaluar", json={
        "paciente_id": "paciente_03_alto_riesgo_franco",
        "analiticas_archivos": ["2026-01_analitica_actual.json", "2024-01_analitica_inicial.json"],
    })
    assert response.status_code == 200
    raw = response.json()["datos_entrada"]
    assert raw["num_analiticas"] == 2
    assert [v["nombre_archivo"] for v in raw["historial_visitas"]] == [
        "2024-01_analitica_inicial.json", "2026-01_analitica_actual.json",
    ]
    assert raw["modo_evaluacion"] == "MODO_B"


def test_single_selection_uses_isolated_mode(http_client):
    response = http_client.post("/api/analiticas/evaluar", json={
        "paciente_id": "paciente_03_alto_riesgo_franco",
        "analiticas_archivos": ["2024-01_analitica_inicial.json"],
    })
    assert response.status_code == 200
    raw = response.json()["datos_entrada"]
    assert raw["num_analiticas"] == 1
    assert raw["modo_evaluacion"] == "MODO_A"
    assert raw["analitica_evaluada"] == "2024-01_analitica_inicial.json"
    assert raw["progresion"] is None


@pytest.mark.parametrize("files,status", [
    ([], 422), (["inexistente.json"], 404), (["../otra_carpeta/analitica.json"], 422),
])
def test_rejects_empty_or_foreign_selection(http_client, files, status):
    response = http_client.post("/api/analiticas/evaluar", json={
        "paciente_id": "paciente_03_alto_riesgo_franco",
        "analiticas_archivos": files,
    })
    assert response.status_code == status
