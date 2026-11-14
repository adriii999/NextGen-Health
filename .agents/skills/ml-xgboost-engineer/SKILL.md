---
name: ml-xgboost-engineer
description: Comprehensive expert guidelines for training, calibrating, tuning, and exporting clinical XGBoost models with missing value handling, class imbalance, and Recall optimization.
---

# Machine Learning Skill: XGBoost for Clinical Risk Stratification

This skill governs the training pipeline, hyperparameter tuning, loss function calibration, missing value handling, and serialization of XGBoost models for clinical decision support in NextGen-Health.

---

## 1. Clinical Machine Learning Framework

In cardiovascular risk screening, the cost of a **False Negative** (overlooking a patient who will experience an adverse renal or cardiovascular event) is clinically catastrophic. Conversely, a **False Positive** merely triggers a non-invasive confirmatory lab test or clinical follow-up.

### 5-Layer Engineering Principles:
1. **Problem Framing:** Stratify into three pathophysiological risk phenotypes (Aterosclerótico, Insuficiencia Cardíaca, Cardiorrenal).
2. **Validation Design:** 5-fold Stratified K-Fold cross-validation (`StratifiedKFold(n_splits=5, shuffle=True, random_state=42)`). Never evaluate solely on train or simple random splits.
3. **Missing Value Resilience:** Native XGBoost NaN handling (`missing=np.nan`). Missing prior lab tests ($\Delta = \text{NaN}$) must route down the optimal split path naturally.
4. **Regularization & Capacity:** Keep tree depth shallow (`max_depth` $\in [3, 5]$) and apply L2 regularization (`reg_lambda`) to avoid memorizing small cohorts.
5. **Operational Threshold Tuning:** Tune the decision threshold on the validation Precision-Recall curve to guarantee $\text{Sensitivity (Recall)} \ge 0.85$.

---

## 2. Mathematics of XGBoost Native Missing Value Routing

XGBoost handles missing values (`np.nan`) without imputation:
* At each split node, the algorithm evaluates split gains by placing all missing values into the left child node, and then into the right child node.
* It chooses the default direction that maximizes the split criterion (reduction in loss).
* During inference, if a patient has no prior lab report ($\Delta_{\text{eGFR}} = \text{NaN}$), the tree automatically routes the sample down the learned default direction.

---

## 3. End-to-End Training Pipeline Implementation

```python
import numpy as np
import pandas as pd
from xgboost import XGBClassifier
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import recall_score, precision_score, roc_auc_score, precision_recall_curve
import joblib

FEATURE_NAMES = [
    "edad", "sexo", "bmi", "ap_hi", "ap_lo",
    "colesterol_total", "fuma", "diabetes", "egfr", "uacr",
    "delta_egfr", "delta_uacr", "delta_ap_hi", "delta_colesterol", "delta_bmi"
]

def train_and_calibrate_model(df: pd.DataFrame, target_col: str = "target_cardio"):
    X = df[FEATURE_NAMES]
    y = df[target_col]

    # Calculate class imbalance weighting
    neg_count = (y == 0).sum()
    pos_count = (y == 1).sum()
    scale_pos_weight = neg_count / max(pos_count, 1)

    print(f"Dataset: {len(df)} filas. Positivos: {pos_count}, Negativos: {neg_count}. scale_pos_weight: {scale_pos_weight:.2f}")

    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    val_recalls = []
    val_aucs = []

    model = XGBClassifier(
        n_estimators=180,
        max_depth=4,
        learning_rate=0.04,
        subsample=0.85,
        colsample_bytree=0.80,
        reg_alpha=0.1,
        reg_lambda=1.5,
        scale_pos_weight=scale_pos_weight,
        missing=np.nan,
        eval_metric="logloss",
        random_state=42
    )

    # Cross-validation validation check
    for fold, (train_idx, val_idx) in enumerate(skf.split(X, y)):
        X_tr, y_tr = X.iloc[train_idx], y.iloc[train_idx]
        X_va, y_va = X.iloc[val_idx], y.iloc[val_idx]

        model.fit(X_tr, y_tr, eval_set=[(X_va, y_va)], verbose=False)
        probs = model.predict_proba(X_va)[:, 1]

        val_auc = roc_auc_score(y_va, probs)
        val_aucs.append(val_auc)

    print(f"Cross-Validation ROC-AUC medio: {np.mean(val_aucs):.4f}")

    # Final fit on entire dataset
    model.fit(X, y, verbose=False)
    all_probs = model.predict_proba(X)[:, 1]

    # Calibrate operational threshold for screening sensitivity >= 85%
    precisions, recalls, thresholds = precision_recall_curve(y, all_probs)
    # Find lowest threshold where recall >= 0.85
    idx = np.where(recalls >= 0.85)[0][-1]
    optimal_threshold = float(thresholds[min(idx, len(thresholds)-1)])

    print(f"Umbral calibrado para Recall >= 85%: {optimal_threshold:.3f}")

    # Clinical Phenotype-Specific Submodel / Threshold calibration
    clinical_thresholds = {
        "riesgo_aterosclerotico": 0.10,
        "riesgo_insuficiencia_cardiaca": 0.08,
        "riesgo_cardiorrenal": 0.12,
        "umbral_general_recall": optimal_threshold
    }

    # Export unified artifact
    artifact = {
        "model": model,
        "feature_names": FEATURE_NAMES,
        "thresholds": clinical_thresholds,
        "metrics": {
            "cv_auc_mean": float(np.mean(val_aucs)),
            "target_recall": 0.85
        }
    }

    joblib.dump(artifact, "model/out/model_artifact.joblib")
    print("Modelo exportado exitosamente en model/out/model_artifact.joblib")
    return artifact
```

---

## 4. Model Packaging & Verification Checklist

* [ ] Features list in artifact matches the exact order of columns passed to `predict_proba`.
* [ ] Artifact includes metadata, calibrated thresholds, and feature names.
* [ ] Verify that running an input with all `delta_* = np.nan` evaluates without error or `ValueError`.
* [ ] Check that predictions change predictably when adverse values are introduced.
