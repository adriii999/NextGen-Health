from typing import List, Dict, Any, Optional
import numpy as np
import pandas as pd

from app.backend.schemas.response import FactorClave


class ShapService:
    def __init__(self, explainer=None, feature_names: Optional[List[str]] = None):
        self.explainer = explainer
        self.feature_names = feature_names or []

    def explain(
        self,
        features_dict: Dict[str, Any],
        predicted_probs: Dict[str, float],
        top_k: int = 3,
    ) -> List[FactorClave]:
        """Genera los factores clave explicativos. Si hay explainer SHAP lo usa,
        de lo contrario utiliza el motor de atribución clínica heurística."""
        if self.explainer is not None:
            try:
                return self._explain_with_shap(features_dict, predicted_probs, top_k)
            except Exception as e:
                print(f"Aviso: SHAP explainer falló ({e}), usando fallback heurístico clínico.")

        return self._explain_heuristic(features_dict, predicted_probs, top_k)

    def _explain_with_shap(
        self,
        features_dict: Dict[str, Any],
        predicted_probs: Dict[str, float],
        top_k: int,
    ) -> List[FactorClave]:
        # Preparar DataFrame de 1 fila en el orden exacto
        df_row = pd.DataFrame([features_dict])[self.feature_names]
        shap_values = self.explainer.shap_values(df_row)

        if isinstance(shap_values, list):
            vals = shap_values[1][0]
        elif len(shap_values.shape) == 2:
            vals = shap_values[0]
        else:
            vals = shap_values

        max_prob = max(predicted_probs.values())
        scale = max_prob * (1.0 - max_prob) * 2.0

        raw_factors = []
        for name, phi in zip(self.feature_names, vals):
            raw_val = features_dict.get(name)
            if pd.isna(raw_val):
                continue
            impact_pct = int(round(float(phi) * scale * 100))
            raw_factors.append((name, raw_val, impact_pct, abs(float(phi))))

        raw_factors.sort(key=lambda x: x[3], reverse=True)

        factors: List[FactorClave] = []
        for name, val, impact_num, _ in raw_factors[:top_k]:
            sign = "+" if impact_num >= 0 else ""
            desc, fuente = self._get_medical_description(name, val, impact_num)
            factors.append(
                FactorClave(
                    variable=name,
                    valor_actual=self._format_value(name, val),
                    impacto=f"{sign}{impact_num}%",
                    descripcion=desc,
                    fuente=fuente,
                )
            )
        return factors

    def _explain_heuristic(
        self,
        features: Dict[str, Any],
        predicted_probs: Dict[str, float],
        top_k: int,
    ) -> List[FactorClave]:
        """Motor clínico heurístico para calibrar impacto de variables cuando no hay explainer en disco."""
        candidates = []

        # 1. Delta eGFR (la variable reina del deterioro silente)
        delta_egfr = features.get("delta_egfr")
        if delta_egfr is not None and not np.isnan(delta_egfr):
            if delta_egfr <= -5.0:
                candidates.append((
                    "delta_egfr",
                    delta_egfr,
                    int(min(28, abs(delta_egfr) * 1.5)),
                    f"Pérdida acelerada de filtrado glomerular ({delta_egfr:.1f} mL/min/año) indica daño renal progresivo activo.",
                    "Evolución Longitudinal",
                ))

        # 2. Delta UACR
        delta_uacr = features.get("delta_uacr")
        if delta_uacr is not None and not np.isnan(delta_uacr):
            if delta_uacr >= 10.0:
                candidates.append((
                    "delta_uacr",
                    delta_uacr,
                    int(min(24, delta_uacr * 0.8)),
                    f"Incremento interanual de microalbuminuria (+{delta_uacr:.1f} mg/g) confirma estrés glomerular.",
                    "Evolución Longitudinal",
                ))

        # 3. UACR absoluto
        uacr = features.get("uacr", 0)
        if uacr >= 30.0:
            candidates.append((
                "uacr",
                uacr,
                int(min(20, (uacr / 30.0) * 10)),
                f"Microalbuminuria patológica activa ({uacr:.1f} mg/g) con daño endotelial microvascular.",
                "Laboratorio Actual",
            ))

        # 4. eGFR absoluto
        egfr = features.get("egfr", 90)
        if egfr < 60.0:
            candidates.append((
                "egfr",
                egfr,
                int(min(22, (60.0 - egfr) * 0.8 + 8)),
                f"Filtrado glomerular reducido ({egfr:.1f} mL/min/1.73m²), compatible con enfermedad renal crónica.",
                "Laboratorio Actual",
            ))
        elif egfr < 75.0:
            candidates.append((
                "egfr",
                egfr,
                8,
                f"Filtrado glomerular en rango limítrofe estadio G2 ({egfr:.1f} mL/min/1.73m²).",
                "Laboratorio Actual",
            ))

        # 5. Presión arterial sistólica
        ap_hi = features.get("ap_hi", 120)
        if ap_hi >= 140:
            candidates.append((
                "ap_hi",
                ap_hi,
                int(min(18, (ap_hi - 120) * 0.5)),
                f"Presión sistólica elevada ({ap_hi:.0f} mmHg) genera sobrecarga hemodinámica vascular.",
                "Constantes Vitales",
            ))

        # 6. Colesterol total
        col = features.get("colesterol_total", 180)
        if col >= 240:
            candidates.append((
                "colesterol_total",
                col,
                14,
                f"Colesterol total marcadamente elevado ({col:.0f} mg/dL) favorece aterogénesis.",
                "Laboratorio Actual",
            ))
        elif col >= 200:
            candidates.append((
                "colesterol_total",
                col,
                7,
                f"Colesterol total en rango limítrofe ({col:.0f} mg/dL).",
                "Laboratorio Actual",
            ))

        # 7. Diabetes
        if features.get("diabetes") == 1:
            candidates.append((
                "diabetes",
                1,
                11,
                "Diabetes mellitus actúa como multiplicador sistémico de daño micro y macrovascular.",
                "Historial Clínico",
            ))

        # 8. Tabaquismo
        if features.get("fuma") == 1:
            candidates.append((
                "fuma",
                1,
                9,
                "Tabaquismo activo promueve inflamación endotelial y vasoconstricción.",
                "Hábitos de Vida",
            ))

        # Ordenar por impacto descendente
        candidates.sort(key=lambda x: x[2], reverse=True)

        factors: List[FactorClave] = []
        for name, val, impact_num, desc, fuente in candidates[:top_k]:
            sign = "+" if impact_num >= 0 else ""
            factors.append(
                FactorClave(
                    variable=name,
                    valor_actual=self._format_value(name, val),
                    impacto=f"{sign}{impact_num}%",
                    descripcion=desc,
                    fuente=fuente,
                )
            )

        return factors

    def _get_medical_description(self, var: str, val: Any, impact: int) -> tuple[str, str]:
        mapping = {
            "delta_egfr": (
                f"Variación de filtrado renal de {val} mL/min/año ({'+' if impact > 0 else ''}{impact}%).",
                "Evolución Longitudinal",
            ),
            "delta_uacr": (
                f"Variación de microalbuminuria de {val} mg/g ({'+' if impact > 0 else ''}{impact}%).",
                "Evolución Longitudinal",
            ),
            "egfr": (f"Filtrado glomerular actual ({val} mL/min).", "Laboratorio Actual"),
            "uacr": (f"Albuminuria en orina ({val} mg/g).", "Laboratorio Actual"),
            "colesterol_total": (f"Colesterol total continuo ({val} mg/dL).", "Laboratorio Actual"),
            "ap_hi": (f"Presión arterial sistólica ({val} mmHg).", "Constantes Vitales"),
            "diabetes": ("Diagnóstico de diabetes mellitus.", "Historial Clínico"),
            "fuma": ("Hábito tabáquico.", "Hábitos de Vida"),
            "bmi": (f"Índice de masa corporal ({val} kg/m²).", "Antropometría"),
        }
        return mapping.get(var, (f"Parámetro {var}: {val}", "Analítica"))

    def _format_value(self, var: str, val: Any) -> str:
        if val is None or (isinstance(val, float) and np.isnan(val)):
            return "No disponible"
        if var == "colesterol_total":
            return f"{float(val):.0f} mg/dL"
        if var in ["egfr", "delta_egfr"]:
            return f"{float(val):.1f} mL/min"
        if var in ["uacr", "delta_uacr"]:
            return f"{float(val):.1f} mg/g"
        if var in ["ap_hi", "ap_lo", "delta_ap_hi"]:
            return f"{float(val):.0f} mmHg"
        if var in ["bmi", "delta_bmi"]:
            return f"{float(val):.1f} kg/m²"
        if var == "diabetes":
            return "Sí" if int(val) == 1 else "No"
        if var == "fuma":
            return "Fumador" if int(val) == 1 else "No fumador"
        return str(val)
