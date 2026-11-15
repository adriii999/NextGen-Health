# Script PowerShell para iniciar el backend
$ErrorActionPreference = "Stop"
Write-Host "Iniciando NextGen-Health Backend..." -ForegroundColor Cyan

$venvPython = Join-Path $PSScriptRoot "..\.venv\Scripts\python.exe"
if (Test-Path $venvPython) {
    & $venvPython (Join-Path $PSScriptRoot "run_backend.py")
} else {
    python (Join-Path $PSScriptRoot "run_backend.py")
}
