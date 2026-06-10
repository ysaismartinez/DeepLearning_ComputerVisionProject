"""PetVision backend API.

Run locally:
    uvicorn main:app --reload

External data attribution:
- Oxford-IIIT Pet Dataset: https://www.robots.ox.ac.uk/~vgg/data/pets/
- iNaturalist: https://www.inaturalist.org/
"""
from __future__ import annotations

import shutil
import tempfile
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile
from pydantic import BaseModel

from scripts.config import CLASS_NAMES
from scripts.model import PetVisionPredictor

app = FastAPI(title="PetVision Backend", version="1.0.0")
predictor = PetVisionPredictor()


class HealthResponse(BaseModel):
    status: str
    classes: list[str]


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    """Return API health status and supported prediction classes."""
    return HealthResponse(status="ok", classes=CLASS_NAMES)


@app.post("/predict")
def predict(file: UploadFile = File(...)) -> dict[str, Any]:
    """Classify an uploaded shelter intake photo as Dog, Cat, or Other."""
    if file.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(status_code=400, detail="Upload a JPEG, PNG, or WEBP image.")

    suffix = Path(file.filename or "image.jpg").suffix or ".jpg"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        shutil.copyfileobj(file.file, tmp)
        temp_path = Path(tmp.name)
    try:
        return predictor.predict_image(temp_path)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    finally:
        temp_path.unlink(missing_ok=True)
