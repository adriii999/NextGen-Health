from fastapi import Request
from app.backend.services.model_service import ModelService
from app.backend.services.file_service import FileService


def get_model_service(request: Request) -> ModelService:
    """Recupera la instancia singleton de ModelService inicializada en el lifespan."""
    return getattr(request.app.state, "model_service", ModelService())


def get_file_service() -> FileService:
    """Provee una instancia de FileService."""
    return FileService()
