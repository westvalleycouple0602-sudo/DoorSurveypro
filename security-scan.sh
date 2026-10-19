#!/bin/bash

##
# Security Scanning Script
# Runs automated security checks on the codebase
##

echo "🔒 Running Security Scans..."
echo ""

# NPM Security Audit
echo "📦 Running npm audit..."
npm audit --audit-level=moderate
AUDIT_EXIT=$?

echo ""
echo "✅ NPM Audit Complete (Exit Code: $AUDIT_EXIT)"
echo ""

# Check for known vulnerabilities in dependencies
echo "🔍 Checking for outdated dependencies..."
npm outdated || true

echo ""

# Check for secret leaks (basic pattern matching)
echo "🔐 Scanning for potential secrets..."
echo "Checking for common secret patterns..."

# Check for hardcoded secrets (basic)
grep -r -i "password\s*=\s*['\"][^'\"]*['\"]" server/ client/ --exclude-dir=node_modules --exclude-dir=dist --exclude="*.test.ts" || echo "No hardcoded passwords found"
grep -r -i "api[_-]?key\s*=\s*['\"][^'\"]*['\"]" server/ client/ --exclude-dir=node_modules --exclude-dir=dist --exclude="*.test.ts" || echo "No hardcoded API keys found"
grep -r -i "secret\s*=\s*['\"][^'\"]*['\"]" server/ client/ --exclude-dir=node_modules --exclude-dir=dist --exclude="*.test.ts" || echo "No hardcoded secrets found"

echo ""
echo "✅ Secret scan complete"
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Security Scan Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "NPM Audit: $([ $AUDIT_EXIT -eq 0 ] && echo '✅ PASS' || echo '⚠️  WARNINGS')"
echo ""
echo "Run 'npm audit fix' to automatically fix vulnerabilities"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
