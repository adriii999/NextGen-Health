from pathlib import Path
from typing import Dict, Any, Optional
import numpy as np
import pandas as pd
import joblib

from app.backend.schemas.clinical import LabInput
from app.backend.schemas.response import (
    EvaluationResponse,
    TiposRiesgo,
    RiesgoItem,
    FactorClave,
    PerfilRenalKDIGO,
)
from app.backend.services.shap_service import ShapService
from app.backend.config import settings


DEFAULT_FEATURE_NAMES = [
    "edad", "sexo", "bmi", "ap_hi", "ap_lo",
    "colesterol_total", "fuma", "diabetes", "egfr", "uacr",
    "delta_egfr", "delta_uacr", "delta_ap_hi", "delta_colesterol", "delta_bmi"
]

DEFAULT_THRESHOLDS = {
    "riesgo_aterosclerotico": 0.25,
    "riesgo_insuficiencia_cardiaca": 0.25,
    "riesgo_cardiorrenal": 0.28,
    "riesgo_microvascular": 0.28,
    "riesgo_cardiometabolico": 0.28,
}


class ModelNotImplementedError(Exception):
    """Excepción lanzada cuando el modelo de ML no ha sido entrenado ni cargado."""
    pass


class ModelService:
    def __init__(self):
        self.models = {}
        self.explainers = {}
        self.model = None
        self.feature_names = DEFAULT_FEATURE_NAMES
        self.thresholds = DEFAULT_THRESHOLDS
        self.shap_service = ShapService(explainer=None, feature_names=self.feature_names)
        self.artifact_loaded = False

    def load_artifacts(self, artifact_path: Optional[str] = None) -> bool:
        """
        Intenta cargar el artefacto .joblib desde disco.
        Devuelve True si el modelo fue cargado exitosamente, False si no existe o es inválido.
        """
        target_path = Path(artifact_path or settings.MODEL_PATH)
        if target_path.exists() and target_path.is_file():
            try:
                artifact = joblib.load(target_path)
                required_risks = set(DEFAULT_THRESHOLDS)
                models = artifact.get("models") if isinstance(artifact, dict) else None
                explainers = artifact.get("explainers") if isinstance(artifact, dict) else None
                thresholds = artifact.get("thresholds") if isinstance(artifact, dict) else None
                feature_names = artifact.get("feature_names") if isinstance(artifact, dict) else None
                thresholds_are_valid = (
                    isinstance(thresholds, dict)
                    and required_risks.issubset(thresholds)
                    and all(
                        isinstance(thresholds[name], (int, float))
                        and 0.0 <= float(thresholds[name]) <= 1.0
                        for name in required_risks
                    )
                )
                if (
                    isinstance(models, dict)
                    and required_risks.issubset(models)
                    and isinstance(explainers, dict)
                    and required_risks.issubset(explainers)
                    and thresholds_are_valid
                    and isinstance(feature_names, list)
                    and feature_names
                ):
                    self.models = models
                    self.explainers = explainers
                    self.feature_names = feature_names
                    self.thresholds = thresholds
                    self.model = None
                    self.shap_service = ShapService(
                        explainer=None, feature_names=self.feature_names
                    )
                    self.artifact_loaded = True
                    print(f"[OK] Tres modelos y explicadores SHAP cargados desde {target_path}")
                    return True
            except Exception as e:
                print(f"[AVISO] Error cargando artefacto de {target_path}: {e}")

        # Sin artefacto real: queda en estado NO IMPLEMENTADO
        self.model = None
        self.models = {}
        self.explainers = {}
        self.artifact_loaded = False
        self.shap_service = ShapService(explainer=None, feature_names=self.feature_names)
        print(f"[INFO] Artefacto '{target_path}' NO encontrado. Endpoints de inferencia responderán 501.")
        return False

    def is_model_loaded(self) -> bool:
        """True solo cuando están cargados los tres modelos independientes y sus SHAP."""
        return self.artifact_loaded and all(
            name in self.models and name in self.explainers and name in self.thresholds
            for name in DEFAULT_THRESHOLDS
        )

    def evaluate(self, lab_data: LabInput) -> EvaluationResponse:
        """
        Evalúa una analítica usando el modelo real.
        Si el modelo no está cargado, lanza ModelNotImplementedError (HTTP 501).
        NUNCA devuelve predicciones falsas o inventadas.
        """
        if not self.is_model_loaded():
            raise ModelNotImplementedError(
                f"El artefacto del modelo no se encuentra en '{settings.MODEL_PATH}'. "
                "Se requiere entrenar el modelo de Machine Learning antes de realizar inferencias."
            )

        features = lab_data.to_features_dict()
        probs = self._predict_with_real_model(features)

        # Construir items de riesgo frente a sus umbrales (5 dominios clínicos CKM / KDIGO)
        ath_probability = probs["riesgo_aterosclerotico"]
        ath_val = round(ath_probability, 3)
        ath_umb = self.thresholds.get("riesgo_aterosclerotico", 0.25)
        ath_alert = ath_probability >= ath_umb

        hf_probability = probs["riesgo_insuficiencia_cardiaca"]
        hf_val = round(hf_probability, 3)
        hf_umb = self.thresholds.get("riesgo_insuficiencia_cardiaca", 0.25)
        hf_alert = hf_probability >= hf_umb

        ren_probability = probs["riesgo_cardiorrenal"]
        ren_val = round(ren_probability, 3)
        ren_umb = self.thresholds.get("riesgo_cardiorrenal", 0.28)
        ren_alert = ren_probability >= ren_umb

        mic_probability = probs["riesgo_microvascular"]
        mic_val = round(mic_probability, 3)
        mic_umb = self.thresholds.get("riesgo_microvascular", 0.28)
        mic_alert = mic_probability >= mic_umb

        met_probability = probs["riesgo_cardiometabolico"]
        met_val = round(met_probability, 3)
        met_umb = self.thresholds.get("riesgo_cardiometabolico", 0.28)
        met_alert = met_probability >= met_umb

        tipos_riesgo = TiposRiesgo(
            riesgo_aterosclerotico=RiesgoItem(
                valor=ath_val,
                umbral=ath_umb,
                alerta=ath_alert,
                interpretacion=self._interpret_score(ath_val, ath_umb),
            ),
            riesgo_insuficiencia_cardiaca=RiesgoItem(
                valor=hf_val,
                umbral=hf_umb,
                alerta=hf_alert,
                interpretacion=self._interpret_score(hf_val, hf_umb),
            ),
            riesgo_cardiorrenal=RiesgoItem(
                valor=ren_val,
                umbral=ren_umb,
                alerta=ren_alert,
                interpretacion=self._interpret_score(ren_val, ren_umb),
            ),
            riesgo_microvascular=RiesgoItem(
                valor=mic_val,
                umbral=mic_umb,
                alerta=mic_alert,
                interpretacion=self._interpret_score(mic_val, mic_umb),
            ),
            riesgo_cardiometabolico=RiesgoItem(
                valor=met_val,
                umbral=met_umb,
                alerta=met_alert,
                interpretacion=self._interpret_score(met_val, met_umb),
            ),
        )

        hay_riesgo = ath_alert or hf_alert or ren_alert or mic_alert or met_alert

        perfil_renal = self._compute_kdigo_profile(features)
        motivos_prioridad = self._priority_reasons(
            ath_alert, hf_alert, ren_alert, mic_alert, met_alert, features, probs, perfil_renal
        )

        # Explicar con TreeSHAP real: si hay alertas activas, priorizar los modelos en alerta;
        # si no hay alertas (paciente bajo control), ejecutar TreeSHAP sobre los 5 modelos para
        # mostrar factores protectores o parámetros limítrofes al médico de Atención Primaria.
        factor_candidates = []
        for risk_name, is_alert in (
            ("riesgo_aterosclerotico", ath_alert),
            ("riesgo_insuficiencia_cardiaca", hf_alert),
            ("riesgo_cardiorrenal", ren_alert),
            ("riesgo_microvascular", mic_alert),
            ("riesgo_cardiometabolico", met_alert),
        ):
            if hay_riesgo and not is_alert:
                continue
            explainer = self.explainers[risk_name]
            service = ShapService(explainer=explainer, feature_names=self.feature_names)
            factor_candidates.extend(
                service.explain(
                    features,
                    {risk_name: probs[risk_name]},
                    top_k=3,
                    allow_heuristic_fallback=False,
                )
            )
        unique_factors = {}
        for factor in factor_candidates:
            key = factor.variable
            current = unique_factors.get(key)
            impact = abs(float(factor.impacto.rstrip("%").replace("+", "")))
            current_impact = (
                abs(float(current.impacto.rstrip("%").replace("+", "")))
                if current is not None
                else -1
            )
            if impact > current_impact:
                unique_factors[key] = factor
        factores_clave = sorted(
            unique_factors.values(),
            key=lambda factor: abs(float(factor.impacto.rstrip("%").replace("+", ""))),
            reverse=True,
        )[:3]

        if not hay_riesgo:
            high_review = bool(set(motivos_prioridad) & {
                "DESCENSO_RAPIDO", "RIESGO_RENAL_ALTO", "PRESION_ALTA",
            })
            return EvaluationResponse(
                hay_riesgo=False,
                conclusion_diagnostica="El modelo experimental no ha generado alertas. Esto no descarta riesgo.",
                nivel_prioridad="ALTA" if high_review else "BAJA",
                motivos_prioridad=motivos_prioridad,
                tipos_riesgo=tipos_riesgo,
                factores_clave=factores_clave,
                recomendacion_preventiva=(
                    "Revisar los datos y la historia clínica según el criterio profesional."
                ),
                perfil_renal=perfil_renal,
            )

        conclusion, recomendacion, prioridad = self._synthesize_verdict(
            ath_alert, hf_alert, ren_alert, mic_alert, met_alert,
            features, probs=probs, perfil_renal=perfil_renal
        )

        return EvaluationResponse(
            hay_riesgo=True,
            conclusion_diagnostica=conclusion,
            nivel_prioridad=prioridad,
            motivos_prioridad=motivos_prioridad,
            tipos_riesgo=tipos_riesgo,
            factores_clave=factores_clave,
            recomendacion_preventiva=recomendacion,
            perfil_renal=perfil_renal,
        )

    def _predict_with_real_model(self, features: Dict[str, Any]) -> Dict[str, float]:
        """Obtiene una probabilidad independiente de cada clasificador entrenado."""
        df_row = pd.DataFrame([features])[self.feature_names]
        probabilities = {}
        for risk_name in DEFAULT_THRESHOLDS:
            model = self.models[risk_name]
            probability = float(model.predict_proba(df_row)[0][1])
            if not np.isfinite(probability) or not 0.0 <= probability <= 1.0:
                raise ValueError(f"El modelo '{risk_name}' devolvió una probabilidad inválida.")
            probabilities[risk_name] = probability
        return probabilities

    def _interpret_score(self, val: float, umbral: float) -> str:
        pct = int(round(val * 100))
        if val >= umbral * 1.5:
            return f"Alto ({pct}%, umbral alerta: {int(umbral*100)}%)"
        if val >= umbral:
            return f"Moderado-Alto ({pct}%)"
        return f"Por debajo del umbral del modelo ({pct}%)"

    def _priority_reasons(
        self,
        ath_alert: bool,
        hf_alert: bool,
        ren_alert: bool,
        mic_alert: bool,
        met_alert: bool,
        features: Dict[str, Any],
        probs: Dict[str, float],
        perfil_renal: Optional[PerfilRenalKDIGO],
    ):
        any_alert = ath_alert or hf_alert or ren_alert or mic_alert or met_alert
        reasons = [] if any_alert else ["SIN_ALERTAS"]
        for active, reason in (
            (ath_alert, "ALERTA_CIRCULACION"),
            (hf_alert, "ALERTA_CORAZON"),
            (ren_alert, "ALERTA_RINON_CORAZON"),
            (mic_alert, "ALERTA_MICROVASCULAR"),
            (met_alert, "ALERTA_CARDIOMETABOLICO"),
        ):
            if active:
                reasons.append(reason)
        delta = features.get("delta_egfr")
        if delta is not None and not np.isnan(delta) and delta <= -5.0:
            reasons.append("DESCENSO_RAPIDO")
        if perfil_renal is not None and perfil_renal.cuadrante_kdigo in ("ALTO", "MUY_ALTO"):
            reasons.append("RIESGO_RENAL_ALTO")
        if float(features.get("ap_hi", 120.0)) >= 165.0 or float(features.get("ap_lo", 80.0)) >= 100.0:
            reasons.append("PRESION_ALTA")
        if probs and max(probs.values()) >= 0.45:
            reasons.append("PUNTUACION_ALTA")
        active_count = sum([ath_alert, hf_alert, ren_alert, mic_alert, met_alert])
        if ath_alert and hf_alert and ren_alert:
            reasons.append("TRES_ALERTAS")
        if active_count >= 3:
            reasons.append("MULTIPLES_ALERTAS")
        return reasons

    def _synthesize_verdict(
        self,
        ath_alert: bool,
        hf_alert: bool,
        ren_alert: bool,
        mic_alert: bool,
        met_alert: bool,
        features: Dict[str, Any],
        probs: Optional[Dict[str, float]] = None,
        perfil_renal: Optional[PerfilRenalKDIGO] = None,
    ) -> tuple[str, str, str]:
        conclusions = []
        prioridad = "MEDIA"

        if ren_alert:
            delta_egfr = features.get("delta_egfr")
            if delta_egfr is not None and not np.isnan(delta_egfr) and delta_egfr <= -5.0:
                conclusions.append(
                    "alerta en la evaluación de función renal (filtrado glomerular)"
                )
                prioridad = "ALTA"
            else:
                conclusions.append("alerta en la evaluación de función renal (filtrado glomerular)")

        if mic_alert:
            conclusions.append("alerta en la evaluación de daño microvascular y endotelial")

        if hf_alert:
            conclusions.append("alerta en la evaluación de sobrecarga e insuficiencia cardíaca")

        if ath_alert:
            conclusions.append("alerta en la evaluación coronaria e isquemia")

        if met_alert:
            conclusions.append("alerta en la evaluación de descompensación cardiometabólica")

        # Criterios clínicos de Atención Primaria para triaje de Prioridad ALTA en Modo A y Modo B:
        reasons = self._priority_reasons(
            ath_alert, hf_alert, ren_alert, mic_alert, met_alert, features, probs, perfil_renal
        )
        if set(reasons) & {
            "DESCENSO_RAPIDO",
            "RIESGO_RENAL_ALTO",
            "PRESION_ALTA",
            "PUNTUACION_ALTA",
            "TRES_ALERTAS",
            "MULTIPLES_ALERTAS",
        }:
            prioridad = "ALTA"

        conclusion_txt = (
            f"Modelo experimental: {', '.join(conclusions)}. No es un diagnóstico."
            if conclusions
            else "Riesgo cardiovascular aumentado."
        )
        recomendacion_txt = "Revisar los datos y la historia clínica según el criterio profesional."

        return conclusion_txt, recomendacion_txt, prioridad

    def _compute_kdigo_profile(self, features: Dict[str, Any]) -> PerfilRenalKDIGO:
        """Calcula la estratificación de riesgo renal según guías KDIGO 2024."""
        egfr = float(features.get("egfr", 90.0))
        uacr = float(features.get("uacr", 10.0))
        delta_egfr = features.get("delta_egfr")

        # 1. Estadio GFR
        if egfr >= 90.0:
            g_stage = "G1"
        elif egfr >= 60.0:
            g_stage = "G2"
        elif egfr >= 45.0:
            g_stage = "G3a"
        elif egfr >= 30.0:
            g_stage = "G3b"
        elif egfr >= 15.0:
            g_stage = "G4"
        else:
            g_stage = "G5"

        # 2. Estadio Albuminuria
        if uacr < 30.0:
            a_stage = "A1"
        elif uacr <= 300.0:
            a_stage = "A2"
        else:
            a_stage = "A3"

        # 3. Matriz de Riesgo KDIGO (Semáforo Cardiorrenal)
        if g_stage in ["G1", "G2"]:
            quadrant = "BAJO" if a_stage == "A1" else ("MODERADO" if a_stage == "A2" else "ALTO")
        elif g_stage == "G3a":
            quadrant = "MODERADO" if a_stage == "A1" else ("ALTO" if a_stage == "A2" else "MUY_ALTO")
        elif g_stage == "G3b":
            quadrant = "ALTO" if a_stage == "A1" else "MUY_ALTO"
        else:
            quadrant = "MUY_ALTO"

        # 4. Alerta de Progresor Rápido KDIGO (pérdida >= 5 mL/min/año)
        is_rapid = False
        if delta_egfr is not None and not pd.isna(delta_egfr):
            if float(delta_egfr) <= -5.0:
                is_rapid = True
                if quadrant == "BAJO":
                    quadrant = "MODERADO"
                elif quadrant == "MODERADO":
                    quadrant = "ALTO"

        desc = f"Estadio KDIGO {g_stage}-{a_stage} (Riesgo {quadrant}). eGFR: {egfr:.1f} mL/min, uACR: {uacr:.1f} mg/g."
        if is_rapid:
            desc += f" ALERTA NEFROLÓGICA: Progresor rápido con caída de {float(delta_egfr):.1f} mL/min/año (umbral patológico: -5 mL/min/año)."

        return PerfilRenalKDIGO(
            estadio_gfr=g_stage,
            estadio_uacr=a_stage,
            cuadrante_kdigo=quadrant,
            progresor_rapido=is_rapid,
            descripcion_clinica=desc,
        )
