# Reglas del Proyecto NextGen-Health para Agentes

## 1. REGLA ESTRICTA: Test-Driven Development (TDD) Obligatorio

> [!IMPORTANT]
> **Todo desarrollo en el proyecto debe seguir TDD:**
> 1. **Escribir el test primero (Red):** Definir la prueba del comportamiento, esquema o endpoint antes de escribir el código de la solución.
> 2. **Implementar (Green):** Desarrollar la lógica necesaria para que el test pase.
> 3. **Refactorizar (Refactor):** Mejorar el código asegurando que la suite continúe en verde.

---

## 2. REGLA ESTRICTA: Integración Real y Cero Falsificación de Datos

> [!CAUTION]
> **Prohibido el "Silent Mocking":** NUNCA devolver un HTTP 200 con predicciones simuladas, datos *mock* o heurísticas cableadas en endpoints que dependan de modelos de Machine Learning no implementados.

### Directrices de Integración para Agentes:
1. **HTTP 501 Not Implemented en ausencia de componentes:**
   * Si el artefacto del modelo (`model/out/model_artifact.joblib`) no existe en disco, los endpoints de inferencia (`/api/predict`, `/api/analiticas/analizar-carpeta`) **DEBEN devolver HTTP 501 Not Implemented**.
2. **Criterio de Finalización Global (Suite al 100%):**
   * **Todos los tests se considerarán superados ÚNICAMENTE cuando todas las piezas reales estén implementadas e integradas** (Frontend, Backend y el modelo entrenado por ML).
   * La prueba de inferencia real de extremo a extremo (`test_status_modelo_real_en_disco`) permanecerá en estado `SKIPPED` de forma explícita hasta que el equipo de ML deposite el artefacto `model_artifact.joblib`.
   * El agente que una las partes sabrá que su integración ha finalizado con éxito en cuanto ese test pase de `SKIPPED` a `PASSED`.

---

## 3. Ejecución de Tests: Paralelismo y Servidor Instanciado

* **Servidor Real Instanciado:** Los tests de API se ejecutan contra un servidor Uvicorn real instanciado por sockets en un puerto dinámico (definido en `tests/conftest.py`).
* **Ejecución en Paralelo:** Los tests corren en paralelo (`pytest -n auto`) utilizando `pytest-xdist`.
* **No Detener la Suite:** La ejecución no se detiene ante el primer fallo (sin flag `-x`), permitiendo evaluar el mapa completo del sistema.

---

## 4. Guía de Conexión para el Agente de Frontend (React / Vite)

Para el agente o desarrollador que implementa la interfaz de usuario en `app/frontend/`:

### 4.1 URL Base y Puertos
* **Backend API Base:** `http://localhost:8000/api`
* **Vite Dev Server (Frontend):** `http://localhost:5173`
* **CORS:** El backend ya tiene habilitado CORS para `http://localhost:5173` y `http://127.0.0.1:5173`.

### 4.2 Configuración Recomendada en Vite (`vite.config.js`)
Para evitar problemas de dominios cruzados en desarrollo, se recomienda configurar el proxy en `app/frontend/vite.config.js`:
```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
```
Con esto, el frontend puede llamar directamente a `/api/analiticas`, `/api/predict`, etc.

### 4.3 Comportamiento de la Ruta Raíz (`/`)
* **En desarrollo:** Si se accede a `http://localhost:8000/`, el backend responde un JSON explicativo con el estado del sistema y la guía de endpoints disponibles.
* **Para demo y producción (`npm run build`):**
  Al ejecutar `npm run build` dentro de `app/frontend/`, Vite genera la carpeta `app/frontend/dist/`.
  El servidor FastAPI está programado para **detectar automáticamente esa carpeta y servir directamente el archivo `index.html` y los assets en `http://localhost:8000/`**.
  ¡Esto permite que el proyecto se entregue o exponga desde un solo servidor en el puerto 8000!

### 4.4 Endpoints que debe consumir el Frontend:
1. `GET /api/health`: Comprueba si la API está viva y si el modelo está cargado o pendiente.
2. `GET /api/analiticas`: Lista los archivos analíticos de la carpeta `data/analiticas/`.
3. `POST /api/analiticas/analizar-carpeta`: **Botón principal en 1 Clic** (evalúa todo el lote y lo ordena por severidad de riesgo).
4. `POST /api/predict`: **Simulador manual** (recibe el JSON con los 10 valores continuos y el bloque opcional `progresion`).
