# NextGen Health: Segunda Opinión Multidimensional de Riesgo Cardiovascular (Progresión Temporal)

Herramienta clínica de demostración (MVP) para **Atención Primaria**, diseñada para proporcionar una **segunda opinión en un solo clic** analizando archivos de analíticas depositados en una carpeta, identificando señales de riesgo cardiovascular oculto mediante el análisis de **progresiones temporales ($\Delta$)** y valores de laboratorio continuos.

> **Estado:** Prototipo funcional (demo ligera sin base de datos) desarrollado para el Datathon.

---

## 🎯 Enfoque y Propuesta de Valor: Detección por Progresión

En una consulta habitual de Atención Primaria (5–7 minutos por paciente), una analítica con valores aparentemente "aceptables" (ej. eGFR de 68 mL/min o UACR de 28 mg/g) puede enmascarar un riesgo cardiovascular severo si el paciente ha experimentado una **pérdida rápida de función renal o albuminuria creciente** respecto al año previo.

* **Flujo Principal ("Analizar Carpeta"):** Con un clic en `POST /api/analiticas/analizar-carpeta`, el sistema procesa las analíticas longitudinales de `data/analiticas/`, calculando automáticamente los deltas interanuales ($\Delta$) y generando el diagnóstico priorizado.
* **Simulador Manual ("Demo"):** Pestaña interactiva para ingresar valores actuales y previos (o sus deltas), evaluando en tiempo real con `POST /api/predict`.
* **Valores de Laboratorio Continuos:** El colesterol se modela en su valor analítico real continuo en **mg/dL** (ej. 218 mg/dL), eliminando categorías artificiales (1, 2, 3).
* **Salida Multidimensional por Tipos de Riesgo:**
  1. **Riesgo Aterosclerótico (ASCVD):** Infarto e ictus por dislipemia continua, HTA sistólica y tabaquismo.
  2. **Riesgo de Insuficiencia Cardíaca (IC):** Sobrecarga metabólica y descompensación tensional/peso ($\Delta$).
  3. **Riesgo Cardiorrenal:** Caída acelerada de filtrado glomerular (`delta_egfr`) y microalbuminuria creciente (`delta_uacr`).
  * **Criterio de corte:** Si ningún fenotipo supera su umbral clínico, el sistema concluye: *"Sin riesgo significativo detectado (perfil bajo control)"*.

---

## 📊 Fuentes de Datos y Variables Continuas

Para calibrar el modelo se combinan fuentes abiertas y síntesis clínica temporal:

1. **Fuente 1 (Población España):** [NutriSynthCare](https://www.kaggle.com/datasets/danicruzdevtech/datasets-sintticos-de-salud-diabetes-cardio).
2. **Fuente 2 (Calibración masiva):** [Cardiovascular Disease Dataset (Kaggle)](https://www.kaggle.com/datasets/sulianova/cardiovascular-disease-dataset).
3. **Síntesis Longitudinal Calibrada:** Generación de deltas interanuales ($\Delta_{\text{eGFR}}$, $\Delta_{\text{UACR}}$, $\Delta_{\text{ap\_hi}}$, $\Delta_{\text{colesterol}}$, $\Delta_{\text{bmi}}$) para modelar la velocidad de deterioro cardiorrenal.

---

## 🛠️ Stack Tecnológico

* **Frontend:** React + Vite, Tailwind CSS, Lucide Icons y Recharts.
* **Backend:** FastAPI, Pydantic v2 (Python 3.10+).
* **Machine Learning & XAI:** XGBoost (`xgboost`) con soporte nativo de `NaN` (para analíticas sin registro previo), persistencia con `joblib` y explicabilidad de deltas con `shap`.

---

## 📂 Estructura del Repositorio

```text
NextGen-Health/
|-- app/
|   |-- frontend/      # UI React: Analizador de carpeta + Simulador manual
|   \-- backend/       # API FastAPI: /api/predict y /api/analiticas
|-- data/
|   |-- analiticas/    # Carpeta con las analíticas para la demo (CSV / JSON)
|   |-- raw/           # Datasets de entrenamiento originales
|   \-- processed/     # Dataset enriquecido con correlación cardiorrenal y deltas
|-- model/
|   |-- scripts/       # Pipelines de preparación, síntesis y entrenamiento
|   \-- out/           # Modelos (.joblib) y artefactos SHAP
|-- docs/
|   |-- Arquitectura-propuesta-reto1.md   # Especificación técnica detallada
|   |-- Enunciado-Reto1.docx              # Enunciado original del reto
|   |-- f.md                              # Documento de fuentes de referencia
|   \-- estructura-repo.md                # Detalle de directorios
\-- README.md
```
