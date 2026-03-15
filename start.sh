#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODEL_DIR="$ROOT_DIR/../neural networks and model"
MODEL_PYTHON="$MODEL_DIR/.venv/bin/python"
OLLAMA_BIN="${OLLAMA_BIN:-$(command -v ollama || true)}"
OLLAMA_BASE_URL="${OLLAMA_BASE_URL:-http://127.0.0.1:11434}"
OLLAMA_MODEL="${OLLAMA_MODEL:-llama3.2:1b}"
OLLAMA_PID=""

if [[ ! -x "$MODEL_PYTHON" ]]; then
  echo "Missing model server venv at $MODEL_PYTHON"
  echo "Create it first with: python3.12 -m venv \"$MODEL_DIR/.venv\""
  exit 1
fi

if [[ -z "$OLLAMA_BIN" ]]; then
  echo "Missing Ollama. Install it first with: brew install ollama"
  exit 1
fi

if ! curl -sf "$OLLAMA_BASE_URL/api/tags" >/dev/null 2>&1; then
  "$OLLAMA_BIN" serve >/tmp/advocate-ollama.log 2>&1 &
  OLLAMA_PID=$!
  # Wait briefly for Ollama to accept connections before checking models.
  for _ in {1..30}; do
    if curl -sf "$OLLAMA_BASE_URL/api/tags" >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done
fi

if ! curl -sf "$OLLAMA_BASE_URL/api/tags" >/dev/null 2>&1; then
  echo "Ollama did not start successfully. Check /tmp/advocate-ollama.log"
  exit 1
fi

# Ensure the local chat model exists before starting Next so BERT can answer immediately.
if ! "$OLLAMA_BIN" list | awk 'NR>1 {print $1}' | grep -Fxq "$OLLAMA_MODEL"; then
  "$OLLAMA_BIN" pull "$OLLAMA_MODEL"
fi

cd "$MODEL_DIR"
"$MODEL_PYTHON" server.py &
MODEL_PID=$!
trap 'kill "$MODEL_PID" >/dev/null 2>&1 || true; if [[ -n "$OLLAMA_PID" ]]; then kill "$OLLAMA_PID" >/dev/null 2>&1 || true; fi' EXIT

# Wait until the model service is actually accepting requests before starting Next.
for _ in {1..30}; do
  if curl -sf "http://127.0.0.1:8000/health" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! curl -sf "http://127.0.0.1:8000/health" >/dev/null 2>&1; then
  echo "Model service did not start successfully."
  exit 1
fi

cd "$ROOT_DIR"
npm run dev
