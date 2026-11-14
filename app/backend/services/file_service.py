import os
import json
import csv
from pathlib import Path
from datetime import datetime
from typing import List, Tuple, Dict, Any, Optional

from app.backend.schemas.clinical import LabInput, ProgressionDelta
from app.backend.schemas.response import AnaliticaItem
from app.backend.config import settings


class FileService:
    def __init__(self, base_dir: Optional[Path] = None):
        self.base_dir = Path(base_dir or settings.ANALITICAS_DIR)

    def scan_folder(self) -> List[AnaliticaItem]:
        """Escanea la carpeta de analíticas y devuelve una lista de metadatos de archivos."""
        if not self.base_dir.exists() or not self.base_dir.is_dir():
            return []

        items: List[AnaliticaItem] = []
        valid_extensions = {".json", ".csv"}

        for entry in sorted(self.base_dir.iterdir()):
            if entry.is_file() and entry.suffix.lower() in valid_extensions:
                try:
                    stat = entry.stat()
                    fecha_mod = datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M")
                    
                    # Comprobar si incluye deltas de progresión
                    tiene_progresion, resumen = self._check_progression_and_summary(entry)

                    items.append(
                        AnaliticaItem(
                            archivo=entry.name,
                            tamano_bytes=stat.st_size,
                            fecha_modificacion=fecha_mod,
                            tiene_progresion=tiene_progresion,
                            datos_resumen=resumen,
                        )
                    )
                except Exception as e:
                    # No romper el escaneo si un archivo tiene permisos raros
                    print(f"Aviso: Error leyendo metadatos de {entry.name}: {e}")
                    continue

        return items

    def load_all_analiticas(self) -> List[Tuple[str, LabInput, Dict[str, Any]]]:
        """Carga y parsea todos los archivos de analíticas válidos."""
        if not self.base_dir.exists():
            return []

        analiticas: List[Tuple[str, LabInput, Dict[str, Any]]] = []

        for entry in sorted(self.base_dir.iterdir()):
            if not entry.is_file():
                continue
            ext = entry.suffix.lower()
            if ext == ".json":
                parsed = self._parse_json_file(entry)
                if parsed:
                    analiticas.append(parsed)
            elif ext == ".csv":
                parsed_list = self._parse_csv_file(entry)
                analiticas.extend(parsed_list)

        return analiticas

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

    def _parse_json_file(self, path: Path) -> Optional[Tuple[str, LabInput, Dict[str, Any]]]:
        try:
            raw_data = json.loads(path.read_text(encoding="utf-8"))
            lab_input = self._dict_to_lab_input(raw_data)
            return path.name, lab_input, raw_data
        except Exception as e:
            print(f"Error parseando JSON {path.name}: {e}")
            return None

    def _parse_csv_file(self, path: Path) -> List[Tuple[str, LabInput, Dict[str, Any]]]:
        results = []
        try:
            with open(path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for idx, row in enumerate(reader):
                    try:
                        lab_input = self._dict_to_lab_input(row)
                        item_name = f"{path.name} (fila {idx+1})" if idx > 0 else path.name
                        results.append((item_name, lab_input, row))
                    except Exception as row_err:
                        print(f"Error en fila {idx} de {path.name}: {row_err}")
        except Exception as e:
            print(f"Error parseando CSV {path.name}: {e}")
        return results

    def _dict_to_lab_input(self, data: Dict[str, Any]) -> LabInput:
        """Convierte un diccionario (plano o anidado) a LabInput."""
        # Extraer deltas si están en la raíz
        prog_data = data.get("progresion")
        if not isinstance(prog_data, dict):
            # Extraer posibles delta_* en la raíz
            delta_keys = ["delta_egfr", "delta_uacr", "delta_ap_hi", "delta_colesterol", "delta_bmi"]
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

        # Construir LabInput
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
