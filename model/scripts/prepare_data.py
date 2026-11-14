"""
Pipeline de Limpieza, Armonización, Filtrado Fisiológico y Síntesis Cardiorrenal (KDIGO).
Integra tres fuentes de datos en data/raw/:
1. NutriSynthCare España (db_cardiabetes.csv)
2. Kaggle Cardiovascular Disease Dataset (cardio_train.csv)
3. CDC NHANES (demographic, examination, labs, questionnaire) con eGFR (CKD-EPI 2021) y UACR reales.
Genera el dataset enriquecido para entrenamiento y validación en data/processed/dataset_preprocessed.csv.
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
OUTPUT_FILE = PROCESSED_DIR / "dataset_preprocessed.csv"

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
ALL_COLUMNS = ORDERED_FEATURES + [
    TARGET_COLUMN,
    TARGET_ATEROSCLEROTICO,
    TARGET_INSUFICIENCIA_CARDIACA,
    TARGET_CARDIORRENAL,
]


def filter_physiological_outliers(df: pd.DataFrame) -> pd.DataFrame:
    """
    Aplica filtros estrictos para eliminar errores de medición y valores incompatibles con la vida:
    1. Presión sistólica (ap_hi) en [80, 220] mmHg.
    2. Presión diastólica (ap_lo) en [50, 130] mmHg.
    3. Condición hemodinámica: ap_lo < ap_hi.
    4. Índice de masa corporal (bmi) en [15.0, 60.0] kg/m².
    5. Edad en [30.0, 85.0] años si la columna está presente.
    """
    initial_len = len(df)
    
    mask = (
        (df["ap_hi"] >= 80.0) & (df["ap_hi"] <= 220.0) &
        (df["ap_lo"] >= 50.0) & (df["ap_lo"] <= 130.0) &
        (df["ap_lo"] < df["ap_hi"]) &
        (df["bmi"] >= 15.0) & (df["bmi"] <= 60.0)
    )

    if "edad" in df.columns:
        mask = mask & (df["edad"] >= 30.0) & (df["edad"] <= 85.0)

    if "colesterol_total" in df.columns:
        mask = mask & (df["colesterol_total"] >= 80.0) & (df["colesterol_total"] <= 450.0)

    cleaned = df[mask].copy().reset_index(drop=True)
    dropped = initial_len - len(cleaned)
    if dropped > 0:
        print(f" * Filtro fisiológico: {dropped} registros atípicos eliminados ({initial_len} -> {len(cleaned)}).")
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
    Extrae, valida y calcula biomarcadores renales reales desde la cohorte CDC NHANES:
    - eGFR calculado a partir de creatinina sérica real usando CKD-EPI 2021 (sin componente racial).
    - uACR medido directamente en análisis de laboratorio de orina (URDACT, mg/g).
    - Colesterol total sérico continuo en mg/dL.
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
    scr = valid["LBXSCR"].to_numpy()
    age = valid["RIDAGEYR"].to_numpy()
    egfr = 142 * (np.minimum(scr / kappa, 1.0) ** alpha) * (np.maximum(scr / kappa, 1.0) ** (-1.200)) * (0.9938 ** age) * gender_factor

    # Tabaquismo activo
    fuma = ((valid["SMQ020"] == 1) & (valid["SMQ040"].isin([1, 2]))).astype(int)

    # Diabetes (diagnóstico clínico o glucosa basal en ayunas >= 126 mg/dL)
    diabetes = ((valid["DIQ010"] == 1) | (valid["LBXSGL"] >= 126.0)).astype(int)

    # Evento cardiovascular reportado (insuficiencia cardíaca, infarto, angina o enfermedad coronaria)
    target = ((valid["MCQ160B"] == 1) | (valid["MCQ160C"] == 1) | (valid["MCQ160D"] == 1) | (valid["MCQ160E"] == 1)).astype(int)

    nhanes_harmonized = pd.DataFrame({
        "edad": valid["RIDAGEYR"].astype(float),
        "sexo": sexo,
        "bmi": np.round(valid["BMXBMI"].astype(float), 1),
        "ap_hi": valid["BPXSY1"].astype(float),
        "ap_lo": valid["BPXDI1"].astype(float),
        "colesterol_total": np.round(valid["LBXSCH"].astype(float), 1),
        "fuma": fuma,
        "diabetes": diabetes,
        "egfr": np.round(np.clip(egfr, 15.0, 125.0), 1),
        "uacr": np.round(np.clip(valid["URDACT"].to_numpy(), 3.0, 380.0), 1),
        "target_cardio": target
    })

    print(f" * CDC NHANES procesado: {len(nhanes_harmonized)} registros clínicos reales con eGFR y UACR.")
    return nhanes_harmonized


def clean_and_harmonize_data(random_seed: int = 42) -> pd.DataFrame:
    """
    Carga, unifica y normaliza las tres fuentes crudas:
    1. NutriSynthCare España (db_cardiabetes.csv)
    2. Kaggle Cardiovascular Disease Dataset (cardio_train.csv)
    3. CDC NHANES (cohorte real con eGFR y UACR medidos)
    """
    dfs = []
    rng = np.random.default_rng(random_seed)

    # 1. Cargar NutriSynthCare (España)
    if NUTRISYNTHCARE_FILE.exists():
        print(f"Cargando NutriSynthCare desde: {NUTRISYNTHCARE_FILE}")
        df_es = pd.read_csv(NUTRISYNTHCARE_FILE)
        
        sexo_map = {"Hombre": 2, "Mujer": 1, 2: 2, 1: 1}
        target_map = {"Bajo": 0, "Riesgo Elevado": 1, 0: 0, 1: 1}

        # Imputar tabaquismo con prevalencia española (~22% población adulta)
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
            "target_cardio": df_es["Riesgo_Cardiovascular"].map(target_map).fillna(0).astype(int)
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
            "target_cardio": df_cvd["cardio"].astype(int)
        })
        dfs.append(harmonized_cvd)
        print(f" * Kaggle CVD procesado: {len(harmonized_cvd)} registros.")

    # 3. Cargar CDC NHANES (datos reales de función renal y orina)
    nhanes_df = extract_nhanes_data()
    if not nhanes_df.empty:
        dfs.append(nhanes_df)

    if not dfs:
        raise FileNotFoundError("No se encontró ningún archivo de datos en data/raw/")

    combined_df = pd.concat(dfs, ignore_index=True)
    print(f"Total registros brutos combinados: {len(combined_df)}")

    # Aplicar filtrado de atípicos fisiológicos
    cleaned_df = filter_physiological_outliers(combined_df)
    return cleaned_df


def synthesize_cardiorenal_and_deltas(base_df: pd.DataFrame, random_seed: int = 42) -> pd.DataFrame:
    """
    Completa los biomarcadores renales (eGFR y UACR) según directrices KDIGO 2024
    para los registros que no los tienen de origen, preservando intactos los valores
    reales medidos (como en NHANES), y genera las variaciones temporales longitudinales (Deltas).
    
    Regla de nulos para deltas:
    Se inyecta exactamente un 25% de valores NaN en las columnas delta_* para
    entrenar al modelo en la dualidad clínica (Modo A: analítica aislada sin histórico).
    """
    rng = np.random.default_rng(random_seed)
    n = len(base_df)
    df = base_df.copy().reset_index(drop=True)

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
        sub_target = df.loc[mask_need_egfr, "target_cardio"].to_numpy()

        base_egfr = 98.0 - 0.75 * np.maximum(0.0, sub_age - 30.0)
        penalty_diabetes = np.where(sub_diab == 1, rng.uniform(10.0, 22.0, size=sub_n), 0.0)
        penalty_hta = np.where(sub_ap_hi >= 140.0, rng.uniform(6.0, 16.0, size=sub_n), 0.0)
        noise_egfr = rng.normal(0.0, 4.0, size=sub_n)
        shift_target = np.where(sub_target == 1, rng.uniform(4.0, 12.0, size=sub_n), 0.0)
        egfr_synth = base_egfr - penalty_diabetes - penalty_hta + noise_egfr - shift_target
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
        sub_target = df.loc[mask_need_uacr, "target_cardio"].to_numpy()

        uacr_normal = rng.lognormal(mean=2.2, sigma=0.45, size=sub_n)
        uacr_high = rng.uniform(32.0, 140.0, size=sub_n)
        uacr_very_high = rng.uniform(150.0, 360.0, size=sub_n)

        prob_micro = np.where(sub_diab == 1, 0.45, 0.12)
        prob_micro = np.where(sub_target == 1, prob_micro + 0.30, prob_micro)

        random_draw = rng.random(sub_n)
        mask_micro = (random_draw < prob_micro)
        mask_macro = (random_draw < 0.05) & (sub_diab == 1) & (sub_target == 1)

        uacr_final = np.where(mask_micro, uacr_high, uacr_normal)
        uacr_final = np.where(mask_macro, uacr_very_high, uacr_final)
        df.loc[mask_need_uacr, "uacr"] = np.round(np.clip(uacr_final, 3.0, 380.0), 1)

    # --------------------------------------------------------------------------
    # 3. GENERACIÓN DE DELTAS LONGITUDINALES (Progresión interanual T-1 -> T)
    # --------------------------------------------------------------------------
    delta_egfr = np.zeros(n)
    delta_uacr = np.zeros(n)
    delta_ap_hi = np.zeros(n)
    delta_col = np.zeros(n)
    delta_bmi = np.zeros(n)

    for i in range(n):
        is_target = df.iloc[i]["target_cardio"] == 1
        is_diab = df.iloc[i]["diabetes"] == 1

        if is_target or is_diab:
            delta_egfr[i] = rng.normal(loc=-9.5, scale=3.5)
            delta_uacr[i] = rng.uniform(8.0, 42.0)
            delta_ap_hi[i] = rng.normal(loc=6.5, scale=4.0)
            delta_col[i] = rng.normal(loc=5.0, scale=7.0)
            delta_bmi[i] = rng.normal(loc=0.7, scale=0.5)
        else:
            delta_egfr[i] = rng.normal(loc=-1.1, scale=1.4)
            delta_uacr[i] = rng.normal(loc=0.5, scale=2.5)
            delta_ap_hi[i] = rng.normal(loc=0.5, scale=3.0)
            delta_col[i] = rng.normal(loc=-1.0, scale=5.0)
            delta_bmi[i] = rng.normal(loc=0.0, scale=0.3)

    df["delta_egfr"] = np.round(delta_egfr, 1)
    df["delta_uacr"] = np.round(delta_uacr, 1)
    df["delta_ap_hi"] = np.round(delta_ap_hi, 1)
    df["delta_colesterol"] = np.round(delta_col, 1)
    df["delta_bmi"] = np.round(delta_bmi, 1)

    # --------------------------------------------------------------------------
    # 4. INYECCIÓN DE NULLS (25% de pacientes sin histórico previo = Modo A)
    # --------------------------------------------------------------------------
    mask_missing = rng.random(n) < 0.25
    delta_cols = ["delta_egfr", "delta_uacr", "delta_ap_hi", "delta_colesterol", "delta_bmi"]
    df.loc[mask_missing, delta_cols] = np.nan

    # --------------------------------------------------------------------------
    # 5. ENRIQUECIMIENTO DEL TARGET CARDIORRENAL (ÉNFASIS RENAL KDIGO 2024)
    # --------------------------------------------------------------------------
    # Según guías KDIGO 2024 y ESC, la enfermedad renal es un equivalente cardiovascular.
    # Se consolida como evento positivo (1) a:
    # - Pacientes con evento previo (target_cardio == 1)
    # - Progresores rápidos con caída renal severa (delta_egfr <= -6.0 mL/min/año)
    # - Filtrado deteriorado con microalbuminuria (eGFR < 60 y uACR >= 30)
    # - Macroalbuminuria franca (uACR >= 150 mg/g)
    is_renal_adverse = (
        ((df["egfr"] < 60.0) & (df["uacr"] >= 30.0)) |
        (df["delta_egfr"] <= -6.0) |
        (df["uacr"] >= 150.0)
    )
    df["target_cardio"] = np.where(is_renal_adverse, 1, df["target_cardio"])

    # --------------------------------------------------------------------------
    # 6. GENERACIÓN DE LOS TRES OBJETIVOS FENOTÍPICOS (MULTI-RIESGO CLÍNICO)
    # --------------------------------------------------------------------------
    # A) Fenotipo Aterosclerótico (ASCVD / Placa / Isquemia):
    is_ath = (
        (df["target_cardio"] == 1) & (
            (df["colesterol_total"] >= 190.0) |
            (df["fuma"] == 1) |
            (df["ap_hi"] >= 135.0) |
            (df["delta_colesterol"].fillna(0.0) >= 4.0)
        )
    ) | (
        (df["colesterol_total"] >= 230.0) & (df["fuma"] == 1) & (df["ap_hi"] >= 140.0)
    )
    df["target_aterosclerotico"] = is_ath.astype(int)

    # B) Fenotipo Insuficiencia Cardíaca (Sobrecarga hemodinámica / cardiometabólica):
    is_hf = (
        (df["target_cardio"] == 1) & (
            (df["ap_hi"] >= 135.0) |
            (df["bmi"] >= 28.0) |
            (df["diabetes"] == 1) |
            (df["delta_ap_hi"].fillna(0.0) >= 4.0)
        )
    ) | (
        (df["ap_hi"] >= 150.0) & (df["bmi"] >= 30.0) & (df["diabetes"] == 1)
    )
    df["target_insuficiencia_cardiaca"] = is_hf.astype(int)

    # C) Fenotipo Cardiorrenal (KDIGO 2024 / Deterioro silente / Albuminuria):
    is_ren = (
        (df["delta_egfr"].fillna(0.0) <= -5.0) |
        (df["uacr"] >= 30.0) |
        (df["delta_uacr"].fillna(0.0) >= 8.0) |
        (df["egfr"] < 60.0) |
        ((df["diabetes"] == 1) & ((df["uacr"] >= 20.0) | (df["delta_egfr"].fillna(0.0) <= -3.0))) |
        ((df["target_cardio"] == 1) & ((df["egfr"] < 75.0) | (df["uacr"] >= 25.0) | (df["delta_egfr"].fillna(0.0) <= -4.0)))
    )
    df["target_cardiorrenal"] = is_ren.astype(int)

    return df[ALL_COLUMNS]


def run_data_preparation(output_path: Optional[Path] = None, random_seed: int = 42) -> pd.DataFrame:
    """Ejecuta el pipeline completo y persiste el archivo final."""
    target_out = output_path or OUTPUT_FILE
    target_out.parent.mkdir(parents=True, exist_ok=True)

    print("=" * 65)
    print(" INICIANDO PIPELINE DE PREPARACIÓN DE DATOS MULTI-FUENTE")
    print(" Fuentes: NutriSynthCare (España) + Kaggle CVD + CDC NHANES")
    print("=" * 65)

    # 1. Armonización y filtrado
    cleaned_df = clean_and_harmonize_data(random_seed=random_seed)

    # 2. Síntesis cardiorrenal y deltas
    final_df = synthesize_cardiorenal_and_deltas(cleaned_df, random_seed=random_seed)

    # 3. Guardar archivo
    final_df.to_csv(target_out, index=False)
    print(f"\n[OK] Dataset preprocesado guardado en: {target_out}")
    print(f"Dimensiones finales: {final_df.shape[0]} filas x {final_df.shape[1]} columnas.")
    print(f"Balance de target (0 / 1):\n{final_df[TARGET_COLUMN].value_counts(normalize=True).to_dict()}")
    print(f"Porcentaje de nulos en deltas: {final_df['delta_egfr'].isnull().mean() * 100:.1f}% (Modo A simulado).")
    print("=" * 65)

    return final_df


if __name__ == "__main__":
    run_data_preparation()
