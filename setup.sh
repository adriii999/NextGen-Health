#!/usr/bin/env bash
# Script Bash de preparación integral de NextGen-Health
set -e

echo -e "\033[96mIniciando instalación y configuración de NextGen-Health...\033[0m"

# Comprobar si Python está instalado en el sistema
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo -e "\n\033[91m[ERROR FATAL]\033[0m Python no está instalado o no se encuentra en el PATH."
    echo "NextGen-Health requiere Python 3.10 o superior."
    echo "Por favor, instálalo desde: https://www.python.org/downloads/"
    echo "El script NO descargará Python automáticamente."
    exit 1
fi

PYTHON_BIN=$(command -v python3 || command -v python)
$PYTHON_BIN scripts/setup.py "$@"
