# NextGen Health: revisión experimental de analíticas

Prototipo para Atención Primaria que analiza archivos de analíticas de una carpeta y presenta una lista orientativa de pacientes por revisar. Puede utilizar una analítica aislada o calcular cambios entre visitas.

> **Estado:** Demo experimental sin base de datos, sin integración con la historia clínica y sin validación clínica. No utilizar con pacientes reales ni como base de decisiones asistenciales.

---

## 🎯 Enfoque y Doble Funcionalidad Analítica

La bandeja inicia el análisis al abrirse, muestra la fecha de revisión y permite abrir cada ficha. Los registros con datos insuficientes o inválidos quedan separados y no reciben una predicción.

El sistema implementa dos modos de evaluación automáticos:

1. **Modo A (Analítica Aislada / Foto Fija):**
   * *Escenario:* Paciente nuevo o sin registros previos.
   * *Funcionamiento:* Procesa los 10 valores de laboratorio actuales. Los campos de progresión ($\Delta$) viajan como nulos (`NaN`), gestionados de forma nativa por XGBoost (`missing=np.nan`) sin romper la predicción.
2. **Modo B (Progresión Temporal / Análisis Longitudinal):**
   * *Escenario:* Paciente con histórico analítico previo (~12 meses).
   * *Funcionamiento:* Procesa los valores actuales y calcula variaciones anuales entre visitas cuando hay datos y fechas suficientes.

La prioridad combina alertas del modelo y reglas experimentales sobre datos observados. Sus umbrales requieren revisión y validación clínica. La ausencia de alertas no descarta riesgo. Si las fuentes cambian, se muestra un aviso tras comprobarlas al volver a la ventana o periódicamente; el profesional puede solicitar una nueva revisión del cupo. No se actualizan pacientes individualmente.

---

## 🧠 ¿Para qué sirve SHAP (XAI) en este proyecto?

La librería `shap` calcula atribuciones del modelo. Los porcentajes mostrados son aproximaciones, no puntos exactos de probabilidad ni evidencia de causalidad. Las puntuaciones no están validadas como probabilidades de eventos clínicos futuros.

El prototipo no prescribe ni selecciona tratamientos. Una evaluación profesional debe considerar la historia clínica y las guías aplicables.

---

## 🛠️ Stack Tecnológico y Librerías

* **Frontend:** React + Vite, Tailwind CSS, Lucide Icons y Recharts (para radar de 3 riesgos y barras de impacto SHAP).
* **Backend:** FastAPI, Pydantic v2 (Python 3.10+).
* **Librerías de Machine Learning & XAI:**
  * **`xgboost`:** Clasificador de gradiente para datos tabulares con soporte nativo de valores nulos (`missing=np.nan`).
  * **`shap`:** Librería de Inteligencia Artificial Explicable (XAI) para calcular los factores determinantes de cada predicción.
  * **`joblib`:** Persistencia y carga en memoria de los modelos y artefactos entrenados.
  * **`scikit-learn`:** Validación cruzada (`StratifiedKFold`) y optimización de sensibilidad (*Recall* $\ge 85\%$).
  * **`pandas` y `numpy`:** Procesamiento de datos tabulares y cálculo de variaciones temporales.

---

## 🚀 Inicio Rápido del Backend

### 1. Iniciar el Servidor API
```bash
# Con Python directo
python scripts/run_backend.py

# O con PowerShell en Windows
.\scripts\run_backend.ps1
```
* **Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
* **ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)
* **Health Check:** [http://localhost:8000/api/health](http://localhost:8000/api/health)

La aplicación se abre en **http://localhost:8000**. Para actualizar la interfaz después de cambiar el frontend, ejecuta `npm install` y `npm run build` en `app/frontend/`; FastAPI sirve la compilación desde el mismo puerto. Si el artefacto de modelo no está disponible, la API devuelve HTTP 501 en lugar de predicciones inventadas.

### 2. Ejecutar la Suite de Pruebas (TDD)
```bash
python scripts/run_tests.py
# o bien
pytest tests -v
```

### 3. Generar Analíticas de Prueba
```bash
python scripts/seed_sample_analiticas.py
```

---

## 📂 Estructura del Repositorio

```text
NextGen-Health/
|-- app/
|   |-- frontend/      # UI React: Analizador de carpeta + Simulador dual
|   \-- backend/       # API FastAPI: /api/predict, /api/analiticas y /api/health
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
|-- scripts/
|   |-- run_backend.py                    # Script de arranque del backend FastAPI
|   |-- run_tests.py                      # Ejecución de la suite pytest
|   \-- seed_sample_analiticas.py         # Generador de analíticas de prueba
|-- tests/                                # Suite de pruebas TDD (API, schemas, services)
\-- README.md
```
