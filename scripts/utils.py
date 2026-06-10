"""Utility functions for PetVision.

External data attribution:
- Oxford-IIIT Pet Dataset: https://www.robots.ox.ac.uk/~vgg/data/pets/
- iNaturalist: https://www.inaturalist.org/
"""
from __future__ import annotations

import json
import random
from pathlib import Path
from typing import Iterable

import numpy as np
from PIL import Image

from scripts.config import CLASS_NAMES, IMAGE_SIZE, RANDOM_SEED


def set_seed(seed: int = RANDOM_SEED) -> None:
    random.seed(seed)
    np.random.seed(seed)
    try:
        import torch
        torch.manual_seed(seed)
        torch.cuda.manual_seed_all(seed)
    except Exception:
        pass


def load_image(path: str | Path, size: int = IMAGE_SIZE) -> Image.Image:
    image = Image.open(path).convert("RGB")
    return image.resize((size, size))


def save_json(data: dict, path: str | Path) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def read_json(path: str | Path) -> dict:
    with Path(path).open("r", encoding="utf-8") as f:
        return json.load(f)


def list_images(root: str | Path) -> list[Path]:
    root = Path(root)
    extensions = {".jpg", ".jpeg", ".png", ".webp"}
    return sorted(p for p in root.rglob("*") if p.suffix.lower() in extensions)


def validate_label(label: str) -> str:
    if label not in CLASS_NAMES:
        raise ValueError(f"Unknown label '{label}'. Expected one of {CLASS_NAMES}.")
    return label


def softmax_np(logits: Iterable[float]) -> np.ndarray:
    values = np.asarray(list(logits), dtype=float)
    values = values - values.max()
    exp = np.exp(values)
    return exp / exp.sum()
