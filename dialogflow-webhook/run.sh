#!/bin/bash
# Dialogflow Webhook Service Startup Script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Installing dependencies ==="
pip install fastapi uvicorn asyncpg python-dotenv

echo "=== Starting Dialogflow Webhook Service ==="
echo "Listening on: 0.0.0.0:8888"

exec uvicorn main:app --host 0.0.0.0 --port 8888 --reload
