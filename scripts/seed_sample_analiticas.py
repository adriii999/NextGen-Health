"""
Genera las carpetas de seguimiento longitudinal de pacientes en data/analiticas/.
Cumple estrictamente:
1. Regla de analíticas "aparentemente correctas" (ej. colesterol total < 200 mg/dL en todos los casos,
   presiones arteriales y filtrados glomerulares eGFR > 60 mL/min sin valores extremos evidentes).
2. Cobertura completa de todas las respuestas posibles de los 5 dominios del modelo:
   - Control sano óptimo (Prioridad BAJA, 0 alertas)
   - Deterioro renal silente en rango normal (Prioridad ALTA, alerta en Función Renal y Microvascular)
   - Riesgo coronario y cardiometabólico con riñón sano (Alerta en Coronario y Cardiometabólico, sin alerta renal)
   - Sobrecarga hemodinámica e insuficiencia cardíaca aislada (Alerta en Insuficiencia Cardíaca, sin alerta renal)
   - Daño microvascular endotelial incipiente con filtrado normal (Alerta Microvascular, sin caída de filtrado)
   - Descompensación multiorgánica CKM progresiva (Prioridad ALTA por múltiples ejes sin descenso rápido renal)
   - Primera consulta aislada sin historial previo (Evaluación transversal individual)
"""
import json
import shutil
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
ANALITICAS_DIR = BASE_DIR / "data" / "analiticas"


def generate_patient_folders() -> None:
    if ANALITICAS_DIR.exists():
        for item in ANALITICAS_DIR.iterdir():
            if item.is_dir():
                shutil.rmtree(item)
            elif item.suffix.lower() in [".json", ".csv"]:
                item.unlink()
    else:
        ANALITICAS_DIR.mkdir(parents=True, exist_ok=True)

    # -------------------------------------------------------------------------
    # 1. PACIENTE 01: Control Sano Estable (Prioridad BAJA · 0 Alertas)
    # -------------------------------------------------------------------------
    p1_dir = ANALITICAS_DIR / "paciente_01_seguimiento_control_sano"
    p1_dir.mkdir(parents=True, exist_ok=True)
    p1_visitas = [
        (
            "2025-02_analitica_basal.json",
            {
                "paciente_id": "paciente_01_seguimiento_control_sano",
                "nombre": "Seguimiento 01 · Control Sano Estable",
                "fecha_analitica": "2025-02-14",
                "edad": 48.0,
                "sexo": 1,
                "bmi": 22.8,
                "ap_hi": 116.0,
                "ap_lo": 74.0,
                "colesterol_total": 168.0,
                "fuma": 0,
                "diabetes": 0,
                "egfr": 98.5,
                "uacr": 6.2,
            },
        ),
        (
            "2026-02_analitica_anual.json",
            {
                "paciente_id": "paciente_01_seguimiento_control_sano",
                "nombre": "Seguimiento 01 · Control Sano Estable",
                "fecha_analitica": "2026-02-14",
                "edad": 49.0,
                "sexo": 1,
                "bmi": 22.9,
                "ap_hi": 118.0,
                "ap_lo": 75.0,
                "colesterol_total": 171.0,
                "fuma": 0,
                "diabetes": 0,
                "egfr": 97.8,
                "uacr": 6.5,
            },
        ),
    ]
    for fname, payload in p1_visitas:
        (p1_dir / fname).write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

    # -------------------------------------------------------------------------
    # 2. PACIENTE 02: Trampa del Rango Normal · Deterioro Renal Silente
    # Valores aislados normales (Colesterol 178, PA 122/78, eGFR 82 > 60, uACR 28 < 30),
    # pero caída anual de -9.0 mL/min y subida de +22 mg/g de albúmina.
    # -------------------------------------------------------------------------
    p2_dir = ANALITICAS_DIR / "paciente_02_trampa_rango_normal_deterioro_silente"
    p2_dir.mkdir(parents=True, exist_ok=True)
    p2_visitas = [
        (
            "2025-03_analitica_basal.json",
            {
                "paciente_id": "paciente_02_trampa_rango_normal_deterioro_silente",
                "nombre": "Seguimiento 02 · Deterioro Renal Silente (Rango Normal)",
                "fecha_analitica": "2025-03-10",
                "edad": 54.0,
                "sexo": 1,
                "bmi": 23.8,
                "ap_hi": 118.0,
                "ap_lo": 76.0,
                "colesterol_total": 174.0,
                "fuma": 0,
                "diabetes": 0,
                "egfr": 91.0,
                "uacr": 6.0,
            },
        ),
        (
            "2026-03_analitica_anual.json",
            {
                "paciente_id": "paciente_02_trampa_rango_normal_deterioro_silente",
                "nombre": "Seguimiento 02 · Deterioro Renal Silente (Rango Normal)",
                "fecha_analitica": "2026-03-10",
                "edad": 55.0,
                "sexo": 1,
                "bmi": 24.0,
                "ap_hi": 122.0,
                "ap_lo": 78.0,
                "colesterol_total": 178.0,
                "fuma": 0,
                "diabetes": 0,
                "egfr": 82.0,
                "uacr": 28.0,
            },
        ),
    ]
    for fname, payload in p2_visitas:
        (p2_dir / fname).write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

    # -------------------------------------------------------------------------
    # 3. PACIENTE 03: Progresión Coronaria y Cardiometabólica con Riñón Sano
    # Riñón completamente estable (eGFR 94 -> 93.2 -> 92.5, uACR 7 -> 8 mg/g),
    # colesterol < 200 mg/dL pero en ascenso rápido (162 -> 178 -> 196 mg/dL).
    # -------------------------------------------------------------------------
    p3_dir = ANALITICAS_DIR / "paciente_03_alto_riesgo_franco"
    p3_dir.mkdir(parents=True, exist_ok=True)
    p3_visitas = [
        (
            "2024-01_analitica_inicial.json",
            {
                "paciente_id": "paciente_03_alto_riesgo_franco",
                "nombre": "Seguimiento 03 · Riesgo Coronario y Metabólico (Riñón Estable)",
                "fecha_analitica": "2024-01-20",
                "edad": 56.0,
                "sexo": 2,
                "bmi": 25.2,
                "ap_hi": 122.0,
                "ap_lo": 78.0,
                "colesterol_total": 162.0,
                "fuma": 1,
                "diabetes": 1,
                "egfr": 94.0,
                "uacr": 7.0,
            },
        ),
        (
            "2025-01_analitica_control.json",
            {
                "paciente_id": "paciente_03_alto_riesgo_franco",
                "nombre": "Seguimiento 03 · Riesgo Coronario y Metabólico (Riñón Estable)",
                "fecha_analitica": "2025-01-20",
                "edad": 57.0,
                "sexo": 2,
                "bmi": 26.4,
                "ap_hi": 125.0,
                "ap_lo": 79.0,
                "colesterol_total": 178.0,
                "fuma": 1,
                "diabetes": 1,
                "egfr": 93.2,
                "uacr": 7.5,
            },
        ),
        (
            "2026-01_analitica_actual.json",
            {
                "paciente_id": "paciente_03_alto_riesgo_franco",
                "nombre": "Seguimiento 03 · Riesgo Coronario y Metabólico (Riñón Estable)",
                "fecha_analitica": "2026-01-20",
                "edad": 58.0,
                "sexo": 2,
                "bmi": 27.8,
                "ap_hi": 128.0,
                "ap_lo": 80.0,
                "colesterol_total": 196.0,
                "fuma": 1,
                "diabetes": 1,
                "egfr": 92.5,
                "uacr": 8.0,
            },
        ),
    ]
    for fname, payload in p3_visitas:
        (p3_dir / fname).write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

    # -------------------------------------------------------------------------
    # 4. PACIENTE 04: Sobrecarga Hemodinámica e Insuficiencia Cardíaca Aislada
    # Colesterol óptimo (166 mg/dL), riñón normal y estable (eGFR 88, uACR 8.5),
    # pero trayectoria tensional en ascenso (122/76 -> 138/84 mmHg) con presión de pulso amplia.
    # -------------------------------------------------------------------------
    p4_dir = ANALITICAS_DIR / "paciente_04_sobrecarga_hemodinamica"
    p4_dir.mkdir(parents=True, exist_ok=True)
    p4_visitas = [
        (
            "2025-04_analitica_previa.json",
            {
                "paciente_id": "paciente_04_sobrecarga_hemodinamica",
                "nombre": "Seguimiento 04 · Sobrecarga Hemodinámica e Insuficiencia Cardíaca",
                "fecha_analitica": "2025-04-12",
                "edad": 64.0,
                "sexo": 1,
                "bmi": 28.0,
                "ap_hi": 124.0,
                "ap_lo": 76.0,
                "colesterol_total": 164.0,
                "fuma": 0,
                "diabetes": 0,
                "egfr": 86.2,
                "uacr": 8.0,
            },
        ),
        (
            "2026-04_analitica_actual.json",
            {
                "paciente_id": "paciente_04_sobrecarga_hemodinamica",
                "nombre": "Seguimiento 04 · Sobrecarga Hemodinámica e Insuficiencia Cardíaca",
                "fecha_analitica": "2026-04-12",
                "edad": 65.0,
                "sexo": 1,
                "bmi": 29.4,
                "ap_hi": 144.0,
                "ap_lo": 84.0,
                "colesterol_total": 166.0,
                "fuma": 0,
                "diabetes": 0,
                "egfr": 85.0,
                "uacr": 8.5,
            },
        ),
    ]
    for fname, payload in p4_visitas:
        (p4_dir / fname).write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

    # -------------------------------------------------------------------------
    # 5. PACIENTE 05: Daño Microvascular y Endotelial con Filtrado Estable
    # Filtrado renal normal y estable (eGFR 96 -> 95 mL/min, sin caída rápida),
    # colesterol normal (171 mg/dL), PA normal (122/76 mmHg), pero albuminuria
    # subiendo de 7.0 a 26.5 mg/g (aún < 30 mg/g).
    # -------------------------------------------------------------------------
    p5_dir = ANALITICAS_DIR / "paciente_05_dano_microvascular_endotelial"
    p5_dir.mkdir(parents=True, exist_ok=True)
    p5_visitas = [
        (
            "2025-05_analitica_previa.json",
            {
                "paciente_id": "paciente_05_dano_microvascular_endotelial",
                "nombre": "Seguimiento 05 · Daño Microvascular Incipiente (Filtrado Normal)",
                "fecha_analitica": "2025-05-18",
                "edad": 51.0,
                "sexo": 1,
                "bmi": 23.6,
                "ap_hi": 118.0,
                "ap_lo": 75.0,
                "colesterol_total": 168.0,
                "fuma": 0,
                "diabetes": 1,
                "egfr": 96.0,
                "uacr": 7.0,
            },
        ),
        (
            "2026-05_analitica_actual.json",
            {
                "paciente_id": "paciente_05_dano_microvascular_endotelial",
                "nombre": "Seguimiento 05 · Daño Microvascular Incipiente (Filtrado Normal)",
                "fecha_analitica": "2026-05-18",
                "edad": 52.0,
                "sexo": 1,
                "bmi": 23.8,
                "ap_hi": 122.0,
                "ap_lo": 76.0,
                "colesterol_total": 171.0,
                "fuma": 0,
                "diabetes": 1,
                "egfr": 95.0,
                "uacr": 26.5,
            },
        ),
    ]
    for fname, payload in p5_visitas:
        (p5_dir / fname).write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

    # -------------------------------------------------------------------------
    # 6. PACIENTE 06: Síndrome Cardiometabólico y Vascular Multiorgánico
    # Valores estáticos moderados (Colesterol 194 < 200, PA 138/84 < 140/90, eGFR 72 > 60, uACR 27 < 30),
    # pero empeoramiento simultáneo en múltiples ejes (Prioridad ALTA sin caída rápida renal).
    # -------------------------------------------------------------------------
    p6_dir = ANALITICAS_DIR / "paciente_06_sindrome_ckm_multiorganico"
    p6_dir.mkdir(parents=True, exist_ok=True)
    p6_visitas = [
        (
            "2025-06_analitica_previa.json",
            {
                "paciente_id": "paciente_06_sindrome_ckm_multiorganico",
                "nombre": "Seguimiento 06 · Síndrome Cardiometabólico y Vascular Progresivo",
                "fecha_analitica": "2025-06-15",
                "edad": 59.0,
                "sexo": 2,
                "bmi": 26.4,
                "ap_hi": 126.0,
                "ap_lo": 78.0,
                "colesterol_total": 176.0,
                "fuma": 1,
                "diabetes": 1,
                "egfr": 76.0,
                "uacr": 12.0,
            },
        ),
        (
            "2026-06_analitica_actual.json",
            {
                "paciente_id": "paciente_06_sindrome_ckm_multiorganico",
                "nombre": "Seguimiento 06 · Síndrome Cardiometabólico y Vascular Progresivo",
                "fecha_analitica": "2026-06-15",
                "edad": 60.0,
                "sexo": 2,
                "bmi": 28.0,
                "ap_hi": 138.0,
                "ap_lo": 84.0,
                "colesterol_total": 194.0,
                "fuma": 1,
                "diabetes": 1,
                "egfr": 72.2,
                "uacr": 27.5,
            },
        ),
    ]
    for fname, payload in p6_visitas:
        (p6_dir / fname).write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

    # -------------------------------------------------------------------------
    # 7. PACIENTE 07: Primera Consulta Aislada (Sin Historial Previo)
    # -------------------------------------------------------------------------
    p7_dir = ANALITICAS_DIR / "paciente_07_primera_consulta_aislada"
    p7_dir.mkdir(parents=True, exist_ok=True)
    p7_unica = {
        "paciente_id": "paciente_07_primera_consulta_aislada",
        "nombre": "Seguimiento 07 · Primera Consulta Aislada (Sin Historial)",
        "fecha_analitica": "2026-04-22",
        "edad": 61.0,
        "sexo": 2,
        "bmi": 27.4,
        "ap_hi": 136.0,
        "ap_lo": 84.0,
        "colesterol_total": 192.0,
        "fuma": 1,
        "diabetes": 1,
        "egfr": 86.0,
        "uacr": 12.0,
    }
    (p7_dir / "2026-04_primera_analitica.json").write_text(
        json.dumps(p7_unica, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    print(f"[OK] 7 carpetas de seguimiento generadas en {ANALITICAS_DIR}")


if __name__ == "__main__":
    generate_patient_folders()
