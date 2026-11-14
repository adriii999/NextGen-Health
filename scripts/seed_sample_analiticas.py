"""Script para generar analíticas de prueba en data/analiticas/ para demostraciones."""
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
ANALITICAS_DIR = BASE_DIR / "data" / "analiticas"


def seed_analiticas():
    ANALITICAS_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Paciente Control / Sano (Baja prioridad)
    caso1 = {
        "edad": 38,
        "sexo": 1,
        "bmi": 22.5,
        "ap_hi": 118,
        "ap_lo": 76,
        "colesterol_total": 165.0,
        "fuma": 0,
        "diabetes": 0,
        "egfr": 105.0,
        "uacr": 7.5,
        "progresion": {
            "delta_egfr": -0.5,
            "delta_uacr": 0.5,
            "delta_ap_hi": 1.0,
            "delta_colesterol": -2.0,
            "delta_bmi": 0.1,
        },
    }
    (ANALITICAS_DIR / "01_paciente_control_sano.json").write_text(
        json.dumps(caso1, indent=2), encoding="utf-8"
    )

    # 2. EL PACIENTE INVISIBLE (Reto central de la Dra. Carmen):
    # Valores actuales aparentemente normales/limítrofes, pero con deterioro renal acelerado
    caso2 = {
        "edad": 59,
        "sexo": 2,
        "bmi": 27.2,
        "ap_hi": 138,
        "ap_lo": 86,
        "colesterol_total": 218.0,
        "fuma": 0,
        "diabetes": 1,
        "egfr": 68.0,  # "Aceptable" a simple vista (estadio G2)
        "uacr": 38.5,  # Microalbuminuria silente
        "progresion": {
            "delta_egfr": -16.0,  # Caída acelerada patológica (>5 mL/min/año)
            "delta_uacr": 24.0,   # Microalbuminuria multiplicada en 1 año
            "delta_ap_hi": 9.0,
            "delta_colesterol": 14.0,
            "delta_bmi": 1.2,
        },
    }
    (ANALITICAS_DIR / "02_paciente_invisible_deterioro_silente.json").write_text(
        json.dumps(caso2, indent=2), encoding="utf-8"
    )

    # 3. Paciente con Riesgo Aterosclerótico Alto (ASCVD)
    caso3 = {
        "edad": 64,
        "sexo": 2,
        "bmi": 28.5,
        "ap_hi": 158,
        "ap_lo": 94,
        "colesterol_total": 268.0,
        "fuma": 1,
        "diabetes": 0,
        "egfr": 82.0,
        "uacr": 16.0,
        "progresion": {
            "delta_egfr": -1.5,
            "delta_uacr": 1.0,
            "delta_ap_hi": 12.0,
            "delta_colesterol": 22.0,
            "delta_bmi": 0.5,
        },
    }
    (ANALITICAS_DIR / "03_riesgo_aterosclerotico_evidente.json").write_text(
        json.dumps(caso3, indent=2), encoding="utf-8"
    )

    # 4. Modo A: Analítica aislada sin registros previos (primer contacto)
    caso4 = {
        "edad": 52,
        "sexo": 1,
        "bmi": 25.8,
        "ap_hi": 136,
        "ap_lo": 84,
        "colesterol_total": 205.0,
        "fuma": 0,
        "diabetes": 0,
        "egfr": 74.0,
        "uacr": 22.0,
        "progresion": None,
    }
    (ANALITICAS_DIR / "04_analitica_aislada_modo_a.json").write_text(
        json.dumps(caso4, indent=2), encoding="utf-8"
    )

    # 5. Lote en CSV: Cupo de pacientes
    csv_content = (
        "edad,sexo,bmi,ap_hi,ap_lo,colesterol_total,fuma,diabetes,egfr,uacr,delta_egfr,delta_uacr,delta_ap_hi\n"
        "45,1,23.5,120,78,185.0,0,0,98.0,10.0,-1.0,0.5,0.0\n"
        "67,2,30.2,162,95,245.0,1,1,52.0,85.0,-12.0,35.0,10.0\n"
        "55,1,26.0,132,82,210.0,0,1,70.0,32.0,-8.0,14.0,4.0\n"
    )
    (ANALITICAS_DIR / "05_lote_cupo_semanal.csv").write_text(csv_content, encoding="utf-8")

    print(f"[OK] 5 archivos de analíticas de prueba generados en: {ANALITICAS_DIR}")


if __name__ == "__main__":
    seed_analiticas()
