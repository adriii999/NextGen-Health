import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import json
from app.backend.services.model_service import ModelService
from app.backend.schemas.clinical import LabInput, ProgressionDelta

ms = ModelService()
ms.load_artifacts("model/out/model_artifact.joblib")

# Caso 1: Sano Modo A
caso_sano = LabInput(
    edad=45, sexo=1, bmi=23.0, ap_hi=118, ap_lo=76, colesterol_total=175.0,
    fuma=0, diabetes=0, egfr=100.0, uacr=8.0, progresion=None
)
res_sano = ms.evaluate(caso_sano)
print("=== CASO 1: SANO MODO A ===")
print("hay_riesgo:", res_sano.hay_riesgo, "prioridad:", res_sano.nivel_prioridad)
print("at:", res_sano.tipos_riesgo.riesgo_aterosclerotico)
print("hf:", res_sano.tipos_riesgo.riesgo_insuficiencia_cardiaca)
print("cr:", res_sano.tipos_riesgo.riesgo_cardiorrenal)
print("perfil_renal:", res_sano.perfil_renal.cuadrante_kdigo, res_sano.perfil_renal.progresor_rapido)

# Caso 2: Severo Modo A (analítica aislada con factores de riesgo francos)
caso_severo = LabInput(
    edad=68, sexo=2, bmi=33.0, ap_hi=165, ap_lo=98, colesterol_total=260.0,
    fuma=1, diabetes=1, egfr=50.0, uacr=95.0, progresion=None
)
res_severo = ms.evaluate(caso_severo)
print("\n=== CASO 2: SEVERO MODO A ===")
print("hay_riesgo:", res_severo.hay_riesgo, "prioridad:", res_severo.nivel_prioridad)
print("at:", res_severo.tipos_riesgo.riesgo_aterosclerotico)
print("hf:", res_severo.tipos_riesgo.riesgo_insuficiencia_cardiaca)
print("cr:", res_severo.tipos_riesgo.riesgo_cardiorrenal)
print("perfil_renal:", res_severo.perfil_renal.cuadrante_kdigo, res_severo.perfil_renal.progresor_rapido)
print("factores:", [(f.variable, f.impacto) for f in res_severo.factores_clave])

# Caso 3: Estable Modo B (seguimiento anual con envejecimiento fisiológico normal)
caso_estable = LabInput(
    edad=52, sexo=1, bmi=24.0, ap_hi=120, ap_lo=78, colesterol_total=185.0,
    fuma=0, diabetes=0, egfr=92.0, uacr=10.0,
    progresion=ProgressionDelta(delta_egfr=-0.8, delta_uacr=0.5, delta_ap_hi=0.5, delta_colesterol=-1.0, delta_bmi=0.0)
)
res_estable = ms.evaluate(caso_estable)
print("\n=== CASO 3: ESTABLE MODO B ===")
print("hay_riesgo:", res_estable.hay_riesgo, "prioridad:", res_estable.nivel_prioridad)
print("at:", res_estable.tipos_riesgo.riesgo_aterosclerotico)
print("hf:", res_estable.tipos_riesgo.riesgo_insuficiencia_cardiaca)
print("cr:", res_estable.tipos_riesgo.riesgo_cardiorrenal)
print("perfil_renal:", res_estable.perfil_renal.cuadrante_kdigo, res_estable.perfil_renal.progresor_rapido)

# Caso 4: "La Trampa del Rango Normal" Modo B (valores aparentemente normales en corte transversal pero deterioro silente acelerado)
caso_trampa = LabInput(
    edad=56, sexo=1, bmi=26.5, ap_hi=128, ap_lo=82, colesterol_total=195.0,
    fuma=0, diabetes=1, egfr=82.0, uacr=28.0,
    progresion=ProgressionDelta(delta_egfr=-9.0, delta_uacr=22.0, delta_ap_hi=8.0, delta_colesterol=6.0, delta_bmi=0.8)
)
res_trampa = ms.evaluate(caso_trampa)
print("\n=== CASO 4: TRAMPA DEL RANGO NORMAL MODO B ===")
print("hay_riesgo:", res_trampa.hay_riesgo, "prioridad:", res_trampa.nivel_prioridad)
print("at:", res_trampa.tipos_riesgo.riesgo_aterosclerotico)
print("hf:", res_trampa.tipos_riesgo.riesgo_insuficiencia_cardiaca)
print("cr:", res_trampa.tipos_riesgo.riesgo_cardiorrenal)
print("perfil_renal:", res_trampa.perfil_renal.cuadrante_kdigo, res_trampa.perfil_renal.progresor_rapido, res_trampa.perfil_renal.descripcion_clinica)
print("factores:", [(f.variable, f.impacto) for f in res_trampa.factores_clave])

# ==============================================================================
# EVALUACIÓN DE FILAS REALES EXTRAÍDAS DEL DATASET (SIN target_cardio)
# ==============================================================================
import pandas as pd
df = pd.read_csv("data/processed/dataset.csv")

# Fila 1: Control Modo A (sin deltas)
row_a_ctrl = df[(df["target_cardio"] == 0) & (df["delta_egfr"].isna())].iloc[0]
lab_a_ctrl = LabInput(
    edad=float(row_a_ctrl["edad"]), sexo=int(row_a_ctrl["sexo"]), bmi=float(row_a_ctrl["bmi"]),
    ap_hi=float(row_a_ctrl["ap_hi"]), ap_lo=float(row_a_ctrl["ap_lo"]),
    colesterol_total=float(row_a_ctrl["colesterol_total"]), fuma=int(row_a_ctrl["fuma"]),
    diabetes=int(row_a_ctrl["diabetes"]), egfr=float(row_a_ctrl["egfr"]), uacr=float(row_a_ctrl["uacr"]),
    progresion=None
)
res_a_ctrl = ms.evaluate(lab_a_ctrl)
print("\n=== DATASET REAL MODO A CONTROL ===")
print("hay_riesgo:", res_a_ctrl.hay_riesgo, "prioridad:", res_a_ctrl.nivel_prioridad)
print("at:", res_a_ctrl.tipos_riesgo.riesgo_aterosclerotico.valor, "hf:", res_a_ctrl.tipos_riesgo.riesgo_insuficiencia_cardiaca.valor, "cr:", res_a_ctrl.tipos_riesgo.riesgo_cardiorrenal.valor)

# Fila 2: Riesgo Modo A (sin deltas)
row_a_risk = df[(df["target_cardio"] == 1) & (df["delta_egfr"].isna())].iloc[0]
lab_a_risk = LabInput(
    edad=float(row_a_risk["edad"]), sexo=int(row_a_risk["sexo"]), bmi=float(row_a_risk["bmi"]),
    ap_hi=float(row_a_risk["ap_hi"]), ap_lo=float(row_a_risk["ap_lo"]),
    colesterol_total=float(row_a_risk["colesterol_total"]), fuma=int(row_a_risk["fuma"]),
    diabetes=int(row_a_risk["diabetes"]), egfr=float(row_a_risk["egfr"]), uacr=float(row_a_risk["uacr"]),
    progresion=None
)
res_a_risk = ms.evaluate(lab_a_risk)
print("\n=== DATASET REAL MODO A RIESGO ===")
print("hay_riesgo:", res_a_risk.hay_riesgo, "prioridad:", res_a_risk.nivel_prioridad)
print("at:", res_a_risk.tipos_riesgo.riesgo_aterosclerotico.valor, "hf:", res_a_risk.tipos_riesgo.riesgo_insuficiencia_cardiaca.valor, "cr:", res_a_risk.tipos_riesgo.riesgo_cardiorrenal.valor)

# Fila 3: Seguimiento Modo B "Trampa del rango normal" (eGFR normal >= 60 pero delta_egfr <= -6.0)
row_b_trampa = df[(df["egfr"] >= 60.0) & (df["delta_egfr"] <= -6.0)].iloc[0]
lab_b_trampa = LabInput(
    edad=float(row_b_trampa["edad"]), sexo=int(row_b_trampa["sexo"]), bmi=float(row_b_trampa["bmi"]),
    ap_hi=float(row_b_trampa["ap_hi"]), ap_lo=float(row_b_trampa["ap_lo"]),
    colesterol_total=float(row_b_trampa["colesterol_total"]), fuma=int(row_b_trampa["fuma"]),
    diabetes=int(row_b_trampa["diabetes"]), egfr=float(row_b_trampa["egfr"]), uacr=float(row_b_trampa["uacr"]),
    progresion=ProgressionDelta(
        delta_egfr=float(row_b_trampa["delta_egfr"]),
        delta_uacr=float(row_b_trampa["delta_uacr"]),
        delta_ap_hi=float(row_b_trampa["delta_ap_hi"]),
        delta_colesterol=float(row_b_trampa["delta_colesterol"]),
        delta_bmi=float(row_b_trampa["delta_bmi"]),
    )
)
res_b_trampa = ms.evaluate(lab_b_trampa)
print("\n=== DATASET REAL MODO B TRAMPA RANGO NORMAL ===")
print("hay_riesgo:", res_b_trampa.hay_riesgo, "prioridad:", res_b_trampa.nivel_prioridad)
print("progresor_rapido:", res_b_trampa.perfil_renal.progresor_rapido, "desc:", res_b_trampa.perfil_renal.descripcion_clinica)
print("factores:", [(f.variable, f.impacto) for f in res_b_trampa.factores_clave])
