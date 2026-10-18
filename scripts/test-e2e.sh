#!/bin/bash
# Run Playwright end-to-end tests
# Usage: ./scripts/test-e2e.sh

set -e

echo "🧪 Running E2E tests with Playwright..."

# Ensure dependencies are installed
npx playwright install chromium --with-deps 2>/dev/null || true

# Run tests
npx playwright test

echo "✅ E2E tests passed!"
