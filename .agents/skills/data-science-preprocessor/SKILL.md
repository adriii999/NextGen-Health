---
name: data-science-preprocessor
description: Data science and engineering guidelines for cleaning, clinical synthesis, and temporal progression (delta) engineering in cardiorenal medicine.
---

# Data Science Skill: Clinical Feature Engineering & Data Synthesis

This skill guides the data preparation, harmonization, cleaning, and synthetic expansion pipelines for the NextGen-Health project.

## Core Responsibilities
1. **Source Ingestion:** Ingest and normalize `NutriSynthCare` (Spain-specific diabetes/cardio dataset) and Kaggle's `Cardiovascular Disease Dataset`.
2. **Clinical Harmonization:**
   * Convert discrete cholesterol (1, 2, 3) to continuous values in mg/dL:
     - 1 (Normal) $\rightarrow$ Uniform distribution $\in [150, 199]$ mg/dL.
     - 2 (Above Normal) $\rightarrow$ Uniform distribution $\in [200, 239]$ mg/dL.
     - 3 (High) $\rightarrow$ Uniform distribution $\in [240, 320]$ mg/dL.
   * Verify systolic/diastolic blood pressure coherence (`ap_lo < ap_hi`, filter impossible physiology).
3. **Cardiorenal Synthesis (KDIGO Guidelines):**
   * Generate `egfr`:
     - Base population centered around $90\pm 15$ mL/min.
     - Diabetics / Hypertensivos shifted toward lower filtration ($50 - 75$ mL/min).
   * Generate `uacr`:
     - Normal healthy $<30$ mg/g (e.g. log-normal centered around $8-15$ mg/g).
     - Cardiorenal risk cohort $\ge 30$ mg/g (microalbuminuria $30-300$ mg/g).
4. **Temporal Progression ($\Delta$) Simulation:**
   * Generate previous year ($T-1$) values to compute:
     $$\Delta_{\text{eGFR}} = \text{eGFR}_T - \text{eGFR}_{T-1}$$
     $$\Delta_{\text{UACR}} = \text{UACR}_T - \text{UACR}_{T-1}$$
     $$\Delta_{\text{ap\_hi}} = \text{ap\_hi}_T - \text{ap\_hi}_{T-1}$$
     $$\Delta_{\text{colesterol}} = \text{colesterol}_T - \text{colesterol}_{T-1}$$
     $$\Delta_{\text{bmi}} = \text{bmi}_T - \text{bmi}_{T-1}$$
   * Induce significant negative $\Delta_{\text{eGFR}}$ (accelerated loss) and positive $\Delta_{\text{UACR}}$ for patients with positive outcome (`target_cardio=1`).
   * Introduce a realistic percentage (~20–30%) of `NaN` in delta columns to train the model on single-visit (Mode A) scenarios.

---

## Output Standards
* Store clean processed dataset in `data/processed/dataset_preprocessed.csv`.
* Generate a sample batch of test files in `data/analiticas/` (e.g. `pacientes_demo.json` and individual CSVs) showcasing:
  1. A low-risk patient (healthy profile).
  2. A patient with isolated single-lab high risk.
  3. The classic "invisible" patient (normal current lab, but dangerous negative $\Delta_{\text{eGFR}}$ and rising $\Delta_{\text{UACR}}$).
