from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
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
    
    # Montar assets estáticos del frontend si ya se ha compilado (npm run build)
    assets_dir = settings.FRONTEND_DIST_DIR / "assets"
    if assets_dir.exists() and assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="frontend-assets")
        print(f"[OK] Assets estáticos de React montados desde {assets_dir}")

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

# Montaje de routers con prefijo /api
app.include_router(health.router, prefix=settings.API_PREFIX)
app.include_router(predict.router, prefix=settings.API_PREFIX)
app.include_router(analiticas.router, prefix=settings.API_PREFIX)


@app.get("/", tags=["Frontend & Root"])
def root():
    """
    Ruta raíz '/':
    1. Si el frontend React ya ha sido compilado ('npm run build' -> app/frontend/dist),
       sirve directamente el archivo index.html para visualización inmediata de la app.
    2. Si el frontend está en desarrollo, devuelve la guía explícita de conexión para
       que el agente o desarrollador de Frontend conecte React a esta API.
    """
    index_html = settings.FRONTEND_DIST_DIR / "index.html"
    if index_html.exists() and index_html.is_file():
        return FileResponse(index_html)

    return {
        "status": "online",
        "proyecto": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "frontend_connection_guide": {
            "mensaje": "Guía de conexión para el agente o desarrollador de Frontend (React)",
            "modo_desarrollo": {
                "frontend_dev_server": "http://localhost:5173",
                "backend_api_url": f"http://localhost:{settings.PORT}{settings.API_PREFIX}",
                "recomendacion_vite": "Configurar proxy en vite.config.js para redirigir '/api' a 'http://localhost:8000'",
                "cors_habilitado": True,
            },
            "modo_produccion_entrega": {
                "instruccion": "Ejecutar 'npm run build' en app/frontend. Al crearse 'app/frontend/dist/index.html', el backend servirá automáticamente la web en '/'",
                "ruta_dist_esperada": str(settings.FRONTEND_DIST_DIR),
            },
            "endpoints_principales": {
                "health": f"{settings.API_PREFIX}/health",
                "analiticas_listado": f"{settings.API_PREFIX}/analiticas",
                "analizar_carpeta_1clic": f"{settings.API_PREFIX}/analiticas/analizar-carpeta",
                "predict_simulador": f"{settings.API_PREFIX}/predict",
                "documentacion_swagger": "/docs",
            },
        },
    }
