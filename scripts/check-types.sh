#!/bin/bash
# Run TypeScript type checking
# Usage: ./scripts/check-types.sh

set -e

echo "🔍 Running TypeScript type checking..."

npm run check

echo "✅ Type checking passed!"
