#!/bin/bash
# Smoke Test Runner
# Runs post-deployment smoke tests against local or remote deployment
#
# Usage:
#   ./scripts/smoke-test.sh                    # Test local server
#   ./scripts/smoke-test.sh https://your-app.replit.app  # Test remote deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get target URL from argument or default to localhost
TARGET_URL=${1:-"http://localhost:5000"}

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}DEPLOYMENT SMOKE TESTS${NC}"
echo -e "${YELLOW}========================================${NC}"
echo -e "Target: ${TARGET_URL}"
echo ""

# Set environment variable for tests
export SMOKE_TEST_URL="${TARGET_URL}"

# Run smoke tests
echo "Running smoke tests..."
npx jest --testPathPattern=smoke-tests.test.ts --verbose --forceExit

# Check exit code
if [ $? -eq 0 ]; then
  echo ""
  echo -e "${GREEN}========================================${NC}"
  echo -e "${GREEN}✅ ALL SMOKE TESTS PASSED${NC}"
  echo -e "${GREEN}========================================${NC}"
  echo -e "Deployment: ${TARGET_URL}"
  echo -e "Status: ${GREEN}HEALTHY${NC}"
  echo ""
  exit 0
else
  echo ""
  echo -e "${RED}========================================${NC}"
  echo -e "${RED}❌ SMOKE TESTS FAILED${NC}"
  echo -e "${RED}========================================${NC}"
  echo -e "Deployment: ${TARGET_URL}"
  echo -e "Status: ${RED}UNHEALTHY${NC}"
  echo ""
  echo "Please check the logs above for details."
  exit 1
fi
