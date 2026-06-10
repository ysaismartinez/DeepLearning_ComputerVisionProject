"""Training and inference models for PetVision.

External data attribution:
- Oxford-IIIT Pet Dataset: https://www.robots.ox.ac.uk/~vgg/data/pets/
- iNaturalist: https://www.inaturalist.org/
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score
from sklearn.pipeline import Pipeline

from scripts.build_features import HOGFeatureBuilder
from scripts.config import CLASS_NAMES, CONFIDENCE_REVIEW_THRESHOLD, MODEL_DIR
from scripts.utils import load_image, save_json


class MetricsReporter:
    """Computes common classification metrics."""

    @staticmethod
    def evaluate(y_true: np.ndarray, y_pred: np.ndarray) -> dict[str, Any]:
        return {
            "accuracy": float(accuracy_score(y_true, y_pred)),
            "macro_f1": float(f1_score(y_true, y_pred, average="macro")),
            "classification_report": classification_report(
                y_true, y_pred, target_names=CLASS_NAMES, output_dict=True, zero_division=0
            ),
            "confusion_matrix": confusion_matrix(y_true, y_pred).tolist(),
        }


class MajorityBaselineModel:
    """Naive baseline that always predicts the majority class."""

    def __init__(self) -> None:
        self.model = DummyClassifier(strategy="most_frequent")

    def train(self, y_train: np.ndarray) -> None:
        dummy_x = np.zeros((len(y_train), 1))
        self.model.fit(dummy_x, y_train)

    def predict(self, n_samples: int) -> np.ndarray:
        return self.model.predict(np.zeros((n_samples, 1)))

    def save(self, path: Path = MODEL_DIR / "majority_baseline.joblib") -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(self.model, path)


class HOGRandomForestModel:
    """Classical ML model: HOG features + Random Forest."""

    def __init__(self, n_estimators: int = 500, min_samples_split: int = 5) -> None:
        self.model = RandomForestClassifier(
            n_estimators=n_estimators,
            min_samples_split=min_samples_split,
            class_weight="balanced",
            random_state=42,
            n_jobs=-1,
        )

    def train(self, x_train: np.ndarray, y_train: np.ndarray) -> None:
        self.model.fit(x_train, y_train)

    def predict(self, x: np.ndarray) -> np.ndarray:
        return self.model.predict(x)

    def predict_proba(self, x: np.ndarray) -> np.ndarray:
        return self.model.predict_proba(x)

    def save(self, path: Path = MODEL_DIR / "hog_random_forest.joblib") -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(self.model, path)


class PetVisionPredictor:
    """Backend inference wrapper for deployed PetVision predictions."""

    def __init__(self, model_path: Path = MODEL_DIR / "hog_random_forest.joblib") -> None:
        self.model_path = model_path
        self.model = joblib.load(model_path) if model_path.exists() else None
        pipeline_path = MODEL_DIR / "hog_feature_pipeline.joblib"
        self.feature_pipeline = joblib.load(pipeline_path) if pipeline_path.exists() else None

    def predict_image(self, image_path: str | Path) -> dict[str, Any]:
        if self.model is None or self.feature_pipeline is None:
            raise FileNotFoundError("Trained model artifacts not found. Run scripts/train.py first.")
        builder = HOGFeatureBuilder()
        builder.label_encoder = self.feature_pipeline["encoder"]
        builder.scaler = self.feature_pipeline["scaler"]
        builder.pca = self.feature_pipeline["pca"]
        raw = builder.image_to_hog(image_path).reshape(1, -1)
        raw = builder.scaler.transform(raw)
        features = builder.pca.transform(raw)
        probabilities = self.model.predict_proba(features)[0]
        idx = int(np.argmax(probabilities))
        confidence = float(probabilities[idx])
        return {
            "prediction": CLASS_NAMES[idx],
            "confidence": confidence,
            "requires_human_review": confidence < CONFIDENCE_REVIEW_THRESHOLD,
            "probabilities": {name: float(probabilities[i]) for i, name in enumerate(CLASS_NAMES)},
        }


def save_metrics(metrics: dict[str, Any], filename: str) -> None:
    save_json(metrics, Path("data/outputs") / filename)
