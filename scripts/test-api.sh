#!/usr/bin/env bash
#
# HITL POC — API test script
#
# Run this while `npm run dev` is serving on localhost:3000.
# It exercises the main API flows: create key, submit request, poll, respond.
#
# Usage:
#   bash scripts/test-api.sh
#

BASE="http://localhost:3000"
ADMIN_SECRET="dev-secret-123"

# Use the pre-seeded mock API key (see mock-store.ts)
API_KEY="hitl_mock-dev-key-for-local-testing"

# Helper: pretty-print JSON using node (available on any system with this project)
pretty() {
  node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.stringify(JSON.parse(d),null,2))}catch(e){console.log(d)}})"
}

# Helper: extract a JSON field using node
jsonval() {
  local field="$1"
  node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const v=$field;process.stdout.write(String(v))}catch(e){}})"
}

echo "============================================"
echo "  HITL POC — API Test Script"
echo "============================================"
echo ""

# ─── 1. Check service status ───
echo "--- 1. Check service status ---"
curl -s "$BASE/api/status" | pretty
echo ""

# ─── 2. Create a new API key ───
echo "--- 2. Create a new API key ---"
KEY_RESPONSE=$(curl -s -X POST "$BASE/api/keys" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d '{"name": "Test Key", "agent_name": "test-agent"}')
echo "$KEY_RESPONSE" | pretty
echo ""

NEW_KEY=$(echo "$KEY_RESPONSE" | jsonval "JSON.parse(d).data.key")
if [ -n "$NEW_KEY" ]; then
  echo "  -> New API key: $NEW_KEY"
fi
echo ""

# ─── 3. Submit an approval request ───
echo "--- 3. Submit an approval request ---"
REQUEST_RESPONSE=$(curl -s -X POST "$BASE/api/requests" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "agent_name": "test-agent",
    "request_type": "approve_reject",
    "title": "Should we refactor the auth module?",
    "description": "The auth module has grown to 500 lines. Refactoring would take ~2 days but improve maintainability.",
    "agent_context": "I am analyzing codebase health and flagging modules that need attention.",
    "priority": "normal",
    "tags": ["refactor", "auth"],
    "callback_method": "poll",
    "timeout_seconds": 3600
  }')
echo "$REQUEST_RESPONSE" | pretty
echo ""

# Extract the request ID
REQUEST_ID=$(echo "$REQUEST_RESPONSE" | jsonval "JSON.parse(d).data.id")
if [ -z "$REQUEST_ID" ]; then
  echo "  -> Could not extract request ID. Skipping poll/respond steps."
  echo "  -> Raw response: $REQUEST_RESPONSE"
  exit 1
fi
echo "  -> Request ID: $REQUEST_ID"
echo ""

# ─── 4. Poll for the response (will be pending) ───
echo "--- 4. Poll for response (should be 'pending') ---"
curl -s "$BASE/api/requests/$REQUEST_ID" | pretty
echo ""

# ─── 5. Submit a human response (approve it) ───
echo "--- 5. Submit human response (approve with reasoning) ---"
curl -s -X PATCH "$BASE/api/requests/$REQUEST_ID" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d '{"decision": "approved", "reasoning": "Yes, 500 lines is too much. Go ahead with the refactor."}' \
  | pretty
echo ""

# ─── 6. Poll again (should now be completed) ───
echo "--- 6. Poll again (should be 'completed' with the response) ---"
curl -s "$BASE/api/requests/$REQUEST_ID" | pretty
echo ""

# ─── 7. Submit a choice request ───
echo "--- 7. Submit a choice request ---"
curl -s -X POST "$BASE/api/requests" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "agent_name": "design-agent",
    "request_type": "choose_option",
    "title": "Which color palette for the dashboard?",
    "description": "I generated three palette options. Which feels right?",
    "options": [
      {"id": "warm", "label": "Warm palette", "description": "Oranges and reds — energetic and bold"},
      {"id": "cool", "label": "Cool palette", "description": "Blues and greens — calm and professional"},
      {"id": "mono", "label": "Monochrome", "description": "Grays with one accent color — minimal and clean"}
    ],
    "priority": "normal",
    "tags": ["design", "palette"]
  }' | pretty
echo ""

# ─── 8. Check stats ───
echo "--- 8. Check stats ---"
curl -s "$BASE/api/stats" \
  -H "x-admin-secret: $ADMIN_SECRET" | pretty
echo ""

# ─── 9. List all requests ───
echo "--- 9. List all requests (status=all) ---"
curl -s "$BASE/api/requests?status=all&limit=10" | pretty
echo ""

echo "============================================"
echo "  Done! Open http://localhost:3000 to see"
echo "  the dashboard with these requests."
echo "============================================"
