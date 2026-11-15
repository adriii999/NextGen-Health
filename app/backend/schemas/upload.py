from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

from app.backend.schemas.clinical import LabInput, ProgressionDelta
from app.backend.services.file_service import FileService


class UploadedLab(LabInput):
    nombre: str = Field(min_length=1, max_length=200)
    fecha_analitica: date
    paciente_id: str | None = Field(default=None, max_length=200)

    @field_validator("nombre")
    @classmethod
    def nonempty_name(cls, value):
        if not value.strip():
            raise ValueError("Indica el nombre o identificador del paciente")
        return value.strip()

    @field_validator("fecha_analitica", mode="before")
    @classmethod
    def parse_date(cls, value):
        if isinstance(value, str) and len(value) == 7:
            return value + "-01"
        return value


class UploadedVisit(BaseModel):
    archivo: str = Field(min_length=1, max_length=255, pattern=r"(?i)^[^/\\]+\.json$")
    datos: UploadedLab


class PatientUpload(BaseModel):
    visitas: list[UploadedVisit] = Field(min_length=1, max_length=50)
    modo: Literal["A", "B"] = "B"
    analitica_archivo: str | None = None

    @model_validator(mode="after")
    def validate_patient(self):
        identities = {
            (v.datos.nombre.casefold(), v.datos.paciente_id, v.datos.sexo)
            for v in self.visitas
        }
        if len(identities) != 1:
            raise ValueError("Todas las analíticas deben pertenecer al mismo paciente (nombre, identificador y sexo)")
        if len({v.archivo for v in self.visitas}) != len(self.visitas):
            raise ValueError("Hay nombres de archivo duplicados")
        if len({v.datos.fecha_analitica for v in self.visitas}) != len(self.visitas):
            raise ValueError("Hay fechas de analítica duplicadas")
        if self.analitica_archivo and self.analitica_archivo not in {v.archivo for v in self.visitas}:
            raise ValueError("La analítica seleccionada no está en los archivos cargados")
        return self

    def clinical_data(self):
        visits = sorted(self.visitas, key=lambda v: v.datos.fecha_analitica)
        selected = visits[-1]
        if self.modo == "A" and self.analitica_archivo:
            selected = next(v for v in visits if v.archivo == self.analitica_archivo)
        raw = selected.datos.model_dump(mode="json")
        raw["progresion"] = None
        # Las cargas derivan la evolución de las visitas, nunca de deltas aportados.
        if self.modo == "B" and len(visits) >= 2:
            deltas = FileService()._compute_deltas_from_visits(
                [v.datos.model_dump(mode="json") for v in visits]
            )
            raw["progresion"] = ProgressionDelta(**deltas).model_dump()
        raw.update(
            paciente_id=selected.datos.paciente_id or selected.datos.nombre,
            analitica_evaluada=selected.archivo,
            modo_evaluacion="MODO_B" if raw["progresion"] else "MODO_A",
            num_analiticas=len(visits),
            historial_visitas=[
                {**v.datos.model_dump(mode="json"), "archivo": v.archivo, "nombre_archivo": v.archivo}
                for v in visits
            ],
        )
        return raw
