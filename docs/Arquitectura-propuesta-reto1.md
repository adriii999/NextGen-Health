# Especificación Técnica: Sistema de Detección de Riesgo Cardiovascular Oculto

## 1. Contexto del Proyecto (Para el LLM)
**Objetivo:** Desarrollar un prototipo (MVP) para un Datathon en 48 horas.
**Problema:** Pacientes con resultados analíticos dentro de rangos "aceptables" que ocultan un alto riesgo cardiovascular, prestando especial atención a factores silenciosos como la función renal y la albuminuria.
**Solución:** Una herramienta de "segunda opinión" (API + Interfaz) que procesa los datos mediante un modelo predictivo (XGBoost) y devuelve una probabilidad de riesgo (0-100%) junto con los factores clave (XAI con SHAP).

## 2. Stack Tecnológico
### Frontend (Interfaz de Usuario)
* **Framework:** React (Vite).
* **Estilos:** Tailwind CSS.
* **Librerías Extra:** `axios`, `lucide-react`, `recharts` (para gráficos simples).

### Backend (API REST)
* **Framework:** FastAPI (Python 3.10+).
* **Validación de Datos:** Pydantic.

### Machine Learning
* **Modelo Algorítmico:** XGBoost (`xgboost`).
* **Persistencia:** `joblib`.
* **Explicabilidad (XAI):** `shap` (para explicar por qué el modelo da ese riesgo).

## 3. Especificación del Dataset y Preprocesamiento
### 3.1 Estrategia de Datos (Data Augmentation)
Para alinear el modelo con las guías médicas actuales (SCORE2 / PREVENT) y la narrativa del reto, se tomará como base el **Cardiovascular Disease Dataset (Kaggle)**, pero el script de entrenamiento deberá **inyectar variables sintéticas** correlacionadas para la función renal y la diabetes, emulando historiales clínicos reales de Atención Primaria.

### 3.2 Diccionario de Variables (Entrada del Modelo)
**Variables Base:**
* `age`: Edad en años.
* `gender`: Sexo (1 = mujer, 2 = hombre).
* `ap_hi`: Presión arterial sistólica (mmHg).
* `ap_lo`: Presión arterial diastólica (mmHg).
* `cholesterol`: Colesterol total (1: normal, 2: alto, 3: muy alto).
* `smoke`: Tabaquismo (0 = No, 1 = Sí).
* `bmi`: Índice de Masa Corporal (calculado a partir de peso y altura).

**Variables Clínicas Añadidas (Críticas para el Reto):**
* `diabetes`: Presencia de diabetes (0 = No, 1 = Sí).
* `egfr`: Tasa de Filtración Glomerular estimada (Función renal. Normal > 90, deterioro < 60 mL/min).
* `uacr`: Cociente Albúmina/Creatinina en orina (Albuminuria. Normal < 30, riesgo > 30 mg/g).

**Target (`cardio`):**
* Presencia/Evento de enfermedad cardiovascular (0 = No, 1 = Sí).

### 3.3 Limpieza y Eliminación de Atípicos (Outliers)
El LLM debe aplicar filtros estrictos antes del entrenamiento:
1. **Presión Arterial:** Filtrar `ap_hi` fuera del rango [80, 220] y `ap_lo` fuera de [50, 130]. Eliminar registros donde `ap_lo` >= `ap_hi`.
2. **BMI:** Filtrar valores fuera del rango [15, 60].
3. **eGFR / UACR (Sintéticos):** Asegurar que pacientes con `cardio=1` tengan mayor probabilidad de presentar `egfr` entre 45-75 (deterioro silencioso) y `uacr` entre 25-150 (microalbuminuria).

### 3.4 Manejo de Valores Nulos
* **Estrategia:** No imputar valores nulos. XGBoost debe configurarse para manejar `NaN` nativamente (parámetro `missing=np.nan`). Esto simula la realidad clínica donde a un paciente le puede faltar la prueba de orina (UACR).

## 4. Entrenamiento y Métricas
* **Métrica de Optimización:** Maximizar el **Recall (Sensibilidad)** ajustando el umbral de decisión (*threshold*). Un falso negativo (ignorar a un paciente en riesgo) es inaceptable.
* **Evaluación secundaria:** AUC-ROC y Matriz de Confusión.

## 5. Diseño de la API (FastAPI)
### Payload de Entrada (JSON desde React)
Definir el modelo Pydantic:
```json
{
  "edad": 58,
  "sexo": 1,
  "bmi": 26.5,
  "ap_hi": 138,
  "ap_lo": 85,
  "colesterol": 1,
  "fuma": 0,
  "diabetes": 1,
  "egfr": 68,
  "uacr": 35
}
```
*(Nota: Este perfil representa el "paciente invisible" del reto: todo parece casi normal, pero la combinación de ligera hipertensión, diabetes y microalbuminuria dispara el riesgo).*

### Respuesta del Modelo (JSON hacia React)
El endpoint `/predict` devolverá:
```json
{
  "riesgo_probabilidad": 0.86,
  "nivel_alerta": "ALTA",
  "factores_clave": [
    {"variable": "uacr", "impacto": "+15%", "descripcion": "Albuminuria leve detectada"},
    {"variable": "egfr", "impacto": "+10%", "descripcion": "Deterioro temprano de función renal"}
  ],
  "mensaje_clinico": "Alerta: Aunque los valores individuales rozan la normalidad, la combinación de deterioro renal silencioso (eGFR 68) y microalbuminuria en contexto diabético eleva el riesgo CV a un 86%."
}
```