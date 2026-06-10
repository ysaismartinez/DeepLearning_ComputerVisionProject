"""Train all three required PetVision modeling approaches.

External data attribution:
- Oxford-IIIT Pet Dataset: https://www.robots.ox.ac.uk/~vgg/data/pets/
- iNaturalist: https://www.inaturalist.org/
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from scripts.build_features import HOGFeatureBuilder
from scripts.config import MODEL_DIR, OUTPUT_DIR, PROCESSED_DIR
from scripts.model import HOGRandomForestModel, MajorityBaselineModel, MetricsReporter, save_metrics
from scripts.train_deep import train_mobilenetv2
from scripts.utils import set_seed


def train_baseline(y_train: np.ndarray, y_test: np.ndarray) -> dict:
    baseline = MajorityBaselineModel()
    baseline.train(y_train)
    baseline.save()
    predictions = baseline.predict(len(y_test))
    return MetricsReporter.evaluate(y_test, predictions)


def train_classical(train_df: pd.DataFrame, test_df: pd.DataFrame) -> dict:
    builder = HOGFeatureBuilder(n_components=512)
    x_train, y_train = builder.transform_manifest(train_df, fit=True)
    x_test, y_test = builder.transform_manifest(test_df, fit=False)
    builder.save()
    model = HOGRandomForestModel()
    model.train(x_train, y_train)
    model.save()
    predictions = model.predict(x_test)
    return MetricsReporter.evaluate(y_test, predictions)


def main(train_deep: bool = False) -> None:
    set_seed()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    train_df = pd.read_csv(PROCESSED_DIR / "train.csv")
    test_df = pd.read_csv(PROCESSED_DIR / "test.csv")

    label_map = {"Dog": 0, "Cat": 1, "Other": 2}
    y_train = train_df["label"].map(label_map).to_numpy()
    y_test = test_df["label"].map(label_map).to_numpy()

    baseline_metrics = train_baseline(y_train, y_test)
    save_metrics(baseline_metrics, "baseline_metrics.json")

    rf_metrics = train_classical(train_df, test_df)
    save_metrics(rf_metrics, "hog_random_forest_metrics.json")

    if train_deep:
        deep_metrics = train_mobilenetv2()
        save_metrics(deep_metrics, "mobilenetv2_metrics.json")

    print("Training complete. Metrics saved to data/outputs/.")


if __name__ == "__main__":
    main(train_deep=False)
