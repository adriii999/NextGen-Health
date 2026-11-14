# NextGen-Health: Guía y Diccionario del Dataset Procesado

Este documento detalla la estructura, armonización clínica, fuentes de datos y directrices de uso del dataset preprocesado para el modelo de detección precoz de riesgo cardiorrenal en Atención Primaria.

---

## 1. Fuentes de Datos Crudas Integradas en `data/raw/`

El dataset final unifica **tres fuentes complementarias** para cubrir todas las dimensiones biológicas y mitigar sesgos poblacionales:

1. **NutriSynthCare España (`data/raw/nutrisynthcare/db_cardiabetes.csv`):**
   * **15.949 registros** con prevalencia epidemiológica adaptada a la población adulta en España (factores de riesgo cardiometabólicos, colesterol continuo, diabetes).
2. **Cardiovascular Disease Dataset - Kaggle (`data/raw/cardio_train.csv`):**
   * **70.000 registros** para calibración estadística masiva y combinaciones no lineales de hipertensión, tabaquismo y cardiopatía.
3. **CDC NHANES - National Health and Nutrition Examination Survey (`data/raw/nhanes/`):**
   * **3.975 registros clínicos completos** con **biomarcadores renales reales medidos en laboratorio**:
     * Creatinina sérica real (`LBXSCR`) $\rightarrow$ Cálculo oficial de $\text{eGFR}$ mediante **CKD-EPI 2021** (sin componente racial, según directrices KDIGO).
     * Microalbuminuria real en orina (`URDACT`, UACR en mg/g).
     * Colesterol total sérico continuo (`LBXSCH`, mg/dL).
     * Presión arterial múltiple (`BPXSY1`, `BPXDI1`), tabaquismo activo (`SMQ`) e historial cardiovascular (`MCQ`).

* **Total registros brutos combinados:** 89.924
* **Filtrado fisiológico:** 2.102 registros atípicos eliminados.
* **Dataset procesado final:** **87.822 registros limpios**.
* **Distribución Targets:**
  * `target_cardio`: 53.8% positivos.
  * `target_aterosclerotico`: 46.7% positivos (ASCVD / perfil lipídico / tabaquismo).
  * `target_insuficiencia_cardiaca`: 49.1% positivos (sobrecarga hemodinámica / HTA / obesidad / diabetes).
  * `target_cardiorrenal`: 60.5% positivos (KDIGO 2024 / progresores rápidos con $\Delta_{eGFR} \le -5$ mL/min/año / albuminuria).

---

## 2. Archivo, Scripts y Validación

* **Ruta del dataset:** `data/processed/dataset.csv` (y sincronizado en `data/raw/dataset.csv`)
* **Script generador:** `model/scripts/prepare_data.py`
* **Script de profiling y calidad:** `scripts/validate_dataset.py`
* **Tests unitarios automatizados:** `tests/test_prepare_data.py` y `tests/test_model_training.py`

Comandos de ejecución:
```powershell
# Regenerar dataset
python model/scripts/prepare_data.py

# Validar calidad clínica y distribuciones
python scripts/validate_dataset.py
```

---

## 3. Diccionario de Datos (15 Características + 1 Target)

### Variables Basales (Completitud del 100%, 0 nulos)
| Variable | Tipo | Unidad | Rango Clínico | Descripción y Fuente |
| :--- | :--- | :--- | :--- | :--- |
| `edad` | Float | Años | $30.0 - 85.0$ | Edad del paciente |
| `sexo` | Entero | Binario | `1`: Mujer, `2`: Hombre | Sexo biológico |
| `bmi` | Float | $\text{kg/m}^2$ | $15.0 - 60.0$ | Índice de Masa Corporal (IMC) |
| `ap_hi` | Float | mmHg | $80.0 - 220.0$ | Presión Arterial Sistólica (PAS) |
| `ap_lo` | Float | mmHg | $50.0 - 130.0$ | Presión Arterial Diastólica (PAD), con $PAD < PAS$ |
| `colesterol_total` | Float | mg/dL | $145.0 - 315.0$ | Colesterol sérico total continuo |
| `fuma` | Entero | Binario | `0`: No, `1`: Sí | Hábito tabáquico activo |
| `diabetes` | Entero | Binario | `0`: No, `1`: Sí | Diagnóstico de diabetes mellitus o glucemia $\ge 126$ mg/dL |
| `egfr` | Float | $\text{mL/min/1.73m}^2$ | $15.0 - 125.0$ | Tasa de Filtración Glomerular estimada (CKD-EPI 2021 / KDIGO) |
| `uacr` | Float | mg/g | $3.0 - 380.0$ | Cociente Albúmina/Creatinina en orina (KDIGO) |

### Variables de Progresión Longitudinal (Deltas interanuales $T-1 \rightarrow T$)
| Variable | Tipo | Unidad | % Nulos | Significado Clínico |
| :--- | :--- | :--- | :--- | :--- |
| `delta_egfr` | Float | $\text{mL/min/año}$ | $\approx 25\%$ | Caída anual en filtrado renal. Valores $<-5$ indican progresión silente acelerada |
| `delta_uacr` | Float | $\text{mg/g/año}$ | $\approx 25\%$ | Aumento o reducción en microalbuminuria |
| `delta_ap_hi` | Float | $\text{mmHg/año}$ | $\approx 25\%$ | Descompensación tensional de la sistólica |
| `delta_colesterol` | Float | $\text{mg/dL/año}$ | $\approx 25\%$ | Variación interanual en perfil lipídico |
| `delta_bmi` | Float | $\text{kg/m}^2/\text{año}$ | $\approx 25\%$ | Variación ponderal anual |

### Targets Clínicos (Fenotipos Multi-Riesgo)
| Columna | Tipo | Valores | Significado Clínico y Guías |
| :--- | :--- | :--- | :--- |
| `target_cardio` | Entero | `0` / `1` | Presencia de evento o daño cardiovascular/cardiorrenal significativo |
| `target_aterosclerotico` | Entero | `0` / `1` | Enfermedad vascular aterosclerótica (ASCVD) impulsada por dislipidemia, tabaquismo y PAS |
| `target_insuficiencia_cardiaca` | Entero | `0` / `1` | Sobrecarga hemodinámica e insuficiencia cardíaca (HTA, IMC elevado, diabetes) |
| `target_cardiorrenal` | Entero | `0` / `1` | Síndrome cardiorrenal según guías KDIGO 2024 (eGFR < 60, UACR $\ge 30$, progresores rápidos $\le -5$) |

---

## 4. Directriz Esencial para el Equipo de Modelado (XGBoost)

> [!IMPORTANT]
> **NO IMPUTAR LOS VALORES NULOS EN LAS COLUMNAS `delta_*`:**
> 
> Un $\approx 25\%$ de las filas tienen `NaN` en los deltas para reflejar la realidad asistencial de la consulta médica:
> * **Modo A (Analítica Aislada):** Paciente que acude con una analítica sin antecedentes de hace 1 año.
> * **Modo B (Evolución Longitudinal):** Paciente crónico con seguimiento anual.
> 
> Imputar los `NaN` con ceros o medias provocaría que el modelo interprete que un paciente sin histórico "no ha empeorado nada" (estabilidad confirmada). 
> Al configurar XGBoost con `missing=np.nan`, los árboles aprenden de forma nativa la mejor dirección de división por defecto (*default direction*) para analíticas aisladas sin falsear información.

---

## 5. Carga Rápida en Python

```python
import numpy as np
import pandas as pd

# Cargar dataset
df = pd.read_csv("data/processed/dataset.csv")

FEATURE_NAMES = [
    "edad", "sexo", "bmi", "ap_hi", "ap_lo",
    "colesterol_total", "fuma", "diabetes", "egfr", "uacr",
    "delta_egfr", "delta_uacr", "delta_ap_hi", "delta_colesterol", "delta_bmi"
]
TARGET = "target_cardio"

X = df[FEATURE_NAMES]
y = df[TARGET]

print(f"Dimensiones de X: {X.shape}, Balance de target:\n{y.value_counts(normalize=True)}")
```
