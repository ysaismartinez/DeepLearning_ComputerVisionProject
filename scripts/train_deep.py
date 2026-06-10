"""MobileNetV2 transfer learning for PetVision.

External data attribution:
- Oxford-IIIT Pet Dataset: https://www.robots.ox.ac.uk/~vgg/data/pets/
- iNaturalist: https://www.inaturalist.org/
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
import torch
from PIL import Image
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score
from torch import nn
from torch.utils.data import DataLoader, Dataset
from torchvision import models, transforms
from tqdm import tqdm

from scripts.config import CLASS_NAMES, IMAGE_SIZE, MODEL_DIR, PROCESSED_DIR
from scripts.utils import set_seed


class PetVisionImageDataset(Dataset):
    """PyTorch dataset backed by PetVision CSV manifests."""

    def __init__(self, manifest: pd.DataFrame, transform: transforms.Compose) -> None:
        self.manifest = manifest.reset_index(drop=True)
        self.transform = transform
        self.label_map = {name: idx for idx, name in enumerate(CLASS_NAMES)}

    def __len__(self) -> int:
        return len(self.manifest)

    def __getitem__(self, index: int) -> tuple[torch.Tensor, int]:
        row = self.manifest.iloc[index]
        image = Image.open(row["path"]).convert("RGB")
        return self.transform(image), self.label_map[row["label"]]


class MobileNetV2Classifier(nn.Module):
    """MobileNetV2 with a custom three-class PetVision head."""

    def __init__(self, dropout: float = 0.30) -> None:
        super().__init__()
        weights = models.MobileNet_V2_Weights.DEFAULT
        self.backbone = models.mobilenet_v2(weights=weights)
        in_features = self.backbone.classifier[1].in_features
        self.backbone.classifier = nn.Sequential(
            nn.Dropout(dropout),
            nn.Linear(in_features, 256),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(256, len(CLASS_NAMES)),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.backbone(x)


def build_transforms(train: bool) -> transforms.Compose:
    if train:
        return transforms.Compose(
            [
                transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
                transforms.RandomHorizontalFlip(p=0.5),
                transforms.RandomRotation(20),
                transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.2),
                transforms.ToTensor(),
                transforms.RandomErasing(p=0.3),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
            ]
        )
    return transforms.Compose(
        [
            transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ]
    )


def evaluate_model(model: nn.Module, loader: DataLoader, device: torch.device) -> dict[str, Any]:
    model.eval()
    y_true: list[int] = []
    y_pred: list[int] = []
    with torch.no_grad():
        for images, labels in loader:
            logits = model(images.to(device))
            predictions = logits.argmax(dim=1).cpu().numpy().tolist()
            y_pred.extend(predictions)
            y_true.extend(labels.numpy().tolist())
    return {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "macro_f1": float(f1_score(y_true, y_pred, average="macro")),
        "classification_report": classification_report(
                                    y_true,
                                    y_pred,
                                    labels=list(range(len(CLASS_NAMES))),
                                    target_names=CLASS_NAMES,
                                    output_dict=True,
                                    zero_division=0,
                                ),
        "confusion_matrix": confusion_matrix(y_true, y_pred).tolist(),
    }


def train_mobilenetv2(epochs_head: int = 3, epochs_finetune: int = 10) -> dict[str, Any]:
    set_seed()
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    train_df = pd.read_csv(PROCESSED_DIR / "train.csv")
    val_df = pd.read_csv(PROCESSED_DIR / "val.csv")
    test_df = pd.read_csv(PROCESSED_DIR / "test.csv")

    train_loader = DataLoader(PetVisionImageDataset(train_df, build_transforms(True)), batch_size=32, shuffle=True)
    val_loader = DataLoader(PetVisionImageDataset(val_df, build_transforms(False)), batch_size=32)
    test_loader = DataLoader(PetVisionImageDataset(test_df, build_transforms(False)), batch_size=32)

    model = MobileNetV2Classifier().to(device)
    for param in model.backbone.features.parameters():
        param.requires_grad = False

    class_counts = train_df["label"].value_counts().reindex(CLASS_NAMES).to_numpy()
    weights = torch.tensor(class_counts.sum() / class_counts, dtype=torch.float32).to(device)
    criterion = nn.CrossEntropyLoss(weight=weights)
    optimizer = torch.optim.AdamW(filter(lambda p: p.requires_grad, model.parameters()), lr=3e-4, weight_decay=1e-4)

    for _ in range(epochs_head):
        _train_one_epoch(model, train_loader, criterion, optimizer, device)

    for param in model.backbone.features[-4:].parameters():
        param.requires_grad = True
    optimizer = torch.optim.AdamW(filter(lambda p: p.requires_grad, model.parameters()), lr=5e-6, weight_decay=1e-4)

    best_f1 = -1.0
    best_state = None
    patience = 5
    stale = 0
    for _ in range(epochs_finetune):
        _train_one_epoch(model, train_loader, criterion, optimizer, device)
        metrics = evaluate_model(model, val_loader, device)
        if metrics["macro_f1"] > best_f1:
            best_f1 = metrics["macro_f1"]
            best_state = model.state_dict()
            stale = 0
        else:
            stale += 1
        if stale >= patience:
            break

    if best_state:
        model.load_state_dict(best_state)
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    torch.save(model.state_dict(), MODEL_DIR / "mobilenetv2_petvision.pt")
    return evaluate_model(model, test_loader, device)


def _train_one_epoch(model: nn.Module, loader: DataLoader, criterion: nn.Module, optimizer: torch.optim.Optimizer, device: torch.device) -> None:
    model.train()
    for images, labels in tqdm(loader, desc="training"):
        optimizer.zero_grad()
        logits = model(images.to(device))
        loss = criterion(logits, labels.to(device))
        loss.backward()
        optimizer.step()


if __name__ == "__main__":
    print(train_mobilenetv2())
