"""Extract HOG features for the classical PetVision model.

External data attribution:
- Oxford-IIIT Pet Dataset: https://www.robots.ox.ac.uk/~vgg/data/pets/
- iNaturalist: https://www.inaturalist.org/
"""
from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from skimage.color import rgb2gray
from skimage.feature import hog
from sklearn.decomposition import PCA
from sklearn.preprocessing import LabelEncoder, StandardScaler
from tqdm import tqdm

from scripts.config import CLASS_NAMES, MODEL_DIR, PROCESSED_DIR
from scripts.utils import load_image


class HOGFeatureBuilder:
    """Converts images into HOG + PCA features for classical ML."""

    def __init__(self, n_components: int = 512) -> None:
        self.n_components = n_components
        self.label_encoder = LabelEncoder().fit(CLASS_NAMES)
        self.scaler = StandardScaler()
        self.pca = PCA(n_components=n_components, random_state=42)

    def image_to_hog(self, image_path: str | Path) -> np.ndarray:
        image = np.asarray(load_image(image_path))
        gray = rgb2gray(image)
        return hog(
            gray,
            orientations=9,
            pixels_per_cell=(8, 8),
            cells_per_block=(2, 2),
            block_norm="L2-Hys",
            feature_vector=True,
        )

    def transform_manifest(self, manifest: pd.DataFrame, fit: bool = False) -> tuple[np.ndarray, np.ndarray]:
        features = np.vstack([self.image_to_hog(p) for p in tqdm(manifest["path"], desc="HOG")])
        labels = self.label_encoder.transform(manifest["label"])
        if fit:
            features = self.scaler.fit_transform(features)
            components = min(self.n_components, features.shape[0], features.shape[1])
            if components != self.n_components:
                self.pca = PCA(n_components=components, random_state=42)
            features = self.pca.fit_transform(features)
        else:
            features = self.scaler.transform(features)
            features = self.pca.transform(features)
        return features, labels

    def save(self, path: Path = MODEL_DIR / "hog_feature_pipeline.joblib") -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(
            {"encoder": self.label_encoder, "scaler": self.scaler, "pca": self.pca}, path
        )


if __name__ == "__main__":
    train = pd.read_csv(PROCESSED_DIR / "train.csv")
    builder = HOGFeatureBuilder()
    x_train, y_train = builder.transform_manifest(train, fit=True)
    np.savez(PROCESSED_DIR / "hog_train.npz", x=x_train, y=y_train)
    builder.save()
