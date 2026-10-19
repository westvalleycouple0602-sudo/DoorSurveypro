#!/bin/bash
# Set up development environment
# Usage: ./scripts/dev-setup.sh

set -e

echo "🚀 Setting up development environment..."

# Check Node.js version
NODE_VERSION=$(node -v)
echo "Node.js version: $NODE_VERSION"

# Install dependencies
echo "Installing dependencies..."
npm install

# Run database migrations
echo "Pushing database schema..."
npm run db:push || echo "⚠️  Database push failed - check DATABASE_URL"

# Make scripts executable
echo "Making scripts executable..."
chmod +x scripts/*.sh

echo "✅ Development environment setup complete!"
echo ""
echo "Next steps:"
echo "  1. Ensure environment secrets are configured"
echo "  2. Run 'npm run dev' to start the development server"
echo "  3. Use './scripts/seed-demo.sh' to populate demo data"
