# Advocate Inference Service

This service hosts Python-first model artifacts that do not belong inside the Next.js runtime.

It is intended to serve:

- appeal risk scoring
- branch viability scoring
- BlindSpot anomaly/conflict signals

## Why This Exists

The current frontend/backend app is a `Next.js` project, but the model artifacts depend on:

- `PyTorch`
- `scikit-learn`
- `huggingface_hub`

Serving them from a separate Python process is the cleanest integration path.

## Endpoints

- `POST /predict/appeal-risk`
- `POST /predict/branch-viability`
- `POST /analyze/blindspot`
- `POST /score/evidence-relevance`
- `GET /healthz`

## Environment

- `MODEL_ARTIFACT_DIR`
- `HF_TOKEN` (optional, only for live BlindSpot zero-shot)

## Run

```bash
cd services/inference
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

The Next.js app can then call this service via `MODEL_SERVICE_URL=http://localhost:8001`.

## Current State

This scaffold is production-oriented but conservative:

- it supports deterministic fallbacks if model dependencies or artifacts are missing
- it documents the boundary between frontend/backend orchestration and model-serving
- it does not yet fully load the serialized medical risk model because the exact numeric feature registry still needs to be formalized
