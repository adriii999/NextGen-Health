# Estructura del repositorio

```text
NextGen-Health/
|-- README.md
|-- data/
|   |-- raw/
|   |   \-- dataset.csv
|   \-- processed/
|-- model/
|   |-- scripts/
|   \-- out/
|-- scripts/
|-- app/
|   |-- frontend/
|   |   |-- public/
|   |   \-- src/
|   |       |-- assets/
|   |       |-- components/
|   |       |-- pages/
|   |       \-- services/
|   \-- backend/
|       |-- api/
|       |   \-- routes/
|       |-- schemas/
|       \-- services/
\-- docs/
    |-- Arquitectura-propuesta-reto1.md
    |-- Enunciado-Reto1.docx
    \-- estructura-repo.md
```

## Responsabilidad de cada área

- `data/raw/`: datos originales, sin modificar. El `dataset.csv` actual es provisional y se sustituirá por el dataset definitivo.
- `data/processed/`: datos limpios y transformados para el entrenamiento; conservar los originales en `raw/`.
- `model/scripts/`: preparación del dataset, entrenamiento y evaluación del modelo de riesgo cardiovascular.
- `model/out/`: artefactos generados por el entrenamiento (por ejemplo, el modelo serializado con `joblib`). No guardar aquí los datos fuente.
- `scripts/`: automatizaciones y utilidades generales del proyecto que no pertenecen al pipeline de ML.
- `app/frontend/`: interfaz React/Vite. `src/` separa recursos, componentes reutilizables, páginas y comunicación con la API.
- `app/backend/`: API FastAPI. `api/routes/` contiene los endpoints; `schemas/`, los modelos de validación Pydantic; y `services/`, la lógica de inferencia y explicabilidad (XGBoost/SHAP).
- `docs/`: enunciado, propuesta técnica y documentación de la estructura.
