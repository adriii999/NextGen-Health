---
description: Reglas obligatorias de Test-Driven Development (TDD) y política de suite completa para agentes.
---

# Regla: Test-Driven Development (TDD) e Integración Completa

Para garantizar la estabilidad y coordinación entre agentes durante el Datathon:

1. **Ciclo TDD Obligatorio:**
   * Antes de codificar cualquier ruta, servicio o módulo de datos, se debe crear el archivo de test correspondiente en `tests/` especificando las aserciones esperadas.
   * La implementación debe ser la mínima necesaria para satisfacer el test sin trucar los resultados.

2. **Criterio de Éxito Global (Todos los Tests Pasados):**
   * La suite de pruebas solo estará al 100% (sin skips ni 501 pendientes) **cuando todos los componentes del sistema estén completamente desarrollados e integrados** con el modelo real en disco (`model/out/model_artifact.joblib`).
   * Ningún agente debe falsear respuestas para "hacer pasar" un test prematuramente.

3. **Ejecución Paralela Continua:**
   * Los tests se ejecutan en paralelo con `pytest -n auto` comunicándose por red con servidores reales instanciados en background.
   * La suite de tests debe ejecutarse siempre al completo sin interrupciones tempranas.
