#!/bin/bash
# Check code quality and common issues
# Usage: ./scripts/lint-check.sh

set -e

echo "🔍 Checking code quality..."

# Check for console.log statements in server code (should use Winston logging)
echo "Checking for console.log in server code..."
if grep -r "console\.\(log\|error\|warn\|info\)" server/ --exclude-dir=node_modules --exclude="*.log" 2>/dev/null | grep -v "// OK:" ; then
  echo "⚠️  Warning: Found console statements in server code. Use Winston logger instead."
else
  echo "✅ No console statements found in server code"
fi

# Check for TODO comments
echo "Checking for TODO comments..."
TODO_COUNT=$(grep -r "TODO\|FIXME\|XXX" server/ client/ --exclude-dir=node_modules 2>/dev/null | wc -l || echo "0")
echo "📝 Found $TODO_COUNT TODO/FIXME comments"

# Run TypeScript check
echo "Running TypeScript type checking..."
npm run check

echo "✅ Code quality checks complete!"
