# Phase 2 Validation: Transaction Builder

## Overview

Phase 2 implements `build_transfer_ownership_transaction()` in `backend/posts/solana.py`.

This function takes the instruction data from Phase 1 and builds a complete Solana transaction that can be signed and submitted to the blockchain.

## What the Function Does

### Input Parameters
```python
authority_pubkey: str      # New owner's wallet address
parent_crate_pubkey: str   # Address of crate being transferred
crate_id: str              # ID for new crate record
weight: int                # Weight in grams (must match parent)
timestamp: int             # Unix timestamp
hash_str: str              # SHA256 data hash
ipfs_cid: str              # IPFS content ID
```

### Processing Steps

1. **Validate Addresses** - Parse and validate both public keys
2. **Generate New Keypair** - Create new account for the crate record
3. **Build Instruction Data** - Use Phase 1 function to serialize parameters
4. **Set Up Accounts** - Configure accounts in the correct order:
   - Account 0: `crate_record` (new, signer, writable)
   - Account 1: `authority` (new owner, signer, writable)
   - Account 2: `parent_crate` (old crate, read-only)
   - Account 3: `system_program` (Solana system program)
5. **Create Instruction** - Package program ID + accounts + data
6. **Get Blockhash** - Fetch recent blockhash from Solana network
7. **Build Transaction** - Create unsigned transaction message
8. **Serialize** - Encode transaction and keypair as base64

### Output
```python
{
    "transaction": "base64_encoded_unsigned_transaction",
    "crate_keypair": "base64_encoded_keypair",
    "crate_pubkey": "new_crate_address",
    "authority": "new_owner_address",
    "parent_crate": "parent_crate_address",
    "accounts": {
        "crate_record": "...",
        "authority": "...",
        "parent_crate": "...",
        "system_program": "11111111111111111111111111111111"
    },
    "program_id": "FHzgesT5QzphL5eucFCjL9KL59TLs3jztw7Qe9RZjHta"
}
```

## Critical Implementation Details

### Account Order
The account order MUST match the Rust `TransferOwnership` struct:

```rust
pub struct TransferOwnership<'info> {
    pub crate_record: Account<'info, CrateRecord>,
    pub authority: Signer<'info>,
    pub parent_crate: Account<'info, CrateRecord>,
    pub system_program: Program<'info, System>,
}
```

**Why this matters**: Solana uses account indices to access accounts in the program. Wrong order = transaction fails.

### Signer Requirements
The transaction requires TWO signatures:

1. **Authority (new owner)** - Signs to authorize the transfer
2. **Crate record keypair** - Signs to create the new account

The client must:
```javascript
// 1. Deserialize the transaction
const tx = Transaction.from(Buffer.from(transaction_base64, 'base64'));

// 2. Deserialize the crate keypair
const crateKeypair = Keypair.fromSecretKey(
    Buffer.from(crate_keypair_base64, 'base64')
);

// 3. Partially sign with crate keypair
tx.partialSign(crateKeypair);

// 4. Sign with wallet (e.g., Phantom)
const signedTx = await wallet.signTransaction(tx);

// 5. Submit to Solana
const signature = await connection.sendRawTransaction(signedTx.serialize());
```

### Account Flags

| Account | is_signer | is_writable | Purpose |
|---------|-----------|-------------|---------|
| crate_record | ✓ | ✓ | New account being created |
| authority | ✓ | ✓ | Pays fees, becomes owner |
| parent_crate | ✗ | ✗ | Read-only reference |
| system_program | ✗ | ✗ | Creates accounts |

## Validation Checklist

### Manual Validation (No Network Required)

✅ **Function exists** - `build_transfer_ownership_transaction` is defined
✅ **Imports correct** - Uses `solders` for Solana types
✅ **Phase 1 integration** - Calls `build_transfer_ownership_instruction_data()`
✅ **Account order** - Matches Rust struct order
✅ **Account flags** - Correct signer/writable flags
✅ **Returns required fields** - All fields present in response
✅ **Error handling** - Try-catch block wraps logic
✅ **Documentation** - Comprehensive docstring

### Network-Required Testing

⚠️ **These tests require Solana devnet connection**:

- [ ] Valid addresses are accepted
- [ ] Invalid addresses throw ValueError
- [ ] Transaction can be deserialized by client
- [ ] Keypair can be deserialized by client
- [ ] Transaction can be signed
- [ ] Signed transaction can be submitted (devnet)
- [ ] On-chain weight validation works (mismatch should fail)

## Integration with Phase 1

Phase 2 directly uses Phase 1's output:

```python
# Phase 1: Build instruction data
instruction_data = build_transfer_ownership_instruction_data(
    crate_id=crate_id,
    weight=weight,
    timestamp=timestamp,
    hash_str=hash_str,
    ipfs_cid=ipfs_cid,
)

# Phase 2: Use it in the instruction
instruction = Instruction(
    program_id=PROGRAM_ID,
    accounts=accounts,
    data=instruction_data,  # <-- Phase 1 output
)
```

## Key Differences from `create_crate`

Comparing to the existing `build_create_crate_transaction()`:

### Similarities
- Both generate new keypairs for crate records
- Both return unsigned transactions
- Both serialize transaction + keypair

### Differences
- **transfer_ownership** has 3 accounts + system_program (4 total)
- **create_crate** has 2 accounts + system_program (3 total)
- transfer_ownership includes `parent_crate` account
- transfer_ownership has simpler instruction data (5 params vs 9)

## Expected Behavior

### Success Case
```python
result = await build_transfer_ownership_transaction(
    authority_pubkey="9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    parent_crate_pubkey="8WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAXXN",
    crate_id="CRATE_002",
    weight=1000,
    timestamp=1234567890,
    hash_str="b665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae4",
    ipfs_cid="QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
)

assert "transaction" in result
assert "crate_keypair" in result
assert "crate_pubkey" in result
assert result["authority"] == "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
assert result["parent_crate"] == "8WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAXXN"
```

### Error Cases

**Invalid authority pubkey:**
```python
# Should raise ValueError
await build_transfer_ownership_transaction(
    authority_pubkey="invalid",
    ...
)
```

**Invalid parent crate pubkey:**
```python
# Should raise ValueError
await build_transfer_ownership_transaction(
    parent_crate_pubkey="invalid",
    ...
)
```

**Network unavailable:**
```python
# Should raise exception when getting blockhash
# (if Solana RPC is down)
```

## Next Steps: Phase 3

With Phase 2 complete, we have:
- ✅ Instruction data builder (Phase 1)
- ✅ Transaction builder (Phase 2)

Phase 3 will add:
- Request/Response Pydantic models
- API endpoint with authentication
- Input validation
- Error handling

## Phase 2 Status

**Status**: ✅ **COMPLETE** (pending integration testing)

**What works**:
- Transaction builder function implemented
- All accounts configured correctly
- Instruction data integration working
- Response format matches requirements

**What's tested**:
- Code structure and logic flow
- Account order and flags
- Integration with Phase 1

**What needs testing** (requires Solana devnet):
- Actual transaction submission
- On-chain validation
- Client-side signing flow
- End-to-end transfer workflow

