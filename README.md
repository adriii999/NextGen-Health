# NextGen Health

Prototipo para detectar de forma temprana posibles señales de riesgo cardiovascular oculto en pacientes de Atención Primaria. El proyecto busca ayudar a los profesionales a priorizar casos y facilitar la toma de decisiones preventivas sin añadir carga administrativa.

> **Estado:** proyecto en desarrollo para un Datathon. El modelo y la aplicación descritos son una propuesta de MVP, no una herramienta clínica validada ni un sustituto del criterio profesional.

## Objetivo

Identificar pacientes cuyo riesgo cardiovascular podría pasar desapercibido al valorar resultados analíticos de forma aislada, prestando especial atención a factores renales como la tasa de filtración glomerular estimada (eGFR) y el cociente albúmina/creatinina en orina (UACR).

La propuesta combina una API y una interfaz web. Para cada paciente, el sistema devolverá una probabilidad estimada, un nivel de alerta y factores explicativos del resultado.

## Stack propuesto

- **Frontend:** React con Vite, Tailwind CSS, Axios, Lucide y Recharts.
- **Backend:** FastAPI y Pydantic (Python 3.10 o superior).
- **Modelo:** XGBoost, con persistencia mediante Joblib y explicabilidad con SHAP.

## Datos y modelo

La propuesta parte del *Cardiovascular Disease Dataset* de Kaggle y contempla generar variables sintéticas correlacionadas para diabetes y función renal. El dataset disponible actualmente en `data/raw/dataset.csv` es provisional y se sustituirá por el dataset definitivo.

Variables previstas para el modelo:

- Edad, sexo, presión arterial sistólica y diastólica, colesterol, tabaquismo e IMC.
- Diabetes, eGFR y UACR.
- **Objetivo (`cardio`):** presencia de enfermedad cardiovascular.

El preprocesamiento previsto incluye filtrar presiones fuera de los rangos definidos en la propuesta, eliminar registros con presión diastólica mayor o igual a la sistólica y excluir IMC fuera de 15–60. Los valores nulos no se imputarán; XGBoost deberá gestionarlos de forma nativa.

La métrica principal de entrenamiento será *recall* (sensibilidad), ajustando el umbral de decisión. AUC-ROC y matriz de confusión servirán como métricas complementarias.

## API propuesta

El endpoint `POST /predict` recibirá variables clínicas validadas con Pydantic y devolverá la probabilidad estimada, el nivel de alerta, factores clave explicados con SHAP y un mensaje clínico orientativo. El contrato detallado y los ejemplos están en [docs/Arquitectura-propuesta-reto1.md](docs/Arquitectura-propuesta-reto1.md).

## Estructura del repositorio

```text
NextGen-Health/
|-- app/          # Interfaz web y API
|-- data/         # Datos originales y procesados
|-- docs/         # Enunciado y documentación
|-- model/        # Preparación, entrenamiento y artefactos del modelo
|-- scripts/      # Automatizaciones y utilidades generales
\-- README.md
```

Consulta el árbol detallado en [docs/estructura-repo.md](docs/estructura-repo.md) y el reto original en [docs/Enunciado-Reto1.docx](docs/Enunciado-Reto1.docx).

## Estado de implementación

El repositorio contiene la documentación inicial y un dataset provisional. Las carpetas de frontend, backend y entrenamiento están preparadas; la aplicación, el pipeline de datos y el modelo todavía están pendientes de implementación.
