#!/bin/bash
# Backup database schema using pg_dump
# Usage: ./scripts/db-backup.sh [backup-name]
# Requires: DATABASE_URL environment variable set

set -e

BACKUP_NAME=${1:-"backup-$(date +%Y%m%d-%H%M%S)"}
BACKUP_DIR="backups"

echo "💾 Creating database schema backup: $BACKUP_NAME..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL environment variable not set"
  exit 1
fi

mkdir -p "$BACKUP_DIR"

# Export schema using pg_dump (schema only, no data)
if command -v pg_dump &> /dev/null; then
  pg_dump --schema-only "$DATABASE_URL" > "$BACKUP_DIR/$BACKUP_NAME-schema.sql"
  if [ $? -eq 0 ]; then
    echo "✅ Database schema backup created: $BACKUP_DIR/$BACKUP_NAME-schema.sql"
    exit 0
  else
    echo "❌ pg_dump failed"
    exit 1
  fi
else
  echo "❌ pg_dump not found. Install PostgreSQL client tools."
  exit 1
fi
