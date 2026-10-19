#!/usr/bin/env bash
    set -e
    python3 -m pip install --upgrade pip
    pip3 install -r requirements.txt
    export FLASK_APP=app.py
    export FLASK_ENV=development
    python3 - <<'PY'
from app import app
print("✅ Flask app imported. Starting server on 0.0.0.0:5000 ...")
app.run(host="0.0.0.0", port=5000, debug=True)
PY
