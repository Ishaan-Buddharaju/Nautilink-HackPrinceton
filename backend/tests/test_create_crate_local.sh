#!/bin/bash
# Test script for create-crate endpoint with local Solana validator

set -e

echo "=== Testing Create Crate Endpoint Locally ==="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:8000}"
TEST_EMAIL="${TEST_EMAIL:-test@example.com}"
TEST_PASSWORD="${TEST_PASSWORD:-testpass123}"

# Step 1: Check if backend is running
echo -e "${YELLOW}Step 1: Checking if backend is running...${NC}"
if ! curl -s "$API_URL/health" > /dev/null; then
    echo -e "${RED}❌ Backend is not running at $API_URL${NC}"
    echo "Please start the backend with: cd backend && python main.py"
    exit 1
fi
echo -e "${GREEN}✅ Backend is running${NC}"
echo ""

# Step 2: Sign up or login
echo -e "${YELLOW}Step 2: Authenticating...${NC}"
TOKEN=$(curl -s -X POST "$API_URL/auth/signup" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"$TEST_EMAIL\",
        \"password\": \"$TEST_PASSWORD\",
        \"user_type\": \"fisherman\",
        \"full_name\": \"Test User\"
    }" | jq -r '.access_token // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
    # Try login instead
    echo "Signup failed or user exists, trying login..."
    TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$TEST_EMAIL\",
            \"password\": \"$TEST_PASSWORD\"
        }" | jq -r '.access_token // empty')
fi

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
    echo -e "${RED}❌ Authentication failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Authenticated successfully${NC}"
echo "Token: ${TOKEN:0:50}..."
echo ""

# Step 3: Generate a test Solana wallet (if solana CLI is available)
echo -e "${YELLOW}Step 3: Setting up Solana wallet...${NC}"
if command -v solana-keygen &> /dev/null; then
    # Check if we have a local keypair
    if [ -f ~/.config/solana/id.json ]; then
        WALLET=$(solana address)
        echo -e "${GREEN}✅ Using existing wallet: $WALLET${NC}"
    else
        echo "Creating new test wallet..."
        solana-keygen new --no-bip39-passphrase -o ~/.config/solana/id.json
        WALLET=$(solana address)
        echo -e "${GREEN}✅ Created wallet: $WALLET${NC}"
        
        # Airdrop SOL if on localhost
        if solana config get | grep -q "localhost"; then
            echo "Requesting airdrop for local validator..."
            solana airdrop 2 $WALLET || echo "Airdrop failed (validator might not be running)"
        fi
    fi
else
    # Use a test wallet address
    WALLET="9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
    echo -e "${YELLOW}⚠️  Solana CLI not found, using test wallet: $WALLET${NC}"
fi
echo ""

# Step 4: Test create-crate endpoint
echo -e "${YELLOW}Step 4: Testing create-crate endpoint...${NC}"
TIMESTAMP=$(date +%s)
CRATE_ID="TEST_CRATE_$(date +%s)"

RESPONSE=$(curl -s -X POST "$API_URL/web3/create-crate" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"nfc_tag_id\": \"NFC_TEST_001\",
        \"weight\": 1000,
        \"crate_id\": \"$CRATE_ID\",
        \"ipfs_cid\": \"QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG\",
        \"hash\": \"a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3\",
        \"timestamp\": $TIMESTAMP,
        \"solana_wallet\": \"$WALLET\"
    }")

# Check response
if echo "$RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Create crate successful!${NC}"
    echo ""
    echo "Response:"
    echo "$RESPONSE" | jq '.'
    echo ""
    
    # Extract transaction if present
    TX=$(echo "$RESPONSE" | jq -r '.transaction // empty')
    if [ ! -z "$TX" ] && [ "$TX" != "null" ]; then
        echo -e "${GREEN}Transaction created:${NC}"
        echo "Length: ${#TX} characters"
        echo "Crate Pubkey: $(echo "$RESPONSE" | jq -r '.crate_pubkey')"
    fi
else
    echo -e "${RED}❌ Create crate failed${NC}"
    echo "Response:"
    echo "$RESPONSE" | jq '.' || echo "$RESPONSE"
    exit 1
fi

echo ""
echo -e "${GREEN}=== Test Complete ===${NC}"

