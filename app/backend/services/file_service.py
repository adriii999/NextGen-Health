import json
import csv
from pathlib import Path
from datetime import datetime
from typing import List, Tuple, Dict, Any, Optional

from app.backend.schemas.clinical import LabInput, ProgressionDelta
from app.backend.schemas.response import AnaliticaItem, VisitaAnaliticaItem
from app.backend.config import settings


class FileService:
    def __init__(self, base_dir: Optional[Path] = None):
        self.base_dir = Path(base_dir or settings.ANALITICAS_DIR)

    def scan_folder(self) -> List[AnaliticaItem]:
        """
        Escanea data/analiticas/ soportando tanto carpetas de seguimiento por paciente
        (cada subcarpeta agrupa las analíticas cronológicas de un paciente) como
        archivos individuales JSON/CSV en la raíz.
        """
        if not self.base_dir.exists() or not self.base_dir.is_dir():
            return []

        items: List[AnaliticaItem] = []
        valid_extensions = {".json", ".csv"}

        for entry in sorted(self.base_dir.iterdir()):
            if entry.name.startswith("."):
                continue

            if entry.is_dir():
                folder_item = self._scan_patient_directory(entry)
                if folder_item is not None:
                    items.append(folder_item)
            elif entry.is_file() and entry.suffix.lower() in valid_extensions:
                try:
                    stat = entry.stat()
                    fecha_mod = datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M")
                    tiene_progresion, resumen = self._check_progression_and_summary(entry)
                    nombre = resumen.get("nombre") or entry.stem
                    visita = VisitaAnaliticaItem(
                        archivo=entry.name,
                        nombre_archivo=entry.name,
                        fecha_analitica=resumen.get("fecha_analitica"),
                        tamano_bytes=stat.st_size,
                        fecha_modificacion=fecha_mod,
                        datos_resumen=resumen,
                    )
                    items.append(
                        AnaliticaItem(
                            archivo=entry.name,
                            nombre=nombre,
                            es_carpeta=False,
                            num_analiticas=1,
                            tamano_bytes=stat.st_size,
                            fecha_modificacion=fecha_mod,
                            tiene_progresion=tiene_progresion,
                            datos_resumen=resumen,
                            analiticas=[visita],
                        )
                    )
                except Exception as e:
                    print(f"Aviso: Error leyendo metadatos de {entry.name}: {e}")
                    continue

        return items

    def _scan_patient_directory(self, folder: Path) -> Optional[AnaliticaItem]:
        """Escanea la carpeta de un paciente y ordena cronológicamente sus analíticas."""
        visit_files = sorted(
            [f for f in folder.iterdir() if f.is_file() and f.suffix.lower() == ".json"]
        )
        if not visit_files:
            return None

        visitas: List[VisitaAnaliticaItem] = []
        raw_visits: List[Dict[str, Any]] = []
        total_bytes = 0
        latest_mtime = 0.0

        for vf in visit_files:
            try:
                stat = vf.stat()
                total_bytes += stat.st_size
                if stat.st_mtime > latest_mtime:
                    latest_mtime = stat.st_mtime
                fecha_mod = datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M")
                data = json.loads(vf.read_text(encoding="utf-8"))
                raw_visits.append(data)
                resumen_v = {
                    "nombre": data.get("nombre"),
                    "fecha_analitica": data.get("fecha_analitica") or vf.stem.split("_")[0],
                    "edad": data.get("edad"),
                    "sexo": data.get("sexo"),
                    "bmi": data.get("bmi"),
                    "ap_hi": data.get("ap_hi"),
                    "ap_lo": data.get("ap_lo"),
                    "colesterol_total": data.get("colesterol_total"),
                    "fuma": data.get("fuma"),
                    "diabetes": data.get("diabetes"),
                    "egfr": data.get("egfr"),
                    "uacr": data.get("uacr"),
                }
                visitas.append(
                    VisitaAnaliticaItem(
                        archivo=f"{folder.name}/{vf.name}",
                        nombre_archivo=vf.name,
                        fecha_analitica=resumen_v["fecha_analitica"],
                        tamano_bytes=stat.st_size,
                        fecha_modificacion=fecha_mod,
                        datos_resumen=resumen_v,
                    )
                )
            except Exception as e:
                print(f"Aviso: Error leyendo analítica {vf}: {e}")

        if not visitas:
            return None

        latest_data = raw_visits[-1]
        has_prog = len(raw_visits) >= 2 or bool(latest_data.get("progresion"))
        deltas = self._compute_deltas_from_visits(raw_visits) if len(raw_visits) >= 2 else latest_data.get("progresion")
        nombre_paciente = latest_data.get("nombre") or folder.name
        fecha_mod_folder = datetime.fromtimestamp(latest_mtime).strftime("%Y-%m-%d %H:%M")

        resumen_carpeta = {
            "nombre": nombre_paciente,
            "edad": latest_data.get("edad"),
            "sexo": latest_data.get("sexo"),
            "egfr": latest_data.get("egfr"),
            "uacr": latest_data.get("uacr"),
            "ap_hi": latest_data.get("ap_hi"),
            "ap_lo": latest_data.get("ap_lo"),
            "colesterol_total": latest_data.get("colesterol_total"),
            "bmi": latest_data.get("bmi"),
            "num_analiticas": len(visitas),
            "progresion": deltas,
        }

        return AnaliticaItem(
            archivo=folder.name,
            nombre=nombre_paciente,
            es_carpeta=True,
            num_analiticas=len(visitas),
            tamano_bytes=total_bytes,
            fecha_modificacion=fecha_mod_folder,
            tiene_progresion=has_prog,
            datos_resumen=resumen_carpeta,
            analiticas=visitas,
        )

    def _compute_deltas_from_visits(self, raw_visits: List[Dict[str, Any]]) -> Dict[str, float]:
        """Calcula los deltas interanuales entre la penúltima (T-1) y la última visita (T)."""
        prev_v = raw_visits[-2]
        curr_v = raw_visits[-1]
        return {
            "delta_egfr": round(float(curr_v["egfr"]) - float(prev_v["egfr"]), 2),
            "delta_uacr": round(float(curr_v["uacr"]) - float(prev_v["uacr"]), 2),
            "delta_ap_hi": round(float(curr_v["ap_hi"]) - float(prev_v["ap_hi"]), 2),
            "delta_colesterol": round(float(curr_v["colesterol_total"]) - float(prev_v["colesterol_total"]), 2),
            "delta_bmi": round(float(curr_v["bmi"]) - float(prev_v["bmi"]), 2),
        }

    def load_all_analiticas(self, modo: str = "B") -> List[Tuple[str, LabInput, Dict[str, Any]]]:
        """
        Carga todas las carpetas de pacientes (y archivos sueltos si existen).
        Si modo == 'B', calcula el seguimiento longitudinal completo cuando hay >=2 visitas.
        Si modo == 'A', evalúa únicamente la última analítica de forma aislada (progresion=None).
        """
        if not self.base_dir.exists():
            return []

        analiticas: List[Tuple[str, LabInput, Dict[str, Any]]] = []

        for entry in sorted(self.base_dir.iterdir()):
            if entry.name.startswith("."):
                continue
            if entry.is_dir():
                parsed = self.load_single_item(entry.name, modo=modo)
                if parsed:
                    analiticas.append(parsed)
            elif entry.is_file():
                ext = entry.suffix.lower()
                if ext == ".json":
                    parsed = self.load_single_item(entry.name, modo=modo)
                    if parsed:
                        analiticas.append(parsed)
                elif ext == ".csv":
                    parsed_list = self._parse_csv_file(entry, modo=modo)
                    analiticas.extend(parsed_list)

        return analiticas

    def load_single_item(
        self,
        paciente_id: str,
        modo: str = "B",
        analitica_archivo: Optional[str] = None,
    ) -> Optional[Tuple[str, LabInput, Dict[str, Any]]]:
        """
        Carga una carpeta de paciente o un archivo individual en el modo indicado:
        - modo='B' (Seguimiento completo): utiliza las visitas cronológicas de la carpeta para calcular
          los deltas de progresión entre T-1 y T.
        - modo='A' (Analítica aislada): carga una única analítica (analitica_archivo o la más reciente)
          con progresion=None (sin deltas históricos).
        """
        modo_norm = (modo or "B").upper()
        target_path = self.base_dir / paciente_id

        if target_path.is_dir():
            visit_files = sorted(
                [f for f in target_path.iterdir() if f.is_file() and f.suffix.lower() == ".json"]
            )
            if not visit_files:
                return None

            raw_visits: List[Dict[str, Any]] = []
            visit_summaries: List[Dict[str, Any]] = []
            for vf in visit_files:
                data = json.loads(vf.read_text(encoding="utf-8"))
                data["_archivo"] = vf.name
                raw_visits.append(data)
                visit_summaries.append(
                    {
                        "archivo": f"{target_path.name}/{vf.name}",
                        "nombre_archivo": vf.name,
                        "fecha_analitica": data.get("fecha_analitica") or vf.stem.split("_")[0],
                        "edad": data.get("edad"),
                        "egfr": data.get("egfr"),
                        "uacr": data.get("uacr"),
                        "ap_hi": data.get("ap_hi"),
                        "ap_lo": data.get("ap_lo"),
                        "colesterol_total": data.get("colesterol_total"),
                        "bmi": data.get("bmi"),
                    }
                )

            if modo_norm == "A":
                selected_data = raw_visits[-1]
                if analitica_archivo:
                    clean_name = Path(analitica_archivo).name
                    for rv in raw_visits:
                        if rv["_archivo"] == clean_name:
                            selected_data = rv
                            break

                raw_out = dict(selected_data)
                raw_out.pop("_archivo", None)
                raw_out["progresion"] = None
                raw_out["paciente_id"] = target_path.name
                raw_out["analitica_evaluada"] = selected_data["_archivo"]
                raw_out["modo_evaluacion"] = "MODO_A"
                raw_out["num_analiticas"] = len(raw_visits)
                raw_out["historial_visitas"] = visit_summaries

                lab_input = self._dict_to_lab_input(raw_out, force_no_progression=True)
                return target_path.name, lab_input, raw_out

            else:
                latest_data = dict(raw_visits[-1])
                latest_file = latest_data.pop("_archivo", visit_files[-1].name)
                if len(raw_visits) >= 2:
                    deltas = self._compute_deltas_from_visits(raw_visits)
                    latest_data["progresion"] = deltas
                    effective_mode = "MODO_B"
                elif latest_data.get("progresion"):
                    effective_mode = "MODO_B"
                else:
                    latest_data["progresion"] = None
                    effective_mode = "MODO_A"

                latest_data["paciente_id"] = target_path.name
                latest_data["analitica_evaluada"] = latest_file
                latest_data["modo_evaluacion"] = effective_mode
                latest_data["num_analiticas"] = len(raw_visits)
                latest_data["historial_visitas"] = visit_summaries

                lab_input = self._dict_to_lab_input(
                    latest_data, force_no_progression=(effective_mode == "MODO_A")
                )
                return target_path.name, lab_input, latest_data

        elif target_path.is_file() and target_path.suffix.lower() == ".json":
            raw_data = json.loads(target_path.read_text(encoding="utf-8"))
            force_no_prog = modo_norm == "A"
            if force_no_prog:
                raw_data["progresion"] = None
                for k in list(raw_data.keys()):
                    if k.startswith("delta_"):
                        raw_data[k] = None
            lab_input = self._dict_to_lab_input(raw_data, force_no_progression=force_no_prog)
            raw_data["paciente_id"] = target_path.name
            raw_data["analitica_evaluada"] = target_path.name
            raw_data["modo_evaluacion"] = "MODO_B" if lab_input.progresion is not None else "MODO_A"
            raw_data["num_analiticas"] = 1
            return target_path.name, lab_input, raw_data

        return None

    def _check_progression_and_summary(self, path: Path) -> Tuple[bool, Dict[str, Any]]:
        """Comprueba de forma rápida si el archivo contiene deltas."""
        ext = path.suffix.lower()
        if ext == ".json":
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
                has_prog = bool(
                    data.get("progresion")
                    or any(k.startswith("delta_") and data.get(k) is not None for k in data)
                )
                resumen = {
                    "nombre": data.get("nombre"),
                    "fecha_analitica": data.get("fecha_analitica"),
                    "edad": data.get("edad"),
                    "sexo": data.get("sexo"),
                    "egfr": data.get("egfr"),
                    "uacr": data.get("uacr"),
                }
                return has_prog, resumen
            except Exception:
                return False, {}
        elif ext == ".csv":
            try:
                with open(path, "r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    row = next(reader, None)
                    if row:
                        has_prog = any(
                            k.startswith("delta_") and row.get(k) not in (None, "", "NaN", "nan")
                            for k in row
                        )
                        resumen = {
                            "edad": row.get("edad"),
                            "sexo": row.get("sexo"),
                            "egfr": row.get("egfr"),
                            "uacr": row.get("uacr"),
                        }
                        return has_prog, resumen
            except Exception:
                return False, {}
        return False, {}

    def _parse_csv_file(
        self, path: Path, modo: str = "B"
    ) -> List[Tuple[str, LabInput, Dict[str, Any]]]:
        results = []
        force_no_prog = (modo or "B").upper() == "A"
        try:
            with open(path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for idx, row in enumerate(reader):
                    try:
                        row_copy = dict(row)
                        if force_no_prog:
                            for k in list(row_copy.keys()):
                                if k.startswith("delta_"):
                                    row_copy[k] = None
                        lab_input = self._dict_to_lab_input(
                            row_copy, force_no_progression=force_no_prog
                        )
                        item_name = f"{path.name} (fila {idx+1})" if idx > 0 else path.name
                        row_copy["modo_evaluacion"] = (
                            "MODO_B" if lab_input.progresion is not None else "MODO_A"
                        )
                        results.append((item_name, lab_input, row_copy))
                    except Exception as row_err:
                        print(f"Error en fila {idx} de {path.name}: {row_err}")
        except Exception as e:
            print(f"Error parseando CSV {path.name}: {e}")
        return results

    def _dict_to_lab_input(
        self, data: Dict[str, Any], force_no_progression: bool = False
    ) -> LabInput:
        """Convierte un diccionario (plano o anidado) a LabInput."""
        if force_no_progression:
            prog = None
        else:
            prog_data = data.get("progresion")
            if not isinstance(prog_data, dict):
                delta_keys = [
                    "delta_egfr",
                    "delta_uacr",
                    "delta_ap_hi",
                    "delta_colesterol",
                    "delta_bmi",
                ]
                found_deltas = {}
                for k in delta_keys:
                    val = data.get(k)
                    if val not in (None, "", "NaN", "nan"):
                        try:
                            found_deltas[k] = float(val)
                        except (ValueError, TypeError):
                            pass
                prog = ProgressionDelta(**found_deltas) if found_deltas else None
            else:
                prog = ProgressionDelta(**prog_data)

        return LabInput(
            edad=float(data["edad"]),
            sexo=int(data["sexo"]),
            bmi=float(data["bmi"]),
            ap_hi=float(data["ap_hi"]),
            ap_lo=float(data["ap_lo"]),
            colesterol_total=float(data["colesterol_total"]),
            fuma=int(data["fuma"]),
            diabetes=int(data["diabetes"]),
            egfr=float(data["egfr"]),
            uacr=float(data["uacr"]),
            progresion=prog,
        )
