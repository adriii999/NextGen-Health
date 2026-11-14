# Script PowerShell para iniciar el backend
$ErrorActionPreference = "Stop"
Write-Host "Iniciando NextGen-Health Backend..." -ForegroundColor Cyan
python scripts/run_backend.py
