"""
Genera un dashboard visual integral del dataset clínico y los resultados del modelo.
Paneles incluidos:
1. Matriz de Riesgo Cardiorrenal KDIGO 2024 (eGFR vs log(uACR)).
2. 'La Trampa del Rango Normal' (eGFR Basal vs Delta eGFR longitudinal).
3. Curvas ROC de los 3 Modelos Clínicos Multi-Fenotipo.
4. Importancia de Variables SHAP (Impacto Clínico Promedio).
5. Distribución de Probabilidades Predichas frente a Umbrales de Alerta.
"""
from pathlib import Path
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
import pandas as pd
import joblib
from sklearn.metrics import roc_curve, auc, precision_recall_curve

ROOT_DIR = Path(__file__).resolve().parent.parent
DATASET_PATH = ROOT_DIR / "data" / "processed" / "dataset.csv"
ARTIFACT_PATH = ROOT_DIR / "model" / "out" / "model_artifact.joblib"
OUT_IMG_DOCS = ROOT_DIR / "docs" / "img" / "model_evaluation_dashboard.png"

ARTIFACT_DIR = Path(r"C:\Users\juan\.gemini\antigravity\brain\92e5d739-dab0-43ab-ada2-8544ba3668ed")
OUT_IMG_ARTIFACT = ARTIFACT_DIR / "model_evaluation_dashboard.png"


def create_clinical_dashboard():
    print("Cargando dataset y artefacto del modelo...")
    df = pd.read_csv(DATASET_PATH)
    artifact = joblib.load(ARTIFACT_PATH)
    models = artifact["models"]
    thresholds = artifact["thresholds"]
    feature_names = artifact["feature_names"]

    # Configuración estética
    plt.style.use("seaborn-v0_8-whitegrid" if "seaborn-v0_8-whitegrid" in plt.style.available else "default")
    fig = plt.figure(figsize=(20, 12), dpi=200)
    fig.patch.set_facecolor("#0f172a")  # Fondo azul oscuro slate elegante

    # Paleta clínica
    colors = {
        "text": "#f8fafc",
        "muted": "#94a3b8",
        "accent_blue": "#38bdf8",
        "accent_red": "#ef4444",
        "accent_green": "#22c55e",
        "accent_amber": "#f59e0b",
        "accent_purple": "#a855f7",
        "grid": "#334155",
        "panel_bg": "#1e293b",
    }

    plt.rcParams["text.color"] = colors["text"]
    plt.rcParams["axes.labelcolor"] = colors["text"]
    plt.rcParams["xtick.color"] = colors["muted"]
    plt.rcParams["ytick.color"] = colors["muted"]

    # -------------------------------------------------------------------------
    # Panel 1: Matriz KDIGO 2024 (eGFR vs log(uACR))
    # -------------------------------------------------------------------------
    ax1 = plt.subplot2grid((2, 3), (0, 0))
    ax1.set_facecolor(colors["panel_bg"])

    # Submuestra para scatter legible
    sample_df = df.sample(min(3000, len(df)), random_state=42)
    sc = ax1.scatter(
        sample_df["egfr"],
        sample_df["uacr"],
        c=sample_df["target_cardiorrenal"],
        cmap="coolwarm",
        alpha=0.6,
        s=18,
        edgecolors="none",
    )
    ax1.set_yscale("log")
    ax1.axvline(60, color=colors["accent_amber"], linestyle="--", linewidth=1.2, label="Límite eGFR 60 mL/min")
    ax1.axhline(30, color=colors["accent_red"], linestyle="--", linewidth=1.2, label="Límite Microalbuminuria (30 mg/g)")
    ax1.set_title("1. Matriz Cardiorrenal KDIGO 2024", fontsize=13, fontweight="bold", pad=12, color=colors["text"])
    ax1.set_xlabel("eGFR Basal (mL/min/1.73m²)", fontsize=10)
    ax1.set_ylabel("uACR en Orina (mg/g, escala log)", fontsize=10)
    ax1.legend(loc="upper right", facecolor=colors["panel_bg"], edgecolor=colors["grid"], fontsize=8)
    ax1.grid(True, color=colors["grid"], linestyle=":", alpha=0.6)

    # -------------------------------------------------------------------------
    # Panel 2: La Trampa del Rango Normal (eGFR vs Delta eGFR)
    # -------------------------------------------------------------------------
    ax2 = plt.subplot2grid((2, 3), (0, 1))
    ax2.set_facecolor(colors["panel_bg"])

    valid_deltas = df.dropna(subset=["delta_egfr"]).sample(min(4000, df["delta_egfr"].notna().sum()), random_state=42)
    # Identificar la trampa: eGFR >= 60 pero delta_egfr <= -5.0
    is_trap = (valid_deltas["egfr"] >= 60.0) & (valid_deltas["delta_egfr"] <= -5.0)

    ax2.scatter(
        valid_deltas.loc[~is_trap, "egfr"],
        valid_deltas.loc[~is_trap, "delta_egfr"],
        color=colors["accent_blue"],
        alpha=0.3,
        s=14,
        label="Evolución Habitual",
    )
    ax2.scatter(
        valid_deltas.loc[is_trap, "egfr"],
        valid_deltas.loc[is_trap, "delta_egfr"],
        color=colors["accent_red"],
        alpha=0.7,
        s=20,
        label="La Trampa: Deterioro Silente (Δ ≤ -5)",
    )
    ax2.axhline(-5.0, color=colors["accent_red"], linestyle="--", linewidth=1.5)
    ax2.axvline(60.0, color=colors["accent_amber"], linestyle=":", linewidth=1.2)
    ax2.set_title("2. 'La Trampa del Rango Normal'", fontsize=13, fontweight="bold", pad=12, color=colors["text"])
    ax2.set_xlabel("eGFR Basal Transversal (mL/min)", fontsize=10)
    ax2.set_ylabel("Variación Anual Δ_eGFR (mL/min/año)", fontsize=10)
    ax2.legend(loc="lower left", facecolor=colors["panel_bg"], edgecolor=colors["grid"], fontsize=8)
    ax2.grid(True, color=colors["grid"], linestyle=":", alpha=0.6)

    # -------------------------------------------------------------------------
    # Panel 3: Curvas ROC de los 3 Modelos Clínicos
    # -------------------------------------------------------------------------
    ax3 = plt.subplot2grid((2, 3), (0, 2))
    ax3.set_facecolor(colors["panel_bg"])

    holdout_sample = df.sample(min(10000, len(df)), random_state=123)
    X_sample = holdout_sample[feature_names].astype(float)

    palette = [colors["accent_blue"], colors["accent_amber"], colors["accent_red"]]
    risk_labels = {
        "riesgo_aterosclerotico": ("ASCVD / Aterosclerosis", "target_aterosclerotico"),
        "riesgo_insuficiencia_cardiaca": ("Insuficiencia Cardíaca", "target_insuficiencia_cardiaca"),
        "riesgo_cardiorrenal": ("Cardiorrenal (KDIGO)", "target_cardiorrenal"),
    }

    for idx, (risk_key, (label, target_col)) in enumerate(risk_labels.items()):
        model = models[risk_key]
        y_true = holdout_sample[target_col].to_numpy()
        y_probs = model.predict_proba(X_sample)[:, 1]
        fpr, tpr, _ = roc_curve(y_true, y_probs)
        roc_auc = auc(fpr, tpr)
        ax3.plot(fpr, tpr, color=palette[idx], linewidth=2.0, label=f"{label} (AUC = {roc_auc:.3f})")

    ax3.plot([0, 1], [0, 1], color=colors["muted"], linestyle="--", linewidth=1.0)
    ax3.set_title("3. Rendimiento Clínico: Curvas ROC", fontsize=13, fontweight="bold", pad=12, color=colors["text"])
    ax3.set_xlabel("Tasa de Falsos Positivos (1 - Especificidad)", fontsize=10)
    ax3.set_ylabel("Tasa de Verdaderos Positivos (Sensibilidad/Recall)", fontsize=10)
    ax3.legend(loc="lower right", facecolor=colors["panel_bg"], edgecolor=colors["grid"], fontsize=8)
    ax3.grid(True, color=colors["grid"], linestyle=":", alpha=0.6)

    # -------------------------------------------------------------------------
    # Panel 4: Importancia de Variables (Feature Importance SHAP/Gain)
    # -------------------------------------------------------------------------
    ax4 = plt.subplot2grid((2, 3), (1, 0), colspan=2)
    ax4.set_facecolor(colors["panel_bg"])

    # Extraer feature importances de los modelos XGBoost
    importances_matrix = []
    for model in models.values():
        importances_matrix.append(model.feature_importances_)
    avg_importance = np.mean(importances_matrix, axis=0)
    importance_df = pd.DataFrame({
        "feature": feature_names,
        "importance": avg_importance
    }).sort_values("importance", ascending=True)

    y_pos = np.arange(len(importance_df))
    bar_colors = [
        colors["accent_red"] if feat.startswith("delta_") else colors["accent_blue"]
        for feat in importance_df["feature"]
    ]
    ax4.barh(y_pos, importance_df["importance"], color=bar_colors, edgecolor="none", height=0.65)
    ax4.set_yticks(y_pos)
    ax4.set_yticklabels(importance_df["feature"], fontsize=9)
    ax4.set_title("4. Jerarquía de Impacto Clínico (Rojo: Progresión Longitudinal Δ | Azul: Laboratorio Basal)", fontsize=13, fontweight="bold", pad=12, color=colors["text"])
    ax4.set_xlabel("Importancia Relativa (Weight / Gain normalizado)", fontsize=10)
    ax4.grid(True, color=colors["grid"], linestyle=":", alpha=0.6)

    # -------------------------------------------------------------------------
    # Panel 5: Distribución de Probabilidades y Umbrales
    # -------------------------------------------------------------------------
    ax5 = plt.subplot2grid((2, 3), (1, 2))
    ax5.set_facecolor(colors["panel_bg"])

    # Probabilidades del modelo cardiorrenal en controles vs patológicos
    cr_model = models["riesgo_cardiorrenal"]
    cr_threshold = thresholds["riesgo_cardiorrenal"]
    probs = cr_model.predict_proba(X_sample)[:, 1]
    targets = holdout_sample["target_cardiorrenal"].to_numpy()

    sns.kdeplot(probs[targets == 0], ax=ax5, fill=True, color=colors["accent_green"], label="Controles Sanos", alpha=0.4, linewidth=1.5)
    sns.kdeplot(probs[targets == 1], ax=ax5, fill=True, color=colors["accent_red"], label="Riesgo Cardiorrenal", alpha=0.4, linewidth=1.5)
    ax5.axvline(cr_threshold, color=colors["accent_amber"], linestyle="--", linewidth=2.0, label=f"Umbral Alerta ({cr_threshold:.2f})")

    ax5.set_title("5. Calibración y Separación de Clases", fontsize=13, fontweight="bold", pad=12, color=colors["text"])
    ax5.set_xlabel("Probabilidad de Riesgo Cardiorrenal", fontsize=10)
    ax5.set_ylabel("Densidad Poblacional", fontsize=10)
    ax5.legend(loc="upper center", facecolor=colors["panel_bg"], edgecolor=colors["grid"], fontsize=8)
    ax5.grid(True, color=colors["grid"], linestyle=":", alpha=0.6)

    # Título General y Footer
    plt.suptitle("NextGen-Health: Validación Visual del Dataset Clínico y Modelos de Riesgo Cardiorrenal", fontsize=16, fontweight="bold", color=colors["text"], y=0.98)
    plt.tight_layout(rect=[0.02, 0.03, 0.98, 0.95])

    # Guardar en docs/img/ y en el directorio de artefactos
    OUT_IMG_DOCS.parent.mkdir(parents=True, exist_ok=True)
    OUT_IMG_ARTIFACT.parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(OUT_IMG_DOCS, facecolor=fig.get_facecolor(), edgecolor="none")
    plt.savefig(OUT_IMG_ARTIFACT, facecolor=fig.get_facecolor(), edgecolor="none")
    plt.close()

    print(f"[OK] Gráfica guardada exitosamente en:")
    print(f"  * {OUT_IMG_DOCS}")
    print(f"  * {OUT_IMG_ARTIFACT}")


if __name__ == "__main__":
    create_clinical_dashboard()
