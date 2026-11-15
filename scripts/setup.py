#!/usr/bin/env python3
"""
Script de Instalación, Configuración de Entornos y Precompilación Completa
para NextGen-Health.

Comprueba prerrequisitos del sistema (Python 3.10+, Node.js y npm).
Si faltan Python o Node.js, se detiene con un error fatal indicando
dónde descargarlos (nunca descarga binarios del sistema operativo automáticamente).
Crea el entorno virtual de Python (.venv), instala librerías de backend y ML,
descarga las dependencias de Node (Vite, React, etc.) si faltan, precompila el
frontend en app/frontend/dist/ y asegura la presencia del modelo de Machine Learning.
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path

# Directorio raíz del proyecto
ROOT_DIR = Path(__file__).resolve().parents[1]
FRONTEND_DIR = ROOT_DIR / "app" / "frontend"
MODEL_DIR = ROOT_DIR / "model"
VENV_DIR = ROOT_DIR / ".venv"
REQUIREMENTS_FILE = ROOT_DIR / "requirements.txt"
MODEL_ARTIFACT = ROOT_DIR / "model" / "out" / "model_artifact.joblib"
DATASET_PROCESSED = ROOT_DIR / "data" / "processed" / "dataset.csv"

# Colores ANSI para terminal
CYAN = "\033[96m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
BOLD = "\033[1m"
RESET = "\033[0m"


def print_step(step: int, total: int, title: str) -> None:
    print(f"\n{BOLD}{CYAN}[{step}/{total}] {title}{RESET}")


def print_ok(msg: str) -> None:
    print(f" {GREEN}✔{RESET} {msg}")


def print_warn(msg: str) -> None:
    print(f" {YELLOW}⚠{RESET} {msg}")


def print_fatal(msg: str) -> None:
    print(f"\n{BOLD}{RED}[ERROR FATAL]{RESET} {msg}\n")
    sys.exit(1)


def check_prerequisites() -> tuple[Path, str, str]:
    """
    Verifica que Python 3.10+ y Node.js con npm estén instalados.
    Si falta alguno, arroja un error fatal y detiene el script.
    """
    print_step(1, 5, "Verificando prerrequisitos del sistema (Python y Node.js)...")

    # 1. Verificar versión de Python
    py_version = sys.version_info
    if py_version < (3, 10):
        print_fatal(
            f"Se requiere Python 3.10 o superior.\n"
            f"Versión detectada: {sys.version.split()[0]}\n\n"
            f"Por favor, instala una versión soportada de Python desde:\n"
            f"  https://www.python.org/downloads/\n"
            f"El instalador de NextGen-Health NO descargará Python automáticamente."
        )
    print_ok(f"Python detectado: {sys.version.split()[0]} (compatible)")

    # 2. Verificar Node.js
    node_bin = shutil.which("node")
    if not node_bin:
        print_fatal(
            "Node.js no está instalado o no se encuentra en el PATH del sistema.\n\n"
            "NextGen-Health requiere Node.js (v18 o superior) para compilar el frontend con Vite.\n"
            "Por favor, descarga e instala Node.js desde:\n"
            "  https://nodejs.org/\n"
            "El instalador de NextGen-Health NO descargará Node.js automáticamente."
        )

    try:
        node_ver = subprocess.check_output([node_bin, "--version"], text=True).strip()
        print_ok(f"Node.js detectado: {node_ver} ({node_bin})")
    except Exception as e:
        print_fatal(f"Error comprobando la versión de Node.js: {e}")

    # 3. Verificar npm
    npm_bin = shutil.which("npm") or shutil.which("npm.cmd")
    if not npm_bin:
        print_fatal(
            "npm no está disponible en el PATH del sistema.\n\n"
            "Asegúrate de que la instalación de Node.js incluye npm y está en el PATH.\n"
            "Descarga e instala Node.js completo desde: https://nodejs.org/"
        )

    try:
        # En Windows ejecutar con shell=True para invocar npm.cmd correctamente
        use_shell = sys.platform == "win32"
        npm_ver = subprocess.check_output(
            f'"{npm_bin}" --version' if use_shell else [npm_bin, "--version"],
            shell=use_shell,
            text=True,
        ).strip()
        print_ok(f"npm detectado: v{npm_ver}")
    except Exception as e:
        print_fatal(f"Error comprobando la versión de npm: {e}")

    return Path(node_bin), node_ver, npm_bin


def setup_python_venv() -> tuple[Path, Path]:
    """
    Crea el entorno virtual .venv si no existe y devuelve las rutas de python y pip.
    """
    print_step(2, 5, "Configurando el entorno virtual de Python (.venv)...")

    if not VENV_DIR.exists():
        print(f" Creando nuevo entorno virtual en: {VENV_DIR}")
        subprocess.run([sys.executable, "-m", "venv", str(VENV_DIR)], check=True)
        print_ok("Entorno virtual .venv creado con éxito.")
    else:
        print_ok(f"Entorno virtual existente encontrado en: {VENV_DIR}")

    if sys.platform == "win32":
        venv_python = VENV_DIR / "Scripts" / "python.exe"
        venv_pip = VENV_DIR / "Scripts" / "pip.exe"
    else:
        venv_python = VENV_DIR / "bin" / "python"
        venv_pip = VENV_DIR / "bin" / "pip"

    if not venv_python.exists():
        print_fatal(
            f"No se encontró el ejecutable de Python en el entorno virtual: {venv_python}"
        )

    # Actualizar pip e instalar dependencias
    print(" Instalando y verificando dependencias de Python desde requirements.txt...")
    req_file = REQUIREMENTS_FILE if REQUIREMENTS_FILE.exists() else (MODEL_DIR / "requirements.txt")
    
    cmd_install = [str(venv_python), "-m", "pip", "install", "-q", "-r", str(req_file)]
    res = subprocess.run(cmd_install)
    if res.returncode != 0:
        print_fatal("Error instalando dependencias de Python. Revisa la conexión o requirements.txt.")

    print_ok("Dependencias de Python instaladas y actualizadas.")
    return venv_python, venv_pip


def setup_node_and_vite(npm_bin: str, force_install: bool = False) -> None:
    """
    Verifica node_modules en app/frontend/. Si no existe o se fuerza, ejecuta npm install
    para descargar Vite, React, Tailwind CSS y demás dependencias.
    """
    print_step(3, 5, "Comprobando dependencias de Node.js y Vite en app/frontend/...")

    node_modules_dir = FRONTEND_DIR / "node_modules"
    use_shell = sys.platform == "win32"

    if not node_modules_dir.exists() or force_install:
        print(" Descargando e instalando dependencias de Node.js (Vite, React, Tailwind)...")
        res = subprocess.run(
            f'"{npm_bin}" install' if use_shell else [npm_bin, "install"],
            cwd=str(FRONTEND_DIR),
            shell=use_shell,
        )
        if res.returncode != 0:
            print_fatal("Error ejecutando 'npm install' en app/frontend/.")
        print_ok("Dependencias de Node.js y Vite descargadas e instaladas con éxito.")
    else:
        print_ok("node_modules ya existe en app/frontend/ (Vite y dependencias presentes).")


def build_frontend(npm_bin: str) -> None:
    """
    Precompila los assets del frontend ejecutando 'npm run build' con Vite.
    Genera app/frontend/dist/ para que FastAPI pueda servir la interfaz estática.
    """
    print_step(4, 5, "Precompilando el frontend de producción con Vite ('npm run build')...")

    use_shell = sys.platform == "win32"
    res = subprocess.run(
        f'"{npm_bin}" run build' if use_shell else [npm_bin, "run", "build"],
        cwd=str(FRONTEND_DIR),
        shell=use_shell,
    )
    if res.returncode != 0:
        print_fatal("Error al compilar el frontend con Vite ('npm run build').")

    dist_index = FRONTEND_DIR / "dist" / "index.html"
    dist_assets = FRONTEND_DIR / "dist" / "assets"
    if not (dist_index.exists() and dist_assets.exists()):
        print_fatal("El directorio 'app/frontend/dist/' no se generó correctamente.")

    print_ok("Frontend precompilado con éxito en 'app/frontend/dist/'.")


def verify_or_train_ml_model(venv_python: Path) -> None:
    """
    Verifica que el modelo de Machine Learning (XGBoost + TreeSHAP) esté entrenado
    en model/out/model_artifact.joblib. Si no existe, genera los datos y entrena el modelo.
    """
    print_step(5, 5, "Verificando artefacto de Machine Learning (XGBoost + SHAP)...")

    if MODEL_ARTIFACT.exists():
        print_ok(f"Modelo ya entrenado y listo en: {MODEL_ARTIFACT.relative_to(ROOT_DIR)}")
        return

    print_warn(
        "No se encontró el artefacto del modelo en 'model/out/model_artifact.joblib'.\n"
        "   Procediendo al entrenamiento automático del modelo..."
    )

    # 1. Preparar datos si dataset.csv no existe
    if not DATASET_PROCESSED.exists():
        print(" Generando dataset armonizado con biomarcadores renales y progresión...")
        prep_script = ROOT_DIR / "model" / "scripts" / "prepare_data.py"
        res_prep = subprocess.run([str(venv_python), str(prep_script)])
        if res_prep.returncode != 0:
            print_fatal("Error en la preparación de datos del modelo.")

    # 2. Entrenar y calibrar modelos XGBoost
    print(" Entrenando y calibrando clasificadores XGBoost con TreeSHAP...")
    train_script = ROOT_DIR / "model" / "scripts" / "train_models.py"
    res_train = subprocess.run([str(venv_python), str(train_script)])
    if res_train.returncode != 0:
        print_fatal("Error en el entrenamiento del modelo.")

    if not MODEL_ARTIFACT.exists():
        print_fatal("El entrenamiento finalizó pero no se generó 'model/out/model_artifact.joblib'.")

    print_ok("Modelo entrenado, calibrado y exportado exitosamente.")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Script de preparación integral y precompilación para NextGen-Health."
    )
    parser.add_argument(
        "--force-npm",
        action="store_true",
        help="Fuerza la reinstalación de node_modules aunque ya exista.",
    )
    args = parser.parse_args()

    print("=" * 70)
    print(f"{BOLD}{GREEN}   NEXTGEN-HEALTH | Configuración Automatizada del Entorno{RESET}")
    print("=" * 70)

    # Paso 1: Prerrequisitos de sistema (error fatal si falta Python o Node)
    _, _, npm_bin = check_prerequisites()

    # Paso 2: Entorno virtual de Python y dependencias de backend/ML
    venv_python, _ = setup_python_venv()

    # Paso 3: Dependencias de Node.js (Vite, React, Tailwind)
    setup_node_and_vite(npm_bin, force_install=args.force_npm)

    # Paso 4: Precompilación de producción con Vite
    build_frontend(npm_bin)

    # Paso 5: Verificación o entrenamiento de Machine Learning
    verify_or_train_ml_model(venv_python)

    # Resumen final de éxito e instrucciones de arranque
    print("\n" + "=" * 70)
    print(f"{BOLD}{GREEN} ✔ ¡INSTALACIÓN Y PRECOMPILACIÓN COMPLETADAS CON ÉXITO!{RESET}")
    print("=" * 70)
    print("\nPara iniciar el servidor de NextGen-Health:")
    if sys.platform == "win32":
        print(f"   {CYAN}powershell:{RESET}  .\\scripts\\run_backend.ps1")
        print(f"   {CYAN}o python:{RESET}    .\\.venv\\Scripts\\python scripts\\run_backend.py")
    else:
        print(f"   {CYAN}bash:{RESET}        source .venv/bin/activate && python scripts/run_backend.py")
        print(f"   {CYAN}o python:{RESET}    ./.venv/bin/python scripts/run_backend.py")

    print(f"\nLuego abre tu navegador en: {BOLD}http://localhost:8000/{RESET}")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    main()
