---
name: backend-fastapi
description: High-performance backend development guidelines using FastAPI and Pydantic v2 for clinical AI inference services.
---

# Backend Developer Skill: FastAPI & Medical Inference Engine

This skill guides the design, structure, and implementation of the backend REST API for NextGen-Health using FastAPI and Pydantic v2.

## Core Stack & Libraries
* **Framework:** FastAPI (Python 3.10+).
* **Data Validation:** Pydantic v2 (Strict type checking, Field boundaries, validation errors).
* **Inference Serving:** Joblib (loading pre-trained XGBoost artifacts and SHAP TreeExplainers).
* **CORS & Middleware:** `fastapi.middleware.cors.CORSMiddleware` configured for local Vite frontend (`http://localhost:5173`).

---

## Architecture Guidelines

### Directory Structure
```text
app/backend/
|-- main.py              # Application entrypoint, CORS setup, router mounting
|-- api/
|   \-- routes/
|       |-- predict.py     # POST /api/predict (Simulador / individual)
|       \-- analiticas.py  # GET /api/analiticas, POST /api/analiticas/analizar-carpeta
|-- schemas/
|   |-- clinical.py      # Pydantic input models (LabReport, ProgressionDelta)
|   \-- response.py      # Multidimensional risk outputs, SHAP driver schemas
\-- services/
    |-- model_service.py # Model loading, inference, XGBoost NaN management
    |-- shap_service.py  # TreeExplainer calculation and translation to impacts
    \-- file_service.py  # Scanning and reading files from data/analiticas/
```

---

## Pydantic Schema Specifications

### Input Schema (`schemas/clinical.py`)
```python
from typing import Optional
from pydantic import BaseModel, Field

class ProgressionDelta(BaseModel):
    delta_egfr: Optional[float] = Field(None, description="Caída o subida interanual de eGFR (mL/min)")
    delta_uacr: Optional[float] = Field(None, description="Variación interanual de UACR (mg/g)")
    delta_ap_hi: Optional[float] = Field(None, description="Variación interanual de PAS (mmHg)")
    delta_colesterol: Optional[float] = Field(None, description="Variación de colesterol total (mg/dL)")
    delta_bmi: Optional[float] = Field(None, description="Variación de IMC (kg/m2)")

class LabInput(BaseModel):
    edad: float = Field(..., ge=18, le=110, description="Edad en años")
    sexo: int = Field(..., ge=1, le=2, description="1: Mujer, 2: Hombre")
    bmi: float = Field(..., ge=12.0, le=70.0, description="Índice de masa corporal")
    ap_hi: float = Field(..., ge=70, le=250, description="Presión arterial sistólica (mmHg)")
    ap_lo: float = Field(..., ge=40, le=150, description="Presión arterial diastólica (mmHg)")
    colesterol_total: float = Field(..., ge=80.0, le=500.0, description="Colesterol total continuo (mg/dL)")
    fuma: int = Field(..., ge=0, le=1, description="0: No fumador, 1: Fumador")
    diabetes: int = Field(..., ge=0, le=1, description="0: No diabético, 1: Diabético")
    egfr: float = Field(..., ge=5.0, le=140.0, description="Filtrado glomerular estimado (mL/min)")
    uacr: float = Field(..., ge=1.0, le=500.0, description="Cociente albúmina/creatinina (mg/g)")
    progresion: Optional[ProgressionDelta] = None
```

---

## Best Practices
1. **Model Singleton:** Load `.joblib` model and SHAP explainer once at startup in FastAPI lifespan context manager, not on every incoming request.
2. **Missing Deltas Support:** When `progresion` is `None` or deltas are `None`, convert them directly to `np.nan` so XGBoost uses its default split direction seamlessly.
3. **Deterministic Endpoints:** Ensure `/api/analiticas/analizar-carpeta` checks `data/analiticas/` without throwing 500 errors if the folder is empty (return graceful empty list).
