---
name: ml-xgboost-engineer
description: Best practices for training, evaluating, and tuning XGBoost models with missing value handling and Recall optimization in clinical risk domains.
---

# Machine Learning Skill: XGBoost for Clinical Risk Stratification

This skill provides comprehensive instructions for designing, training, evaluating, and exporting high-performance XGBoost models for clinical risk stratification in healthcare hackathons.

## Guiding Principles for Medical ML
1. **Recall Over Accuracy:** In screening, a False Negative (failing to alert a patient who will suffer an event) is far more dangerous than a False Positive (which merely prompts a follow-up lab or review). Threshold tuning must prioritize sensitivity/recall while keeping specificity within practical clinical bounds.
2. **Native Missing Value Support:** Set `missing=np.nan` in `xgboost.XGBClassifier`. Do NOT perform crude mean or median imputation on clinical features like progression deltas, because the absence of prior data is informative in itself.
3. **Calibrated Probabilities:** Use `predict_proba` rather than binary `predict` to extract granular risk probabilities for the three clinical phenotypes.

---

## Model Pipeline & Layer Architecture

```python
import numpy as np
import pandas as pd
from xgboost import XGBClassifier
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import recall_score, roc_auc_score, precision_recall_curve
import joblib

def train_clinical_xgboost(X: pd.DataFrame, y: pd.Series):
    """
    Trains an XGBoost model tailored for medical screening.
    """
    # Calculate scale_pos_weight for class imbalance
    num_neg = (y == 0).sum()
    num_pos = (y == 1).sum()
    scale_pos_weight = num_neg / max(num_pos, 1)

    model = XGBClassifier(
        n_estimators=150,
        max_depth=4,              # Keep depth moderate to avoid overfitting small subsets
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=scale_pos_weight,
        missing=np.nan,           # Crucial for optional deltas
        random_state=42,
        eval_metric="logloss"
    )

    model.fit(X, y)
    return model
```

---

## Calibrating Decision Thresholds
* Compute Precision-Recall curve: `precisions, recalls, thresholds = precision_recall_curve(y_val, y_proba)`.
* Select operational threshold where $\text{Recall} \ge 0.85$ (or target sensitivity for early detection).
* Save the chosen threshold alongside the model in the exported dictionary:
```python
artifact = {
    "model": model,
    "feature_names": list(X.columns),
    "thresholds": {
        "riesgo_aterosclerotico": 0.10,
        "riesgo_insuficiencia_cardiaca": 0.08,
        "riesgo_cardiorrenal": 0.12
    }
}
joblib.dump(artifact, "model/out/model_artifact.joblib")
```
