# Fixes Applied to Solana API Integration

## Date: November 9, 2025

## Problem Summary

The Python API code was sending **incorrect parameters** to the Solana smart contract, causing transaction failures due to deserialization errors.

---

## Issues Identified

### 1. **Parameter Mismatch in `create_crate`**

**Rust Contract Expected (lib.rs):**
```rust
pub fn create_crate(
    ctx: Context<CreateCrate>,
    crate_id: String,      // ✓
    weight: u32,           // ✓
    timestamp: i64,        // ✓
    hash: String,          // ✓
    ipfs_cid: String,      // ✓
) -> Result<()>
```
**5 parameters total**

**Python API Was Sending (solana.py - BEFORE FIX):**
```python
build_create_crate_instruction_data(
    crate_id: str,         # ✓
    crate_did: str,        # ❌ DOESN'T EXIST IN RUST
    owner_did: str,        # ❌ DOESN'T EXIST IN RUST
    device_did: str,       # ❌ DOESN'T EXIST IN RUST
    location: str,         # ❌ DOESN'T EXIST IN RUST
    weight: int,           # ✓
    timestamp: int,        # ✓
    hash_str: str,         # ✓
    ipfs_cid: str,         # ✓
)
```
**9 parameters total** ❌

### 2. **Hardcoded vs Calculated Discriminator**

**BEFORE (Incorrect):**
```python
# Hardcoded discriminator (potentially from old program version)
discriminator = bytes([52, 253, 8, 10, 147, 201, 59, 115])
```

**AFTER (Correct):**
```python
# Calculated discriminator (matches Anchor's method)
discriminator_input = b"global:create_crate"
discriminator_hash = hashlib.sha256(discriminator_input).digest()
discriminator = discriminator_hash[:8]
```

---

## Fixes Applied

### ✅ Fix 1: Updated `build_create_crate_instruction_data` function

**File:** `backend/posts/solana.py` (lines 100-145)

**Changes:**
- Removed 4 extra parameters: `crate_did`, `owner_did`, `device_did`, `location`
- Changed discriminator from hardcoded to calculated (matching `transfer_ownership`)
- Updated parameter order to exactly match Rust contract
- Added comprehensive documentation

**New Signature:**
```python
def build_create_crate_instruction_data(
    crate_id: str,
    weight: int,
    timestamp: int,
    hash_str: str,
    ipfs_cid: str,
) -> bytes:
```

### ✅ Fix 2: Updated `build_create_crate_transaction` function call

**File:** `backend/posts/solana.py` (lines 218-225)

**Changes:**
- Removed calls passing the non-existent parameters
- Simplified to only pass the 5 parameters that Rust expects

**BEFORE:**
```python
instruction_data = build_create_crate_instruction_data(
    crate_id=crate_id,
    crate_did=f"did:crate:{crate_id}",        # ❌ Removed
    owner_did=f"did:owner:{str(authority)}",  # ❌ Removed
    device_did="did:device:nfc001",           # ❌ Removed
    location="0,0",                           # ❌ Removed
    weight=weight,
    timestamp=timestamp,
    hash_str=hash_str,
    ipfs_cid=ipfs_cid,
)
```

**AFTER:**
```python
instruction_data = build_create_crate_instruction_data(
    crate_id=crate_id,
    weight=weight,
    timestamp=timestamp,
    hash_str=hash_str,
    ipfs_cid=ipfs_cid,
)
```

---

## Why This Matters

1. **Serialization Must Match**: Anchor deserializes instruction data in the exact order defined in the Rust function signature. Extra parameters cause deserialization to fail.

2. **Discriminator Accuracy**: The discriminator is how Solana identifies which instruction to call. A wrong discriminator means the program can't find the function.

3. **Type Matching**: The byte layout must match exactly (String lengths, u32 sizes, i64 sizes, etc.)

---

## Testing Next Steps

### 1. Rebuild the Anchor Program (Recommended)
```bash
cd web3
anchor build
```

This generates the IDL file at `web3/target/idl/nautilink.json` with correct discriminators.

### 2. Test the Fixed API

**Test Create Crate:**
```bash
curl -X POST http://localhost:8000/web3/create-crate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nfc_tag_id": "NFC_DEVICE_001",
    "weight": 1000,
    "crate_id": "CRATE_TEST_001",
    "ipfs_cid": "QmTest123",
    "hash": "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3",
    "solana_wallet": "YOUR_WALLET_PUBLIC_KEY"
  }'
```

**Test Transfer Ownership:**
```bash
curl -X POST http://localhost:8000/web3/transfer-ownership-unsigned \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "parent_crate_pubkey": "PARENT_CRATE_PUBKEY",
    "crate_id": "CRATE_TEST_002",
    "weight": 1000,
    "hash": "b665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae4",
    "ipfs_cid": "QmTest456",
    "solana_wallet": "YOUR_WALLET_PUBLIC_KEY"
  }'
```

### 3. Run Your Test Suite
```bash
cd backend
pytest tests/test_mint_crate_onchain.py -v
pytest tests/test_transfer_ownership.py -v
pytest tests/test_full_transfer_onchain.py -v
```

---

## Expected Results After Fix

✅ Transactions should build without errors
✅ Instruction data should serialize correctly
✅ On-chain deserialization should succeed
✅ Smart contract validation should execute properly
✅ Weight validation should work (transfer_ownership checks weight matches parent)

---

## Additional Notes

- The `transfer_ownership` API was already correct (you wrote it with the AI agent properly)
- Only `create_crate` had the parameter mismatch
- Both functions now use the same discriminator calculation method for consistency
- The linter warnings about fallback imports are harmless (they're for older solana versions)

---

## If You Still See Errors

1. **Check Program ID**: Verify `PROGRAM_ID` in `.env` matches your deployed program
2. **Verify Deployment**: Ensure the program was deployed with `anchor deploy`
3. **Check RPC URL**: Ensure `SOLANA_RPC_URL` points to the correct network (devnet/mainnet)
4. **View Logs**: Use `solana logs` to see on-chain error messages
5. **Inspect Explorer**: Check transaction details on Solana Explorer

---

## Contact

If you need further assistance, provide:
- Transaction signature (from Solana Explorer)
- Error message from API response
- On-chain logs from `solana logs`

