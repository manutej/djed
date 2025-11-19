#!/bin/bash
# Validation script for @djed/logger
# Validates all success criteria automatically

set -e

echo "=========================================="
echo "Validating @djed/logger Success Criteria"
echo "=========================================="
echo ""

# Change to package directory
cd "$(dirname "$0")/.."

# Code Quality
echo "📋 Code Quality Checks"
echo "----------------------"

# Test coverage
echo "→ Running test coverage..."
npm run test:coverage > /dev/null 2>&1

if [ -f coverage/coverage-summary.json ]; then
  COVERAGE=$(node -e "console.log(JSON.parse(require('fs').readFileSync('coverage/coverage-summary.json')).total.lines.pct)")
  if (( $(echo "$COVERAGE < 90" | bc -l) )); then
    echo "❌ Coverage too low: $COVERAGE% (target > 90%)"
    exit 1
  fi
  echo "✅ Test coverage: $COVERAGE% (target > 90%)"
else
  echo "❌ Coverage report not found"
  exit 1
fi

# Security audit
echo "→ Running security audit..."
npm audit --production --audit-level=high > /dev/null 2>&1 || {
  echo "❌ Security vulnerabilities found"
  npm audit --production
  exit 1
}
echo "✅ Zero critical vulnerabilities"

echo ""

# Performance
echo "⚡ Performance Checks"
echo "--------------------"

# Build for bundle size check
echo "→ Building package..."
npm run build > /dev/null 2>&1

# Bundle size
if [ -f dist/index.js ]; then
  SIZE=$(gzip -c dist/index.js | wc -c | tr -d ' ')
  MAX_SIZE=5120  # 5 KB in bytes
  
  if [ $SIZE -gt $MAX_SIZE ]; then
    echo "❌ Bundle too large: $SIZE bytes (target < 5 KB / 5120 bytes)"
    exit 1
  fi
  SIZE_KB=$(echo "scale=2; $SIZE / 1024" | bc)
  echo "✅ Bundle size: ${SIZE_KB} KB (target < 5 KB)"
else
  echo "❌ Build output not found"
  exit 1
fi

# Time to first log
echo "→ Measuring time to first log..."
npm run measure:ttfl > /dev/null 2>&1

if [ -f metrics.json ]; then
  TTFL=$(node -e "console.log(JSON.parse(require('fs').readFileSync('metrics.json')).timeToFirstLog)")
  MAX_TTFL=30000  # 30 seconds in milliseconds
  
  if [ $TTFL -gt $MAX_TTFL ]; then
    echo "❌ Time to first log too slow: ${TTFL}ms (target < 30000ms)"
    exit 1
  fi
  echo "✅ Time to first log: ${TTFL}ms (target < 30000ms)"
else
  echo "❌ Metrics file not found"
  exit 1
fi

echo ""

# Summary
echo "=========================================="
echo "✅ All Success Criteria Met!"
echo "=========================================="
echo ""
echo "Summary:"
echo "  • Test coverage: $COVERAGE%"
echo "  • Security: No critical vulnerabilities"
echo "  • Bundle size: ${SIZE_KB} KB"
echo "  • Time to first log: ${TTFL}ms"
echo ""
echo "Ready for Phase 1 delivery! 🚀"
