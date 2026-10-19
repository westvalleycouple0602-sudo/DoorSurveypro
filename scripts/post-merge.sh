#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

# Restore the merged lockfile exactly. Do not push the declared schema onto
# the existing database: legacy data requires reviewed, explicit migrations.
npm ci --no-audit --no-fund
