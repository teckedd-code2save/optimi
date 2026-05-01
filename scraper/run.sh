#!/usr/bin/env bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
echo "Starting Optimi backend on http://127.0.0.1:8000"
uvicorn api:app --reload --port 8000
