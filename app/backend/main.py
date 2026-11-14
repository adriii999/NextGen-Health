from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.backend.config import settings
from app.backend.services.model_service import ModelService
from app.backend.api.routes import health, predict, analiticas


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Ciclo de vida de la aplicación: carga artefactos de ML una sola vez al inicio."""
    print("=" * 60)
    print(f"Iniciando {settings.PROJECT_NAME} v{settings.VERSION}")
    print(f"Directorio de analíticas: {settings.ANALITICAS_DIR}")
    print(f"Buscando artefacto en: {settings.MODEL_PATH}")
    
    # Inicializar y cargar servicio de modelo
    model_service = ModelService()
    model_service.load_artifacts(str(settings.MODEL_PATH))
    app.state.model_service = model_service

    # Asegurar que data/analiticas exista
    settings.ANALITICAS_DIR.mkdir(parents=True, exist_ok=True)

    print("Servidor listo para recibir consultas.")
    print("=" * 60)
    
    yield
    
    print("Cerrando servidor y liberando recursos...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="API de Segunda Opinión Multidimensional de Riesgo Cardiovascular para Atención Primaria",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configuración de CORS para permitir peticiones desde Vite (desarrollo y red local)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Montaje de routers de la API con prefijo /api
app.include_router(health.router, prefix=settings.API_PREFIX)
app.include_router(predict.router, prefix=settings.API_PREFIX)
app.include_router(analiticas.router, prefix=settings.API_PREFIX)

# Montar carpeta assets del frontend compilado si existe
assets_dir = settings.FRONTEND_DIST_DIR / "assets"
if assets_dir.exists() and assets_dir.is_dir():
    app.mount("/assets", StaticFiles(directory=assets_dir), name="frontend-assets")


@app.get("/{full_path:path}", tags=["Frontend SPA"])
def serve_frontend_spa(full_path: str = ""):
    """
    Servicio directo de la aplicación Frontend en '/':
    1. Si se solicita un archivo estático específico en dist (ej. favicon.svg, icons.svg), lo devuelve.
    2. Si el frontend está compilado ('app/frontend/dist/index.html'), sirve el SPA de React en '/'.
    3. Si el build aún no se ha generado, devuelve un JSON informativo con el estado y los endpoints.
    """
    # Si la petición apunta a un archivo estático existente en dist (ej. favicon.svg)
    if full_path:
        static_file = settings.FRONTEND_DIST_DIR / full_path
        if static_file.is_file():
            return FileResponse(static_file)

    # Servir la aplicación React (Single Page Application)
    index_html = settings.FRONTEND_DIST_DIR / "index.html"
    if index_html.exists() and index_html.is_file():
        return FileResponse(index_html)

    # Fallback si no se ha ejecutado 'npm run build' en app/frontend
    return {
        "status": "online",
        "proyecto": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "aviso": "Frontend React pendiente de compilar. Ejecuta 'npm run build' en app/frontend para ver la app aquí.",
        "endpoints_disponibles": {
            "health": f"{settings.API_PREFIX}/health",
            "analiticas": f"{settings.API_PREFIX}/analiticas",
            "analizar_carpeta": f"{settings.API_PREFIX}/analiticas/analizar-carpeta",
            "predict": f"{settings.API_PREFIX}/predict",
            "documentacion": "/docs",
        },
    }
