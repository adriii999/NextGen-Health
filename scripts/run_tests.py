"""Script para ejecutar la suite completa de pruebas unitarias y de integración en paralelo."""
import sys
import pytest
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))


def main():
    print("=" * 65)
    print("   NEXTGEN-HEALTH | Ejecutando Suite de Pruebas en Paralelo")
    print("=" * 65)

    # -n auto: ejecuta en paralelo sobre los núcleos disponibles
    # -rs: muestra el resumen de tests SKIPPED (ej. estado de integración del modelo)
    # Sin bandera -x para asegurar que el suite completo corra aunque falle algún test
    args = ["-n", "auto", "-v", "-rs", "--tb=short", str(BASE_DIR / "tests")]
    exit_code = pytest.main(args)

    if exit_code == 0:
        print("\n[OK] Suite de pruebas completada exitosamente.")
    else:
        print(f"\n[FAIL] Se detectaron fallos en las pruebas (código: {exit_code}).")

    sys.exit(exit_code)


if __name__ == "__main__":
    main()
