"""Create PetVision metadata splits.

Expected raw folder layout:
    data/raw/Dog/*.jpg
    data/raw/Cat/*.jpg
    data/raw/Other/*.jpg

External data attribution:
- Oxford-IIIT Pet Dataset: https://www.robots.ox.ac.uk/~vgg/data/pets/
- iNaturalist: https://www.inaturalist.org/
"""
from __future__ import annotations

from pathlib import Path

import pandas as pd
from sklearn.model_selection import train_test_split

from scripts.config import CLASS_NAMES, PROCESSED_DIR, RAW_DIR, RANDOM_SEED
from scripts.utils import list_images, validate_label


class DatasetBuilder:
    """Builds train, validation, and test CSV manifests from image folders."""

    def __init__(self, raw_dir: Path = RAW_DIR, output_dir: Path = PROCESSED_DIR) -> None:
        self.raw_dir = raw_dir
        self.output_dir = output_dir

    def build_manifest(self) -> pd.DataFrame:
        rows: list[dict[str, str]] = []
        for label in CLASS_NAMES:
            class_dir = self.raw_dir / label
            for image_path in list_images(class_dir):
                rows.append({"path": str(image_path), "label": validate_label(label)})
        if not rows:
            raise FileNotFoundError(
                f"No images found under {self.raw_dir}. Expected data/raw/Dog, Cat, and Other folders."
            )
        return pd.DataFrame(rows)

    def split(self, test_size: float = 0.10, val_size: float = 0.20) -> dict[str, pd.DataFrame]:
        df = self.build_manifest()
        train_val, test = train_test_split(
            df, test_size=test_size, stratify=df["label"], random_state=RANDOM_SEED
        )
        adjusted_val_size = val_size / (1 - test_size)
        train, val = train_test_split(
            train_val,
            test_size=adjusted_val_size,
            stratify=train_val["label"],
            random_state=RANDOM_SEED,
        )
        return {"train": train, "val": val, "test": test}

    def save_splits(self) -> None:
        self.output_dir.mkdir(parents=True, exist_ok=True)
        for split_name, frame in self.split().items():
            frame.to_csv(self.output_dir / f"{split_name}.csv", index=False)
            print(f"Saved {split_name}: {len(frame)} rows")


if __name__ == "__main__":
    DatasetBuilder().save_splits()
