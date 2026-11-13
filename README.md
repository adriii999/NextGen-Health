# NextGen Health: Segunda Opinión Multidimensional de Riesgo Cardiovascular

Herramienta clínica de soporte a la decisión para **Atención Primaria**, diseñada para proporcionar una **segunda opinión en un solo clic** sobre analíticas ya registradas en el sistema de salud, identificando señales de riesgo cardiovascular oculto sin sobrecargar la consulta médica.

> **Estado:** Prototipo funcional (MVP) desarrollado para el Datathon.

---

## 🎯 Enfoque y Propuesta de Valor

En una consulta habitual de Atención Primaria, el tiempo por paciente es de apenas 5 a 7 minutos. Analíticas con parámetros individuales dentro de rangos aparentemente "aceptables" o limítrofes pueden enmascarar un riesgo cardiovascular elevado.

* **Flujo Principal ("Segunda Opinión en 1 Clic"):** Carmen (médica de AP) no necesita teclear datos. Pulsa un botón sobre la analítica precargada del paciente y recibe al instante una evaluación de riesgo multidimensional explicada.
* **Simulador / Demo ("Entrada Manual"):** Pestaña interactiva para introducir o modificar manualmente los 10 valores clínicos, ideal para presentaciones, docencia o casos no digitalizados.
* **Salida Multidimensional por Tipos de Riesgo:** Basada en las directrices de la **Sociedad Europea de Cardiología (ESC)**, la **Sociedad Española de Cardiología (SEC)** y las ecuaciones multidimensionales **AHA PREVENT**:
  1. **Riesgo Aterosclerótico (ASCVD):** Infarto e ictus por dislipemia, HTA sistólica y tabaquismo.
  2. **Riesgo de Insuficiencia Cardíaca (IC):** Sobrecarga metabólica y remodelado ventricular (SCORE2-HF / PREVENT-HF).
  3. **Riesgo Cardiorrenal:** Deterioro precoz de función renal (`eGFR`) y microalbuminuria (`UACR`).
  * **Criterio de corte:** Si ningún fenotipo supera su umbral clínico, el sistema concluye: *"Sin riesgo significativo detectado (perfil bajo control)"*, evitando fatiga de alertas.

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
|   |-- frontend/      # UI React: Cupo de analíticas + Simulador demo
|   \-- backend/       # API FastAPI: /api/v1/analyze y /api/v1/pacientes
|-- data/
|   |-- raw/           # Dataset base y datos clínicos originales
|   \-- processed/     # Dataset enriquecido con correlación cardiorrenal
|-- model/
|   |-- scripts/       # Pipelines de preparación, síntesis y entrenamiento
|   \-- out/           # Modelos (.joblib) y artefactos SHAP
|-- docs/
|   |-- Arquitectura-propuesta-reto1.md   # Especificación técnica detallada
|   |-- Enunciado-Reto1.docx              # Enunciado original del reto
|   \-- estructura-repo.md                # Detalle de directorios
\-- README.md
```

Consulta el detalle completo del contrato de la API y modelos en [docs/Arquitectura-propuesta-reto1.md](docs/Arquitectura-propuesta-reto1.md).
