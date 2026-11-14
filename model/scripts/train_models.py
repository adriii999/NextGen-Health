"""Entrena los tres clasificadores clínicos desde el CSV final curado."""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

ROOT_DIR = Path(__file__).resolve().parents[2]
DATASET_PATH = ROOT_DIR / "data" / "processed" / "dataset_preprocessed.csv"
ARTIFACT_PATH = ROOT_DIR / "model" / "out" / "model_artifact.joblib"
RANDOM_STATE = 42
TEST_SIZE = 0.2
CV_FOLDS = 5
TARGET_RECALL = 0.85

FEATURE_COLUMNS = [
    "edad", "sexo", "bmi", "ap_hi", "ap_lo", "colesterol_total", "fuma",
    "diabetes", "egfr", "uacr", "delta_egfr", "delta_uacr", "delta_ap_hi",
    "delta_colesterol", "delta_bmi",
]

# Fenotipos clínicos de riesgo cardiovascular y cardiorrenal multidimensional
TARGET_COLUMNS = {
    "riesgo_aterosclerotico": "target_aterosclerotico",
    "riesgo_insuficiencia_cardiaca": "target_insuficiencia_cardiaca",
    "riesgo_cardiorrenal": "target_cardiorrenal",
}


def validate_dataset(dataset: pd.DataFrame) -> pd.DataFrame:
    """Valida esquema y valores sin imputar ni fabricar información clínica."""
    if dataset.empty or len(dataset.columns) < 2:
        raise ValueError(
            "El CSV no contiene una tabla de datos. Comprueba que el dataset final "
            "esté disponible en data/processed/dataset_preprocessed.csv."
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
        n_estimators=250,
        max_depth=4,
        learning_rate=0.04,
        subsample=0.85,
        colsample_bytree=0.8,
        reg_alpha=0.1,
        reg_lambda=1.5,
        scale_pos_weight=negative_count / positive_count,
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
        return 0.5
    # Entre los umbrales que alcanzan recall, elegir el de mayor precisión.
    best = qualifying[np.argmax(precision[:-1][qualifying])]
    return float(thresholds[best])


def _evaluate_target(X: pd.DataFrame, y: pd.Series, target: str) -> tuple[dict[str, Any], float]:
    from sklearn.metrics import (
        average_precision_score,
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

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y
    )
    folds = StratifiedKFold(n_splits=CV_FOLDS, shuffle=True, random_state=RANDOM_STATE)
    oof_probabilities = np.full(len(X_train), np.nan)

    for train_idx, valid_idx in folds.split(X_train, y_train):
        fold_y = y_train.iloc[train_idx]
        estimator = _xgboost_classifier(
            int((fold_y == 1).sum()), int((fold_y == 0).sum())
        )
        estimator.fit(X_train.iloc[train_idx], fold_y)
        oof_probabilities[valid_idx] = estimator.predict_proba(
            X_train.iloc[valid_idx]
        )[:, 1]

    threshold = _threshold_for_recall(y_train.to_numpy(), oof_probabilities)
    evaluation_model = _xgboost_classifier(
        int((y_train == 1).sum()), int((y_train == 0).sum())
    )
    evaluation_model.fit(X_train, y_train)
    test_probabilities = evaluation_model.predict_proba(X_test)[:, 1]
    predictions = (test_probabilities >= threshold).astype(int)

    metrics = {
        "test_rows": int(len(y_test)),
        "roc_auc": float(roc_auc_score(y_test, test_probabilities)),
        "pr_auc": float(average_precision_score(y_test, test_probabilities)),
        "recall_at_threshold": float(recall_score(y_test, predictions, zero_division=0)),
        "precision_at_threshold": float(precision_score(y_test, predictions, zero_division=0)),
        "threshold": threshold,
        "target_recall_for_threshold_selection": TARGET_RECALL,
    }
    return metrics, threshold


def train(dataset_path: Path = DATASET_PATH, artifact_path: Path = ARTIFACT_PATH) -> dict:
    """Evalúa los tres objetivos, vuelve a ajustar y exporta artefacto compatible."""
    import joblib

    try:
        dataset = pd.read_csv(dataset_path)
    except (OSError, pd.errors.EmptyDataError, UnicodeDecodeError) as exc:
        raise ValueError(f"No se pudo leer el CSV '{dataset_path}': {exc}") from exc
    dataset = validate_dataset(dataset)
    X = dataset[FEATURE_COLUMNS].astype(float)

    metrics: dict[str, dict[str, Any]] = {}
    thresholds: dict[str, float] = {}
    for risk_name, target_column in TARGET_COLUMNS.items():
        target_metrics, threshold = _evaluate_target(
            X, dataset[target_column].astype(int), target_column
        )
        metrics[risk_name] = target_metrics
        thresholds[risk_name] = threshold

    models = {}
    for risk_name, target_column in TARGET_COLUMNS.items():
        y = dataset[target_column].astype(int)
        model = _xgboost_classifier(int((y == 1).sum()), int((y == 0).sum()))
        model.fit(X, y)
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
            f"recall={result['recall_at_threshold']:.3f}, "
            f"umbral={result['threshold']:.3f}"
        )


if __name__ == "__main__":
    main()
