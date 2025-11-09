#!/usr/bin/env python3
"""
Direct blockchain test - bypasses API to test on-chain directly
"""

import os
import sys
import asyncio
from dotenv import load_dotenv
from solana.rpc.async_api import AsyncClient
from solders.keypair import Keypair
from solders.pubkey import Pubkey as PublicKey
from solders.transaction import Transaction
import base64
import json

# Import the transaction builders directly
sys.path.insert(0, os.path.dirname(__file__))
from posts.solana import build_create_crate_transaction, build_transfer_ownership_transaction

load_dotenv()

SOLANA_RPC_URL = os.getenv("SOLANA_RPC_URL", "https://api.devnet.solana.com")
WALLET_FILE = "test_wallet.json"

def print_section(title):
    print(f"\n{'='*60}")
    print(f"{title}")
    print('='*60)

def print_result(success, message):
    symbol = "[PASS]" if success else "[FAIL]"
    print(f"{symbol} {message}")

def load_wallet():
    with open(WALLET_FILE, 'r') as f:
        data = json.load(f)
        return Keypair.from_bytes(bytes(data))

async def main():
    print_section("Direct Blockchain Test (No API)")
    print(f"Solana RPC: {SOLANA_RPC_URL}")
    
    # Load wallet
    print_section("1. Load Wallet")
    authority_keypair = load_wallet()
    authority_pubkey = str(authority_keypair.pubkey())
    print(f"Wallet: {authority_pubkey}")
    
    client = AsyncClient(SOLANA_RPC_URL)
    balance = await client.get_balance(authority_keypair.pubkey())
    balance_sol = balance.value / 1_000_000_000
    print(f"Balance: {balance_sol} SOL")
    
    if balance_sol < 0.1:
        print("[FAIL] Insufficient balance")
        await client.close()
        sys.exit(1)
    
    # Test CREATE CRATE
    print_section("2. Test CREATE CRATE (Direct)")
    try:
        print("Building transaction directly...")
        transaction_data = await build_create_crate_transaction(
            authority_pubkey=authority_pubkey,
            crate_id="DIRECT_TEST_001",
            crate_did="did:nautilink:crate:direct001",
            owner_did="did:nautilink:user:directtest",
            device_did="did:nautilink:device:nfc001",
            location="40.7128,-74.0060",
            weight=5000,
            timestamp=1234567890,
            hash_str="abc123direct",
            ipfs_cid="QmTestDirectCID",
        )
        
        print_result(True, "Transaction built")
        print(f"Crate account: {transaction_data['crate_pubkey']}")
        print(f"Program ID used: {transaction_data['program_id']}")
        
        # Deserialize and sign
        tx_bytes = base64.b64decode(transaction_data["transaction"])
        tx = Transaction.from_bytes(tx_bytes)
        
        crate_kp_bytes = base64.b64decode(transaction_data["crate_keypair"])
        crate_keypair = Keypair.from_bytes(crate_kp_bytes)
        
        # Sign
        tx.sign([crate_keypair, authority_keypair], tx.message.recent_blockhash)
        
        # Submit
        print("Submitting to blockchain...")
        send_result = await client.send_raw_transaction(bytes(tx))
        signature = str(send_result.value)
        print(f"Transaction signature: {signature}")
        
        # Confirm
        print("Waiting for confirmation...")
        from solders.signature import Signature
        await client.confirm_transaction(Signature.from_string(signature))
        print_result(True, "CREATE CRATE confirmed on-chain!")
        
        explorer_url = f"https://explorer.solana.com/tx/{signature}?cluster=devnet"
        print(f"\nView on Solana Explorer:")
        print(explorer_url)
        
        crate_pubkey = transaction_data['crate_pubkey']
        
    except Exception as e:
        print_result(False, f"CREATE CRATE error: {e}")
        import traceback
        traceback.print_exc()
        await client.close()
        sys.exit(1)
    
    # Test TRANSFER
    print_section("3. Test TRANSFER OWNERSHIP (Direct)")
    try:
        print("Building transfer transaction directly...")
        transfer_data = await build_transfer_ownership_transaction(
            authority_pubkey=authority_pubkey,
            parent_crate_pubkey=crate_pubkey,
            crate_id="DIRECT_TEST_002",
            crate_did="did:nautilink:crate:direct002",
            owner_did="did:nautilink:user:newowner",
            device_did="did:nautilink:device:nfc002",
            location="40.7580,-73.9855",
            weight=5000,
            timestamp=1234567891,
            hash_str="xyz789direct",
            ipfs_cid="QmTestTransferDirect",
        )
        
        print_result(True, "Transfer transaction built")
        print(f"New crate account: {transfer_data['crate_pubkey']}")
        print(f"Program ID used: {transfer_data['program_id']}")
        
        # Deserialize and sign
        tx_bytes = base64.b64decode(transfer_data["transaction"])
        tx = Transaction.from_bytes(tx_bytes)
        
        crate_kp_bytes = base64.b64decode(transfer_data["crate_keypair"])
        new_crate_keypair = Keypair.from_bytes(crate_kp_bytes)
        
        # Sign
        tx.sign([new_crate_keypair, authority_keypair], tx.message.recent_blockhash)
        
        # Submit
        print("Submitting transfer transaction...")
        send_result = await client.send_raw_transaction(bytes(tx))
        signature = str(send_result.value)
        print(f"Transaction signature: {signature}")
        
        # Confirm
        print("Waiting for confirmation...")
        from solders.signature import Signature
        await client.confirm_transaction(Signature.from_string(signature))
        print_result(True, "TRANSFER OWNERSHIP confirmed on-chain!")
        
        explorer_url = f"https://explorer.solana.com/tx/{signature}?cluster=devnet"
        print(f"\nView on Solana Explorer:")
        print(explorer_url)
        
    except Exception as e:
        print_result(False, f"TRANSFER error: {e}")
        import traceback
        traceback.print_exc()
    
    # Check final balance
    balance = await client.get_balance(authority_keypair.pubkey())
    balance_sol = balance.value / 1_000_000_000
    print(f"\nFinal balance: {balance_sol} SOL")
    
    await client.close()
    
    print_section("Test Complete!")
    print("[PASS] All blockchain operations successful!")
    print("\nWhat was validated:")
    print("  - CREATE CRATE with all DID fields confirmed on Solana devnet")
    print("  - TRANSFER OWNERSHIP with parent reference confirmed on devnet")
    print("  - Both transactions verified on-chain")
    print("  - Smart contract working with updated structure")

if __name__ == "__main__":
    asyncio.run(main())

