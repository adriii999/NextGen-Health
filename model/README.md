# Entrenamiento de los modelos

El pipeline lee `data/processed/dataset_preprocessed.csv` (generado por `model/scripts/prepare_data.py` integrando NutriSynthCare, Kaggle CVD y CDC NHANES) y espera las 15 variables de entrada continuas y de evolución que consume la API, además de los tres objetivos clínicos binarios:
- `target_aterosclerotico`: Riesgo de enfermedad vascular aterosclerótica (ASCVD).
- `target_insuficiencia_cardiaca`: Sobrecarga hemodinámica e insuficiencia cardíaca.
- `target_cardiorrenal`: Síndrome cardiorrenal según guías KDIGO 2024 y progresión rápida de eGFR.

```powershell
python -m pip install -r model/requirements.txt
python model/scripts/train_models.py
```

También se pueden indicar rutas explícitas:

```powershell
python model/scripts/train_models.py --dataset data/processed/dataset_preprocessed.csv --output model/out/model_artifact.joblib
```

El script valida el esquema y los tipos, conserva los deltas ausentes como `NaN` (Modo A para pacientes sin historial longitudinal previo), evalúa cada objetivo por separado mediante validación cruzada estratificada (5 folds) y holdout, ajusta umbrales de decisión calibrados para maximizar la detección precoz (Recall) y exporta los tres clasificadores XGBoost (`hist`), los explicadores TreeSHAP reales, los umbrales y las métricas en un único artefacto compatible con `ModelService`.
