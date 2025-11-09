"""
Test script where backend signs the transaction
This tests if our transaction building is correct
"""
import os
import json
import asyncio
from dotenv import load_dotenv
from solders.keypair import Keypair
from solders.pubkey import Pubkey as PublicKey
from solders.instruction import Instruction, AccountMeta
from solders.transaction import Transaction
from solders.message import Message as SolanaMessage
from solders.system_program import ID as SYSTEM_PROGRAM_ID
from solana.rpc.async_api import AsyncClient
import struct

load_dotenv()

# Configuration
SOLANA_RPC = "https://api.devnet.solana.com"
PROGRAM_ID_STR = "6WVh9yhUaofmUMAsK1EuCJG5ptzZPzKqj7LcFDVzLgnA"
PROGRAM_ID = PublicKey.from_string(PROGRAM_ID_STR)

# Instruction discriminators
CREATE_CRATE_DISCRIMINATOR = bytes([52, 253, 8, 10, 147, 201, 59, 115])

def serialize_string(s: str) -> bytes:
    """Serialize a string as length-prefixed UTF-8 bytes."""
    utf8_bytes = s.encode('utf-8')
    length = len(utf8_bytes)
    return struct.pack('<I', length) + utf8_bytes

def serialize_u64(value: int) -> bytes:
    """Serialize a u64 as little-endian bytes."""
    return struct.pack('<Q', value)

def serialize_i64(value: int) -> bytes:
    """Serialize an i64 as little-endian bytes."""
    return struct.pack('<q', value)

def load_wallet():
    """Load wallet from test_wallet.json"""
    with open('test_wallet.json', 'r') as f:
        keypair_data = json.load(f)
    return Keypair.from_bytes(bytes(keypair_data))

async def test_create_crate_direct():
    """Test creating a crate by building and signing transaction ourselves"""
    print("=" * 60)
    print("Nautilink Direct Blockchain Test")
    print("=" * 60)
    
    # Load wallet
    print("\n[1/3] Loading wallet...")
    wallet = load_wallet()
    authority = wallet.pubkey()
    print(f"      [PASS] Wallet: {authority}")
    
    # Check balance
    client = AsyncClient(SOLANA_RPC)
    balance_resp = await client.get_balance(authority)
    balance = balance_resp.value / 1e9
    print(f"      Balance: {balance} SOL")
    
    if balance < 0.01:
        print("      [FAIL] Insufficient balance!")
        await client.close()
        return
    
    # Create crate keypair
    print("\n[2/3] Building transaction...")
    crate_keypair = Keypair()
    crate_pubkey = crate_keypair.pubkey()
    print(f"      Crate: {crate_pubkey}")
    
    # Build instruction data
    crate_id = f"DIRECT_TEST_{int(asyncio.get_event_loop().time())}"
    instruction_data = CREATE_CRATE_DISCRIMINATOR
    instruction_data += serialize_string(crate_id)
    instruction_data += serialize_string("did:nautilink:crate:direct001")
    instruction_data += serialize_string("did:nautilink:owner:test")
    instruction_data += serialize_string("did:nautilink:device:test01")
    instruction_data += serialize_string("40.7128,-74.0060")
    instruction_data += serialize_u64(1000)
    instruction_data += serialize_i64(int(asyncio.get_event_loop().time()))
    instruction_data += serialize_string("testhash123")
    instruction_data += serialize_string("QmTestIPFS")
    
    # Build instruction
    accounts = [
        AccountMeta(pubkey=crate_pubkey, is_signer=True, is_writable=True),
        AccountMeta(pubkey=authority, is_signer=True, is_writable=True),
        AccountMeta(pubkey=SYSTEM_PROGRAM_ID, is_signer=False, is_writable=False),
    ]
    
    instruction = Instruction(
        program_id=PROGRAM_ID,
        accounts=accounts,
        data=instruction_data,
    )
    
    # Get recent blockhash
    recent_blockhash_resp = await client.get_latest_blockhash()
    recent_blockhash = recent_blockhash_resp.value.blockhash
    
    # Create transaction
    message = SolanaMessage.new_with_blockhash([instruction], authority, recent_blockhash)
    tx = Transaction([crate_keypair, wallet], message, recent_blockhash)
    
    print("      [PASS] Transaction built and signed")
    
    # Send transaction
    print("\n[3/3] Submitting to blockchain...")
    try:
        result = await client.send_transaction(tx)
        signature = str(result.value)
        print(f"      [PASS] Transaction sent!")
        print(f"      Signature: {signature}")
        
        # Wait for confirmation
        print("      Waiting for confirmation...")
        await asyncio.sleep(3)
        
        from solders.signature import Signature as SolSignature
        confirmation = await client.confirm_transaction(SolSignature.from_string(signature))
        
        if confirmation.value:
            print(f"      [PASS] Transaction confirmed!")
            print(f"\n" + "=" * 60)
            print("[PASS] CRATE SUCCESSFULLY CREATED ON DEVNET!")
            print("=" * 60)
            print(f"\nCrate ID: {crate_id}")
            print(f"Crate Address: {crate_pubkey}")
            print(f"Transaction: https://explorer.solana.com/tx/{signature}?cluster=devnet")
            print(f"Account: https://explorer.solana.com/address/{crate_pubkey}?cluster=devnet")
        else:
            print("      [FAIL] Transaction not confirmed")
            
    except Exception as e:
        print(f"      [FAIL] Transaction failed: {str(e)}")
    
    await client.close()

if __name__ == "__main__":
    asyncio.run(test_create_crate_direct())

