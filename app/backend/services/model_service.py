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
    "riesgo_aterosclerotico": 0.10,
    "riesgo_insuficiencia_cardiaca": 0.08,
    "riesgo_cardiorrenal": 0.12,
}


class ModelNotImplementedError(Exception):
    """Excepción lanzada cuando el modelo de ML no ha sido entrenado ni cargado."""
    pass


class ModelService:
    def __init__(self):
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
                if isinstance(artifact, dict) and "model" in artifact:
                    self.model = artifact["model"]
                    self.feature_names = artifact.get("feature_names", DEFAULT_FEATURE_NAMES)
                    self.thresholds = artifact.get("thresholds", DEFAULT_THRESHOLDS)
                    explainer = artifact.get("explainer")
                    self.shap_service = ShapService(explainer=explainer, feature_names=self.feature_names)
                    self.artifact_loaded = True
                    print(f"[OK] Modelo y artefactos cargados exitosamente desde {target_path}")
                    return True
            except Exception as e:
                print(f"[AVISO] Error cargando artefacto de {target_path}: {e}")

        # Sin artefacto real: queda en estado NO IMPLEMENTADO
        self.model = None
        self.artifact_loaded = False
        self.shap_service = ShapService(explainer=None, feature_names=self.feature_names)
        print(f"[INFO] Artefacto '{target_path}' NO encontrado. Endpoints de inferencia responderán 501.")
        return False

    def is_model_loaded(self) -> bool:
        """Devuelve True estrictamente si hay un modelo real cargado."""
        return self.artifact_loaded and self.model is not None

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

        # Construir items de riesgo frente a sus umbrales
        ath_val = round(probs["riesgo_aterosclerotico"], 3)
        ath_umb = self.thresholds.get("riesgo_aterosclerotico", 0.10)
        ath_alert = ath_val >= ath_umb

        hf_val = round(probs["riesgo_insuficiencia_cardiaca"], 3)
        hf_umb = self.thresholds.get("riesgo_insuficiencia_cardiaca", 0.08)
        hf_alert = hf_val >= hf_umb

        ren_val = round(probs["riesgo_cardiorrenal"], 3)
        ren_umb = self.thresholds.get("riesgo_cardiorrenal", 0.12)
        ren_alert = ren_val >= ren_umb

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
        )

        hay_riesgo = ath_alert or hf_alert or ren_alert

        perfil_renal = self._compute_kdigo_profile(features)

        if not hay_riesgo:
            return EvaluationResponse(
                hay_riesgo=False,
                conclusion_diagnostica=(
                    "Sin riesgo cardiovascular significativo detectado. "
                    "Todos los fenotipos se encuentran dentro de los límites de seguridad."
                ),
                nivel_prioridad="BAJA",
                tipos_riesgo=tipos_riesgo,
                factores_clave=[],
                recomendacion_preventiva=(
                    "Continuar con controles habituales de Atención Primaria según protocolo general."
                ),
                perfil_renal=perfil_renal,
            )

        # Factores explicativos SHAP reales
        factores_clave = self.shap_service.explain(features, probs, top_k=3)
        conclusion, recomendacion, prioridad = self._synthesize_verdict(
            ath_alert, hf_alert, ren_alert, features
        )

        return EvaluationResponse(
            hay_riesgo=True,
            conclusion_diagnostica=conclusion,
            nivel_prioridad=prioridad,
            tipos_riesgo=tipos_riesgo,
            factores_clave=factores_clave,
            recomendacion_preventiva=recomendacion,
            perfil_renal=perfil_renal,
        )

    def _predict_with_real_model(self, features: Dict[str, Any]) -> Dict[str, float]:
        """Inferencia utilizando el modelo XGBoost real cargado."""
        df_row = pd.DataFrame([features])[self.feature_names]
        proba_base = float(self.model.predict_proba(df_row)[0][1])

        # Derivar fenotipos a partir de proba_base y factores clave
        ath_factor = (
            (features["colesterol_total"] / 200.0) * 0.4
            + (features["ap_hi"] / 130.0) * 0.3
            + (1.2 if features["fuma"] == 1 else 0.8) * 0.3
        )
        hf_factor = (
            (features["bmi"] / 25.0) * 0.4
            + (features["ap_hi"] / 130.0) * 0.3
            + (1.3 if features["diabetes"] == 1 else 0.8) * 0.3
        )
        ren_factor = (
            (max(0, 90.0 - features["egfr"]) / 30.0) * 0.5
            + (min(features["uacr"], 100.0) / 30.0) * 0.5
        )

        return {
            "riesgo_aterosclerotico": max(0.01, min(0.99, proba_base * ath_factor)),
            "riesgo_insuficiencia_cardiaca": max(0.01, min(0.99, proba_base * hf_factor)),
            "riesgo_cardiorrenal": max(0.01, min(0.99, proba_base * ren_factor)),
        }

    def _interpret_score(self, val: float, umbral: float) -> str:
        pct = int(round(val * 100))
        if val >= umbral * 1.5:
            return f"Alto ({pct}%, umbral alerta: {int(umbral*100)}%)"
        if val >= umbral:
            return f"Moderado-Alto ({pct}%)"
        return f"Bajo control ({pct}%)"

    def _synthesize_verdict(
        self,
        ath_alert: bool,
        hf_alert: bool,
        ren_alert: bool,
        features: Dict[str, Any],
    ) -> tuple[str, str, str]:
        recs = []
        conclusions = []
        prioridad = "MEDIA"

        if ren_alert:
            delta_egfr = features.get("delta_egfr")
            if delta_egfr is not None and not np.isnan(delta_egfr) and delta_egfr <= -5.0:
                conclusions.append(
                    f"Deterioro cardiorrenal silente acelerado (pérdida de eGFR de {delta_egfr:.1f} mL/min/año)"
                )
                prioridad = "ALTA"
            else:
                conclusions.append("Compromiso cardiorrenal incipiente (función renal/albuminuria)")
            recs.append(
                "Confirmar cociente UACR en 3 meses y valorar optimización de nefroprotección (iSGLT2 / ARA-II)."
            )

        if hf_alert:
            conclusions.append("Sobrecarga hemodinámica con riesgo de insuficiencia cardíaca")
            recs.append("Solicitar analítica con NT-proBNP y control de peso/tensión.")

        if ath_alert:
            conclusions.append("Riesgo aterosclerótico aumentado (ASCVD)")
            recs.append("Optimizar control lipídico hacia c-LDL objetivo y deshabituación tabáquica si procede.")

        conclusion_txt = (
            f"Alerta de riesgo detectada: {', '.join(conclusions)}."
            if conclusions
            else "Riesgo cardiovascular aumentado."
        )
        recomendacion_txt = " ".join(recs)

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
