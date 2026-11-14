---
description: Prohibición estricta de predicciones simuladas o respuestas falsas en endpoints no implementados.
---

# Regla de Integración: Cero Simulaciones en Endpoints de Inferencia

1. **Autenticidad de Respuestas:**
   * La API nunca debe engañar al cliente devolviendo HTTP 200 con probabilidades aleatorias, fijas o heurísticas si el modelo de ML no existe.
   * Si falta el artefacto `model/out/model_artifact.joblib`, los endpoints de inferencia deben responder estrictamente con **HTTP 501 Not Implemented**.

2. **Visibilidad en Tests:**
   * Las pruebas deben validar el código 501 en ausencia del modelo.
   * Una prueba de integración que requiera el modelo real debe saltarse condicionalmente con un mensaje explícito: `pytest.skip("MODELO_PENDIENTE: Falta model/out/model_artifact.joblib")`.
   * De este modo, un agente o desarrollador que una los módulos del proyecto sabrá exactamente cuándo su integración ha tenido éxito sin falsos positivos.
