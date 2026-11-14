# Entrenamiento de los modelos

El pipeline lee `data/raw/dataset.csv` y espera las 15 variables de entrada que consume la API, además de tres objetivos binarios. Los nombres de objetivos actuales son provisionales y se configuran en `scripts/train_models.py`.

```powershell
python -m pip install -r model/requirements.txt
python model/scripts/train_models.py
```

También se pueden indicar rutas explícitas:

```powershell
python model/scripts/train_models.py --dataset data/raw/dataset.csv --output model/out/model_artifact.joblib
```

El script valida el esquema y los tipos, conserva los deltas ausentes como `NaN`, evalúa cada objetivo por separado y guarda los tres XGBoost, los explicadores TreeSHAP, umbrales y métricas en un único artefacto. El backend carga ese artefacto en `ModelService`.

La salida de Recall se mide en el holdout y no se garantiza por configurar un objetivo de Recall para seleccionar el umbral. Los objetivos necesitan definiciones confirmadas, suficientes positivos y negativos y un horizonte temporal apropiado. Este pipeline no valida clínicamente el dataset ni vuelve clínico un modelo por el mero hecho de entrenarlo.
