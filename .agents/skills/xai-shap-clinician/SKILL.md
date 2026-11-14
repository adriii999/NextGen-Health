---
name: xai-shap-clinician
description: Explainable AI guidelines using SHAP (TreeExplainer) to convert mathematical feature contributions into trustworthy clinical messages and doctor-facing insights.
---

# Explainable AI Skill: SHAP for Doctor-Facing Insights

This skill governs the integration and translation of SHAP (SHapley Additive exPlanations) values into human-readable clinical explanations for primary care physicians.

## Purpose & Clinical Utility
In healthcare, providing a raw probability score (e.g., "78% risk") is insufficient. Physicians need to understand:
* **Which exact parameters pushed the risk up?**
* **Did an apparently acceptable value act as a hidden amplifier due to temporal decline?**
* **What actionable intervention is recommended?**

---

## Technical Implementation with TreeExplainer

```python
import shap
import numpy as np
import pandas as pd

def init_shap_explainer(model, X_sample: pd.DataFrame):
    """
    Initializes and serializes a TreeExplainer using a background sample.
    """
    explainer = shap.TreeExplainer(model)
    return explainer

def explain_single_prediction(explainer, feature_names, input_row: pd.DataFrame, top_k: int = 3):
    """
    Computes local SHAP values for an individual lab prediction and translates them
    into clinician-facing impact percentages.
    """
    shap_values = explainer.shap_values(input_row)
    
    # Handle binary classification output shape
    if isinstance(shap_values, list):
        vals = shap_values[1][0]
    elif len(shap_values.shape) == 2:
        vals = shap_values[0]
    else:
        vals = shap_values

    # Pair features with their SHAP contribution
    feature_impacts = []
    for name, val, actual_val in zip(feature_names, vals, input_row.iloc[0]):
        feature_impacts.append({
            "variable": name,
            "shap_value": float(val),
            "actual_value": actual_val
        })

    # Sort by absolute impact (descending)
    feature_impacts.sort(key=lambda x: abs(x["shap_value"]), reverse=True)
    
    # Format top K factors
    top_factors = []
    for item in feature_impacts[:top_k]:
        impact_pct = int(round(item["shap_value"] * 100))
        sign = "+" if impact_pct > 0 else ""
        top_factors.append({
            "variable": item["variable"],
            "valor_actual": str(item["actual_value"]),
            "impacto": f"{sign}{impact_pct}%",
            "descripcion": get_clinical_description(item["variable"], item["actual_value"], item["shap_value"])
        })

    return top_factors

def get_clinical_description(var: str, val: float, shap_val: float) -> str:
    descriptions = {
        "delta_egfr": f"Pérdida de función renal de {val} mL/min/año acelera el riesgo",
        "delta_uacr": f"Incremento interanual de microalbuminuria ({val} mg/g)",
        "egfr": f"Filtrado glomerular en rango limítrofe ({val} mL/min)",
        "uacr": f"Albuminuria activa ({val} mg/g) indica daño endotelial",
        "ap_hi": f"Presión sistólica ({val} mmHg) genera sobrecarga vascular",
        "colesterol_total": f"Colesterol total ({val} mg/dL) favorece aterogénesis",
        "diabetes": "Presencia de diabetes actúa como multiplicador de riesgo vascular",
        "fuma": "Tabaquismo activo promueve disfunción endotelial",
        "bmi": f"Índice de masa corporal ({val} kg/m2)"
    }
    return descriptions.get(var, f"Contribución de {var}")
```

---

## Medical Guidelines for Verdict Synthesis
* **When `hay_riesgo` is True:** Summarize the highest risk phenotype (e.g. Cardiorrenal) and cite the top 2 driving factors.
* **When `hay_riesgo` is False:** Produce a reassuring confirmation: *"Sin riesgo cardiovascular significativo detectado. Todos los subtipos analizados se encuentran bajo control."*
