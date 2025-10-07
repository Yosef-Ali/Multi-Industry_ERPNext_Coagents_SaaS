#!/bin/bash
# Simple gateway test script

echo "🧪 Testing Agent Gateway..."
echo ""

echo "1. Testing /health endpoint..."
if curl -sf http://localhost:3001/health > /dev/null 2>&1; then
  echo "   ✓ PASS - Health endpoint responding"
else
  echo "   ✗ FAIL - Health endpoint not responding"
  exit 1
fi

echo ""
echo "2. Testing /api/chat/health endpoint..."
if curl -sf http://localhost:3001/api/chat/health > /dev/null 2>&1; then
  echo "   ✓ PASS - Chat health endpoint responding"
else
  echo "   ✗ FAIL - Chat health endpoint not responding"
  exit 1
fi

echo ""
echo "3. Testing /api/chat endpoint with POST..."
RESPONSE=$(curl -sS -X POST \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello, test"}],"model":"gemini-2.5-pro"}' \
  http://localhost:3001/api/chat 2>&1)

if echo "$RESPONSE" | grep -q "data:"; then
  echo "   ✓ PASS - Chat endpoint returning SSE data"
  echo "   First line: $(echo "$RESPONSE" | head -n 1)"
else
  echo "   ✗ FAIL - Chat endpoint not returning expected format"
  echo "   Response: $RESPONSE"
  exit 1
fi

echo ""
echo "✅ All tests passed!"
