#!/bin/bash
# Test Nautilink API with curl and mint tokens on devnet

set -e

API_URL="http://localhost:8000"
SUPABASE_URL="${SUPABASE_URL}"
SUPABASE_KEY="${SUPABASE_ANON_KEY}"
WALLET_PUBKEY="4oi4ZELW4QG6ntpeAcMMX676TNJiZJB7b44wjZ6L6duZ"

echo "============================================================"
echo "Nautilink API Curl Test"
echo "============================================================"

# Step 1: Authenticate
echo ""
echo "[1/3] Authenticating with Supabase..."
AUTH_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ethangwang7@gmail.com",
    "password": "test123"
  }')

TOKEN=$(echo $AUTH_RESPONSE | jq -r '.access_token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "[FAIL] Authentication failed"
  echo "$AUTH_RESPONSE"
  exit 1
fi

echo "[PASS] Authenticated successfully"
echo "Token: ${TOKEN:0:20}..."

# Step 2: Create Crate
echo ""
echo "[2/3] Calling create-crate endpoint..."
CRATE_ID="CURL_TEST_$(date +%s)"
CREATE_RESPONSE=$(curl -s -X POST "${API_URL}/web3/create-crate" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"crate_id\": \"${CRATE_ID}\",
    \"crate_did\": \"did:nautilink:crate:curl001\",
    \"owner_did\": \"did:nautilink:owner:test\",
    \"device_did\": \"did:nautilink:device:scanner01\",
    \"location\": \"40.7128,-74.0060\",
    \"weight\": 5000,
    \"ipfs_cid\": \"QmCurlTest123\",
    \"hash\": \"curlhash123\",
    \"solana_wallet\": \"${WALLET_PUBKEY}\"
  }")

# Check if request was successful
if echo "$CREATE_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
  CRATE_PUBKEY=$(echo $CREATE_RESPONSE | jq -r '.crate_pubkey')
  echo "[PASS] Transaction built by API"
  echo "Crate Pubkey: ${CRATE_PUBKEY}"
  echo ""
  echo "Response saved to: create_crate_response.json"
  echo "$CREATE_RESPONSE" | jq '.' > create_crate_response.json
else
  echo "[FAIL] API error"
  echo "$CREATE_RESPONSE" | jq '.'
  exit 1
fi

# Step 3: Test Transfer Ownership
echo ""
echo "[3/3] Calling transfer-ownership endpoint..."
TRANSFER_RESPONSE=$(curl -s -X POST "${API_URL}/web3/transfer-ownership-unsigned" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"crate_id\": \"CHILD_${CRATE_ID}\",
    \"crate_did\": \"did:nautilink:crate:curl002\",
    \"owner_did\": \"did:nautilink:owner:test\",
    \"device_did\": \"did:nautilink:device:scanner01\",
    \"location\": \"40.7128,-74.0060\",
    \"parent_crate_pubkey\": \"${CRATE_PUBKEY}\",
    \"weight\": 3000,
    \"ipfs_cid\": \"QmCurlTest456\",
    \"hash\": \"curlhash456\",
    \"solana_wallet\": \"${WALLET_PUBKEY}\"
  }")

if echo "$TRANSFER_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
  CHILD_CRATE_PUBKEY=$(echo $TRANSFER_RESPONSE | jq -r '.crate_pubkey')
  echo "[PASS] Transfer transaction built by API"
  echo "Child Crate Pubkey: ${CHILD_CRATE_PUBKEY}"
  echo ""
  echo "Response saved to: transfer_ownership_response.json"
  echo "$TRANSFER_RESPONSE" | jq '.' > transfer_ownership_response.json
else
  echo "[FAIL] API error"
  echo "$TRANSFER_RESPONSE" | jq '.'
  exit 1
fi

echo ""
echo "============================================================"
echo "[PASS] API ENDPOINTS WORKING!"
echo "============================================================"
echo ""
echo "Next steps to mint on blockchain:"
echo "1. Run: python test_curl_sign.py create_crate_response.json"
echo "2. Run: python test_curl_sign.py transfer_ownership_response.json"
echo ""
echo "Or use the combined script:"
echo "  python test_curl_full.py"

