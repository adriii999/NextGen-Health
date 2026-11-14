---
name: xai-shap-clinician
description: Comprehensive expert guidelines for TreeSHAP integration, feature attribution conversion to clinical impact percentages, and actionable medical recommendation synthesis.
---

# Explainable AI Skill: SHAP for Doctor-Facing Insights

This skill governs the integration, mathematical conversion, and clinical communication of SHAP (SHapley Additive exPlanations) values to provide trustworthy "second opinions" for Primary Care physicians.

---

## 1. Mathematical Grounding: TreeSHAP to Impact Percentages

TreeSHAP computes exact Shapley values for tree ensembles in polynomial time. For binary XGBoost models:
$$\ln\left(\frac{p}{1 - p}\right) = \phi_0 + \sum_{i=1}^{M} \phi_i$$
where:
* $\phi_0$ is the base expected value (log-odds of baseline population risk).
* $\phi_i$ is the additive attribution of feature $i$.
* $p$ is the final predicted probability.

### Conversion to Doctor-Facing Impact Percentage ($\Delta p_i$)
Physicians do not reason in log-odds. We compute the marginal percentage contribution:
$$\text{Impacto}_i \approx \phi_i \times \sigma'(\text{margen}) \times 100\%$$
Where $\sigma'(z) = p(1-p)$ is the derivative of the sigmoid function. A positive impact (e.g. $+14\%$) directly communicates how much that specific parameter elevated the risk compared to a standard patient.

---

## 2. End-to-End SHAP Service Implementation

```python
import shap
import numpy as np
import pandas as pd
from typing import List, Dict, Any

class ShapClinicianService:
    def __init__(self, model, background_sample: pd.DataFrame):
        """
        Initializes TreeExplainer using a representative reference sample.
        """
        self.feature_names = list(background_sample.columns)
        self.explainer = shap.TreeExplainer(model, data=background_sample)

    def explain_case(self, input_df: pd.DataFrame, predicted_prob: float, top_k: int = 3) -> List[Dict[str, Any]]:
        """
        Calculates local feature attributions and transforms them into clinical impacts.
        """
        shap_values = self.explainer.shap_values(input_df)

        if isinstance(shap_values, list):
            vals = shap_values[1][0]
        elif len(shap_values.shape) == 2:
            vals = shap_values[0]
        else:
            vals = shap_values

        # Scaling factor: derivative of sigmoid at predicted probability
        scale = predicted_prob * (1.0 - predicted_prob) * 1.5

        raw_factors = []
        for name, phi in zip(self.feature_names, vals):
            raw_val = input_df[name].iloc[0]
            if pd.isna(raw_val):
                continue  # Skip missing progression deltas

            impact_pct = int(round(phi * scale * 100))
            raw_factors.append({
                "variable": name,
                "phi": float(phi),
                "impact_num": impact_pct,
                "raw_val": raw_val
            })

        # Sort by absolute clinical impact
        raw_factors.sort(key=lambda x: abs(x["phi"]), reverse=True)

        clinical_factors = []
        for item in raw_factors[:top_k]:
            sign = "+" if item["impact_num"] >= 0 else ""
            desc, fuente = self._get_medical_explanation(item["variable"], item["raw_val"], item["impact_num"])
            clinical_factors.append({
                "variable": item["variable"],
                "valor_actual": self._format_value(item["variable"], item["raw_val"]),
                "impacto": f"{sign}{item['impact_num']}%",
                "descripcion": desc,
                "fuente": fuente
            })

        return clinical_factors

    def _get_medical_explanation(self, var: str, val: float, impact: int) -> tuple[str, str]:
        mapping = {
            "delta_egfr": (
                f"Pérdida acelerada de filtrado glomerular ({val} mL/min/año) indica daño renal progresivo activo.",
                "Evolución Longitudinal"
            ),
            "delta_uacr": (
                f"Incremento interanual de microalbuminuria (+{val} mg/g) confirma estrés glomerular.",
                "Evolución Longitudinal"
            ),
            "egfr": (
                f"Filtrado glomerular en rango limítrofe ({val} mL/min/1.73m2).",
                "Laboratorio Actual"
            ),
            "uacr": (
                f"Microalbuminuria patológica activa ({val} mg/g) con daño endotelial renal.",
                "Laboratorio Actual"
            ),
            "colesterol_total": (
                f"Colesterol total ({val} mg/dL) favorece la progresión de placa ateromatosa.",
                "Laboratorio Actual"
            ),
            "ap_hi": (
                f"Presión sistólica ({val} mmHg) genera sobrecarga hemodinámica vascular.",
                "Constantes Vitales"
            ),
            "diabetes": (
                "Presencia de diabetes mellitus actúa como multiplicador sistémico de riesgo micro y macrovascular.",
                "Historial Clínico"
            ),
            "bmi": (
                f"Índice de masa corporal ({val} kg/m2) asociado a adiposidad metabólica.",
                "Antropometría"
            ),
            "fuma": (
                "Tabaquismo activo promueve daño endotelial y trombogénesis.",
                "Hábitos de Vida"
            )
        }
        return mapping.get(var, (f"Aporte del parámetro {var}: {val}", "Analítica"))

    def _format_value(self, var: str, val: Any) -> str:
        if pd.isna(val):
            return "No disponible"
        if var == "colesterol_total":
            return f"{val} mg/dL"
        if var in ["egfr", "delta_egfr"]:
            return f"{val} mL/min"
        if var in ["uacr", "delta_uacr"]:
            return f"{val} mg/g"
        if var in ["ap_hi", "ap_lo", "delta_ap_hi"]:
            return f"{val} mmHg"
        if var in ["bmi", "delta_bmi"]:
            return f"{val} kg/m²"
        if var == "diabetes":
            return "Sí" if val == 1 else "No"
        if var == "fuma":
            return "Fumador" if val == 1 else "No fumador"
        return str(val)
```

---

## 3. Clinical Recommendation Engine (Evidence-Based Guidelines)

The recommendation engine synthesizes actionable guidance based on the active risk phenotype:

| Active Risk Phenotype | Guideline Source | Clinical Action Recommendation |
| :--- | :--- | :--- |
| **Cardiorrenal Predominante** | KDIGO 2024 / SEC | *"Confirmar UACR en 3 meses. Optimizar control tensional (<130/80 mmHg). Valorar inicio de iSGLT2 / finerenona para nefroprotección y frenado del deterioro de eGFR."* |
| **Insuficiencia Cardíaca (IC)** | ESC HF Guidelines | *"Solicitar NT-proBNP en sangre. Reevaluar sobrecarga de volumen y ajuste de dosis de IECA/ARA-II/iSGLT2. Recomendar restricción de sal y control de peso."* |
| **Aterosclerótico (ASCVD)** | ESC / SEC Prevención | *"Intensificar tratamiento hipolipemiante con estatinas de alta potencia para objetivo c-LDL < 70 mg/dL. Programa activo de deshabituación tabáquica."* |
| **Sin Riesgo Significativo** | Protocolo SNS | *"Perfil clínico bajo control. Mantener seguimiento ordinario en Atención Primaria y hábitos de vida cardiosaludables."* |
