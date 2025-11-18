#!/bin/bash

# Task API Demo Script
# Demonstrates @djed/logger in action

set -e

API_URL="http://localhost:3000"

echo "🚀 Task API Demo - @djed/logger Example"
echo "========================================"
echo ""

# Check if server is running
echo "🔍 Checking if server is running..."
if ! curl -s -f "$API_URL/" > /dev/null; then
    echo "❌ Server is not running. Start it with: npm run dev"
    exit 1
fi
echo "✅ Server is running"
echo ""

# Health check
echo "1️⃣  Health Check"
echo "   GET /"
curl -s "$API_URL/" | jq '.'
echo ""

# Create first task
echo "2️⃣  Create Task"
echo "   POST /tasks"
curl -s -X POST "$API_URL/tasks" \
  -H "Content-Type: application/json" \
  -d '{"title":"Learn @djed/logger","priority":"high","description":"Study logging patterns"}' | jq '.'
echo ""

# Create second task
echo "3️⃣  Create Another Task"
echo "   POST /tasks"
curl -s -X POST "$API_URL/tasks" \
  -H "Content-Type: application/json" \
  -d '{"title":"Build production app","priority":"medium"}' | jq '.'
echo ""

# Bulk create tasks
echo "4️⃣  Bulk Create Tasks"
echo "   POST /tasks/bulk"
curl -s -X POST "$API_URL/tasks/bulk" \
  -H "Content-Type: application/json" \
  -d '{"tasks":[{"title":"Write tests","priority":"high"},{"title":"Deploy to prod","priority":"high"},{"title":"Monitor logs","priority":"medium"}]}' | jq '.'
echo ""

# List all tasks
echo "5️⃣  List All Tasks"
echo "   GET /tasks"
curl -s "$API_URL/tasks" | jq '.'
echo ""

# Get specific task
echo "6️⃣  Get Task by ID"
echo "   GET /tasks/1"
curl -s "$API_URL/tasks/1" | jq '.'
echo ""

# Update task
echo "7️⃣  Update Task (Mark as Complete)"
echo "   PATCH /tasks/1"
curl -s -X PATCH "$API_URL/tasks/1" \
  -H "Content-Type: application/json" \
  -d '{"completed":true}' | jq '.'
echo ""

# View stats
echo "8️⃣  View Stats"
echo "   GET /stats"
curl -s "$API_URL/stats" | jq '.'
echo ""

# Test error logging
echo "9️⃣  Test Error Logging (Simulate Error)"
echo "   POST /simulate-error"
echo "   (Expect 500 error - this is intentional)"
curl -s -X POST "$API_URL/simulate-error" | jq '.' || echo "   ✅ Error logged successfully"
echo ""

# Test 404
echo "🔟 Test 404 Logging"
echo "   GET /nonexistent"
curl -s "$API_URL/nonexistent" | jq '.'
echo ""

# Delete task
echo "1️⃣1️⃣  Delete Task"
echo "   DELETE /tasks/2"
curl -s -X DELETE "$API_URL/tasks/2" | jq '.'
echo ""

# Final stats
echo "1️⃣2️⃣  Final Stats"
echo "   GET /stats"
curl -s "$API_URL/stats" | jq '.'
echo ""

echo "✨ Demo Complete!"
echo ""
echo "💡 Check your terminal running 'npm run dev' to see:"
echo "   - Structured logging with metadata"
echo "   - Request IDs for correlation"
echo "   - Module-specific loggers (api, db)"
echo "   - Color-coded log levels (debug, info, warn, error)"
echo "   - Request/response duration tracking"
echo "   - Error context and stack traces"
echo ""
echo "📚 Learn more: see README.md"
