# Especificación Técnica: Sistema de Detección y Segunda Opinión Multidimensional de Riesgo Cardiovascular (Basado en Progresión Temporal)

## 1. Contexto del Proyecto y Enfoque de Progresión Temporal
**Objetivo:** Desarrollar un prototipo / demo para el Datathon en 48 horas adaptado a la práctica médica de Atención Primaria (AP).
**El Factor Clave: Progresión Temporal (Deltas / Tendencias):**
En medicina de familia, el verdadero riesgo oculto casi nunca se detecta en una foto fija aislada. Un paciente con analítica actual en rango "aceptable" (ej. eGFR de 68 mL/min o UACR de 28 mg/g) es de altísimo riesgo si hace 12 meses tenía eGFR de 95 mL/min (caída acelerada > 5 mL/min/año) o UACR de 8 mg/g (triplicación asintomática).
* **Entrada del Modelo:** Analítica actual + analítica previa (o valores basales / variaciones calculadas $\Delta$).
* **Tolerancia Clínica a Analítica Única:** Si el paciente solo dispone de una analítica (primer registro), XGBoost maneja los $\Delta$ ausentes como `NaN`, evaluando el riesgo con la foto estática pero alertando de la necesidad de seguimiento temporal.
* **Modo Principal ("Analizar Carpeta"):** Evalúa las analíticas de `data/analiticas/` (que contienen el registro actual y previo/evolutivo) con un solo clic.
* **Modo Demo ("Simulador Manual"):** Permite ingresar la analítica actual y ajustar si la tendencia respecto al año anterior fue de empeoramiento o estabilidad.
* **Salida Multidimensional ("Tipos de Riesgo"):** Tres fenotipos (Aterosclerótico, Insuficiencia Cardíaca y Cardiorrenal). Si ningún valor supera su umbral, concluye: *"Sin riesgo significativo detectado"*.

---

## 2. Fuentes de Datos (Datasets) y Justificación

### 2.1 Fuente 1: NutriSynthCare - Salud, Diabetes y Riesgo CV en España
* **Enlace:** [https://www.kaggle.com/datasets/danicruzdevtech/datasets-sintticos-de-salud-diabetes-cardio](https://www.kaggle.com/datasets/danicruzdevtech/datasets-sintticos-de-salud-diabetes-cardio)
* **Utilidad:** Población española en AP con diabetes y comorbilidad cardiovascular.

### 2.2 Fuente 2: Cardiovascular Disease Dataset (Kaggle)
* **Enlace:** [https://www.kaggle.com/datasets/sulianova/cardiovascular-disease-dataset](https://www.kaggle.com/datasets/sulianova/cardiovascular-disease-dataset)
* **Utilidad:** 70.000 registros para soporte y calibración de combinaciones multivariables.

### 2.3 Generación Sintética de Progresión Temporal y Función Renal
El script de preparación de datos (`prepare_data.py`) genera la evolución longitudinal ($\Delta$ interanual) según guías clínicas (KDIGO / ESC):
* Pacientes con evento cardiovascular desarrollan caídas progresivas de `eGFR` y aumentos de `UACR` y tensión sistólica entre el año $T-1$ y el año $T$.

---

## 3. Definición del Dataset y Variables Continuas

### 3.1 Variables Clínicas de Entrada (Valores Continuos Reales y Progresión $\Delta$)

Todas las variables analíticas de laboratorio son **continuas reales en unidades clínicas estándar**, eliminando categorías artificiales:

| Variable | Nombre Clínico | Unidades / Rango | Progresión Temporal ($\Delta$) | Justificación Médica |
| :--- | :--- | :--- | :--- | :--- |
| `edad` | Edad | Años (30 – 85) | — | Multiplicador de riesgo basal. |
| `sexo` | Sexo biológico | 1: Mujer, 2: Hombre | — | Calibración de riesgo por sexo. |
| `bmi` | Índice de Masa Corporal | $\text{kg/m}^2$ (15.0 – 60.0) | `delta_bmi` | Aumento rápido de peso por retención hidrosalina en IC. |
| `ap_hi` | Presión Sistólica actual | mmHg (80 – 220) | `delta_ap_hi` | Subida tensional descontrolada interanual. |
| `ap_lo` | Presión Diastólica actual | mmHg (50 – 130) | `delta_ap_lo` | Sobrecarga vascular periférica. |
| `colesterol_total` | Colesterol Total | **mg/dL continuo (120 – 350)** | `delta_colesterol` | Nivel analítico real exacto del laboratorio de AP. |
| `fuma` | Tabaquismo activo | Binario: 0 = No, 1 = Sí | — | Factor endotelial crítico. |
| `diabetes` | Presencia de Diabetes | Binario: 0 = No, 1 = Sí | — | Multiplicador de daño metabólico y vascular. |
| `egfr` | Tasa Filtración Glomerular | $\text{mL/min}/1.73\text{m}^2$ (15 – 120) | **`delta_egfr`** | Caída anual $>5\text{ mL/min}$ indica progresión renal activa. |
| `uacr` | Albúmina/Creatinina en orina | $\text{mg/g}$ (2 – 300) | **`delta_uacr`** | Duplicación o triplicación de microalbuminuria silenciosa. |

> **Cálculo de Progresión:**  
> $\Delta_{\text{variable}} = \text{Valor}_{\text{actual}} - \text{Valor}_{\text{previo (12 meses)}}$  
> Si no existe analítica previa disponible, $\Delta$ toma el valor `null` (`NaN`), que XGBoost maneja de forma nativa sin romper la predicción.

### 3.2 Etiquetas de Entrenamiento (Supervisión en los CSVs de Desarrollo)
* `target_cardio`: Evento cardiovascular registrado en el histórico (0 = No, 1 = Sí), usado exclusivamente durante el entrenamiento para optimizar la sensibilidad (Recall).

---

## 4. Tipos de Riesgo Evaluados (Guías ESC / SEC / PREVENT)

1. **Riesgo Aterosclerótico (ASCVD):**
   * *Variables clave:* `colesterol_total` continuo, `ap_hi`, `fuma`, `edad`, `sexo` y `delta_colesterol`.
   * *Umbral de alerta:* $\ge 10\%$.
2. **Riesgo de Insuficiencia Cardíaca (IC):**
   * *Variables clave:* `bmi`, `delta_bmi`, `ap_hi`, `delta_ap_hi`, `diabetes`, `uacr`, `delta_uacr`.
   * *Umbral de alerta:* $\ge 8\%$.
3. **Riesgo Cardiorrenal (Deterioro Renal Silencioso):**
   * *Variables clave:* `egfr`, `delta_egfr` (caída acelerada), `uacr`, `delta_uacr` (subida silenciosa), `diabetes`.
   * *Umbral de alerta:* $\ge 12\%$.

> **Regla Diagnóstica:** Si ningún tipo supera su umbral, la conclusión es: **"Sin riesgo cardiovascular significativo detectado (perfil bajo control)"**.

---

## 5. Diseño de la API (FastAPI)

### 5.1 Endpoints
* `GET /api/analiticas`: Lista los archivos de analíticas disponibles en la carpeta local `data/analiticas/`.
* `POST /api/analiticas/analizar-carpeta`: **(Flujo Principal en 1 Clic)** Procesa todas las analíticas longitudinales de la carpeta y devuelve el diagnóstico priorizado.
* `POST /api/predict`: **(Simulador / Demo)** Recibe los valores actuales y previos (o sus deltas) y calcula la evaluación multidimensional.

#### Payload de Entrada (`POST /api/predict` con Progresión):
```json
{
  "edad": 58,
  "sexo": 1,
  "bmi": 27.2,
  "ap_hi": 138,
  "ap_lo": 86,
  "colesterol_total": 218.0,
  "fuma": 0,
  "diabetes": 1,
  "egfr": 68.0,
  "uacr": 38.5,
  "progresion": {
    "delta_egfr": -14.0,
    "delta_uacr": 22.0,
    "delta_ap_hi": 8.0,
    "delta_colesterol": 12.0,
    "delta_bmi": 1.1
  }
}
```

#### Respuesta Multidimensional con Explicación de Progresión:
```json
{
  "hay_riesgo": true,
  "conclusion_diagnostica": "Alerta crítica: Aunque los valores absolutos parecen casi normales, la progresión temporal muestra una pérdida acelerada de filtrado glomerular (-14 mL/min) y triplicación de albuminuria.",
  "nivel_prioridad": "ALTA",
  "tipos_riesgo": {
    "riesgo_aterosclerotico": { "valor": 0.08, "umbral": 0.10, "alerta": false, "interpretacion": "Bajo" },
    "riesgo_insuficiencia_cardiaca": { "valor": 0.16, "umbral": 0.08, "alerta": true, "interpretacion": "Alto (sobrecarga hemodinámica incipiente)" },
    "riesgo_cardiorrenal": { "valor": 0.28, "umbral": 0.12, "alerta": true, "interpretacion": "Muy Alto (deterioro renal acelerado)" }
  },
  "factores_clave": [
    { "variable": "delta_egfr", "valor_actual": "-14 mL/min/año", "impacto": "+18%", "descripcion": "Pérdida acelerada de función renal (>5 mL/min/año es patológico)" },
    { "variable": "delta_uacr", "valor_actual": "+22 mg/g", "impacto": "+15%", "descripcion": "Incremento rápido de albuminuria en 12 meses" },
    { "variable": "colesterol_total", "valor_actual": "218 mg/dL", "impacto": "+6%", "descripcion": "Nivel continuo en rango limítrofe" }
  ],
  "recomendacion_preventiva": "Intervención inmediata: Iniciar nefroprotección (iSGLT2 / ARA-II) y citación a 3 meses para frenar caída de eGFR."
}
```

---

## 6. Vistas de Usuario (Frontend React + Tailwind)
1. **Pestaña Principal ("Analizar Carpeta"):** Muestra las analíticas de la carpeta con su comparativa temporal (gráfico de tendencia o flechas de evolución $\uparrow / \downarrow$). Con un clic genera la segunda opinión médica.
2. **Pestaña Secundaria ("Simulador Manual con Progresión"):** Permite ingresar la analítica actual e incluye selectores o campos opcionales para la analítica previa, calculando los deltas automáticamente.
