# NextGen Health: Segunda Opinión Multidimensional de Riesgo Cardiovascular

Herramienta clínica de soporte a la decisión para **Atención Primaria**, diseñada para proporcionar una **segunda opinión en un solo clic** sobre analíticas ya registradas en el sistema de salud, identificando señales de riesgo cardiovascular oculto sin sobrecargar la consulta médica.

> **Estado:** Prototipo funcional (MVP) desarrollado para el Datathon.

---

## 🎯 Enfoque y Propuesta de Valor

En una consulta habitual de Atención Primaria, el tiempo por paciente es de apenas 5 a 7 minutos. Analíticas con parámetros individuales dentro de rangos aparentemente "aceptables" o limítrofes pueden enmascarar un riesgo cardiovascular elevado.

* **Flujo Principal ("Segunda Opinión en 1 Clic"):** Carmen (médica de AP) no necesita teclear datos. Pulsa un botón sobre la analítica precargada del paciente (`POST /api/pacientes/{id}/predict`) y recibe al instante una evaluación de riesgo multidimensional explicada.
* **Simulador / Demo ("Entrada Manual"):** Pestaña interactiva para introducir o modificar manualmente los 10 valores clínicos (`POST /api/predict`), ideal para presentaciones, docencia o casos no digitalizados.
* **Salida Multidimensional por Tipos de Riesgo:** Basada en las directrices de la **Sociedad Europea de Cardiología (ESC)**, la **Sociedad Española de Cardiología (SEC)** y las ecuaciones multidimensionales **AHA PREVENT**:
  1. **Riesgo Aterosclerótico (ASCVD):** Infarto e ictus por dislipemia, HTA sistólica y tabaquismo.
  2. **Riesgo de Insuficiencia Cardíaca (IC):** Sobrecarga metabólica y remodelado ventricular (SCORE2-HF / PREVENT-HF).
  3. **Riesgo Cardiorrenal:** Deterioro precoz de función renal (`eGFR`) y microalbuminuria (`UACR`).
  * **Criterio de corte:** Si ningún fenotipo supera su umbral clínico, el sistema concluye: *"Sin riesgo significativo detectado (perfil bajo control)"*, evitando fatiga de alertas.

---

## 📊 Fuentes de Datos y Variables

Para respetar la privacidad de datos clínicos de España (RGPD) y dotar al modelo de precisión estadística y contextual, se emplea una estrategia híbrida:

1. **Fuente 1 (Principal - Población España):** [NutriSynthCare - Salud, Diabetes y Riesgo CV en España](https://www.kaggle.com/datasets/danicruzdevtech/datasets-sintticos-de-salud-diabetes-cardio). Proporciona `Edad`, `Genero`, `IMC`, `Presion_Arterial`, `Colesterol`, `Nivel_Glucosa`/`Diabetes`, `Fumador`.
2. **Fuente 2 (Apoyo Estadístico y Volumen):** [Cardiovascular Disease Dataset (Kaggle)](https://www.kaggle.com/datasets/sulianova/cardiovascular-disease-dataset). 70.000 registros para patrones biológicos robustos (`ap_hi`, `ap_lo`, `cholesterol`, `gluc`).
3. **Síntesis Clínica Calibrada (Función Cardiorrenal):** Inyección de `eGFR` (Tasa de Filtración Glomerular) y `UACR` (Cociente Albúmina/Creatinina) según guías KDIGO para modelar el deterioro silencioso fundamental en el reto de la Dra. Carmen.

> **Aclaración sobre la variable Target:** `target_cardio` (o `cardio`) existe únicamente en los datasets CSV históricos para el entrenamiento supervisado (la "solución" que el modelo aprende a relacionar). Durante la inferencia clínica en la API (`/api/predict`), esta columna no existe como entrada; la salida es la estimación multidimensional de riesgos.

Consulta la tabla completa de correspondencia de variables en [docs/Arquitectura-propuesta-reto1.md](docs/Arquitectura-propuesta-reto1.md#3-definición-del-dataset-y-trazabilidad-de-variables).

---

## 🛠️ Stack Tecnológico

* **Frontend:** React + Vite, Tailwind CSS, Lucide Icons y Recharts.
* **Backend:** FastAPI, Pydantic v2 (Python 3.10+).
* **Machine Learning & XAI:** XGBoost (`xgboost`) con soporte para nulos clínicos nativos, persistencia con `joblib` y explicabilidad con `shap`.

---

## 📂 Estructura del Repositorio

```text
NextGen-Health/
|-- app/
|   |-- frontend/      # UI React: Cupo de analíticas (1 Clic) + Simulador demo
|   \-- backend/       # API FastAPI: /api/predict y /api/pacientes
|-- data/
|   |-- raw/           # Dataset base y datos clínicos originales
|   \-- processed/     # Dataset enriquecido con correlación cardiorrenal
|-- model/
|   |-- scripts/       # Pipelines de preparación, síntesis y entrenamiento
|   \-- out/           # Modelos (.joblib) y artefactos SHAP
|-- docs/
|   |-- Arquitectura-propuesta-reto1.md   # Especificación técnica detallada y fuentes
|   |-- Enunciado-Reto1.docx              # Enunciado original del reto
|   |-- f.md                              # Documento base de fuentes
|   \-- estructura-repo.md                # Detalle de directorios
\-- README.md
```
