import pandas as pd
import pytest

from model.scripts.train_models import (
    FEATURE_COLUMNS,
    TARGET_COLUMNS,
    validate_dataset,
)


def make_valid_dataset(rows=12):
    data = {
        column: [float(index + 1) for index in range(rows)]
        for column in FEATURE_COLUMNS
    }
    data.update(
        {
            target: [index % 2 for index in range(rows)]
            for target in TARGET_COLUMNS.values()
        }
    )
    return pd.DataFrame(data)


def test_dataset_validation_accepts_three_binary_targets_and_missing_deltas():
    dataset = make_valid_dataset()
    dataset.loc[0, ["delta_egfr", "delta_uacr"]] = float("nan")

    validated = validate_dataset(dataset)

    assert list(validated.columns) == [*FEATURE_COLUMNS, *TARGET_COLUMNS.values()]
    assert validated.loc[0, "delta_egfr"] != validated.loc[0, "delta_egfr"]


def test_dataset_validation_rejects_missing_required_columns():
    dataset = make_valid_dataset().drop(columns=["target_cardiorrenal"])

    with pytest.raises(ValueError, match="target_cardiorrenal"):
        validate_dataset(dataset)


def test_dataset_validation_rejects_non_binary_targets():
    dataset = make_valid_dataset()
    dataset.loc[0, "target_aterosclerotico"] = 2

    with pytest.raises(ValueError, match="0 y 1"):
        validate_dataset(dataset)


def test_dataset_validation_rejects_single_class_target():
    dataset = make_valid_dataset()
    dataset["target_cardiorrenal"] = 0

    with pytest.raises(ValueError, match="ambas clases"):
        validate_dataset(dataset)


def test_dataset_validation_rejects_placeholder_csv():
    with pytest.raises(ValueError, match="no contiene una tabla"):
        validate_dataset(pd.DataFrame({"Será reemplazado por le dataset final": []}))
