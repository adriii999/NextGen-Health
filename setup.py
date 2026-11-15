#!/usr/bin/env python3
"""
Acceso directo en la raíz para ejecutar la configuración integral:
python setup.py
"""
import sys
from pathlib import Path

# Ejecutar el script principal de setup localizado en scripts/setup.py
SETUP_SCRIPT = Path(__file__).resolve().parent / "scripts" / "setup.py"

if __name__ == "__main__":
    if not SETUP_SCRIPT.exists():
        sys.stderr.write(f"Error: No se encontró '{SETUP_SCRIPT}'.\n")
        sys.exit(1)
    
    # Importar y ejecutar main() de scripts/setup.py
    sys.path.insert(0, str(SETUP_SCRIPT.parent))
    from setup import main
    main()
