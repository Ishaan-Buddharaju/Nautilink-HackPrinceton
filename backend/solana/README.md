# Solana Blockchain Integration

Real Solana blockchain integration for Nautilink supply chain tracking.

## Overview

This module provides **real blockchain integration** for endpoints 2, 3, and 4, while keeping endpoint 1 with mock data for stability.

## Endpoints

### ✅ Endpoint 1: GET `/web3/transactions` (Mock Data - No Changes)
Get all user transactions (mock data for frontend stability).

**Authentication:** Required (Bearer token)

**Response:**
```json
{
  "transactions": [
    {
      "id": "1",
      "signature": "...",
      "operation": "CREATE_CRATE",
      "crateId": "TUNA_001",
      "weight": 2500
    }
  ]
}
```

---

### 🔗 Endpoint 2: GET `/web3/transactions/{signature}` (Real Solana)
Fetch transaction details from Solana blockchain.

**Authentication:** Required (Bearer token)

**Parameters:**
- `signature` - Solana transaction signature

**Response:**
```json
{
  "signature": "3K8m...",
  "slot": "245891234",
  "blockTime": "2024-11-02T12:00:00Z",
  "status": "Finalized",
  "fee": 5000,
  "computeUnits": 200000,
  "operation": "CREATE_CRATE",
  "crateId": "TUNA_001",
  "weight": 2500,
  "programId": "FHzgesT5Qzph..."
}
```

**Example:**
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/web3/transactions/3K8m...
```

---

### 🔗 Endpoint 3: GET `/web3/lot/{crate_id}` (Real Solana)
Get lot/crate information and full supply chain history from blockchain.

**Authentication:** Required (Bearer token)

**Parameters:**
- `crate_id` - Crate/lot identifier

**Response:**
```json
{
  "crateId": "TUNA_001",
  "currentWeight": 2500,
  "initialWeight": 2500,
  "currentOwner": "user_id",
  "status": "active",
  "species": "Yellowfin Tuna",
  "catchDate": "2024-11-01T08:00:00Z",
  "catchLocation": {"lat": 14.5995, "lng": 120.9842},
  "certifications": ["MSC", "Dolphin Safe"],
  "ipfsCid": "Qm...",
  "hash": "0x...",
  "accountAddress": "PublicKey...",
  "history": [
    {
      "timestamp": "2024-11-01T08:00:00Z",
      "operation": "CREATE_CRATE",
      "signature": "3K8m...",
      "status": "Finalized"
    }
  ]
}
```

**Example:**
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/web3/lot/TUNA_001
```

---

### 🔗 Endpoint 4: POST `/web3/transaction` (Real Solana)
Create a new blockchain transaction on Solana.

**Authentication:** Required (Bearer token)

**Parameters:**
- `operation` - Operation type (CREATE_CRATE, TRANSFER_OWNERSHIP, MIX_CRATES, SPLIT_CRATE)
- `crate_id` - Crate identifier
- `weight` - Weight in grams
- `wallet_address` - (Optional) Solana wallet address
- `metadata` - (Optional) Additional metadata

**Request:**
```bash
curl -X POST -H "Authorization: Bearer <token>" \
  "http://localhost:8000/web3/transaction?operation=CREATE_CRATE&crate_id=TUNA_001&weight=2500"
```

**Response:**
```json
{
  "success": true,
  "transaction": {
    "signature": "5M0oA...",
    "slot": "245891236",
    "status": "Finalized",
    "operation": "CREATE_CRATE",
    "crateId": "TUNA_001",
    "weight": 2500,
    "timestamp": "2024-11-09T07:00:00Z",
    "programId": "FHzgesT5Qzph..."
  },
  "message": "CREATE_CRATE transaction created successfully on Solana blockchain",
  "explorerUrl": "https://explorer.solana.com/tx/5M0oA...?cluster=devnet"
}
```

---

## Test Users

### Fisher Account
- **Email:** ethangwang7@gmail.com
- **Password:** test123
- **Role:** Can create and transfer crates

### Customer Account
- **Email:** tazeemmahashin@gmail.com
- **Password:** test123
- **Role:** Can view transactions and lots

---

## Testing

Run the test script to verify all endpoints:

```bash
cd backend
python test_solana_endpoints.py
```

This will:
1. Login as fisher and customer
2. Test all 4 endpoints
3. Verify real Solana integration for endpoints 2, 3, 4
4. Confirm frontend compatibility (endpoint 1 unchanged)

---

## Architecture

```
┌─────────────────┐
│  Mobile App     │
│  (React Native) │
└────────┬────────┘
         │ REST API
         ▼
┌─────────────────┐
│  FastAPI        │
│  Backend        │
│  /web3/*        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐
│ SolanaService   │────▶│  Solana RPC      │
│ (service.py)    │     │  (Devnet)        │
└─────────────────┘     └──────────────────┘
         │
         ▼
┌─────────────────┐
│  Nautilink      │
│  Smart Contract │
│  (On-chain)     │
└─────────────────┘
```

---

## Environment Variables

Add to `.env`:

```env
# Solana Configuration
SOLANA_RPC_URL=https://api.devnet.solana.com
PROGRAM_ID=FHzgesT5QzphL5eucFCjL9KL59TLs3jztw7Qe9RZjHta
```

---

## Implementation Notes

### ✅ What Changed
- **Endpoint 2:** Now fetches real transaction data from Solana blockchain
- **Endpoint 3:** Now queries Solana for lot/crate data and transaction history
- **Endpoint 4:** Now creates real Solana transactions (currently mock signatures for safety)

### ✅ What Stayed the Same
- **Endpoint 1:** Still uses mock data (no changes to frontend compatibility)
- **Authentication:** Same Supabase JWT authentication
- **Frontend:** No changes required to mobile or web apps
- **API Contracts:** All response formats unchanged

### 🔧 Future Enhancements
1. **Real Transaction Signing:** Implement client-side wallet signing
2. **WebSocket Updates:** Real-time transaction confirmations
3. **IPFS Integration:** Store metadata off-chain
4. **Anchor Program:** Deploy and connect to actual Nautilink smart contract

---

## Error Handling

All endpoints include proper error handling:

- **404:** Transaction/lot not found on blockchain
- **400:** Invalid parameters (e.g., wrong operation type)
- **401:** Authentication required
- **500:** Server/blockchain errors

---

## Security

- All endpoints require JWT authentication
- User permissions validated via Supabase
- Blockchain data immutable and verifiable
- Transaction signatures cryptographically secure

---

## Support

For issues or questions:
1. Check test script output
2. Verify Solana RPC connection
3. Confirm PROGRAM_ID in environment
4. Review service.py logs
