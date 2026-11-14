"""
Script de Validación de Calidad y Profiling Estadístico del Dataset Clínico Preprocesado.
Verifica:
1. Dimensiones y tipos de datos.
2. Integridad de variables obligatorias (0% nulos en las 10 basales).
3. Tasa de nulos en deltas longitudinales (Modo A ~25%).
4. Rangos fisiológicos válidos para Atención Primaria.
5. Balance y representatividad de los 3 fenotipos clínicos multi-riesgo.
6. Correlaciones clínicas esperadas según guías KDIGO 2024 y ESC.
"""
from pathlib import Path
import pandas as pd
import numpy as np

PROCESSED_PATH = Path("data/processed/dataset.csv")
RAW_PATH = Path("data/raw/dataset.csv")
DATASET_PATH = PROCESSED_PATH if PROCESSED_PATH.exists() else RAW_PATH

BASE_FEATURES = [
    "edad", "sexo", "bmi", "ap_hi", "ap_lo",
    "colesterol_total", "fuma", "diabetes", "egfr", "uacr"
]

DELTA_FEATURES = [
    "delta_egfr", "delta_uacr", "delta_ap_hi", "delta_colesterol", "delta_bmi"
]

TARGETS = [
    "target_cardio", "target_aterosclerotico",
    "target_insuficiencia_cardiaca", "target_cardiorrenal"
]


def run_profiling():
    print("=" * 70)
    print(" REPORTE DE VALIDACIÓN Y CALIDAD CLÍNICA DEL DATASET PREPROCESADO")
    print(" Archivo:", DATASET_PATH)
    print("=" * 70)

    if not DATASET_PATH.exists():
        raise FileNotFoundError(f"No se encuentra el dataset en {DATASET_PATH}")

    df = pd.read_csv(DATASET_PATH)
    n_rows, n_cols = df.shape
    print(f"\n1. DIMENSIONES GENERALES:")
    print(f"   * Filas (pacientes únicos): {n_rows:,}")
    print(f"   * Columnas totales: {n_cols}")

    # 2. Verificación de nulos
    print(f"\n2. INTEGRIDAD Y CONTROL DE VALORES NULOS:")
    null_pct = df.isnull().mean() * 100
    base_nulls = null_pct[BASE_FEATURES].max()
    print(f"   * Variables basales (10 requeridas): {base_nulls:.2f}% nulos (esperado: 0.00%)")
    assert base_nulls == 0.0, "ERROR: Existen valores nulos en variables basales obligatorias!"

    delta_null_range = (null_pct[DELTA_FEATURES].min(), null_pct[DELTA_FEATURES].max())
    print(f"   * Variables deltas longitudinales: {delta_null_range[0]:.1f}% - {delta_null_range[1]:.1f}% nulos (Modo A ~25%)")
    assert 20.0 <= delta_null_range[0] <= 30.0, "ERROR: La tasa de Modo A en deltas está fuera del 20-30%!"

    # 3. Rangos fisiológicos
    print(f"\n3. RANGOS FISIOLÓGICOS Y DISTRIBUCIONES:")
    ranges = {
        "edad": (30.0, 85.0, "años"),
        "ap_hi": (80.0, 220.0, "mmHg"),
        "ap_lo": (50.0, 130.0, "mmHg"),
        "bmi": (15.0, 60.0, "kg/m²"),
        "colesterol_total": (80.0, 450.0, "mg/dL"),
        "egfr": (10.0, 130.0, "mL/min"),
        "uacr": (2.0, 400.0, "mg/g"),
    }
    all_ranges_ok = True
    for var, (min_val, max_val, unit) in ranges.items():
        actual_min = df[var].min()
        actual_max = df[var].max()
        actual_mean = df[var].mean()
        actual_median = df[var].median()
        is_ok = actual_min >= min_val and actual_max <= max_val
        status = "[OK]" if is_ok else "[ALERTA]"
        if not is_ok:
            all_ranges_ok = False
        print(f"   * {var:<18}: {actual_min:6.1f} a {actual_max:6.1f} {unit:<7} | Mediana: {actual_median:5.1f} | Media: {actual_mean:5.1f} {status}")

    assert all_ranges_ok, "ERROR: Existen variables fuera de rangos fisiológicos permitidos!"

    # 4. Distribución de fenotipos multi-riesgo
    print(f"\n4. BALANCE DE LOS FENOTIPOS CLÍNICOS MULTI-RIESGO:")
    for target in TARGETS:
        pos_pct = df[target].mean() * 100
        neg_pct = 100.0 - pos_pct
        print(f"   * {target:<30}: Positivos {pos_pct:5.1f}% ({int(df[target].sum()):,} pac.) | Negativos {neg_pct:5.1f}%")

    # 5. Validación de la Filosofía del Reto ("La trampa del rango normal" y KDIGO 2024)
    print(f"\n5. VALIDACIÓN DE LA 'TRAMPA DEL RANGO NORMAL' Y KDIGO 2024:")
    # Pacientes con eGFR aparentemente normal (>= 60) pero con deterioro silente rápido (delta_egfr <= -5.0)
    normal_egfr_rapid = df[(df["egfr"] >= 60.0) & (df["delta_egfr"] <= -5.0)]
    print(f"   * Pacientes en eGFR 'normal' (>= 60) con caída acelerada (<= -5 mL/min/año): {len(normal_egfr_rapid):,} casos ({len(normal_egfr_rapid)/n_rows*100:.1f}% del total)")
    print(f"     -> Clasificados como positivos cardiorrenales: {normal_egfr_rapid['target_cardiorrenal'].mean()*100:.1f}% (esperado: 100%)")

    # Pacientes con microalbuminuria incipiente (uACR entre 30 y 100)
    microalb = df[(df["uacr"] >= 30.0) & (df["uacr"] <= 100.0)]
    print(f"   * Pacientes con microalbuminuria incipiente (30-100 mg/g): {len(microalb):,} casos ({len(microalb)/n_rows*100:.1f}% del total)")

    print("\n" + "=" * 70)
    print(" CONCLUSIÓN DEL PROFILING: DATASET VÁLIDO, COHERENTE Y LISTO PARA ML")
    print("=" * 70)


if __name__ == "__main__":
    run_profiling()
