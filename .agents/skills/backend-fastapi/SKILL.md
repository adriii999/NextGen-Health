---
name: backend-fastapi
description: Comprehensive expert guidelines for high-performance FastAPI backends, Pydantic v2 validation, non-blocking ML inference, and file processing services.
---

# Backend Developer Skill: FastAPI & Medical Inference Engine

This skill provides the definitive engineering architecture, API patterns, asynchronous processing rules, and Pydantic v2 specifications for the NextGen-Health backend.

---

## 1. Architectural Philosophy & Layer Separation

The backend follows a 3-tier clean architecture without an external database, running inference in-process with high concurrency:

```text
app/backend/
|-- main.py                  # App factory, lifespan setup, global middleware, router mounting
|-- config.py                # Environment paths (DATA_DIR, MODEL_PATH, ARTIFACT_PATH)
|-- api/
|   |-- deps.py              # Dependency injection (e.g. get_model_service)
|   \-- routes/
|       |-- predict.py       # POST /api/predict (Simulador manual / single analysis)
|       \-- analiticas.py    # GET /api/analiticas, POST /api/analiticas/analizar-carpeta
|-- schemas/
|   |-- clinical.py          # Input schemas (LabInput, ProgressionDelta)
|   \-- response.py          # Output schemas (MultidimensionalEvaluation, RiskCategory)
\-- services/
    |-- model_service.py     # XGBoost prediction, probability calibration, NaN routing
    |-- shap_service.py      # TreeExplainer, attribution conversion to percentage impacts
    \-- file_service.py      # Reading CSV/JSON files from data/analiticas/
```

---

## 2. Concurrency: Non-Blocking ML Inference

> [!IMPORTANT]
> Machine Learning inference (`model.predict_proba` and `shap.TreeExplainer`) is **CPU-bound**, not I/O-bound.
> In FastAPI, defining an endpoint as `async def` and running a heavy CPU calculation directly inside it **blocks the entire asyncio event loop**, freezing all other concurrent requests.

### The Rule for Endpoints in this Project:
1. For CPU-bound endpoints (`/api/predict`, `/api/analiticas/analizar-carpeta`), either:
   * Define the route function with standard `def` (FastAPI automatically executes standard `def` functions in a separate threadpool), OR
   * Use `starlette.concurrency.run_in_threadpool(model_service.predict, payload)`.

```python
# Recommended Pattern in app/backend/api/routes/predict.py:
from fastapi import APIRouter, Depends, HTTPException
from schemas.clinical import LabInput
from schemas.response import EvaluationResponse
from services.model_service import ModelService
from api.deps import get_model_service

router = APIRouter(prefix="/api", tags=["Inference"])

# Using standard def ensures FastAPI runs this in the worker threadpool
@router.post("/predict", response_model=EvaluationResponse)
def predict_clinical_risk(
    lab_data: LabInput,
    model_service: ModelService = Depends(get_model_service)
):
    try:
        return model_service.evaluate(lab_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error durante la inferencia: {str(e)}")
```

---

## 3. Pydantic v2 Schema Design (`schemas/clinical.py`)

Inputs must strictly validate physiological boundaries while gracefully handling missing progression deltas:

```python
from typing import Optional
from pydantic import BaseModel, Field, model_validator

class ProgressionDelta(BaseModel):
    delta_egfr: Optional[float] = Field(None, ge=-60.0, le=40.0, description="Variación anual eGFR (mL/min)")
    delta_uacr: Optional[float] = Field(None, ge=-200.0, le=300.0, description="Variación anual UACR (mg/g)")
    delta_ap_hi: Optional[float] = Field(None, ge=-80.0, le=100.0, description="Variación anual sistólica (mmHg)")
    delta_colesterol: Optional[float] = Field(None, ge=-150.0, le=200.0, description="Variación anual colesterol (mg/dL)")
    delta_bmi: Optional[float] = Field(None, ge=-20.0, le=20.0, description="Variación anual IMC (kg/m2)")

class LabInput(BaseModel):
    edad: float = Field(..., ge=18.0, le=105.0, description="Edad del paciente")
    sexo: int = Field(..., ge=1, le=2, description="1: Mujer, 2: Hombre")
    bmi: float = Field(..., ge=14.0, le=65.0, description="Índice de Masa Corporal")
    ap_hi: float = Field(..., ge=75.0, le=240.0, description="Presión arterial sistólica (mmHg)")
    ap_lo: float = Field(..., ge=45.0, le=140.0, description="Presión arterial diastólica (mmHg)")
    colesterol_total: float = Field(..., ge=90.0, le=450.0, description="Colesterol total continuo (mg/dL)")
    fuma: int = Field(..., ge=0, le=1, description="0: No fumador, 1: Fumador")
    diabetes: int = Field(..., ge=0, le=1, description="0: No diabético, 1: Diabético")
    egfr: float = Field(..., ge=5.0, le=130.0, description="Tasa Filtración Glomerular (mL/min)")
    uacr: float = Field(..., ge=1.0, le=400.0, description="Cociente Albúmina/Creatinina (mg/g)")
    progresion: Optional[ProgressionDelta] = None

    @model_validator(mode="after")
    def validate_blood_pressure(self):
        if self.ap_lo >= self.ap_hi:
            raise ValueError(f"La presión diastólica ({self.ap_lo}) debe ser menor que la sistólica ({self.ap_hi})")
        return self
```

---

## 4. Lifespan Pattern: Loading ML Artifacts Once

Avoid loading `.joblib` files on each HTTP call. Load models during application startup using FastAPI's modern `lifespan`:

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from services.model_service import ModelService

model_service_instance = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Load XGBoost and SHAP artifacts
    global model_service_instance
    print("Iniciando servicios y cargando artefactos de Machine Learning...")
    model_service_instance = ModelService()
    model_service_instance.load_artifacts("model/out/model_artifact.joblib")
    app.state.model_service = model_service_instance
    yield
    # Shutdown: Cleanup
    print("Cerrando servicios...")

app = FastAPI(title="NextGen-Health API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 5. File Processing Service (`services/file_service.py`)

The file service parses `data/analiticas/` without failing on empty or malformed files:
* Supports both `.json` and `.csv` files.
* Converts missing delta fields directly to `None` for Pydantic.
* Extracts filename and metadata for display in the frontend table.
* Returns an empty list (`[]`) gracefully if the directory does not exist or has no files.
