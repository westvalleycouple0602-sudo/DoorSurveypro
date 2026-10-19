#!/bin/bash

# Database Migration Runner Script
# Runs pending migrations before starting the application

set -e  # Exit on error

echo "🔄 Running database migrations..."

# Run the migration script
tsx server/migrate.ts

echo "✅ Migrations completed successfully!"
