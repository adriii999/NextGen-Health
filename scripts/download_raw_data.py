"""
Script de Descarga y Sincronización Automática de Fuentes de Datos Crudos (data/raw/).
Fuentes:
1. NutriSynthCare España (danicruzdevtech/datasets-sintticos-de-salud-diabetes-cardio)
2. Kaggle Cardiovascular Disease (sulianova/cardiovascular-disease-dataset)
3. CDC NHANES (cdc/national-health-and-nutrition-examination-survey)
"""
from pathlib import Path
import shutil
import kagglehub

BASE_DIR = Path(__file__).resolve().parent.parent
RAW_DIR = BASE_DIR / "data" / "raw"


def download_all_raw_sources():
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    print("=" * 65)
    print(" DESCARGANDO Y SINCRONIZANDO FUENTES CRUDAS EN data/raw/")
    print("=" * 65)

    # 1. NutriSynthCare (España)
    print("\n[1/3] Descargando NutriSynthCare España...")
    nutri_cache = Path(kagglehub.dataset_download("danicruzdevtech/datasets-sintticos-de-salud-diabetes-cardio"))
    nutri_target = RAW_DIR / "nutrisynthcare"
    nutri_target.mkdir(parents=True, exist_ok=True)
    for f in nutri_cache.iterdir():
        if f.is_file():
            shutil.copy2(f, nutri_target / f.name)
            print(f"  -> Sincronizado: {f.name} ({ (nutri_target/f.name).stat().st_size / 1024:.1f} KB)")

    # 2. Kaggle CVD (70.000 registros)
    print("\n[2/3] Descargando Kaggle Cardiovascular Disease Dataset...")
    cvd_cache = Path(kagglehub.dataset_download("sulianova/cardiovascular-disease-dataset"))
    cvd_file = cvd_cache / "cardio_train.csv"
    if cvd_file.exists():
        shutil.copy2(cvd_file, RAW_DIR / "cardio_train.csv")
        print(f"  -> Sincronizado: cardio_train.csv ({ (RAW_DIR/'cardio_train.csv').stat().st_size / 1024:.1f} KB)")
    else:
        # Buscar recursivamente
        for f in cvd_cache.rglob("*.csv"):
            shutil.copy2(f, RAW_DIR / "cardio_train.csv")
            print(f"  -> Sincronizado: {f.name} a cardio_train.csv ({ (RAW_DIR/'cardio_train.csv').stat().st_size / 1024:.1f} KB)")
            break

    # 3. CDC NHANES (Biomarcadores renales reales)
    print("\n[3/3] Descargando CDC NHANES (Cohorte clínica renal)...")
    nhanes_cache = Path(kagglehub.dataset_download("cdc/national-health-and-nutrition-examination-survey"))
    nhanes_target = RAW_DIR / "nhanes"
    nhanes_target.mkdir(parents=True, exist_ok=True)
    nhanes_files = ["demographic.csv", "examination.csv", "labs.csv", "questionnaire.csv"]
    for fname in nhanes_files:
        src = nhanes_cache / fname
        if src.exists():
            shutil.copy2(src, nhanes_target / fname)
            print(f"  -> Sincronizado: {fname} ({ (nhanes_target/fname).stat().st_size / 1024:.1f} KB)")

    print("\n" + "=" * 65)
    print(" [OK] Todas las fuentes crudas han sido descargadas y sincronizadas.")
    print("=" * 65)


if __name__ == "__main__":
    download_all_raw_sources()
