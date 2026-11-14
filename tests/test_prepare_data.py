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
    """Verifica que el filtrado elimine presiones imposibles (ap_lo >= ap_hi y fuera de rango)."""
    from model.scripts.prepare_data import filter_physiological_outliers

    dirty_df = pd.DataFrame({
        "edad": [50.0, 52.0, 55.0, 60.0],
        "sexo": [1, 2, 1, 2],
        "bmi": [25.0, 75.0, 26.0, 24.0],          # Fila 1 tiene BMI 75 (outlier > 60)
        "ap_hi": [120.0, 130.0, 110.0, 300.0],     # Fila 3 tiene PAS 300 (outlier > 220)
        "ap_lo": [80.0, 85.0, 115.0, 90.0],        # Fila 2 tiene PAD 115 > PAS 110 (imposible)
        "colesterol_total": [190.0, 210.0, 180.0, 220.0],
        "fuma": [0, 1, 0, 0],
        "diabetes": [0, 0, 1, 0],
        "target_cardio": [0, 1, 1, 0],
    })

    cleaned_df = filter_physiological_outliers(dirty_df)
    # Solo la fila 0 cumple todas las condiciones fisiológicas
    assert len(cleaned_df) == 1
    assert cleaned_df.iloc[0]["edad"] == 50.0


def test_nhanes_extraction_extracts_real_renal_markers():
    """Verifica la extracción de la cohorte CDC NHANES con eGFR (CKD-EPI 2021) y UACR reales."""
    from model.scripts.prepare_data import extract_nhanes_data

    nhanes_df = extract_nhanes_data()
    assert isinstance(nhanes_df, pd.DataFrame)
    assert len(nhanes_df) > 3000

    # Comprobar presencia de variables basales con eGFR y UACR reales
    for col in ["edad", "sexo", "bmi", "ap_hi", "ap_lo", "colesterol_total", "fuma", "diabetes", "egfr", "uacr", "target_cardio"]:
        assert col in nhanes_df.columns, f"Falta {col} en NHANES"

    # Verificar que eGFR y UACR provienen de medidas clínicas reales dentro de rangos válidos
    assert (nhanes_df["egfr"] >= 15.0).all() and (nhanes_df["egfr"] <= 125.0).all()
    assert (nhanes_df["uacr"] >= 3.0).all() and (nhanes_df["uacr"] <= 380.0).all()


def test_cardiorenal_and_delta_synthesis():
    """Verifica la integración de eGFR, UACR y deltas longitudinales."""
    from model.scripts.prepare_data import synthesize_cardiorenal_and_deltas

    base_df = pd.DataFrame({
        "edad": [40.0, 65.0, 70.0],
        "sexo": [1, 2, 1],
        "bmi": [23.0, 30.0, 27.0],
        "ap_hi": [115.0, 150.0, 140.0],
        "ap_lo": [75.0, 90.0, 85.0],
        "colesterol_total": [170.0, 240.0, 210.0],
        "fuma": [0, 1, 0],
        "diabetes": [0, 1, 1],
        "target_cardio": [0, 1, 1],
    })

    df_synth = synthesize_cardiorenal_and_deltas(base_df, random_seed=42)

    # Verificar presencia de todas las columnas esperadas
    for col in EXPECTED_COLUMNS:
        assert col in df_synth.columns, f"Falta la columna {col}"

    # Rangos fisiológicos de eGFR y UACR
    assert (df_synth["egfr"] >= 10.0).all() and (df_synth["egfr"] <= 130.0).all()
    assert (df_synth["uacr"] >= 2.0).all() and (df_synth["uacr"] <= 400.0).all()

    # Presencia de deltas
    assert "delta_egfr" in df_synth.columns
    assert "delta_uacr" in df_synth.columns

    # Comprobar que los targets sean binarios 0 o 1
    for target_col in EXPECTED_TARGETS:
        assert target_col in df_synth.columns, f"Falta el target {target_col}"
        assert set(df_synth[target_col].unique()).issubset({0, 1})
