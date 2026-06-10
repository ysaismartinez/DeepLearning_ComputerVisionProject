"""Focused experiment: MobileNetV2 robustness to lighting variation.

External data attribution:
- Oxford-IIIT Pet Dataset: https://www.robots.ox.ac.uk/~vgg/data/pets/
- iNaturalist: https://www.inaturalist.org/
"""
from __future__ import annotations

import pandas as pd
import torch
from PIL import Image
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms
from torchvision.transforms import functional as F

from scripts.config import CLASS_NAMES, IMAGE_SIZE, MODEL_DIR, OUTPUT_DIR, PROCESSED_DIR
from scripts.train_deep import MobileNetV2Classifier, evaluate_model
from scripts.utils import save_json


class BrightnessDataset(Dataset):
    """Applies brightness degradation to test images without retraining."""

    def __init__(self, manifest: pd.DataFrame, factor: float) -> None:
        self.manifest = manifest.reset_index(drop=True)
        self.factor = factor
        self.label_map = {name: idx for idx, name in enumerate(CLASS_NAMES)}
        self.base_transform = transforms.Compose(
            [
                transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
            ]
        )

    def __len__(self) -> int:
        return len(self.manifest)

    def __getitem__(self, index: int):
        row = self.manifest.iloc[index]
        image = Image.open(row["path"]).convert("RGB")
        image = F.adjust_brightness(image, self.factor)
        return self.base_transform(image), self.label_map[row["label"]]


class LightingRobustnessExperiment:
    """Measures performance degradation as image brightness decreases."""

    def __init__(self, factors: tuple[float, ...] = (1.0, 0.8, 0.6, 0.4)) -> None:
        self.factors = factors
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    def run(self) -> dict[str, dict]:
        model = MobileNetV2Classifier().to(self.device)
        model.load_state_dict(torch.load(MODEL_DIR / "mobilenetv2_petvision.pt", map_location=self.device))
        test_df = pd.read_csv(PROCESSED_DIR / "test.csv")
        results: dict[str, dict] = {}
        for factor in self.factors:
            loader = DataLoader(BrightnessDataset(test_df, factor), batch_size=32)
            results[str(factor)] = evaluate_model(model, loader, self.device)
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        save_json(results, OUTPUT_DIR / "lighting_robustness_experiment.json")
        return results


if __name__ == "__main__":
    print(LightingRobustnessExperiment().run())
