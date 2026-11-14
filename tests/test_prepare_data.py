import pytest
from pathlib import Path
import pandas as pd
import numpy as np

# Columnas exactas que espera el modelo y la arquitectura
EXPECTED_FEATURES = [
    "edad", "sexo", "bmi", "ap_hi", "ap_lo",
    "colesterol_total", "fuma", "diabetes", "egfr", "uacr",
    "delta_egfr", "delta_uacr", "delta_ap_hi", "delta_colesterol", "delta_bmi"
]
EXPECTED_TARGETS = [
    "target_cardio",
    "target_aterosclerotico",
    "target_insuficiencia_cardiaca",
    "target_cardiorrenal",
]
EXPECTED_COLUMNS = EXPECTED_FEATURES + EXPECTED_TARGETS


def test_prepare_data_module_import():
    """El módulo prepare_data debe existir en model/scripts/."""
    from model.scripts.prepare_data import run_data_preparation, clean_and_harmonize_data
    assert callable(run_data_preparation)
    assert callable(clean_and_harmonize_data)


def test_filtering_removes_invalid_physiology():
    """Verifica que el filtrado elimine presiones imposibles (ap_lo >= ap_hi, presión de pulso inválida y fuera de rango)."""
    from model.scripts.prepare_data import filter_physiological_outliers

    dirty_df = pd.DataFrame({
        "edad": [50.0, 52.0, 55.0, 60.0, 58.0, 62.0],
        "sexo": [1, 2, 1, 2, 1, 2],
        "bmi": [25.0, 75.0, 26.0, 24.0, 25.0, 27.0],          # Fila 1 tiene BMI 75 (outlier > 60)
        "ap_hi": [120.0, 130.0, 110.0, 300.0, 120.0, 215.0],  # Fila 3 PAS 300 (>220), Fila 4 PP=5 (<15), Fila 5 PP=155 (>130)
        "ap_lo": [80.0, 85.0, 115.0, 90.0, 115.0, 60.0],      # Fila 2 PAD 115 > PAS 110
        "colesterol_total": [190.0, 210.0, 180.0, 220.0, 195.0, 205.0],
        "fuma": [0, 1, 0, 0, 0, 1],
        "diabetes": [0, 0, 1, 0, 0, 1],
        "target_cardio": [0, 1, 1, 0, 0, 1],
    })

    cleaned_df = filter_physiological_outliers(dirty_df)
    # Solo la fila 0 cumple todas las condiciones fisiológicas (incluida presión de pulso en [15, 130])
    assert len(cleaned_df) == 1
    assert cleaned_df.iloc[0]["edad"] == 50.0


def test_nhanes_extraction_extracts_real_renal_markers():
    """Verifica la extracción de la cohorte CDC NHANES con eGFR (CKD-EPI 2021), UACR y subtipos reales."""
    from model.scripts.prepare_data import extract_nhanes_data

    nhanes_df = extract_nhanes_data()
    assert isinstance(nhanes_df, pd.DataFrame)
    assert len(nhanes_df) > 3000

    # Comprobar presencia de variables basales con eGFR, UACR y desenlaces clínicos reales desglosados
    for col in [
        "edad", "sexo", "bmi", "ap_hi", "ap_lo", "colesterol_total",
        "fuma", "diabetes", "egfr", "uacr", "target_cardio",
        "real_ascvd", "real_hf", "source_weight",
    ]:
        assert col in nhanes_df.columns, f"Falta {col} en NHANES"

    # Verificar que eGFR y UACR provienen de medidas clínicas reales dentro de rangos clínicos (incluyendo macroalbuminuria A3 > 380)
    assert (nhanes_df["egfr"] >= 5.0).all() and (nhanes_df["egfr"] <= 150.0).all()
    assert (nhanes_df["uacr"] >= 1.0).all() and (nhanes_df["uacr"] <= 3000.0).all()
    assert nhanes_df["uacr"].max() > 380.0, "NHANES debe preservar macroalbuminurias reales (>380 mg/g) sin truncarlas"
    assert (nhanes_df["source_weight"] > 1.0).all()


def test_cardiorenal_and_delta_synthesis():
    """Verifica la integración de eGFR, UACR, coherencia temporal T-1 y respeto al ground truth real."""
    from model.scripts.prepare_data import synthesize_cardiorenal_and_deltas

    base_df = pd.DataFrame({
        "edad": [40.0, 65.0, 70.0, 58.0],
        "sexo": [1, 2, 1, 2],
        "bmi": [23.0, 30.0, 27.0, 29.0],
        "ap_hi": [115.0, 150.0, 140.0, 145.0],
        "ap_lo": [75.0, 90.0, 85.0, 88.0],
        "colesterol_total": [170.0, 240.0, 210.0, 230.0],
        "fuma": [0, 1, 0, 1],
        "diabetes": [0, 1, 1, 1],
        "egfr": [102.0, 52.0, 48.0, 64.0],
        "uacr": [5.0, 85.0, 120.0, 45.0],
        "target_cardio": [0, 1, 1, 1],
        "real_ascvd": [0, 1, 0, 0],
        "real_hf": [0, 0, 1, 0],
        "source_weight": [2.5, 2.5, 2.5, 1.0],
    })

    df_synth = synthesize_cardiorenal_and_deltas(base_df, random_seed=42)

    # Verificar presencia de todas las columnas esperadas
    for col in EXPECTED_COLUMNS:
        assert col in df_synth.columns, f"Falta la columna {col}"

    # Rangos fisiológicos de eGFR y UACR
    assert (df_synth["egfr"] >= 5.0).all() and (df_synth["egfr"] <= 150.0).all()
    assert (df_synth["uacr"] >= 1.0).all() and (df_synth["uacr"] <= 3000.0).all()

    # Coherencia fisiológica del estado previo T-1 (ningún paciente puede haber tenido uACR < 1.0 o eGFR < 5.0 hace 1 año)
    valid_deltas = df_synth.dropna(subset=["delta_uacr", "delta_egfr"])
    uacr_t_minus_1 = valid_deltas["uacr"] - valid_deltas["delta_uacr"]
    egfr_t_minus_1 = valid_deltas["egfr"] - valid_deltas["delta_egfr"]
    assert (uacr_t_minus_1 >= 1.0).all(), f"Estado previo uACR T-1 inválido: {uacr_t_minus_1.tolist()}"
    assert (egfr_t_minus_1 >= 5.0).all() and (egfr_t_minus_1 <= 150.0).all()

    # Respeto estricto al Ground Truth clínico real de NHANES (real_ascvd=1 -> target_aterosclerotico=1, real_hf=1 -> target_insuficiencia_cardiaca=1)
    assert df_synth.loc[1, "target_aterosclerotico"] == 1
    assert df_synth.loc[2, "target_insuficiencia_cardiaca"] == 1

    # Comprobar que los targets sean binarios 0 o 1
    for target_col in EXPECTED_TARGETS:
        assert target_col in df_synth.columns, f"Falta el target {target_col}"
        assert set(df_synth[target_col].unique()).issubset({0, 1})
