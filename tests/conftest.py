import socket
import threading
import time
import pytest
import uvicorn
import httpx
from app.backend.main import app
from app.backend.config import settings


def get_free_port() -> int:
    """Encuentra un puerto libre en localhost para instanciar el servidor de pruebas."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


@pytest.fixture(scope="session")
def live_server_url():
    """
    Instancia un servidor real Uvicorn en un hilo en background escuchando en un puerto real.
    Cada proceso de pytest-xdist tendrá su propio servidor instanciado de forma paralela.
    """
    # Asegurar que app.state.model_service esté inicializado en el proceso de tests
    from app.backend.services.model_service import ModelService
    if not hasattr(app.state, "model_service") or app.state.model_service is None:
        ms = ModelService()
        if settings.MODEL_PATH.exists():
            ms.load_artifacts(str(settings.MODEL_PATH))
        app.state.model_service = ms

    port = get_free_port()
    config = uvicorn.Config(app, host="127.0.0.1", port=port, log_level="warning")
    server = uvicorn.Server(config)

    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()

    base_url = f"http://127.0.0.1:{port}"

    # Esperar activamente a que el servidor esté listo
    connected = False
    for _ in range(50):
        try:
            with httpx.Client(base_url=base_url) as client:
                res = client.get("/api/health", timeout=1.0)
                if res.status_code == 200:
                    connected = True
                    break
        except Exception:
            time.sleep(0.05)

    if not connected:
        raise RuntimeError(f"No se pudo conectar al servidor instanciado en {base_url}")

    yield base_url

    # Finalizar servidor al terminar la sesión de pruebas
    server.should_exit = True
    thread.join(timeout=1.0)


@pytest.fixture
def http_client(live_server_url):
    """Cliente HTTP real que se comunica por sockets con el servidor instanciado."""
    with httpx.Client(base_url=live_server_url, timeout=10.0) as client:
        yield client


@pytest.fixture(autouse=True)
def ensure_app_state_model_service():
    """Garantiza que app.state.model_service esté inicializado y cargado en cada worker de prueba."""
    from app.backend.services.model_service import ModelService
    if not hasattr(app.state, "model_service") or app.state.model_service is None or not app.state.model_service.is_model_loaded():
        ms = getattr(app.state, "model_service", None)
        if ms is None:
            ms = ModelService()
            app.state.model_service = ms
        if settings.MODEL_PATH.exists() and not ms.is_model_loaded():
            ms.load_artifacts(str(settings.MODEL_PATH))

