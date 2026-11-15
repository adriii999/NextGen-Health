# Entrenamiento de los modelos (5 Ejes Fisiopatológicos CKM / KDIGO)

El pipeline lee `data/processed/dataset.csv` (o `data/raw/dataset.csv`, generado por `model/scripts/prepare_data.py` integrando NutriSynthCare, Kaggle CVD y CDC NHANES) y espera las 15 variables de entrada continuas y de evolución que consume la API, además de los **cinco objetivos clínicos binarios** basados en el consenso **AHA CKM (Cardiovascular-Kidney-Metabolic Syndrome)**, **ESC/SEC** y **KDIGO 2024**:
- `target_aterosclerotico`: **Coronario e isquemia (ASCVD)** — Riesgo de placa ateromatosa, cardiopatía isquémica e ictus (impulsado por colesterol, progresión lipídica, tabaquismo, PAS, diabetes y edad).
- `target_insuficiencia_cardiaca`: **Sobrecarga e insuficiencia cardíaca** — Sobrecarga hemodinámica y fallo de bomba ventricular (impulsado por HTA sistólica/diastólica, presión de pulso, progresión tensional, IMC y edad).
- `target_cardiorrenal`: **Función renal (Filtrado glomerular)** — Deterioro parenquimatoso renal y caída de filtrado glomerular (`egfr` reducido o pérdida acelerada `delta_egfr <= -5 mL/min/año`), calibrado con máscara de especificidad para evitar sobrediagnóstico cuando el filtrado es normal y estable.
- `target_microvascular`: **Daño microvascular y endotelial** — Lesión de la barrera capilar y glomerular medida por albuminuria (`uacr`), progresión de albuminuria (`delta_uacr`), diabetes, tabaquismo y rigidez arterial.
- `target_cardiometabolico`: **Descompensación cardiometabólica** — Eje metabólico-adiposo-lipídico (sobrecarga ponderal `bmi`, ganancia de peso `delta_bmi`, diabetes e hipercolesterolemia progresiva).

```powershell
python -m pip install -r model/requirements.txt
python model/scripts/train_models.py
```

También se pueden indicar rutas explícitas:

```powershell
python model/scripts/train_models.py --dataset data/processed/dataset.csv --output model/out/model_artifact.joblib
```

El script valida el esquema y los tipos, conserva los deltas ausentes como `NaN` (Modo A para pacientes sin historial longitudinal previo), evalúa cada uno de los 5 objetivos por separado mediante validación cruzada estratificada (5 folds) y holdout, ajusta umbrales de decisión calibrados en el rango clínico `[0.22, 0.45]` y exporta los cinco clasificadores XGBoost (`hist`) con restricciones de monotonía fisiológica, los cinco explicadores TreeSHAP reales, los umbrales y las métricas en un único artefacto compatible con `ModelService`.
