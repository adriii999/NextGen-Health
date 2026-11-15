"""Entrena y calibra los tres clasificadores clínicos XGBoost desde el CSV final curado."""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

ROOT_DIR = Path(__file__).resolve().parents[2]
PROCESSED_DATASET = ROOT_DIR / "data" / "processed" / "dataset.csv"
RAW_DATASET = ROOT_DIR / "data" / "raw" / "dataset.csv"
DATASET_PATH = PROCESSED_DATASET if PROCESSED_DATASET.exists() else RAW_DATASET
ARTIFACT_PATH = ROOT_DIR / "model" / "out" / "model_artifact.joblib"
RANDOM_STATE = 42
TEST_SIZE = 0.2
CV_FOLDS = 5
TARGET_RECALL = 0.80

FEATURE_COLUMNS = [
    "edad", "sexo", "bmi", "ap_hi", "ap_lo", "colesterol_total", "fuma",
    "diabetes", "egfr", "uacr", "delta_egfr", "delta_uacr", "delta_ap_hi",
    "delta_colesterol", "delta_bmi",
]

# Restricciones de monotonía fisiológica (1: incrementa riesgo, -1: reduce riesgo, 0: sin restricción)
# Orden exacto de FEATURE_COLUMNS:
# edad(+1), sexo(0), bmi(+1), ap_hi(+1), ap_lo(0), colesterol_total(+1), fuma(+1),
# diabetes(+1), egfr(-1), uacr(+1), delta_egfr(-1), delta_uacr(+1), delta_ap_hi(+1),
# delta_colesterol(+1), delta_bmi(+1)
MONOTONE_CONSTRAINTS = (1, 0, 1, 1, 0, 1, 1, 1, -1, 1, -1, 1, 1, 1, 1)

# 5 Fenotipos clínicos de riesgo cardiovascular, renal, microvascular y cardiometabólico (CKM / KDIGO)
TARGET_COLUMNS = {
    "riesgo_aterosclerotico": "target_aterosclerotico",
    "riesgo_insuficiencia_cardiaca": "target_insuficiencia_cardiaca",
    "riesgo_cardiorrenal": "target_cardiorrenal",
    "riesgo_microvascular": "target_microvascular",
    "riesgo_cardiometabolico": "target_cardiometabolico",
}


def validate_dataset(dataset: pd.DataFrame) -> pd.DataFrame:
    """Valida esquema y valores sin imputar ni fabricar información clínica."""
    if dataset.empty or len(dataset.columns) < 2:
        raise ValueError(
            "El CSV no contiene una tabla de datos. Comprueba que el dataset final "
            "esté disponible en data/processed/dataset.csv o data/raw/dataset.csv."
        )

    required = [*FEATURE_COLUMNS, *TARGET_COLUMNS.values()]
    missing = [column for column in required if column not in dataset.columns]
    if missing:
        raise ValueError(
            "Faltan columnas requeridas en el dataset: " + ", ".join(missing)
        )

    result = dataset.loc[:, required].copy()
    for column in required:
        result[column] = pd.to_numeric(result[column], errors="coerce")

    delta_columns = [column for column in FEATURE_COLUMNS if column.startswith("delta_")]
    non_delta_features = [column for column in FEATURE_COLUMNS if column not in delta_columns]
    invalid_feature_rows = result[non_delta_features].isna().any(axis=1)
    if invalid_feature_rows.any():
        raise ValueError(
            f"Hay {int(invalid_feature_rows.sum())} filas con variables clínicas "
            "obligatorias vacías o no numéricas."
        )

    feature_values = result[FEATURE_COLUMNS].to_numpy(dtype=float)
    if np.isinf(feature_values).any():
        raise ValueError("Las variables de entrada contienen valores infinitos.")

    for target in TARGET_COLUMNS.values():
        values = result[target]
        if values.isna().any() or not values.isin([0, 1]).all():
            raise ValueError(f"La etiqueta '{target}' debe contener solo 0 y 1, sin nulos.")
        if values.nunique() != 2:
            raise ValueError(
                f"La etiqueta '{target}' debe incluir ambas clases (0 y 1) para entrenar."
            )
    return result


def _xgboost_classifier(positive_count: int, negative_count: int):
    try:
        from xgboost import XGBClassifier
    except ImportError as exc:
        raise RuntimeError(
            "Falta XGBoost. Instala las dependencias con "
            "'python -m pip install -r model/requirements.txt'."
        ) from exc

    return XGBClassifier(
        n_estimators=180,
        max_depth=4,
        learning_rate=0.04,
        subsample=0.85,
        colsample_bytree=0.8,
        reg_alpha=0.1,
        reg_lambda=2.0,
        monotone_constraints=MONOTONE_CONSTRAINTS,
        objective="binary:logistic",
        eval_metric="logloss",
        tree_method="hist",
        random_state=RANDOM_STATE,
        n_jobs=-1,
    )


def _threshold_for_recall(y_true: np.ndarray, probabilities: np.ndarray) -> float:
    from sklearn.metrics import precision_recall_curve

    precision, recall, thresholds = precision_recall_curve(y_true, probabilities)
    qualifying = np.flatnonzero(recall[:-1] >= TARGET_RECALL)
    if len(qualifying) == 0:
        return 0.25
    best = qualifying[np.argmax(precision[:-1][qualifying])]
    return float(np.clip(thresholds[best], 0.22, 0.45))


def _evaluate_target(
    X: pd.DataFrame,
    y: pd.Series,
    target: str,
    sample_weight: pd.Series | None = None,
) -> tuple[dict[str, Any], float]:
    from sklearn.metrics import (
        average_precision_score,
        brier_score_loss,
        precision_score,
        recall_score,
        roc_auc_score,
    )
    from sklearn.model_selection import StratifiedKFold, train_test_split

    if int(y.value_counts().min()) < CV_FOLDS + 1:
        raise ValueError(
            f"'{target}' necesita al menos {CV_FOLDS + 1} ejemplos de cada clase "
            "para holdout y validación cruzada."
        )

    weights = sample_weight if sample_weight is not None else pd.Series(1.0, index=X.index)
    X_train, X_test, y_train, y_test, w_train, _ = train_test_split(
        X, y, weights, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y
    )
    folds = StratifiedKFold(n_splits=CV_FOLDS, shuffle=True, random_state=RANDOM_STATE)
    oof_probabilities = np.full(len(X_train), np.nan)

    for train_idx, valid_idx in folds.split(X_train, y_train):
        fold_y = y_train.iloc[train_idx]
        fold_w = w_train.iloc[train_idx]
        estimator = _xgboost_classifier(
            int((fold_y == 1).sum()), int((fold_y == 0).sum())
        )
        estimator.fit(X_train.iloc[train_idx], fold_y, sample_weight=fold_w)
        oof_probabilities[valid_idx] = estimator.predict_proba(
            X_train.iloc[valid_idx]
        )[:, 1]

    threshold = _threshold_for_recall(y_train.to_numpy(), oof_probabilities)
    evaluation_model = _xgboost_classifier(
        int((y_train == 1).sum()), int((y_train == 0).sum())
    )
    evaluation_model.fit(X_train, y_train, sample_weight=w_train)
    test_probabilities = evaluation_model.predict_proba(X_test)[:, 1]
    predictions = (test_probabilities >= threshold).astype(int)

    metrics = {
        "test_rows": int(len(y_test)),
        "roc_auc": float(roc_auc_score(y_test, test_probabilities)),
        "pr_auc": float(average_precision_score(y_test, test_probabilities)),
        "brier_score": float(brier_score_loss(y_test, test_probabilities)),
        "recall_at_threshold": float(recall_score(y_test, predictions, zero_division=0)),
        "precision_at_threshold": float(precision_score(y_test, predictions, zero_division=0)),
        "threshold": threshold,
        "target_recall_for_threshold_selection": TARGET_RECALL,
    }
    return metrics, threshold


def train(dataset_path: Path = DATASET_PATH, artifact_path: Path = ARTIFACT_PATH) -> dict:
    """Evalúa los tres objetivos, vuelve a ajustar con ponderación de evidencia y exporta artefacto."""
    import joblib

    try:
        raw_dataset = pd.read_csv(dataset_path)
    except (OSError, pd.errors.EmptyDataError, UnicodeDecodeError) as exc:
        raise ValueError(f"No se pudo leer el CSV '{dataset_path}': {exc}") from exc

    sample_weight = (
        pd.to_numeric(raw_dataset["source_weight"], errors="coerce").fillna(1.0)
        if isinstance(raw_dataset, pd.DataFrame) and "source_weight" in raw_dataset.columns
        else None
    )
    dataset = validate_dataset(raw_dataset)
    X = dataset[FEATURE_COLUMNS].astype(float)

    metrics: dict[str, dict[str, Any]] = {}
    thresholds: dict[str, float] = {}
    for risk_name, target_column in TARGET_COLUMNS.items():
        target_metrics, threshold = _evaluate_target(
            X,
            dataset[target_column].astype(int),
            target_column,
            sample_weight=sample_weight,
        )
        metrics[risk_name] = target_metrics
        thresholds[risk_name] = threshold

    models = {}
    for risk_name, target_column in TARGET_COLUMNS.items():
        y = dataset[target_column].astype(int)
        model = _xgboost_classifier(int((y == 1).sum()), int((y == 0).sum()))
        model.fit(X, y, sample_weight=sample_weight)
        models[risk_name] = model

    try:
        import shap
    except ImportError as exc:
        raise RuntimeError(
            "Falta SHAP para generar explicadores reales. Instala "
            "'python -m pip install -r model/requirements.txt'."
        ) from exc
    explainers = {name: shap.TreeExplainer(model) for name, model in models.items()}

    artifact = {
        "artifact_version": 2,
        "models": models,
        "feature_names": FEATURE_COLUMNS.copy(),
        "thresholds": thresholds,
        "metrics": metrics,
        "explainers": explainers,
        "target_columns": TARGET_COLUMNS.copy(),
        "training_rows": int(len(dataset)),
        "training_dataset": str(dataset_path),
    }
    artifact_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(artifact, artifact_path)
    return artifact


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset", type=Path, default=DATASET_PATH)
    parser.add_argument("--output", type=Path, default=ARTIFACT_PATH)
    args = parser.parse_args()
    artifact = train(args.dataset, args.output)
    print(f"Artefacto guardado en: {args.output}")
    for risk, result in artifact["metrics"].items():
        print(
            f"{risk}: ROC-AUC={result['roc_auc']:.3f}, "
            f"PR-AUC={result['pr_auc']:.3f}, "
            f"Brier={result['brier_score']:.4f}, "
            f"recall={result['recall_at_threshold']:.3f}, "
            f"umbral={result['threshold']:.3f}"
        )


if __name__ == "__main__":
    main()
