# Phase 3 Validation: API Endpoint Layer

## Overview

Phase 3 implements the complete REST API endpoint for transfer ownership operations, including:
- Request/Response Pydantic models
- POST `/web3/transfer-ownership` endpoint
- JWT authentication integration
- Comprehensive input validation
- Error handling for all failure scenarios

## What Was Built

### 1. Pydantic Models

#### `TransferOwnershipRequest`
```python
class TransferOwnershipRequest(BaseModel):
    parent_crate_pubkey: str     # Required: Parent crate address (min 32 chars)
    crate_id: str                # Required: New crate identifier (min 1 char)
    weight: int                  # Required: Weight in grams (> 0)
    hash: str                    # Required: SHA256 hash
    ipfs_cid: str                # Required: IPFS content ID
    timestamp: Optional[int]     # Optional: Unix timestamp (defaults to now)
    solana_wallet: Optional[str] # Optional: New owner's wallet (or from profile)
```

**Validation Rules:**
- `parent_crate_pubkey`: Minimum 32 characters (Solana address length)
- `crate_id`: Non-empty string
- `weight`: Must be greater than 0
- `hash`: Non-empty string
- `ipfs_cid`: Non-empty string
- `timestamp`: Optional, defaults to current time
- `solana_wallet`: Optional, falls back to user metadata

#### `TransferOwnershipResponse`
```python
class TransferOwnershipResponse(BaseModel):
    success: bool                # Operation status
    message: str                 # Human-readable message
    crate_id: str                # Echo of the crate ID
    user_id: str                 # Authenticated user ID
    validated: bool              # JWT validation status
    transaction: Optional[str]   # Base64 unsigned transaction
    crate_pubkey: Optional[str]  # New crate account address
    crate_keypair: Optional[str] # Base64 keypair for signing
    parent_crate: Optional[str]  # Parent crate address
    accounts: Optional[dict]     # All account addresses
```

### 2. API Endpoint

**Route:** `POST /web3/transfer-ownership`

**Authentication:** JWT Bearer token (required)

**Request Example:**
```bash
curl -X POST "http://localhost:8000/web3/transfer-ownership" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "parent_crate_pubkey": "DtHLdSPxNwFw31JK8AYNiJx8r1YkQYcTw11qmH99HKYp",
    "crate_id": "CRATE_002",
    "weight": 1000,
    "hash": "b665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae4",
    "ipfs_cid": "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
    "solana_wallet": "6ZTB7UovQqYZmE37uRuBjQoPtvZHx2Par4rhD7mp8ge4"
  }'
```

**Response Example:**
```json
{
  "success": true,
  "message": "Transfer ownership transaction built successfully...",
  "crate_id": "CRATE_002",
  "user_id": "user-uuid-123",
  "validated": true,
  "transaction": "AQAAAAAAAAA...",
  "crate_pubkey": "EH9HZ1VwEkfLQwgLd3fbEHm7fr6vt8T1o899ZWojiyJq",
  "crate_keypair": "base64_encoded...",
  "parent_crate": "DtHLdSPxNwFw31JK8AYNiJx8r1YkQYcTw11qmH99HKYp",
  "accounts": {
    "crate_record": "EH9HZ1VwEkfLQwgLd3fbEHm7fr6vt8T1o899ZWojiyJq",
    "authority": "6ZTB7UovQqYZmE37uRuBjQoPtvZHx2Par4rhD7mp8ge4",
    "parent_crate": "DtHLdSPxNwFw31JK8AYNiJx8r1YkQYcTw11qmH99HKYp",
    "system_program": "11111111111111111111111111111111"
  }
}
```

## Implementation Details

### Processing Flow

```
1. JWT Authentication (via get_current_user dependency)
   ↓
2. Extract user_id and email from JWT token
   ↓
3. Validate/Set timestamp (defaults to now)
   ↓
4. Get Solana wallet (request body → user metadata → error)
   ↓
5. Validate weight (> 0)
   ↓
6. Validate parent_crate_pubkey format
   ↓
7. Build transaction (Phase 2 function)
   ↓
8. Return TransferOwnershipResponse
```

### Authentication

**Method:** JWT Bearer token via Supabase

**Implementation:**
```python
current_user: dict = Depends(get_current_user)
```

The `get_current_user` dependency:
1. Extracts Bearer token from Authorization header
2. Validates token with Supabase auth API
3. Returns user data dictionary
4. Raises 401 Unauthorized if token is invalid

**User Data Returned:**
```python
{
    "id": "uuid",
    "email": "user@example.com",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z",
    "user_metadata": {"solana_wallet": "..."},
    "app_metadata": {}
}
```

### Validation Logic

#### Step 1: Timestamp Validation
```python
timestamp = request.timestamp if request.timestamp else int(datetime.utcnow().timestamp())
```
- If provided: Use request timestamp
- If missing: Use current UTC time

#### Step 2: Solana Wallet Resolution
```python
solana_wallet = request.solana_wallet
if not solana_wallet:
    solana_wallet = current_user.get("user_metadata", {}).get("solana_wallet")
if not solana_wallet:
    raise HTTPException(400, "Solana wallet address is required")
```
- Priority 1: Request body
- Priority 2: User profile metadata
- If neither: Return 400 error

#### Step 3: Weight Validation
```python
if request.weight <= 0:
    raise HTTPException(400, "Weight must be greater than 0")
```
- Basic sanity check
- Detailed validation (weight == parent.weight) happens on-chain

#### Step 4: Parent Crate Validation
```python
if not request.parent_crate_pubkey or len(request.parent_crate_pubkey) < 32:
    raise HTTPException(400, "Invalid parent crate public key")
```
- Check for presence
- Check minimum length (Solana addresses are 32-44 characters)

### Error Handling

#### Error Types and HTTP Status Codes

| Error Type | HTTP Code | Description |
|------------|-----------|-------------|
| Missing/Invalid JWT | 401 | Authentication failed |
| Missing wallet | 400 | No Solana wallet provided |
| Invalid weight | 400 | Weight ≤ 0 |
| Invalid parent crate | 400 | Invalid/missing parent crate address |
| Invalid Solana address | 400 | Malformed wallet/crate address |
| IDL file not found | 500 | Server configuration error |
| Transaction build failure | 500 | Unexpected error during tx building |
| Unexpected error | 500 | Other internal errors |

#### Error Response Format

**400 Bad Request:**
```json
{
  "detail": "Solana wallet address is required. Please provide it in the request or set it in your user profile."
}
```

**401 Unauthorized:**
```json
{
  "detail": "Invalid authentication credentials"
}
```

**500 Internal Server Error:**
```json
{
  "detail": "Failed to build Solana transaction: <error details>"
}
```

### Integration with Previous Phases

#### Phase 1 Integration
```python
# Phase 1 builds instruction data
instruction_data = build_transfer_ownership_instruction_data(
    crate_id, weight, timestamp, hash_str, ipfs_cid
)
```

#### Phase 2 Integration
```python
# Phase 2 builds complete transaction
transaction_data = await build_transfer_ownership_transaction(
    authority_pubkey=solana_wallet,
    parent_crate_pubkey=request.parent_crate_pubkey,
    crate_id=request.crate_id,
    weight=request.weight,
    timestamp=timestamp,
    hash_str=request.hash,
    ipfs_cid=request.ipfs_cid,
)
```

#### Phase 3 (API) Integration
```python
# Phase 3 wraps everything in REST API
@router.post("/transfer-ownership")
async def transfer_ownership(request, current_user):
    # Validation + Authentication
    # Call Phase 2
    # Return formatted response
```

## API Documentation

FastAPI automatically generates OpenAPI/Swagger documentation at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- OpenAPI JSON: `http://localhost:8000/openapi.json`

### Swagger UI Features

The endpoint will appear with:
- Request body schema with examples
- Response schema with examples
- "Try it out" functionality
- Authentication (JWT Bearer token input)

## Testing Checklist

### Manual Testing

- [ ] Endpoint appears in Swagger UI (`/docs`)
- [ ] Request model validation works
- [ ] Response model structure is correct
- [ ] JWT authentication is enforced
- [ ] Invalid JWT returns 401
- [ ] Missing wallet returns 400
- [ ] Invalid weight returns 400
- [ ] Invalid parent crate returns 400
- [ ] Valid request returns 200 with transaction
- [ ] Transaction can be deserialized
- [ ] Keypair can be deserialized

### Integration Testing

- [ ] End-to-end flow: API → Transaction → Sign → Submit
- [ ] Weight mismatch rejected on-chain
- [ ] Valid transfer succeeds on-chain
- [ ] Error messages are helpful
- [ ] Response times are acceptable

### Security Testing

- [ ] JWT token properly validated
- [ ] Expired tokens rejected
- [ ] Tampered tokens rejected
- [ ] Rate limiting (if implemented)
- [ ] SQL injection protection (Pydantic handles this)
- [ ] CORS configured properly

## Comparison with create_crate Endpoint

### Similarities
- Both use JWT authentication
- Both validate Solana wallet
- Both build unsigned transactions
- Both return transaction + keypair
- Both have similar error handling

### Differences

| Aspect | create_crate | transfer_ownership |
|--------|--------------|-------------------|
| Parameters | 9 (includes DID fields) | 5 (simpler) |
| Parent crate | None | Required |
| NFC tag | Required | Not needed |
| Accounts | 3 (crate, auth, system) | 4 (adds parent) |
| Weight validation | Basic only | Basic + on-chain match check |

## Performance Considerations

### Expected Response Times
- Authentication check: ~100-200ms (Supabase API call)
- Transaction building: ~50-100ms (local + blockhash fetch)
- **Total:** ~150-300ms

### Bottlenecks
1. **Supabase auth verification** - External API call
2. **Solana blockhash fetch** - Network call to devnet/mainnet
3. **Keypair generation** - Crypto operations (minimal impact)

### Optimization Opportunities
- Cache Supabase JWT verification (with expiry)
- Batch blockhash fetching if multiple requests
- Use connection pooling for Solana RPC

## Production Readiness

### ✅ Complete
- JWT authentication
- Input validation
- Error handling
- Response formatting
- OpenAPI documentation
- Type safety (Pydantic)

### ⚠️ Recommended Additions
- Rate limiting (per user/IP)
- Request logging
- Metrics/monitoring
- Caching layer
- Request ID tracking
- CORS configuration
- API versioning

### 🔒 Security Considerations
- JWT tokens should use HTTPS only
- Implement rate limiting to prevent abuse
- Log suspicious activity
- Monitor for invalid transaction patterns
- Consider API key for server-to-server calls

## Phase 3 Status

**Status:** ✅ **COMPLETE**

**What works:**
- ✅ Pydantic models with validation
- ✅ POST endpoint with JWT auth
- ✅ Input validation (weight, wallet, parent crate)
- ✅ Solana wallet resolution (request → profile)
- ✅ Error handling for all scenarios
- ✅ Integration with Phase 1 & 2
- ✅ OpenAPI documentation generation

**What's tested:**
- Code structure and logic
- Model validation rules
- Integration with authentication
- Error handling paths

**What needs testing:**
- Live API calls with real JWT tokens
- End-to-end transaction flow
- Error scenarios with real requests
- Performance under load

## Next Steps: Phase 4

With Phase 3 complete, we now have a fully functional API endpoint. Phase 4 will focus on:

1. **Integration Testing**
   - Test with real JWT tokens from Supabase
   - Test end-to-end transaction flow
   - Test error scenarios

2. **Documentation**
   - Client integration guide
   - API usage examples
   - Error handling guide

3. **Polish**
   - Add logging
   - Add metrics
   - Performance optimization
   - Security hardening

4. **Deployment Preparation**
   - Environment configuration
   - Health checks
   - Monitoring setup

