#!/bin/bash
# Database Index Deployment Script
# Deploys IDX_customers_organization_id index to database
# October 29, 2025

set -e

echo "=========================================="
echo "Database Index Deployment"
echo "Index: IDX_customers_organization_id"
echo "Table: customers"
echo "Column: organization_id"
echo "=========================================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable not set"
    echo "Please set DATABASE_URL before running this script"
    exit 1
fi

echo "✅ DATABASE_URL is set"
echo ""

# Create index if it doesn't exist (idempotent)
echo "Creating index..."
psql "$DATABASE_URL" -c "CREATE INDEX IF NOT EXISTS \"IDX_customers_organization_id\" ON \"customers\" (\"organization_id\");" 2>&1

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Index created successfully (or already exists)"
    echo ""
    
    # Verify index exists
    echo "Verifying index..."
    RESULT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'customers' AND indexname = 'IDX_customers_organization_id';" 2>&1)
    
    if [ "$(echo $RESULT | tr -d '[:space:]')" == "1" ]; then
        echo "✅ Index verified successfully"
        echo ""
        echo "=========================================="
        echo "Deployment completed successfully"
        echo "=========================================="
        exit 0
    else
        echo "❌ Index verification failed"
        exit 1
    fi
else
    echo ""
    echo "❌ Failed to create index"
    exit 1
fi
