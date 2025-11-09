# Nautilink API Testing Guide with Curl

## Prerequisites

1. **Start the API server:**
   ```bash
   cd backend
   uvicorn main:app --reload
   ```

2. **Load environment variables:**
   - Ensure `.env` file has `SUPABASE_URL` and `SUPABASE_ANON_KEY`

## Quick Test Commands

### 1. Authenticate with Supabase

```bash
# Get auth token
TOKEN=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ethangwang7@gmail.com",
    "password": "test123"
  }' | jq -r '.access_token')

echo "Token: $TOKEN"
```

### 2. Create a Crate (Get Unsigned Transaction)

```bash
curl -X POST "http://localhost:8000/web3/create-crate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "crate_id": "TEST_CRATE_001",
    "crate_did": "did:nautilink:crate:001",
    "owner_did": "did:nautilink:owner:alice",
    "device_did": "did:nautilink:device:scanner01",
    "location": "40.7128,-74.0060",
    "weight": 5000,
    "ipfs_cid": "QmTest123",
    "hash": "testhash123",
    "solana_wallet": "4oi4ZELW4QG6ntpeAcMMX676TNJiZJB7b44wjZ6L6duZ"
  }' | jq '.'
```

**Response:**
```json
{
  "success": true,
  "message": "Crate creation transaction built successfully...",
  "crate_id": "TEST_CRATE_001",
  "user_id": "...",
  "validated": true,
  "transaction": "AQAAAAAAAAA...",  // Base64 encoded transaction
  "crate_pubkey": "D7Q5josB42ZcTjgnQHFTbEFY27wx9jJzKJQajJXUeCKS",
  "crate_keypair": "...",  // Base64 encoded keypair
  "accounts": {
    "crate_record": "...",
    "authority": "...",
    "system_program": "11111111111111111111111111111111"
  }
}
```

### 3. Transfer Ownership (Get Unsigned Transaction)

```bash
curl -X POST "http://localhost:8000/web3/transfer-ownership-unsigned" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "crate_id": "CHILD_CRATE_001",
    "crate_did": "did:nautilink:crate:002",
    "owner_did": "did:nautilink:owner:bob",
    "device_did": "did:nautilink:device:scanner02",
    "location": "40.7589,-73.9851",
    "parent_crate_pubkey": "D7Q5josB42ZcTjgnQHFTbEFY27wx9jJzKJQajJXUeCKS",
    "weight": 3000,
    "ipfs_cid": "QmTest456",
    "hash": "testhash456",
    "solana_wallet": "4oi4ZELW4QG6ntpeAcMMX676TNJiZJB7b44wjZ6L6duZ"
  }' | jq '.'
```

### 4. Get All Posts

```bash
curl -X GET "http://localhost:8000/web3/get-all-posts" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

## Full Flow: API Call + Sign + Submit to Blockchain

### Using Python Script:

```bash
# Make sure the server is running in another terminal
cd backend
python test_with_curl.py
```

This script will:
1. Authenticate with Supabase
2. Call `/web3/create-crate` endpoint
3. Sign the transaction with both keypairs
4. Submit to Solana devnet
5. Confirm the transaction
6. Test transfer ownership

### Using Direct Blockchain Test:

```bash
cd backend
python test_backend_sign.py
```

This bypasses the API and tests transaction building directly.

## Successful Test Results

✅ **Confirmed Working Transactions on Devnet:**

**Transaction 1:**
- Signature: `4nYNLd9LJ12oteiE4GgCuvw31oZVS54y95rJBjdpQyNp7he4vdwV7rd185gvisx2QmKjSrF3DWLvP6Yii6fTBCSe`
- Crate: `D7Q5josB42ZcTjgnQHFTbEFY27wx9jJzKJQajJXUeCKS`
- Explorer: https://explorer.solana.com/tx/4nYNLd9LJ12oteiE4GgCuvw31oZVS54y95rJBjdpQyNp7he4vdwV7rd185gvisx2QmKjSrF3DWLvP6Yii6fTBCSe?cluster=devnet

## API Endpoints

### POST `/web3/create-crate`
Creates an unsigned transaction for a new crate.

**Request Body:**
- `crate_id` (string): Unique identifier
- `crate_did` (string): Decentralized identifier for crate
- `owner_did` (string): DID for owner
- `device_did` (string): DID for NFC/scanner device
- `location` (string): GPS coordinates "lat,long"
- `weight` (integer): Weight in grams
- `ipfs_cid` (string): IPFS content ID
- `hash` (string): SHA256 hash
- `solana_wallet` (string): User's Solana wallet address

**Returns:**
- Base64-encoded unsigned transaction
- Crate keypair (Base64)
- Crate public key
- Account metadata

### POST `/web3/transfer-ownership-unsigned`
Creates an unsigned transaction for transferring crate ownership.

**Request Body:**
- Same as `create-crate` plus:
- `parent_crate_pubkey` (string): Parent crate public key

**Returns:**
- Same format as create-crate

### GET `/web3/get-all-posts`
Returns all posts (placeholder endpoint).

## Program Information

**Program ID:** `6WVh9yhUaofmUMAsK1EuCJG5ptzZPzKqj7LcFDVzLgnA`

**Network:** Solana Devnet

**RPC:** https://api.devnet.solana.com

## Frontend Integration

For frontend/mobile apps, use the Solana wallet adapter:

1. Call API to get unsigned transaction
2. Decode `crate_keypair` from base64
3. Use wallet adapter to sign with:
   - Crate keypair (decoded)
   - User's wallet (via Phantom/Solflare)
4. Submit signed transaction to Solana

Example with Solana Wallet Adapter (JavaScript):
```javascript
// Get transaction from API
const response = await fetch('/web3/create-crate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(crateData)
});

const { transaction, crate_keypair } = await response.json();

// Decode
const txBuffer = Buffer.from(transaction, 'base64');
const tx = VersionedTransaction.deserialize(txBuffer);

// Sign with wallet adapter
const signed = await wallet.signTransaction(tx);

// Submit
const signature = await connection.sendRawTransaction(signed.serialize());
await connection.confirmTransaction(signature);
```

## Troubleshooting

1. **"Authentication failed"**: Check Supabase credentials in `.env`
2. **"Transaction timeout"**: Ensure API server is running
3. **"Program not found"**: Program may not be deployed - check `web3/Anchor.toml`
4. **"Insufficient funds"**: Fund wallet at https://faucet.solana.com

## Test Wallet

Location: `backend/test_wallet.json`
Address: `4oi4ZELW4QG6ntpeAcMMX676TNJiZJB7b44wjZ6L6duZ`

Fund at: https://faucet.solana.com (devnet SOL)

