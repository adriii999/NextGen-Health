# NextGen Health: Segunda Opinión Multidimensional de Riesgo Cardiovascular (Dual: Aislada y Progresión)

Herramienta clínica de demostración (MVP) para **Atención Primaria**, diseñada para proporcionar una **segunda opinión en un solo clic** analizando archivos de analíticas depositados en una carpeta, identificando señales de riesgo cardiovascular oculto mediante una **arquitectura de evaluación dual**: analítica aislada (foto fija) y progresión temporal ($\Delta$).

> **Estado:** Prototipo funcional (demo ligera sin base de datos) desarrollado para el Datathon.

---

## 🎯 Enfoque y Doble Funcionalidad Analítica

En una consulta habitual de Atención Primaria (5–7 minutos por paciente), una analítica con valores aparentemente "aceptables" (ej. eGFR de 68 mL/min o UACR de 28 mg/g) puede enmascarar un riesgo cardiovascular severo si el paciente ha experimentado una **pérdida rápida de función renal o albuminuria creciente** respecto al año previo.

El sistema implementa dos modos de evaluación automáticos:

1. **Modo A (Analítica Aislada / Foto Fija):**
   * *Escenario:* Paciente nuevo o sin registros previos.
   * *Funcionamiento:* Procesa los 10 valores de laboratorio actuales. Los campos de progresión ($\Delta$) viajan como nulos (`NaN`), gestionados de forma nativa por XGBoost (`missing=np.nan`) sin romper la predicción.
2. **Modo B (Progresión Temporal / Análisis Longitudinal):**
   * *Escenario:* Paciente con histórico analítico previo (~12 meses).
   * *Funcionamiento:* Procesa los valores actuales y calcula las variaciones interanuales ($\Delta_{\text{eGFR}}$, $\Delta_{\text{UACR}}$, $\Delta_{\text{ap\_hi}}$, $\Delta_{\text{colesterol}}$, $\Delta_{\text{bmi}}$). Destapa el deterioro renal o hemodinámico silencioso antes de que los valores absolutos alcancen niveles críticos.

---

## 🚀 Flujo de Uso en la Demo

* **Flujo Principal ("Analizar Carpeta"):** Con un clic en `POST /api/analiticas/analizar-carpeta`, el sistema procesa todas las analíticas de `data/analiticas/`, detectando automáticamente si cada caso es una foto aislada o incluye progresión previa, ordenando por severidad.
* **Simulador Manual ("Demo"):** Formulario interactivo en `POST /api/predict` con interruptor opcional para añadir histórico previo y ver cómo reaccionan las alertas de riesgo.
* **Valores de Laboratorio Continuos:** El colesterol se modela en su valor analítico real continuo en **mg/dL** (120–350 mg/dL).
* **Salida Multidimensional por Tipos de Riesgo:**
  1. **Riesgo Aterosclerótico (ASCVD):** Infarto e ictus por dislipemia continua, HTA sistólica y tabaquismo.
  2. **Riesgo de Insuficiencia Cardíaca (IC):** Sobrecarga metabólica y descompensación tensional/peso ($\Delta$).
  3. **Riesgo Cardiorrenal:** Caída acelerada de filtrado glomerular (`delta_egfr`) y microalbuminuria creciente (`delta_uacr`).
  * **Criterio de corte:** Si ningún fenotipo supera su umbral clínico, el sistema concluye: *"Sin riesgo significativo detectado (perfil bajo control)"*.

---

## 📊 Fuentes de Datos y Variables

1. **Fuente 1 (Población España):** [NutriSynthCare](https://www.kaggle.com/datasets/danicruzdevtech/datasets-sintticos-de-salud-diabetes-cardio).
2. **Fuente 2 (Calibración masiva):** [Cardiovascular Disease Dataset (Kaggle)](https://www.kaggle.com/datasets/sulianova/cardiovascular-disease-dataset).
3. **Síntesis Longitudinal Calibrada:** Generación de deltas interanuales según KDIGO/ESC.

> **Nota:** La columna `target_cardio` solo se utiliza en los CSV de entrenamiento para supervisar el aprendizaje y optimizar la sensibilidad (Recall). No forma parte de la entrada de las analíticas en producción.

---

## 🛠️ Stack Tecnológico

* **Frontend:** React + Vite, Tailwind CSS, Lucide Icons y Recharts.
* **Backend:** FastAPI, Pydantic v2 (Python 3.10+).
* **Machine Learning & XAI:** XGBoost (`xgboost`) con soporte nativo de `NaN`, persistencia con `joblib` y explicabilidad con `shap`.

---

## 📂 Estructura del Repositorio

```text
NextGen-Health/
|-- app/
|   |-- frontend/      # UI React: Analizador de carpeta + Simulador dual
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
