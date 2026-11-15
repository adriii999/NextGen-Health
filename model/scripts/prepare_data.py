"""
Pipeline de Limpieza, Armonización, Filtrado Fisiológico y Síntesis Cardiorrenal (KDIGO 2024).
Integra tres fuentes de datos en data/raw/:
1. NutriSynthCare España (db_cardiabetes.csv)
2. Kaggle Cardiovascular Disease Dataset (cardio_train.csv)
3. CDC NHANES (demographic, examination, labs, questionnaire) con eGFR (CKD-EPI 2021), UACR
   y desenlaces clínicos reales por fenotipo (MCQ160B Insuficiencia Cardíaca, MCQ160C/D/E ASCVD).
Genera el dataset enriquecido para entrenamiento y validación en data/processed/dataset.csv.
"""
from pathlib import Path
from typing import Optional
import numpy as np
import pandas as pd

# Rutas estándar del proyecto
BASE_DIR = Path(__file__).resolve().parent.parent.parent
RAW_DIR = BASE_DIR / "data" / "raw"
PROCESSED_DIR = BASE_DIR / "data" / "processed"
NUTRISYNTHCARE_FILE = RAW_DIR / "nutrisynthcare" / "db_cardiabetes.csv"
KAGGLE_CVD_FILE = RAW_DIR / "cardio_train.csv"
NHANES_DIR = RAW_DIR / "nhanes"
OUTPUT_FILE = PROCESSED_DIR / "dataset.csv"
RAW_OUTPUT_FILE = RAW_DIR / "dataset.csv"

# 15 características requeridas por el modelo y la arquitectura
ORDERED_FEATURES = [
    "edad", "sexo", "bmi", "ap_hi", "ap_lo",
    "colesterol_total", "fuma", "diabetes", "egfr", "uacr",
    "delta_egfr", "delta_uacr", "delta_ap_hi", "delta_colesterol", "delta_bmi"
]
TARGET_COLUMN = "target_cardio"
TARGET_ATEROSCLEROTICO = "target_aterosclerotico"
TARGET_INSUFICIENCIA_CARDIACA = "target_insuficiencia_cardiaca"
TARGET_CARDIORRENAL = "target_cardiorrenal"
TARGET_MICROVASCULAR = "target_microvascular"
TARGET_CARDIOMETABOLICO = "target_cardiometabolico"
ALL_COLUMNS = ORDERED_FEATURES + [
    TARGET_COLUMN,
    TARGET_ATEROSCLEROTICO,
    TARGET_INSUFICIENCIA_CARDIACA,
    TARGET_CARDIORRENAL,
    TARGET_MICROVASCULAR,
    TARGET_CARDIOMETABOLICO,
]


def filter_physiological_outliers(df: pd.DataFrame) -> pd.DataFrame:
    """
    Aplica filtros estrictos de Atención Primaria para eliminar errores de medición
    y valores incompatibles con la fisiología humana ambulatoria:
    1. Presión sistólica (ap_hi) en [80, 220] mmHg.
    2. Presión diastólica (ap_lo) en [50, 130] mmHg.
    3. Condición hemodinámica: ap_lo < ap_hi.
    4. Presión de pulso (PP = ap_hi - ap_lo) en [15, 130] mmHg.
    5. Índice de masa corporal (bmi) en [15.0, 60.0] kg/m².
    6. Edad en [30.0, 85.0] años si la columna está presente.
    """
    initial_len = len(df)
    pulse_pressure = df["ap_hi"] - df["ap_lo"]

    mask = (
        (df["ap_hi"] >= 80.0) & (df["ap_hi"] <= 220.0) &
        (df["ap_lo"] >= 50.0) & (df["ap_lo"] <= 130.0) &
        (df["ap_lo"] < df["ap_hi"]) &
        (pulse_pressure >= 15.0) & (pulse_pressure <= 130.0) &
        (df["bmi"] >= 15.0) & (df["bmi"] <= 60.0)
    )

    if "edad" in df.columns:
        mask = mask & (df["edad"] >= 30.0) & (df["edad"] <= 85.0)

    if "colesterol_total" in df.columns:
        mask = mask & (df["colesterol_total"] >= 80.0) & (df["colesterol_total"] <= 450.0)

    cleaned = df[mask].copy().reset_index(drop=True)
    dropped = initial_len - len(cleaned)
    if dropped > 0:
        print(f" * Filtro fisiológico (incl. presión de pulso): {dropped} registros atípicos eliminados ({initial_len} -> {len(cleaned)}).")
    return cleaned


def map_cholesterol_to_continuous(cat_series: pd.Series, random_seed: int = 42) -> np.ndarray:
    """
    Convierte el colesterol categórico (1: Normal, 2: Limítrofe, 3: Alto)
    a valores continuos realistas en mg/dL según directrices clínicas.
    """
    rng = np.random.default_rng(random_seed)
    n = len(cat_series)
    continuous = np.zeros(n)

    cat = cat_series.to_numpy()
    mask1 = (cat == 1)
    mask2 = (cat == 2)
    mask3 = (cat == 3)

    continuous[mask1] = rng.uniform(145.0, 198.0, size=mask1.sum())
    continuous[mask2] = rng.uniform(200.0, 238.0, size=mask2.sum())
    continuous[mask3] = rng.uniform(240.0, 315.0, size=mask3.sum())

    mask_other = ~(mask1 | mask2 | mask3)
    if mask_other.sum() > 0:
        continuous[mask_other] = rng.uniform(170.0, 210.0, size=mask_other.sum())

    return np.round(continuous, 1)


def extract_nhanes_data() -> pd.DataFrame:
    """
    Extrae, valida y calcula biomarcadores renales y desenlaces reales desde la cohorte CDC NHANES:
    - eGFR calculado a partir de creatinina sérica real usando CKD-EPI 2021 (sin componente racial).
    - uACR medido directamente en análisis de laboratorio de orina (URDACT, mg/g) preservando macroalbuminuria A3.
    - Colesterol total sérico continuo en mg/dL.
    - Desenlaces clínicos reales desglosados:
      * real_hf: MCQ160B == 1 (Insuficiencia cardíaca congestiva diagnosticada).
      * real_ascvd: MCQ160C == 1 (Coronariopatía) | MCQ160D == 1 (Angina) | MCQ160E == 1 (Infarto).
    """
    if not NHANES_DIR.exists():
        return pd.DataFrame()

    demo_f = NHANES_DIR / "demographic.csv"
    exam_f = NHANES_DIR / "examination.csv"
    labs_f = NHANES_DIR / "labs.csv"
    q_f = NHANES_DIR / "questionnaire.csv"

    if not (demo_f.exists() and exam_f.exists() and labs_f.exists() and q_f.exists()):
        return pd.DataFrame()

    print(f"Cargando cohorte clínica real CDC NHANES desde: {NHANES_DIR}")
    demo = pd.read_csv(demo_f)[["SEQN", "RIAGENDR", "RIDAGEYR"]]
    exam = pd.read_csv(exam_f)[["SEQN", "BMXBMI", "BPXSY1", "BPXDI1"]]
    labs = pd.read_csv(labs_f)[["SEQN", "LBXSCR", "URDACT", "LBXSCH", "LBXSGL"]]
    q = pd.read_csv(q_f)[["SEQN", "SMQ020", "SMQ040", "DIQ010", "MCQ160B", "MCQ160C", "MCQ160D", "MCQ160E"]]

    merged = demo.merge(exam, on="SEQN").merge(labs, on="SEQN").merge(q, on="SEQN")
    adults = merged[(merged["RIDAGEYR"] >= 30.0) & (merged["RIDAGEYR"] <= 85.0)].copy()
    valid = adults.dropna(subset=["BMXBMI", "BPXSY1", "BPXDI1", "LBXSCR", "URDACT", "LBXSCH"]).copy()

    # Mapeo de sexo (1: Mujer, 2: Hombre) - En NHANES: 1 Male, 2 Female
    sexo = np.where(valid["RIAGENDR"] == 2, 1, 2)

    # CKD-EPI 2021 eGFR real
    is_female = (valid["RIAGENDR"] == 2)
    kappa = np.where(is_female, 0.7, 0.9)
    alpha = np.where(is_female, -0.241, -0.302)
    gender_factor = np.where(is_female, 1.012, 1.0)
    scr = np.maximum(valid["LBXSCR"].to_numpy(), 0.2)
    age = valid["RIDAGEYR"].to_numpy()
    egfr = (
        142.0
        * (np.minimum(scr / kappa, 1.0) ** alpha)
        * (np.maximum(scr / kappa, 1.0) ** (-1.200))
        * (0.9938 ** age)
        * gender_factor
    )

    # Tabaquismo activo
    fuma = ((valid["SMQ020"] == 1) & (valid["SMQ040"].isin([1, 2]))).astype(int)

    # Diabetes (diagnóstico clínico o glucosa basal en ayunas >= 126 mg/dL)
    diabetes = ((valid["DIQ010"] == 1) | (valid["LBXSGL"] >= 126.0)).astype(int)

    # Desenlaces clínicos reales por fenotipo en NHANES
    real_hf = (valid["MCQ160B"] == 1).astype(int)
    real_ascvd = ((valid["MCQ160C"] == 1) | (valid["MCQ160D"] == 1) | (valid["MCQ160E"] == 1)).astype(int)
    target = np.maximum(real_hf, real_ascvd).astype(int)

    nhanes_harmonized = pd.DataFrame({
        "edad": valid["RIDAGEYR"].astype(float),
        "sexo": sexo,
        "bmi": np.round(valid["BMXBMI"].astype(float), 1),
        "ap_hi": valid["BPXSY1"].astype(float),
        "ap_lo": valid["BPXDI1"].astype(float),
        "colesterol_total": np.round(valid["LBXSCH"].astype(float), 1),
        "fuma": fuma,
        "diabetes": diabetes,
        "egfr": np.round(np.clip(egfr, 5.0, 150.0), 1),
        "uacr": np.round(np.clip(valid["URDACT"].to_numpy(), 1.0, 3000.0), 1),
        "target_cardio": target,
        "real_ascvd": real_ascvd,
        "real_hf": real_hf,
        "source_weight": np.full(len(valid), 3.0, dtype=float),
    })

    print(
        f" * CDC NHANES procesado: {len(nhanes_harmonized)} registros clínicos reales "
        f"(ASCVD={int(real_ascvd.sum())}, IC={int(real_hf.sum())})."
    )
    return nhanes_harmonized


def clean_and_harmonize_data(random_seed: int = 42) -> pd.DataFrame:
    """
    Carga, unifica y normaliza las tres fuentes crudas:
    1. NutriSynthCare España (db_cardiabetes.csv)
    2. Kaggle Cardiovascular Disease Dataset (cardio_train.csv)
    3. CDC NHANES (cohorte real con eGFR, UACR y diagnósticos por subtipo)
    """
    dfs = []
    rng = np.random.default_rng(random_seed)

    # 1. Cargar NutriSynthCare (España)
    if NUTRISYNTHCARE_FILE.exists():
        print(f"Cargando NutriSynthCare desde: {NUTRISYNTHCARE_FILE}")
        df_es = pd.read_csv(NUTRISYNTHCARE_FILE)

        sexo_map = {"Hombre": 2, "Mujer": 1, 2: 2, 1: 1}
        target_map = {"Bajo": 0, "Riesgo Elevado": 1, 0: 0, 1: 1}

        p_smoke = np.where(df_es["Riesgo_Cardiovascular"] == "Riesgo Elevado", 0.28, 0.16)
        smoke_es = (rng.random(len(df_es)) < p_smoke).astype(int)

        harmonized_es = pd.DataFrame({
            "edad": df_es["Edad"].astype(float),
            "sexo": df_es["Sexo"].map(sexo_map).fillna(1).astype(int),
            "bmi": df_es["IMC"].astype(float),
            "ap_hi": df_es["PAS"].astype(float),
            "ap_lo": df_es["PAD"].astype(float),
            "colesterol_total": df_es["Colesterol_Total"].astype(float),
            "fuma": smoke_es,
            "diabetes": df_es["Diabetes"].astype(int),
            "target_cardio": df_es["Riesgo_Cardiovascular"].map(target_map).fillna(0).astype(int),
            "real_ascvd": np.nan,
            "real_hf": np.nan,
            "source_weight": np.full(len(df_es), 0.8, dtype=float),
        })
        dfs.append(harmonized_es)
        print(f" * NutriSynthCare procesado: {len(harmonized_es)} registros.")

    # 2. Cargar Kaggle CVD
    if KAGGLE_CVD_FILE.exists():
        print(f"Cargando Kaggle CVD desde: {KAGGLE_CVD_FILE}")
        df_cvd = pd.read_csv(KAGGLE_CVD_FILE, sep=";")

        edad_anios = df_cvd["age"] / 365.25
        height_m = df_cvd["height"] / 100.0
        bmi_calc = df_cvd["weight"] / (height_m ** 2)
        col_continuo = map_cholesterol_to_continuous(df_cvd["cholesterol"], random_seed=random_seed)
        diabetes_cvd = (df_cvd["gluc"] >= 2).astype(int)

        harmonized_cvd = pd.DataFrame({
            "edad": np.round(edad_anios, 1),
            "sexo": df_cvd["gender"].astype(int),  # 1: mujer, 2: hombre
            "bmi": np.round(bmi_calc, 1),
            "ap_hi": df_cvd["ap_hi"].astype(float),
            "ap_lo": df_cvd["ap_lo"].astype(float),
            "colesterol_total": col_continuo,
            "fuma": df_cvd["smoke"].astype(int),
            "diabetes": diabetes_cvd,
            "target_cardio": df_cvd["cardio"].astype(int),
            "real_ascvd": np.nan,
            "real_hf": np.nan,
            "source_weight": np.full(len(df_cvd), 1.0, dtype=float),
        })
        dfs.append(harmonized_cvd)
        print(f" * Kaggle CVD procesado: {len(harmonized_cvd)} registros.")

    # 3. Cargar CDC NHANES (datos reales de función renal, orina y eventos clínicos)
    nhanes_df = extract_nhanes_data()
    if not nhanes_df.empty:
        dfs.append(nhanes_df)

    if not dfs:
        raise FileNotFoundError("No se encontró ningún archivo de datos en data/raw/")

    combined_df = pd.concat(dfs, ignore_index=True)
    print(f"Total registros brutos combinados: {len(combined_df)}")

    cleaned_df = filter_physiological_outliers(combined_df)
    return cleaned_df


def synthesize_cardiorenal_and_deltas(base_df: pd.DataFrame, random_seed: int = 42) -> pd.DataFrame:
    """
    Completa biomarcadores renales (eGFR y UACR) cuando no están medidos, genera trayectorias
    longitudinales (Deltas T-1 -> T) garantizando coherencia fisiológica estricta del estado en T-1,
    y modela los tres fenotipos clínicos (ASCVD, Insuficiencia Cardíaca, Cardiorrenal) respetando
    el Ground Truth clínico real de NHANES y Kaggle CVD.
    """
    rng = np.random.default_rng(random_seed)
    n = len(base_df)
    df = base_df.copy().reset_index(drop=True)

    orig_cardio = df["target_cardio"].fillna(0).astype(int).to_numpy()
    real_ascvd = df["real_ascvd"].to_numpy() if "real_ascvd" in df.columns else np.full(n, np.nan)
    real_hf = df["real_hf"].to_numpy() if "real_hf" in df.columns else np.full(n, np.nan)
    if "source_weight" not in df.columns:
        df["source_weight"] = 1.0

    # --------------------------------------------------------------------------
    # 1. eGFR (Tasa de Filtración Glomerular estimada, mL/min/1.73m²)
    # --------------------------------------------------------------------------
    if "egfr" not in df.columns:
        df["egfr"] = np.nan

    mask_need_egfr = df["egfr"].isna()
    if mask_need_egfr.any():
        sub_n = int(mask_need_egfr.sum())
        sub_age = df.loc[mask_need_egfr, "edad"].to_numpy()
        sub_diab = df.loc[mask_need_egfr, "diabetes"].to_numpy()
        sub_ap_hi = df.loc[mask_need_egfr, "ap_hi"].to_numpy()
        sub_cardio = orig_cardio[mask_need_egfr.to_numpy()]

        base_egfr = 98.0 - 0.72 * np.maximum(0.0, sub_age - 30.0)
        penalty_diabetes = np.where(sub_diab == 1, rng.uniform(7.0, 17.0, size=sub_n), 0.0)
        penalty_hta = np.where(sub_ap_hi >= 140.0, rng.uniform(4.0, 13.0, size=sub_n), 0.0)
        penalty_cardio = np.where(sub_cardio == 1, rng.uniform(3.0, 10.0, size=sub_n), 0.0)
        noise_egfr = rng.normal(0.0, 4.5, size=sub_n)
        egfr_synth = base_egfr - penalty_diabetes - penalty_hta - penalty_cardio + noise_egfr
        df.loc[mask_need_egfr, "egfr"] = np.round(np.clip(egfr_synth, 15.0, 125.0), 1)

    # --------------------------------------------------------------------------
    # 2. UACR (Cociente Albúmina/Creatinina en orina, mg/g)
    # --------------------------------------------------------------------------
    if "uacr" not in df.columns:
        df["uacr"] = np.nan

    mask_need_uacr = df["uacr"].isna()
    if mask_need_uacr.any():
        sub_n = int(mask_need_uacr.sum())
        sub_diab = df.loc[mask_need_uacr, "diabetes"].to_numpy()
        sub_ap_hi = df.loc[mask_need_uacr, "ap_hi"].to_numpy()
        sub_cardio = orig_cardio[mask_need_uacr.to_numpy()]

        uacr_normal = rng.lognormal(mean=2.15, sigma=0.45, size=sub_n)
        uacr_high = rng.uniform(30.0, 145.0, size=sub_n)
        prob_micro = (
            0.08
            + np.where(sub_diab == 1, 0.30, 0.0)
            + np.where(sub_ap_hi >= 140.0, 0.16, 0.0)
            + np.where(sub_cardio == 1, 0.14, 0.0)
        )
        draw = rng.random(sub_n)
        uacr_final = np.where(draw < prob_micro, uacr_high, uacr_normal)
        df.loc[mask_need_uacr, "uacr"] = np.round(np.clip(uacr_final, 2.0, 450.0), 1)

    # --------------------------------------------------------------------------
    # 3. GENERACIÓN VECTORIZADA DE DELTAS CON COHERENCIA FISIOLÓGICA EN T-1
    # --------------------------------------------------------------------------
    diab_arr = df["diabetes"].to_numpy()
    ap_arr = df["ap_hi"].to_numpy()
    uacr_arr = df["uacr"].to_numpy()
    egfr_arr = df["egfr"].to_numpy()
    col_arr = df["colesterol_total"].to_numpy()
    bmi_arr = df["bmi"].to_numpy()

    is_progressor = (
        ((diab_arr == 1) & (uacr_arr >= 28.0))
        | (ap_arr >= 150.0)
        | ((orig_cardio == 1) & (rng.random(n) < 0.35))
        | (rng.random(n) < 0.12)
    )

    raw_delta_egfr = np.where(
        is_progressor,
        rng.normal(loc=-7.2, scale=3.0, size=n),
        rng.normal(loc=-1.0, scale=1.3, size=n),
    )
    raw_delta_uacr = np.where(
        is_progressor,
        rng.uniform(6.0, 32.0, size=n),
        rng.normal(loc=0.4, scale=2.2, size=n),
    )
    raw_delta_ap_hi = np.where(
        is_progressor,
        rng.normal(loc=5.0, scale=3.8, size=n),
        rng.normal(loc=0.4, scale=2.8, size=n),
    )
    raw_delta_col = np.where(
        is_progressor,
        rng.normal(loc=3.5, scale=6.5, size=n),
        rng.normal(loc=-1.0, scale=4.8, size=n),
    )
    raw_delta_bmi = np.where(
        is_progressor,
        rng.normal(loc=0.5, scale=0.45, size=n),
        rng.normal(loc=0.0, scale=0.3, size=n),
    )

    # Acotar deltas para que el estado implícito en T-1 (X_{T-1} = X_T - delta_X) sea 100% fisiológico:
    # - uACR_{T-1} >= 1.5 mg/g -> delta_uacr <= uacr_T - 1.5
    max_valid_delta_uacr = np.maximum(0.0, uacr_arr - 1.5)
    min_valid_delta_uacr = np.maximum(-40.0, uacr_arr - 2950.0)
    delta_uacr = np.round(np.clip(raw_delta_uacr, min_valid_delta_uacr, max_valid_delta_uacr), 1)

    # - 5.5 <= eGFR_{T-1} <= 148.0 -> (egfr_T - 148.0) <= delta_egfr <= (egfr_T - 5.5)
    min_valid_delta_egfr = egfr_arr - 148.0
    max_valid_delta_egfr = egfr_arr - 5.5
    delta_egfr = np.round(np.clip(raw_delta_egfr, min_valid_delta_egfr, max_valid_delta_egfr), 1)

    # - 82.0 <= ap_hi_{T-1} <= 218.0
    delta_ap_hi = np.round(np.clip(raw_delta_ap_hi, ap_arr - 218.0, ap_arr - 82.0), 1)
    delta_col = np.round(np.clip(raw_delta_col, col_arr - 440.0, col_arr - 85.0), 1)
    delta_bmi = np.round(np.clip(raw_delta_bmi, bmi_arr - 58.0, bmi_arr - 15.5), 1)

    df["delta_egfr"] = delta_egfr
    df["delta_uacr"] = delta_uacr
    df["delta_ap_hi"] = delta_ap_hi
    df["delta_colesterol"] = delta_col
    df["delta_bmi"] = delta_bmi

    # --------------------------------------------------------------------------
    # 4. INYECCIÓN DE NULLS (25% de pacientes sin histórico previo = Modo A)
    # --------------------------------------------------------------------------
    mask_missing = rng.random(n) < 0.25
    delta_cols = ["delta_egfr", "delta_uacr", "delta_ap_hi", "delta_colesterol", "delta_bmi"]
    df.loc[mask_missing, delta_cols] = np.nan

    # --------------------------------------------------------------------------
    # 5. ESTRATIFICACIÓN FENOTÍPICA EN 5 DOMINIOS CKM (AHA / ESC / KDIGO 2024)
    # --------------------------------------------------------------------------
    d_egfr = df["delta_egfr"].fillna(0.0).to_numpy()
    d_uacr = df["delta_uacr"].fillna(0.0).to_numpy()
    d_ap = df["delta_ap_hi"].fillna(0.0).to_numpy()
    d_col = df["delta_colesterol"].fillna(0.0).to_numpy()
    d_bmi = df["delta_bmi"].fillna(0.0).to_numpy()
    pulse_pressure = df["ap_hi"].to_numpy() - df["ap_lo"].to_numpy()

    # A) Fenotipo 1: Coronario e Isquemia (Aterosclerosis / Placa - SCORE2 / ESC):
    # Impulsado por colesterol total, aumento de colesterol, tabaquismo, PAS, diabetes y edad
    logit_ath = (
        -3.85
        + 0.042 * (df["edad"].to_numpy() - 52.0)
        + 0.028 * (df["ap_hi"].to_numpy() - 125.0)
        + 0.032 * (df["colesterol_total"].to_numpy() - 190.0)
        + 1.15 * df["fuma"].to_numpy()
        + 0.58 * df["diabetes"].to_numpy()
        + 0.035 * np.maximum(0.0, d_ap - 3.0)
        + 0.055 * np.maximum(0.0, d_col - 3.0)
        + 0.50 * orig_cardio
    )
    p_ath = 1.0 / (1.0 + np.exp(-logit_ath))
    y_ath = (rng.random(n) < p_ath).astype(int)
    # Protección si no hay carga aterogénica
    ath_safe = (
        (df["colesterol_total"].to_numpy() < 188.0)
        & (d_col < 6.0)
        & (df["fuma"].to_numpy() == 0)
        & (df["ap_hi"].to_numpy() < 130.0)
        & (real_ascvd != 1)
    )
    y_ath = np.where(ath_safe, 0, y_ath)
    y_ath = np.where(real_ascvd == 1, 1, y_ath)
    df["target_aterosclerotico"] = y_ath

    # B) Fenotipo 2: Sobrecarga e Insuficiencia Cardíaca (Hemodinámica / PREVENT-HF):
    # Impulsado por HTA sistólica/diastólica, presión de pulso, progresión tensional, IMC y edad
    logit_hf = (
        -3.95
        + 0.044 * (df["edad"].to_numpy() - 54.0)
        + 0.055 * (df["ap_hi"].to_numpy() - 128.0)
        + 0.032 * np.maximum(0.0, pulse_pressure - 48.0)
        + 0.085 * (df["bmi"].to_numpy() - 26.0)
        + 0.085 * np.maximum(0.0, d_ap - 3.0)
        + 0.22 * np.maximum(0.0, d_bmi - 0.3)
        - 0.025 * np.minimum(0.0, df["egfr"].to_numpy() - 65.0)
        + 0.45 * orig_cardio
    )
    p_hf = 1.0 / (1.0 + np.exp(-logit_hf))
    y_hf = (rng.random(n) < p_hf).astype(int)
    hf_safe = (
        (df["ap_hi"].to_numpy() < 128.0)
        & (d_ap < 5.0)
        & (df["bmi"].to_numpy() < 26.5)
        & (df["egfr"].to_numpy() >= 75.0)
        & (real_hf != 1)
    )
    y_hf = np.where(hf_safe, 0, y_hf)
    y_hf = np.where(real_hf == 1, 1, y_hf)
    df["target_insuficiencia_cardiaca"] = y_hf

    # C) Fenotipo 3: Función Renal / Filtrado Glomerular (KDIGO 2024 Nefropatía Parenquimatosa):
    # Específico de pérdida de filtrado (eGFR reducido o caída rápida delta_egfr <= -5).
    # NO sobrediagnostica cuando el filtrado es normal (>= 80 mL/min) y estable.
    logit_cr = (
        -3.95
        + 0.105 * np.maximum(0.0, 75.0 - df["egfr"].to_numpy())
        - 0.44 * np.minimum(0.0, d_egfr + 2.5)
        + 0.012 * np.maximum(0.0, np.minimum(df["uacr"].to_numpy(), 250.0) - 35.0)
        + 0.35 * df["diabetes"].to_numpy() * (df["egfr"].to_numpy() < 78.0).astype(float)
    )
    p_cr = 1.0 / (1.0 + np.exp(-logit_cr))
    y_cr = (rng.random(n) < p_cr).astype(int)
    renal_safe = (df["egfr"].to_numpy() >= 84.0) & (d_egfr > -3.5) & (df["uacr"].to_numpy() < 60.0)
    y_cr = np.where(renal_safe, 0, y_cr)
    # Casos francos de deterioro renal o caída rápida siempre positivos
    renal_frank = (df["egfr"].to_numpy() < 58.0) | (d_egfr <= -5.0)
    y_cr = np.where(renal_frank, 1, y_cr)
    df["target_cardiorrenal"] = y_cr

    # D) Fenotipo 4: Daño Microvascular y Endotelial (Albuminuria / Permeabilidad Capilar):
    # Impulsado por uACR, incremento progresivo de uACR (delta_uacr), diabetes, tabaco y presión de pulso
    logit_micro = (
        -3.80
        + 0.068 * (np.minimum(df["uacr"].to_numpy(), 250.0) - 18.0)
        + 0.125 * np.maximum(0.0, d_uacr - 4.0)
        + 0.85 * df["diabetes"].to_numpy()
        + 0.45 * df["fuma"].to_numpy()
        + 0.022 * np.maximum(0.0, pulse_pressure - 46.0)
    )
    p_micro = 1.0 / (1.0 + np.exp(-logit_micro))
    y_micro = (rng.random(n) < p_micro).astype(int)
    micro_safe = (df["uacr"].to_numpy() < 15.0) & (d_uacr < 5.0) & (df["diabetes"].to_numpy() == 0)
    y_micro = np.where(micro_safe, 0, y_micro)
    micro_frank = (df["uacr"].to_numpy() >= 32.0) | (d_uacr >= 14.0)
    y_micro = np.where(micro_frank, 1, y_micro)
    df["target_microvascular"] = y_micro

    # E) Fenotipo 5: Descompensación Cardiometabólica (Eje Adiposo-Lipídico-Glucémico CKM):
    # Impulsado por IMC, ganancia ponderal (delta_bmi), diabetes, colesterol y progresión lipídica (delta_colesterol)
    logit_metab = (
        -3.85
        + 0.145 * (df["bmi"].to_numpy() - 26.0)
        + 0.55 * np.maximum(0.0, d_bmi - 0.3)
        + 1.35 * df["diabetes"].to_numpy()
        + 0.026 * (df["colesterol_total"].to_numpy() - 185.0)
        + 0.055 * np.maximum(0.0, d_col - 3.0)
    )
    p_metab = 1.0 / (1.0 + np.exp(-logit_metab))
    y_metab = (rng.random(n) < p_metab).astype(int)
    metab_safe = (
        (df["bmi"].to_numpy() < 25.2)
        & (df["diabetes"].to_numpy() == 0)
        & (df["colesterol_total"].to_numpy() < 190.0)
        & (d_col < 6.0)
        & (d_bmi < 0.5)
    )
    y_metab = np.where(metab_safe, 0, y_metab)
    df["target_cardiometabolico"] = y_metab

    # F) Target cardio global compuesto:
    df["target_cardio"] = np.maximum.reduce([y_ath, y_hf, y_cr, y_micro, y_metab])

    output_cols = ALL_COLUMNS + (["source_weight"] if "source_weight" in df.columns else [])
    return df[output_cols]


def run_data_preparation(output_path: Optional[Path] = None, random_seed: int = 42) -> pd.DataFrame:
    """Ejecuta el pipeline completo y persiste el archivo final."""
    target_out = output_path or OUTPUT_FILE
    target_out.parent.mkdir(parents=True, exist_ok=True)

    print("=" * 65)
    print(" INICIANDO PIPELINE DE PREPARACIÓN DE DATOS MULTI-FUENTE")
    print(" Fuentes: NutriSynthCare (España) + Kaggle CVD + CDC NHANES")
    print("=" * 65)

    cleaned_df = clean_and_harmonize_data(random_seed=random_seed)
    final_df = synthesize_cardiorenal_and_deltas(cleaned_df, random_seed=random_seed)

    final_df.to_csv(target_out, index=False)
    print(f"\n[OK] Dataset guardado en: {target_out}")
    if target_out == OUTPUT_FILE and RAW_OUTPUT_FILE.parent.exists():
        final_df.to_csv(RAW_OUTPUT_FILE, index=False)
        print(f"[OK] Reemplazado placeholder en data/raw/: {RAW_OUTPUT_FILE}")
    print(f"Dimensiones finales: {final_df.shape[0]} filas x {final_df.shape[1]} columnas.")
    print(f"Balance de target (0 / 1):\n{final_df[TARGET_COLUMN].value_counts(normalize=True).to_dict()}")
    print(f"Porcentaje de nulos en deltas: {final_df['delta_egfr'].isnull().mean() * 100:.1f}% (Modo A simulado).")
    print("=" * 65)

    return final_df


if __name__ == "__main__":
    run_data_preparation()
