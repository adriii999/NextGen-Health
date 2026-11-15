# Script PowerShell de preparación integral de NextGen-Health
$ErrorActionPreference = "Stop"

Write-Host "Iniciando instalación y configuración de NextGen-Health..." -ForegroundColor Cyan

# Comprobar si Python está instalado en el sistema
$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonCmd) {
    Write-Host ""
    Write-Host "[ERROR FATAL] Python no está instalado o no se encuentra en el PATH." -ForegroundColor Red
    Write-Host "NextGen-Health requiere Python 3.10 o superior."
    Write-Host "Por favor, instálalo desde: https://www.python.org/downloads/"
    Write-Host "El script NO descargará Python automáticamente."
    Write-Host ""
    Exit 1
}

# Ejecutar el script central de configuración
python scripts/setup.py @args
