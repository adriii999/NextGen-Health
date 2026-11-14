from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, model_validator
import numpy as np


class ProgressionDelta(BaseModel):
    """Variaciones interanuales calculadas respecto al año previo (~12 meses)."""
    delta_egfr: Optional[float] = Field(
        None, ge=-80.0, le=50.0, description="Variación anual de eGFR (mL/min/año)"
    )
    delta_uacr: Optional[float] = Field(
        None, ge=-2000.0, le=2000.0, description="Variación anual de UACR (mg/g)"
    )
    delta_ap_hi: Optional[float] = Field(
        None, ge=-90.0, le=120.0, description="Variación anual de presión sistólica (mmHg)"
    )
    delta_colesterol: Optional[float] = Field(
        None, ge=-180.0, le=250.0, description="Variación anual de colesterol total (mg/dL)"
    )
    delta_bmi: Optional[float] = Field(
        None, ge=-25.0, le=25.0, description="Variación anual de IMC (kg/m²)"
    )


class LabInput(BaseModel):
    """Entrada clínica de analítica para inferencia médica."""
    edad: float = Field(..., ge=18.0, le=110.0, description="Edad del paciente en años")
    sexo: int = Field(..., ge=1, le=2, description="Sexo biológico (1: Mujer, 2: Hombre)")
    bmi: float = Field(..., ge=12.0, le=65.0, description="Índice de masa corporal (kg/m²)")
    ap_hi: float = Field(..., ge=75.0, le=240.0, description="Presión arterial sistólica (mmHg)")
    ap_lo: float = Field(..., ge=45.0, le=140.0, description="Presión arterial diastólica (mmHg)")
    colesterol_total: float = Field(..., ge=80.0, le=450.0, description="Colesterol total continuo (mg/dL)")
    fuma: int = Field(..., ge=0, le=1, description="Tabaquismo activo (0: No, 1: Sí)")
    diabetes: int = Field(..., ge=0, le=1, description="Diagnóstico de diabetes (0: No, 1: Sí)")
    egfr: float = Field(..., ge=3.0, le=160.0, description="Tasa de filtración glomerular estimada (mL/min)")
    uacr: float = Field(..., ge=0.1, le=5000.0, description="Cociente albúmina/creatinina en orina (mg/g)")
    progresion: Optional[ProgressionDelta] = None

    @model_validator(mode="after")
    def validate_blood_pressure(self):
        if self.ap_lo >= self.ap_hi:
            raise ValueError(
                f"Presión diastólica ({self.ap_lo} mmHg) debe ser menor que la sistólica ({self.ap_hi} mmHg)"
            )
        return self

    def to_features_dict(self) -> Dict[str, Any]:
        """Convierte los datos a un diccionario plano con las 15 features del modelo."""
        deltas = self.progresion or ProgressionDelta()
        return {
            "edad": float(self.edad),
            "sexo": int(self.sexo),
            "bmi": float(self.bmi),
            "ap_hi": float(self.ap_hi),
            "ap_lo": float(self.ap_lo),
            "colesterol_total": float(self.colesterol_total),
            "fuma": int(self.fuma),
            "diabetes": int(self.diabetes),
            "egfr": float(self.egfr),
            "uacr": float(self.uacr),
            "delta_egfr": float(deltas.delta_egfr) if deltas.delta_egfr is not None else np.nan,
            "delta_uacr": float(deltas.delta_uacr) if deltas.delta_uacr is not None else np.nan,
            "delta_ap_hi": float(deltas.delta_ap_hi) if deltas.delta_ap_hi is not None else np.nan,
            "delta_colesterol": float(deltas.delta_colesterol) if deltas.delta_colesterol is not None else np.nan,
            "delta_bmi": float(deltas.delta_bmi) if deltas.delta_bmi is not None else np.nan,
        }
