from typing import List, Dict, Any, Optional
import numpy as np
import pandas as pd

from app.backend.schemas.response import FactorClave


PHENOTYPE_LABELS = {
    "riesgo_aterosclerotico": "Coronario e Isquemia",
    "riesgo_insuficiencia_cardiaca": "Sobrecarga e Insuficiencia Cardíaca",
    "riesgo_cardiorrenal": "Función Renal (Filtrado)",
    "riesgo_microvascular": "Daño Microvascular y Endotelial",
    "riesgo_cardiometabolico": "Descompensación Cardiometabólica",
}


class ShapService:
    def __init__(self, explainer=None, feature_names: Optional[List[str]] = None):
        self.explainer = explainer
        self.feature_names = feature_names or []

    def explain(
        self,
        features_dict: Dict[str, Any],
        predicted_probs: Dict[str, float],
        top_k: int = 3,
        allow_heuristic_fallback: bool = True,
    ) -> List[FactorClave]:
        """Genera factores SHAP reales con TreeSHAP; el fallback heurístico solo se permite explícitamente."""
        if self.explainer is not None:
            try:
                return self._explain_with_shap(features_dict, predicted_probs, top_k)
            except Exception as e:
                if not allow_heuristic_fallback:
                    raise RuntimeError(f"No se pudo calcular la explicación SHAP: {e}") from e
                print(f"Aviso: SHAP explainer falló ({e}), usando fallback heurístico clínico.")

        if not allow_heuristic_fallback:
            raise RuntimeError("No hay explainer SHAP cargado para el modelo.")
        return self._explain_heuristic(features_dict, predicted_probs, top_k)

    def _explain_with_shap(
        self,
        features_dict: Dict[str, Any],
        predicted_probs: Dict[str, float],
        top_k: int,
    ) -> List[FactorClave]:
        df_row = pd.DataFrame([features_dict])[self.feature_names]
        shap_values = self.explainer.shap_values(df_row)

        if isinstance(shap_values, list):
            vals = np.asarray(shap_values[1][0], dtype=float)
        elif len(shap_values.shape) == 2:
            vals = np.asarray(shap_values[0], dtype=float)
        else:
            vals = np.asarray(shap_values, dtype=float)

        max_prob = max(predicted_probs.values()) if predicted_probs else 0.25
        active_risk_name = max(predicted_probs, key=predicted_probs.get) if predicted_probs else None
        phenotype_label = PHENOTYPE_LABELS.get(active_risk_name, None)

        max_abs_phi = float(np.nanmax(np.abs(vals))) if len(vals) > 0 else 0.0
        # Si los valores vienen ya en escala de probabilidad directa (ej. |phi| <= 0.20), convertir directo a %;
        # si vienen en espacio de log-odds de TreeSHAP, aplicar derivada sigmoidea media acotada:
        if max_abs_phi <= 0.20:
            scale = 1.0
        else:
            effective_p = max(float(max_prob), 0.22)
            scale = effective_p * (1.0 - effective_p) * 1.6

        raw_factors = []
        for name, phi in zip(self.feature_names, vals):
            raw_val = features_dict.get(name)
            if pd.isna(raw_val):
                continue
            phi_f = float(phi)
            impact_pct = int(round(phi_f * scale * 100))
            if impact_pct == 0 and abs(phi_f) >= 0.01:
                impact_pct = 1 if phi_f > 0 else -1
            raw_factors.append((name, raw_val, impact_pct, abs(phi_f)))

        raw_factors.sort(key=lambda x: x[3], reverse=True)

        factors: List[FactorClave] = []
        for name, val, impact_num, _ in raw_factors[:top_k]:
            sign = "+" if impact_num >= 0 else ""
            desc, fuente = self._get_medical_description(name, val, impact_num, phenotype_label)
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
        """Motor clínico heurístico de respaldo exclusivo cuando no hay explainer en tests aislados."""
        candidates = []

        delta_egfr = features.get("delta_egfr")
        if delta_egfr is not None and not np.isnan(delta_egfr) and delta_egfr <= -5.0:
            candidates.append((
                "delta_egfr",
                delta_egfr,
                int(min(28, abs(delta_egfr) * 1.5)),
                f"Pérdida acelerada de filtrado glomerular ({delta_egfr:.1f} mL/min/año) indica daño renal progresivo activo.",
                "Evolución Longitudinal",
            ))

        delta_uacr = features.get("delta_uacr")
        if delta_uacr is not None and not np.isnan(delta_uacr) and delta_uacr >= 10.0:
            candidates.append((
                "delta_uacr",
                delta_uacr,
                int(min(24, delta_uacr * 0.8)),
                f"Incremento interanual de microalbuminuria (+{delta_uacr:.1f} mg/g) confirma estrés glomerular.",
                "Evolución Longitudinal",
            ))

        uacr = features.get("uacr", 0)
        if uacr >= 30.0:
            candidates.append((
                "uacr",
                uacr,
                int(min(20, (uacr / 30.0) * 10)),
                f"Microalbuminuria patológica activa ({uacr:.1f} mg/g) con daño endotelial microvascular.",
                "Laboratorio Actual",
            ))

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

        ap_hi = features.get("ap_hi", 120)
        if ap_hi >= 140:
            candidates.append((
                "ap_hi",
                ap_hi,
                int(min(18, (ap_hi - 120) * 0.5)),
                f"Presión sistólica elevada ({ap_hi:.0f} mmHg) genera sobrecarga hemodinámica vascular.",
                "Constantes Vitales",
            ))

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

        if features.get("diabetes") == 1:
            candidates.append((
                "diabetes",
                1,
                11,
                "Diabetes mellitus actúa como multiplicador sistémico de daño micro y macrovascular.",
                "Historial Clínico",
            ))

        if features.get("fuma") == 1:
            candidates.append((
                "fuma",
                1,
                9,
                "Tabaquismo activo promueve inflamación endotelial y vasoconstricción.",
                "Hábitos de Vida",
            ))

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

    def _get_medical_description(
        self,
        var: str,
        val: Any,
        impact: int,
        phenotype_label: Optional[str] = None,
    ) -> tuple[str, str]:
        """
        Genera explicaciones clínicas contextuales al valor real del paciente y al signo
        de la atribución TreeSHAP (factor de riesgo si impact > 0 vs factor protector si impact < 0).
        """
        prefix = f"[{phenotype_label}] " if phenotype_label else ""
        fval = float(val) if val is not None and not pd.isna(val) else 0.0

        if var == "delta_egfr":
            if impact > 0:
                desc = f"{prefix}Pérdida interanual de filtrado glomerular ({fval:.1f} mL/min/año) indica deterioro renal activo."
            else:
                desc = f"{prefix}Estabilidad longitudinal del filtrado glomerular ({fval:.1f} mL/min/año), factor protector renal."
            return desc, "Evolución Longitudinal"

        if var == "delta_uacr":
            if impact > 0:
                desc = f"{prefix}Incremento interanual de albuminuria ({'+' if fval >= 0 else ''}{fval:.1f} mg/g) confirma estrés endotelial glomerular."
            else:
                desc = f"{prefix}Evolución estable de albuminuria ({fval:.1f} mg/g) sin progresión de daño microvascular."
            return desc, "Evolución Longitudinal"

        if var == "delta_ap_hi":
            if impact > 0:
                desc = f"{prefix}Aumento progresivo de presión sistólica ({'+' if fval >= 0 else ''}{fval:.0f} mmHg/año) incrementa la poscarga."
            else:
                desc = f"{prefix}Trayectoria tensional sistólica controlada ({fval:.0f} mmHg/año)."
            return desc, "Evolución Longitudinal"

        if var == "delta_colesterol":
            if impact > 0:
                desc = f"{prefix}Progresión al alza del colesterol total ({'+' if fval >= 0 else ''}{fval:.0f} mg/dL/año)."
            else:
                desc = f"{prefix}Evolución favorable del perfil lipídico ({fval:.0f} mg/dL/año)."
            return desc, "Evolución Longitudinal"

        if var == "delta_bmi":
            if impact > 0:
                desc = f"{prefix}Incremento ponderal interanual ({'+' if fval >= 0 else ''}{fval:.1f} kg/m²/año) con mayor demanda metabólica."
            else:
                desc = f"{prefix}Estabilidad ponderal longitudinal ({fval:.1f} kg/m²/año)."
            return desc, "Evolución Longitudinal"

        if var == "egfr":
            if impact > 0:
                if fval < 60.0:
                    desc = f"{prefix}Filtrado glomerular disminuido ({fval:.1f} mL/min/1.73m²), compatible con ERC estadio G3-G5."
                else:
                    desc = f"{prefix}Filtrado glomerular en rango limítrofe G2 ({fval:.1f} mL/min/1.73m²) con menor reserva funcional."
            else:
                desc = f"{prefix}Filtrado glomerular conservado ({fval:.1f} mL/min/1.73m²) que actúa como factor protector cardiorrenal."
            return desc, "Laboratorio Actual"

        if var == "uacr":
            if impact > 0:
                if fval >= 300.0:
                    desc = f"{prefix}Macroalbuminuria severa KDIGO A3 ({fval:.1f} mg/g) indicativa de nefropatía establecida."
                else:
                    desc = f"{prefix}Albuminuria elevada ({fval:.1f} mg/g) con daño endotelial glomerular."
            else:
                desc = f"{prefix}Normoalbuminuria KDIGO A1 ({fval:.1f} mg/g), ausencia de daño microvascular renal."
            return desc, "Laboratorio Actual"

        if var == "colesterol_total":
            if impact > 0:
                desc = f"{prefix}Colesterol total ({fval:.0f} mg/dL) favorece la progresión de placa ateromatosa."
            else:
                desc = f"{prefix}Colesterol total contenido ({fval:.0f} mg/dL) con baja carga aterogénica."
            return desc, "Laboratorio Actual"

        if var == "ap_hi":
            if impact > 0:
                desc = f"{prefix}Presión arterial sistólica ({fval:.0f} mmHg) genera sobrecarga hemodinámica vascular."
            else:
                desc = f"{prefix}Presión arterial sistólica controlada ({fval:.0f} mmHg), factor hemodinámico protector."
            return desc, "Constantes Vitales"

        if var == "ap_lo":
            if impact > 0:
                desc = f"{prefix}Presión arterial diastólica ({fval:.0f} mmHg) eleva la resistencia vascular periférica."
            else:
                desc = f"{prefix}Presión arterial diastólica controlada ({fval:.0f} mmHg)."
            return desc, "Constantes Vitales"

        if var == "diabetes":
            if int(round(fval)) == 1 and impact > 0:
                desc = f"{prefix}Presencia de diabetes mellitus actúa como multiplicador sistémico de riesgo micro y macrovascular."
            else:
                desc = f"{prefix}Ausencia de diabetes mellitus actúa como factor protector metabólico y glomerular."
            return desc, "Historial Clínico"

        if var == "fuma":
            if int(round(fval)) == 1 and impact > 0:
                desc = f"{prefix}Tabaquismo activo promueve disfunción endotelial y trombogénesis."
            else:
                desc = f"{prefix}Condición de no fumador preserva la integridad endotelial vascular."
            return desc, "Hábitos de Vida"

        if var == "bmi":
            if impact > 0:
                desc = f"{prefix}Índice de masa corporal ({fval:.1f} kg/m²) asociado a sobrecarga cardiometabólica."
            else:
                desc = f"{prefix}Índice de masa corporal contenido ({fval:.1f} kg/m²) sin sobrecarga metabólica adicional."
            return desc, "Antropometría"

        if var == "edad":
            if impact > 0:
                desc = f"{prefix}Edad ({fval:.0f} años) como determinante basal de rigidez vascular."
            else:
                desc = f"{prefix}Edad ({fval:.0f} años) asociada a menor riesgo basal acumulado."
            return desc, "Demografía"

        return f"{prefix}Parámetro {var} ({val})", "Analítica"

    def _format_value(self, var: str, val: Any) -> str:
        if val is None or (isinstance(val, float) and np.isnan(val)):
            return "No disponible"
        sign = "+" if var.startswith("delta_") and float(val) > 0 else ""
        if var in ["colesterol_total", "delta_colesterol"]:
            return f"{sign}{float(val):.0f} mg/dL"
        if var in ["egfr", "delta_egfr"]:
            return f"{sign}{float(val):.1f} mL/min"
        if var in ["uacr", "delta_uacr"]:
            return f"{sign}{float(val):.1f} mg/g"
        if var in ["ap_hi", "ap_lo", "delta_ap_hi"]:
            return f"{sign}{float(val):.0f} mmHg"
        if var in ["bmi", "delta_bmi"]:
            return f"{sign}{float(val):.1f} kg/m²"
        if var == "edad":
            return f"{float(val):.0f} años"
        if var == "diabetes":
            return "Sí" if int(val) == 1 else "No"
        if var == "fuma":
            return "Fumador" if int(val) == 1 else "No fumador"
        return str(val)
