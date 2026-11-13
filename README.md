# NextGen Health: Segunda Opinión Multidimensional de Riesgo Cardiovascular

Herramienta clínica de demostración (MVP) para **Atención Primaria**, diseñada para proporcionar una **segunda opinión en un solo clic** analizando archivos de analíticas depositados en una carpeta, identificando señales de riesgo cardiovascular oculto sin sobrecargar la consulta médica.

> **Estado:** Prototipo funcional (demo sin base de datos de usuarios) desarrollado para el Datathon.

---

## 🎯 Enfoque y Propuesta de Valor

En una consulta habitual de Atención Primaria, el tiempo por paciente es escaso (5–7 minutos). Analíticas con parámetros individuales dentro de rangos aparentemente "aceptables" o limítrofes pueden enmascarar un riesgo cardiovascular elevado.

* **Flujo Principal ("Analizar Carpeta de Analíticas"):** El sistema lee directamente las analíticas almacenadas en la carpeta de datos (`data/analiticas/`) y, con un solo clic en el botón de análisis (`POST /api/analiticas/analizar-carpeta`), genera una evaluación clínica priorizada de todos los casos.
* **Simulador / Demo ("Entrada Manual"):** Pestaña secundaria interactiva para introducir o modificar manualmente los 10 valores clínicos de una analítica (`POST /api/predict`), ideal para demostraciones en vivo o casos de prueba.
* **Salida Multidimensional por Tipos de Riesgo:** Basada en las directrices de la **ESC**, **SEC** y ecuaciones **AHA PREVENT**:
  1. **Riesgo Aterosclerótico (ASCVD):** Infarto e ictus por dislipemia, HTA sistólica y tabaquismo.
  2. **Riesgo de Insuficiencia Cardíaca (IC):** Sobrecarga metabólica y remodelado ventricular (SCORE2-HF / PREVENT-HF).
  3. **Riesgo Cardiorrenal:** Deterioro precoz de función renal (`eGFR`) y microalbuminuria (`UACR`).
  * **Criterio de corte:** Si ningún fenotipo supera su umbral clínico, el sistema concluye: *"Sin riesgo significativo detectado (perfil bajo control)"*, evitando fatiga de alertas.

---

## 📊 Fuentes de Datos y Variables

Para calibrar el modelo se emplea una combinación de fuentes abiertas y síntesis clínica:

1. **Fuente 1 (Población España):** [NutriSynthCare](https://www.kaggle.com/datasets/danicruzdevtech/datasets-sintticos-de-salud-diabetes-cardio) (`edad`, `sexo`, `bmi`, `ap_hi`, `ap_lo`, `colesterol`, `diabetes`, `fuma`).
2. **Fuente 2 (Calibración estadística masiva):** [Cardiovascular Disease Dataset (Kaggle)](https://www.kaggle.com/datasets/sulianova/cardiovascular-disease-dataset) (70.000 registros para patrones biológicos robustos).
3. **Síntesis Clínica Calibrada (Función Cardiorrenal):** Inyección de `eGFR` y `UACR` según guías KDIGO para modelar el deterioro silencioso del reto.

> **Nota:** La columna `target_cardio` solo se utiliza en los CSV de entrenamiento para supervisar el aprendizaje y optimizar la sensibilidad (Recall). No forma parte de la entrada de las analíticas en producción.

---

## 🛠️ Stack Tecnológico

* **Frontend:** React + Vite, Tailwind CSS, Lucide Icons y Recharts.
* **Backend:** FastAPI, Pydantic v2 (Python 3.10+).
* **Machine Learning & XAI:** XGBoost (`xgboost`), persistencia con `joblib` y explicabilidad con `shap`.

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
|   \-- processed/     # Dataset enriquecido con correlación cardiorrenal
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
