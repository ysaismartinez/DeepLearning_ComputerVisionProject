"""Shared configuration for PetVision.

External data attribution:
- Oxford-IIIT Pet Dataset: https://www.robots.ox.ac.uk/~vgg/data/pets/
- iNaturalist: https://www.inaturalist.org/
"""
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"
OUTPUT_DIR = DATA_DIR / "outputs"
MODEL_DIR = PROJECT_ROOT / "models"

CLASS_NAMES = ["Cat", "Dog", "Other"]
IMAGE_SIZE = 224
RANDOM_SEED = 42
CONFIDENCE_REVIEW_THRESHOLD = 0.80
CONFIDENCE_AUTO_ACCEPT_THRESHOLD = 0.90
