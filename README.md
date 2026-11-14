# NextGen Health: Segunda Opinión Multidimensional de Riesgo Cardiovascular (Dual: Aislada y Progresión)

Herramienta clínica de demostración (MVP) para **Atención Primaria**, diseñada para proporcionar una **segunda opinión en un solo clic** analizando archivos de analíticas depositados en una carpeta, identificando señales de riesgo cardiovascular oculto mediante una **arquitectura de evaluación dual** (analítica aislada y progresión temporal $\Delta$) y **explicabilidad médica transparente con SHAP**.

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

## 🧠 ¿Para qué sirve SHAP (XAI) en este proyecto?

Un modelo de Machine Learning que emite solo un número (ej. *"Riesgo: 82%"*) es una **caja negra** que ningún médico de Atención Primaria utilizaría. 

La librería **`shap` (`TreeExplainer`)** se utiliza para:
1. **Abrir la caja negra:** Calcula la aportación matemática exacta de cada variable clínica al riesgo estimado.
2. **Generar los Factores Clave (`factores_clave`):** Traduce los valores matemáticos en impactos porcentuales comprensibles para el doctor (ej. *"La pérdida de eGFR de -14 mL/min/año aporta un +18% al riesgo"* o *"El colesterol total aporta un +6%"*).
3. **Guiar la Recomendación Médica:** Permite que el sistema emita una intervención preventiva dirigida a la causa raíz (ej. nefroprotección con iSGLT2 ante empeoramiento de UACR/eGFR).

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
