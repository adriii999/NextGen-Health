---
name: data-science-preprocessor
description: Comprehensive expert guidelines for clinical data engineering, continuous variable harmonization, cardiorenal synthesis (KDIGO), and longitudinal progression (delta) simulation.
---

# Data Science Skill: Clinical Feature Engineering & Data Synthesis

This skill establishes the rigorous methodologies for data harmonization, laboratory variable mapping, cardiorenal feature generation, and temporal progression ($\Delta$) simulation for NextGen-Health.

---

## 1. Source Harmonization & Pipeline Architecture

```text
               ┌──────────────────────────────────────┐       ┌──────────────────────────────────────┐
               │ FUENTE 1: NutriSynthCare (España)    │       │ FUENTE 2: Kaggle CVD (70k registros) │
               │ • Demografía española, diabetes      │       │ • Relaciones no lineales biomédicas  │
               └──────────────────┬───────────────────┘       └──────────────────┬───────────────────┘
                                  │                                              │
                                  └──────────────────────┬───────────────────────┘
                                                         │
                                                         ▼
                                       ┌───────────────────────────────────┐
                                       │    LIMPIEZA & FILTROS MÉDICOS     │
                                       │ • ap_lo < ap_hi                   │
                                       │ • ap_hi in [80, 220]              │
                                       │ • ap_lo in [50, 130]              │
                                       │ • bmi in [15, 60]                 │
                                       └─────────────────┬─────────────────┘
                                                         │
                                                         ▼
                                       ┌───────────────────────────────────┐
                                       │ ARMONIZACIÓN CONTINUA & SÍNTESIS  │
                                       │ • Colesterol discreto -> mg/dL    │
                                       │ • eGFR (KDIGO) según edad/diabetes│
                                       │ • UACR (Albuminuria silente)      │
                                       └─────────────────┬─────────────────┘
                                                         │
                                                         ▼
                                       ┌───────────────────────────────────┐
                                       │ INGENIERÍA LONGITUDINAL (DELTAS)  │
                                       │ • Simular T-1 y calcular Δ        │
                                       │ • Inyección de 25% NaN para       │
                                       │   entrenamiento dual (Modo A y B) │
                                       └─────────────────┬─────────────────┘
                                                         │
                                                         ▼
                                       ┌───────────────────────────────────┐
                                       │ data/processed/dataset_final.csv  │
                                       └───────────────────────────────────┘
```

---

## 2. Laboratory Mapping: Discrete to Continuous Cholesterol

In primary care, cholesterol is measured in milligrams per deciliter (`mg/dL`):

```python
import numpy as np

def map_cholesterol_to_continuous(cat_series: np.ndarray, random_seed: int = 42) -> np.ndarray:
    """
    Transforms categorical cholesterol (1: Normal, 2: Above Normal, 3: Well Above)
    into a realistic continuous distribution in mg/dL.
    """
    rng = np.random.default_rng(random_seed)
    continuous = np.zeros(len(cat_series))

    # Category 1 (Normal: 140 - 199 mg/dL)
    mask1 = (cat_series == 1)
    continuous[mask1] = rng.uniform(145.0, 198.0, size=mask1.sum())

    # Category 2 (Borderline High: 200 - 239 mg/dL)
    mask2 = (cat_series == 2)
    continuous[mask2] = rng.uniform(200.0, 238.0, size=mask2.sum())

    # Category 3 (High: 240 - 320 mg/dL)
    mask3 = (cat_series == 3)
    continuous[mask3] = rng.uniform(240.0, 315.0, size=mask3.sum())

    return np.round(continuous, 1)
```

---

## 3. Cardiorenal Synthesis (KDIGO 2024 Guidelines)

Renal function decline is the silent amplifier in the Dr. Carmen scenario. We synthesize `egfr` and `uacr` based on clinical pathophysiology:

### 3.1 Estimated Glomerular Filtration Rate (`egfr`)
* **Healthy Reference:** Centered around $95 - 0.75 \times (\text{edad} - 30)$ mL/min.
* **Diabetic / Hypertensive Penalty:** Loss of $12 - 25$ mL/min.
* **Cardiovascular Event Cohort (`target=1`):** Shifted toward $50 - 72$ mL/min (moderate impairment, stage G2/G3a).

### 3.2 Urinary Albumin-to-Creatinine Ratio (`uacr`)
* **Normal (`<30 mg/g`):** Log-normal distribution centered around $8 - 18$ mg/g.
* **Microalbuminuria (`30 - 300 mg/g`):** Early vascular damage, highly correlated with diabetes and elevated pulse pressure.
* **Macroalbuminuria (`>300 mg/g`):** Severe nephropathy.

---

## 4. Longitudinal Progression ($\Delta$) Simulation Pipeline

```python
def generate_temporal_deltas(df: pd.DataFrame, random_seed: int = 42) -> pd.DataFrame:
    """
    Simulates annual variations (Deltas) between T-1 and T.
    Adverse outcomes (target=1) have higher probability of accelerated decline.
    """
    rng = np.random.default_rng(random_seed)
    n = len(df)

    delta_egfr = np.zeros(n)
    delta_uacr = np.zeros(n)
    delta_ap_hi = np.zeros(n)
    delta_colesterol = np.zeros(n)
    delta_bmi = np.zeros(n)

    for i in range(n):
        is_cardio = df.iloc[i]["target_cardio"] == 1
        is_diabetic = df.iloc[i]["diabetes"] == 1

        if is_cardio or is_diabetic:
            # Accelerated renal loss: -6 to -18 mL/min/year
            delta_egfr[i] = rng.normal(loc=-9.0, scale=3.5)
            # Rising albuminuria: +10 to +45 mg/g
            delta_uacr[i] = rng.uniform(8.0, 40.0)
            # Systolic creep: +4 to +15 mmHg
            delta_ap_hi[i] = rng.normal(loc=7.0, scale=4.0)
            delta_colesterol[i] = rng.normal(loc=5.0, scale=8.0)
            delta_bmi[i] = rng.normal(loc=0.8, scale=0.6)
        else:
            # Normal physiological drift: -1 to -2 mL/min/year
            delta_egfr[i] = rng.normal(loc=-1.2, scale=1.5)
            delta_uacr[i] = rng.normal(loc=1.0, scale=3.0)
            delta_ap_hi[i] = rng.normal(loc=0.5, scale=3.0)
            delta_colesterol[i] = rng.normal(loc=-1.0, scale=6.0)
            delta_bmi[i] = rng.normal(loc=0.1, scale=0.4)

    df["delta_egfr"] = np.round(delta_egfr, 1)
    df["delta_uacr"] = np.round(delta_uacr, 1)
    df["delta_ap_hi"] = np.round(delta_ap_hi, 1)
    df["delta_colesterol"] = np.round(delta_colesterol, 1)
    df["delta_bmi"] = np.round(delta_bmi, 1)

    # Invert 25% of samples to NaN to ensure the model trains on single-visit (Mode A) data
    mask_missing = rng.random(n) < 0.25
    df.loc[mask_missing, ["delta_egfr", "delta_uacr", "delta_ap_hi", "delta_colesterol", "delta_bmi"]] = np.nan

    return df
```
