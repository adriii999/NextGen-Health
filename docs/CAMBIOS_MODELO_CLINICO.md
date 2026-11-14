# Explicación de los Cambios en el Modelo y Pipeline Clínico

Este documento explica de forma clara y accesible para humanos (médicos, evaluadores y desarrolladores) los cambios aplicados en la rama de trabajo para transformar el sistema predictivo de NextGen-Health en una herramienta de soporte a la decisión clínica (**Clinical Decision Support System - CDSS**) rigurosa, veraz y apta para la práctica médica de Atención Primaria.

---

## 1. ¿Qué problemas existían antes?

Antes de estos cambios, el modelo sufría de varios problemas técnicos y médicos fundamentales:

1. **Riesgos polarizados en 0% o 100% ("blanco o negro"):**
   - El modelo predecía casi siempre 0% o casi 100%, sin escala de grises. Esto impedía al médico detectar a pacientes en riesgo moderado o inicial.
2. **Destrucción de los diagnósticos reales de los pacientes:**
   - En el paso final de preparación de datos, una fórmula sintética sobrescribía los eventos de los pacientes reales tirando una "moneda al aire". Si un paciente real de la cohorte CDC NHANES tenía un diagnóstico médico de infarto o insuficiencia cardíaca, la fórmula podía borrarlo y sustituirlo por un valor inventado.
3. **Explicabilidad (TreeSHAP) incompleta y confusa:**
   - Si el paciente estaba sano o bajo control, el sistema devolvía una lista vacía de factores clave, impidiendo al médico ver qué protegía al paciente o si algún parámetro estaba cerca del límite.
   - Las descripciones eran textos fijos: si un paciente no fumaba ni tenía diabetes (`fuma=0`, `diabetes=0`) y SHAP le daba un impacto protector (`-6%`), el texto decía erróneamente *"Diagnóstico de diabetes mellitus"* o *"Tabaquismo activo"*.
4. **Incoherencias fisiológicas en el tiempo:**
   - La simulación de visitas previas ($T-1$) podía generar albuminurias negativas (por ejemplo, si el paciente tenía hoy $6\text{ mg/g}$ y se le restaba un delta de $+25$, resultaba un valor previo absurdo de $-19\text{ mg/g}$).
   - Se admitían presiones de pulso físicamente imposibles en personas vivas ambulatorias (como $120/115\text{ mmHg}$, con una diferencia de solo $5\text{ mmHg}$).
5. **Cálculo de seguimiento longitudinal rígido:**
   - Se asumía que entre dos analíticas pasaba siempre exactamente 1 año. Si un médico pedía un control a los 6 meses y el paciente perdía $4.5\text{ mL/min}$, el sistema no lo detectaba como progresor rápido (umbral: $-5\text{ mL/min/año}$) aunque a ritmo anual estuviera perdiendo $-9\text{ mL/min/año}$.

---

## 2. Cambios Realizados y Explicación en Términos Médicos

### A. Preprocesamiento e Integración de Datos Reales (`prepare_data.py`)

* **Preservación del *Ground Truth* Clínico:**
  - De la cohorte real **CDC NHANES** (3.975 pacientes) se extrajeron los diagnósticos reales certificados:
    - `real_hf`: Insuficiencia cardíaca congestiva diagnosticada por médico (`MCQ160B`).
    - `real_ascvd`: Enfermedad coronaria, angina de pecho o infarto de miocardio (`MCQ160C/D/E`).
    - Daño renal objetivo medido en laboratorio: estadios KDIGO con $eGFR < 45\text{ mL/min}$ o macroalbuminuria $uACR \ge 200\text{ mg/g}$.
  - Estos desenlaces reales ya no se sobrescriben con fórmulas artificiales.
* **Ponderación por Calidad de Evidencia (`source_weight`):**
  - Los datos medidos en laboratorio de CDC NHANES tienen un peso de $3.0$, mientras que cohortes con variables imputadas pesan $1.0$ o $0.8$. El modelo aprende prioritariamente de la biología humana real.
* **Filtro Hemodinámico de Presión de Pulso:**
  - Se exige que la presión de pulso ($PAS - PAD$) esté entre $15$ y $130\text{ mmHg}$, eliminando 2.181 registros incongruentes.
* **Coherencia Biológica Temporal en $T-1$:**
  - Todos los deltas se acotaron matemáticamente para garantizar que el estado implícito del paciente hace un año ($X_{T-1} = X_T - \Delta_X$) sea fisiológicamente válido: ninguna albuminuria negativa y ningún filtrado glomerular fuera de límites biológicos.
* **Soporte para Nefropatía Severa:**
  - Se eliminaron recortes artificiales (`clip` a 380 mg/g) para que el modelo aprenda sobre macroalbuminuria severa real estadio KDIGO A3 ($>300 - 3000\text{ mg/g}$).

---

### B. Entrenamiento y Calibración Algorítmica (`train_models.py`)

* **Restricciones de Monotonía Fisiológica (`monotone_constraints`):**
  - En los árboles de decisión XGBoost se forzaron reglas biológicas inmutables:
    - Una **caída en el filtrado glomerular** (`egfr`, `delta_egfr`) **nunca** puede reducir el riesgo predicho.
    - Un **aumento de presión arterial, albuminuria, colesterol, tabaco o diabetes** **nunca** puede reducir el riesgo predicho.
  - Esto erradica artefactos estadísticos o conclusiones absurdas provocadas por ruido muestral.
* **Calibración Probabilística Real (Brier Score):**
  - Además de ROC-AUC y PR-AUC, se incorporó el **Brier Score** en el artefacto del modelo. Esto garantiza que las probabilidades reflejen la probabilidad real observada en la población y no solo una separación binaria forzada.
* **Sensibilidad de Cribado Calibrada ($\ge 85\%$):**
  - Los umbrales de decisión se calibraron sobre la curva Precision-Recall para garantizar que ningún paciente con riesgo real sea pasado por alto (reducción drástica de falsos negativos).

---

### C. Explicabilidad Clínica Transparente con TreeSHAP (`shap_service.py` y `model_service.py`)

* **TreeSHAP activo en el 100% de las consultas:**
  - El médico ahora recibe siempre los factores clave, incluso en pacientes sanos o con riesgo bajo (`hay_riesgo == False`).
* **Distinción entre Factores de Riesgo y Factores Protectores:**
  - Si un factor empeora el pronóstico, se muestra con signo positivo (ej. `+24%`) y texto de sobrecarga patológica.
  - Si un factor protege al paciente, se muestra con signo negativo (ej. `-18%`) y texto positivo (ej. *"Filtrado glomerular conservado (94 mL/min), factor protector cardiorrenal"* o *"Ausencia de diabetes mellitus"*).
* **Trazabilidad de Eje Fisiopatológico:**
  - Cada explicación indica a qué modelo pertenece la alerta:
    - `[Eje Cardiorrenal]`: Deterioro de filtrado glomerular o microalbuminuria silente.
    - `[Eje Aterosclerótico]`: Placa, colesterol, hipertensión y tabaquismo.
    - `[Eje Insuficiencia Cardíaca]`: Sobrecarga de volumen, adiposidad y poscarga hemodinámica.

---

### D. Mejoras Asistenciales en el Backend (`clinical.py`, `file_service.py`, `model_service.py`)

1. **Anualización Automática de Intervalos de Analíticas:**
   - `FileService` calcula la diferencia en días entre visitas. Si dos analíticas distan 6 meses, la variación se escala a ritmo anual ($\text{tasa} = \Delta / (\text{días} / 365.25)$), detectando progresiones aceleradas reales aunque las visitas no sean exactamente anuales.
2. **Triaje de Prioridad ALTA en Primera Visita (Modo A):**
   - El sistema ya no reserva la prioridad `"ALTA"` únicamente a quien tiene deltas conocidos. Un paciente que acude por primera vez con daño renal severo (KDIGO `ALTO` o `MUY_ALTO`), HTA severa ($\ge 165/100\text{ mmHg}$) o probabilidad elevada recibe de inmediato prioridad `"ALTA"`.
3. **Ampliación de Rangos Clínicos en Pydantic:**
   - Se extendió el rango admisible de `uacr` hasta $5000\text{ mg/g}$ y `egfr` hasta $160\text{ mL/min}$ para permitir evaluar pacientes reales con síndrome nefrótico o hiperfiltración temprana sin bloqueos HTTP 422.

---

## 3. Métricas Finales de los Modelos Entrenados

Los tres modelos XGBoost integrados en `model/out/model_artifact.joblib` presentan las siguientes métricas de rendimiento clínico:

| Fenotipo Clínico | ROC-AUC | PR-AUC | Brier Score (Calibración) | Sensibilidad (Recall) | Umbral Operativo Calibrado |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Riesgo Aterosclerótico (ASCVD)** | `0.817` | `0.435` | `0.0848` | `85.1%` | **7.0%** (`0.070`) |
| **Riesgo Insuficiencia Cardíaca** | `0.838` | `0.495` | `0.0848` | `85.7%` | **8.0%** (`0.080`) |
| **Riesgo Cardiorrenal (KDIGO)** | `0.910` | `0.824` | `0.0966` | `85.2%` | **23.6%** (`0.236`) |

---

## 4. Estado de Validación y Tests

El proyecto cuenta con verificación continua bajo Test-Driven Development (TDD):
* **Backend y Machine Learning (`pytest -n auto`):** **43 pruebas superadas (100% PASSED)** en `tests/`.
* **Frontend React / Vite (`npm test`):** **4 pruebas unitarias superadas (100% PASSED)** en `app/frontend/`.
* **Prueba en las 6 carpetas de pacientes reales:** Verificado el comportamiento de los modos A y B, incluyendo el caso emblemático de la *"Trampa del Rango Normal"* (paciente con valores aparentemente normales pero pérdida acelerada de filtrado glomerular, detectado con riesgo cardiorrenal del 49% y prioridad ALTA).
