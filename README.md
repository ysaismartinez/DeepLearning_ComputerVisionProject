# PetVision Backend

PetVision is a backend Python implementation of a shelter intake computer vision app. It classifies animal images into **Dog**, **Cat**, or **Other** and returns confidence scores so low-confidence predictions can be routed to human review. For my commits to GitHub I only committed a small dataset as Terminal would crash if trying to upload all 11K+ images. My intention with this is to demonstrate the modesl being used, training, and having a live API call to test things. 

This repository follows the required project structure and includes all three required modeling approaches:

1. **Naive baseline**: majority-class classifier in `scripts/model.py` and `scripts/train.py`.
2. **Classical ML model**: HOG features + Random Forest in `scripts/build_features.py`, `scripts/model.py`, and `scripts/train.py`.
3. **Deep learning model**: MobileNetV2 transfer learning in `scripts/train_deep.py`.

It also includes the required focused experiment: **robustness to lighting variation**, implemented in `scripts/experiment.py`.

## Repository Structure

```text
petvision_backend/
├──Supporting Screenshots Showing PR and Training/
│   ├── Supporting Screenshots.docx
├──Technical Written Report/
│   ├── PetVision_Written_Report_v1.docx
├── README.md
├── requirements.txt
├── setup.py
├── main.py
├── scripts/
│   ├── config.py
│   ├── utils.py
│   ├── make_dataset.py
│   ├── build_features.py
│   ├── model.py
│   ├── train.py
│   ├── train_deep.py
│   └── experiment.py
├── models/
├── data/
│   ├── raw/
│   ├── processed/
│   └── outputs/
├── notebooks/
└── .gitignore
```

## Data Attribution

This project is designed around the datasets described in the technical report:

- Oxford-IIIT Pet Dataset: <https://www.robots.ox.ac.uk/~vgg/data/pets/>
- iNaturalist: <https://www.inaturalist.org/>

Place images into this structure before creating splits:

```text
data/raw/Dog/
data/raw/Cat/
data/raw/Other/
```

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip3 install -r requirements.txt
```

## Prepare Data

```bash
python3 -m scripts.make_dataset
```

This creates:

```text
data/processed/train.csv
data/processed/val.csv
data/processed/test.csv
```

Each CSV has two columns:

```text
path,label
```

## Train the Required Models

Train the naive baseline and classical HOG + Random Forest model:

```bash
python3 -m scripts.train
```

Train MobileNetV2 separately, because it is slower and may require GPU time:

```bash
python3 -m scripts.train_deep
```

Generated model artifacts are saved in `models/`. Metrics are saved in `data/outputs/`.

## Run the Required Experiment

After training MobileNetV2:

```bash
python3 -m scripts.experiment
```

This evaluates the trained deep learning model under brightness factors of `1.0`, `0.8`, `0.6`, and `0.4`, matching the lighting robustness experiment described in the report.

## Run the Backend API

```bash
uvicorn main:app --reload
```

Health check:

```bash
curl http://127.0.0.1:8000/health
```

Prediction endpoint:
You must be in the folder for a certain animal. For example if you are running this from Terminal and you are passing a cat jpg, you must be in the Cat folder. 

```bash
curl -X POST "http://127.0.0.1:8000/predict" \
  -F "file=@sample_pet.jpg"
```

Example response:

```json
{
  "prediction": "Dog",
  "confidence": 0.94,
  "requires_human_review": false,
  "probabilities": {
    "Dog": 0.94,
    "Cat": 0.04,
    "Other": 0.02
  }
}
```
