#!/bin/bash
# Seed demo environment with sample data
# Usage: ./scripts/seed-demo.sh

set -e

echo "🌱 Seeding demo environment..."

# Reset demo environment and capture HTTP status
HTTP_STATUS=$(curl -s -w "%{http_code}" -o /dev/null -X POST http://localhost:5000/api/demo/reset \
  -H "Content-Type: application/json")

if [ "$HTTP_STATUS" -eq 200 ] || [ "$HTTP_STATUS" -eq 201 ] || [ "$HTTP_STATUS" -eq 204 ]; then
  echo "✅ Demo environment seeded successfully!"
  exit 0
else
  echo "❌ Failed to seed demo environment (HTTP $HTTP_STATUS)"
  echo "   Make sure the development server is running on port 5000"
  exit 1
fi
