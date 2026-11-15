from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field


class RiesgoItem(BaseModel):
    valor: float = Field(..., ge=0.0, le=1.0, description="Probabilidad estimada (0.0 a 1.0)")
    umbral: float = Field(..., ge=0.0, le=1.0, description="Umbral clínico de alerta")
    alerta: bool = Field(..., description="True si supera el umbral de alerta")
    interpretacion: str = Field(..., description="Explicación clínica concisa")


class TiposRiesgo(BaseModel):
    riesgo_aterosclerotico: RiesgoItem = Field(..., description="Riesgo coronario e isquémico (aterosclerosis, placa, infarto, ictus)")
    riesgo_insuficiencia_cardiaca: RiesgoItem = Field(..., description="Riesgo de sobrecarga hemodinámica e insuficiencia cardíaca")
    riesgo_cardiorrenal: RiesgoItem = Field(..., description="Riesgo de deterioro de función renal (filtrado glomerular / nefropatía)")
    riesgo_microvascular: RiesgoItem = Field(..., description="Riesgo de daño microvascular y endotelial (albuminuria y rigidez arterial)")
    riesgo_cardiometabolico: RiesgoItem = Field(..., description="Riesgo de descompensación cardiometabólica (obesidad, dislipidemia y diabetes)")


class FactorClave(BaseModel):
    variable: str = Field(..., description="Nombre técnico de la variable")
    valor_actual: str = Field(..., description="Valor formateado con unidades clínicas")
    impacto: str = Field(..., description="Impacto porcentual estimado (+X% / -X%)")
    descripcion: str = Field(..., description="Justificación médica del impacto")
    fuente: str = Field("Laboratorio", description="Origen o categoría clínica del dato")


class PerfilRenalKDIGO(BaseModel):
    estadio_gfr: str = Field(..., description="Estadio GFR según KDIGO: G1, G2, G3a, G3b, G4, G5")
    estadio_uacr: str = Field(..., description="Estadio Albuminuria según KDIGO: A1, A2, A3")
    cuadrante_kdigo: str = Field(..., description="Cuadrante de riesgo KDIGO: BAJO, MODERADO, ALTO o MUY_ALTO")
    progresor_rapido: bool = Field(False, description="True si la pérdida de eGFR es >= 5 mL/min/año")
    descripcion_clinica: str = Field(..., description="Interpretación clínica del estado cardiorrenal")


class EvaluationResponse(BaseModel):
    hay_riesgo: bool = Field(..., description="False si ningún umbral se supera (perfil bajo control)")
    conclusion_diagnostica: str = Field(..., description="Veredicto diagnóstico integral")
    nivel_prioridad: str = Field(..., description="Nivel de prioridad: BAJA, MEDIA o ALTA")
    motivos_prioridad: List[str] = Field(default_factory=list, description="Criterios usados para la prioridad")
    tipos_riesgo: TiposRiesgo = Field(..., description="Desglose multidimensional de los 3 fenotipos")
    factores_clave: List[FactorClave] = Field(default_factory=list, description="Factores explicativos SHAP")
    recomendacion_preventiva: str = Field(..., description="Acción médica preventiva sugerida")
    perfil_renal: Optional[PerfilRenalKDIGO] = Field(None, description="Estratificación renal detallada KDIGO 2024")


class VisitaAnaliticaItem(BaseModel):
    archivo: str = Field(..., description="Ruta relativa del archivo dentro de data/analiticas")
    nombre_archivo: str = Field(..., description="Nombre del archivo de la visita")
    fecha_analitica: Optional[str] = Field(None, description="Fecha clínica de la analítica")
    tamano_bytes: int
    fecha_modificacion: str
    datos_resumen: Dict[str, Any] = Field(default_factory=dict)


class AnaliticaItem(BaseModel):
    archivo: str
    nombre: Optional[str] = None
    es_carpeta: bool = False
    num_analiticas: int = 1
    tamano_bytes: int
    fecha_modificacion: str
    tiene_progresion: bool
    datos_resumen: Dict[str, Any] = Field(default_factory=dict)
    analiticas: List[VisitaAnaliticaItem] = Field(default_factory=list)


class EvaluarAnaliticaRequest(BaseModel):
    paciente_id: str = Field(..., description="Carpeta de paciente o archivo en data/analiticas")
    modo: str = Field("B", description="'B' para seguimiento longitudinal completo, 'A' para analítica aislada")
    analitica_archivo: Optional[str] = Field(None, description="Archivo específico dentro de la carpeta para Modo A")
    analiticas_archivos: Optional[List[str]] = Field(
        None, min_length=1, max_length=50, description="Visitas seleccionadas de este paciente"
    )


class AnaliticaEvaluadaItem(BaseModel):
    archivo: str
    evaluacion: EvaluationResponse
    datos_entrada: Dict[str, Any]


class AnaliticaLoteItem(BaseModel):
    archivo: str
    estado: Literal["EVALUADA", "DATOS_INSUFICIENTES", "DATOS_NO_VALIDOS"]
    campos_pendientes: List[str] = Field(default_factory=list)
    errores_datos: List[str] = Field(default_factory=list)
    evaluacion: Optional[EvaluationResponse] = None
    datos_entrada: Dict[str, Any] = Field(default_factory=dict)
