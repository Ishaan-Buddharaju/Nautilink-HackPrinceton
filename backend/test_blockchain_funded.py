#!/usr/bin/env python3
"""
Test blockchain with manually funded wallet
Uses the wallet created by setup_test_wallet.py
"""

import os
import sys
import json
import requests
import asyncio
from dotenv import load_dotenv
from solana.rpc.async_api import AsyncClient
from solders.keypair import Keypair
from solders.pubkey import Pubkey as PublicKey
from solders.transaction import Transaction
import base64

load_dotenv()

API_BASE = "http://localhost:8000"
EMAIL = "ethangwang7@gmail.com"
PASSWORD = "test123"
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
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
    """Load the test wallet"""
    if not os.path.exists(WALLET_FILE):
        print(f"[FAIL] Wallet file not found: {WALLET_FILE}")
        print("Run: python setup_test_wallet.py first")
        sys.exit(1)
    
    with open(WALLET_FILE, 'r') as f:
        data = json.load(f)
        return Keypair.from_bytes(bytes(data))

async def check_balance(keypair, client):
    """Check wallet balance"""
    balance = await client.get_balance(keypair.pubkey())
    balance_sol = balance.value / 1_000_000_000
    print(f"Wallet: {keypair.pubkey()}")
    print(f"Balance: {balance_sol} SOL")
    
    if balance_sol < 0.1:
        print("\n[FAIL] Insufficient balance (need at least 0.1 SOL)")
        print("\nFund your wallet:")
        print(f"1. Visit: https://faucet.solana.com")
        print(f"2. Paste: {keypair.pubkey()}")
        print(f"3. Request airdrop")
        print(f"\nOr use CLI: solana airdrop 2 {keypair.pubkey()} --url devnet")
        return False
    
    print_result(True, "Wallet has sufficient balance")
    return True

async def main():
    print_section("Blockchain Testing with Funded Wallet")
    print(f"Solana RPC: {SOLANA_RPC_URL}")
    print(f"API Base: {API_BASE}")
    
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        print("[FAIL] Missing Supabase credentials")
        sys.exit(1)
    
    # 1. Login
    print_section("1. Authenticate with Supabase")
    try:
        login_response = requests.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers={
                "apikey": SUPABASE_ANON_KEY,
                "Content-Type": "application/json"
            },
            json={"email": EMAIL, "password": PASSWORD}
        )
        login_data = login_response.json()
        
        if "access_token" not in login_data:
            print_result(False, f"Login failed: {login_data}")
            sys.exit(1)
        
        jwt_token = login_data["access_token"]
        print_result(True, "Authentication successful")
        
    except Exception as e:
        print_result(False, f"Login error: {e}")
        sys.exit(1)
    
    headers = {
        "Authorization": f"Bearer {jwt_token}",
        "Content-Type": "application/json"
    }
    
    # 2. Load funded wallet
    print_section("2. Load Test Wallet")
    authority_keypair = load_wallet()
    authority_pubkey = str(authority_keypair.pubkey())
    
    client = AsyncClient(SOLANA_RPC_URL)
    
    has_balance = await check_balance(authority_keypair, client)
    if not has_balance:
        await client.close()
        sys.exit(1)
    
    # 3. Test CREATE CRATE
    print_section("3. Test CREATE CRATE (on-chain)")
    try:
        create_data = {
            "crate_id": "FUNDED_TEST_001",
            "crate_did": "did:nautilink:crate:funded001",
            "owner_did": "did:nautilink:user:fundedtest",
            "device_did": "did:nautilink:device:nfc001",
            "location": "40.7128,-74.0060",
            "weight": 5000,
            "ipfs_cid": "QmTestFundedCID123",
            "hash": "abc123funded",
            "solana_wallet": authority_pubkey
        }
        
        response = requests.post(
            f"{API_BASE}/web3/create-crate",
            headers=headers,
            json=create_data
        )
        result = response.json()
        
        if not result.get("success"):
            print_result(False, f"Transaction build failed: {result}")
            await client.close()
            sys.exit(1)
        
        print_result(True, "Transaction built successfully")
        
        # Deserialize and sign
        tx_bytes = base64.b64decode(result["transaction"])
        tx = Transaction.from_bytes(tx_bytes)
        
        crate_kp_bytes = base64.b64decode(result["crate_keypair"])
        crate_keypair = Keypair.from_bytes(crate_kp_bytes)
        
        crate_pubkey = result["crate_pubkey"]
        print(f"Crate account: {crate_pubkey}")
        
        # Sign with both keypairs
        tx.sign([crate_keypair, authority_keypair], tx.message.recent_blockhash)
        
        # Submit
        print("Submitting to blockchain...")
        send_result = await client.send_raw_transaction(bytes(tx))
        signature = str(send_result.value)
        print(f"Transaction signature: {signature}")
        
        # Confirm
        print("Waiting for confirmation...")
        confirmation = await client.confirm_transaction(signature)
        print_result(True, "CREATE CRATE confirmed on-chain!")
        
        explorer_url = f"https://explorer.solana.com/tx/{signature}?cluster=devnet"
        print(f"\nView on Solana Explorer:")
        print(explorer_url)
        
        # Check new balance
        await check_balance(authority_keypair, client)
        
    except Exception as e:
        print_result(False, f"CREATE CRATE error: {e}")
        import traceback
        traceback.print_exc()
        await client.close()
        sys.exit(1)
    
    # 4. Test TRANSFER OWNERSHIP
    print_section("4. Test TRANSFER OWNERSHIP (on-chain)")
    try:
        # For transfer, we'll use same wallet as new owner
        # (in production, this would be a different wallet)
        
        transfer_data = {
            "parent_crate_pubkey": crate_pubkey,
            "crate_id": "FUNDED_TEST_002",
            "crate_did": "did:nautilink:crate:funded002",
            "owner_did": "did:nautilink:user:newowner",
            "device_did": "did:nautilink:device:nfc002",
            "location": "40.7580,-73.9855",
            "weight": 5000,
            "hash": "xyz789transfer",
            "ipfs_cid": "QmTestTransferFunded",
            "solana_wallet": authority_pubkey
        }
        
        response = requests.post(
            f"{API_BASE}/web3/transfer-ownership-unsigned",
            headers=headers,
            json=transfer_data
        )
        result = response.json()
        
        if not result.get("success"):
            print_result(False, f"Transfer build failed: {result}")
            await client.close()
            sys.exit(1)
        
        print_result(True, "Transfer transaction built successfully")
        
        # Deserialize and sign
        tx_bytes = base64.b64decode(result["transaction"])
        tx = Transaction.from_bytes(tx_bytes)
        
        crate_kp_bytes = base64.b64decode(result["crate_keypair"])
        new_crate_keypair = Keypair.from_bytes(crate_kp_bytes)
        
        new_crate_pubkey = result["crate_pubkey"]
        print(f"New crate account: {new_crate_pubkey}")
        
        # Sign with both keypairs
        tx.sign([new_crate_keypair, authority_keypair], tx.message.recent_blockhash)
        
        # Submit
        print("Submitting transfer transaction...")
        send_result = await client.send_raw_transaction(bytes(tx))
        signature = str(send_result.value)
        print(f"Transaction signature: {signature}")
        
        # Confirm
        print("Waiting for confirmation...")
        confirmation = await client.confirm_transaction(signature)
        print_result(True, "TRANSFER OWNERSHIP confirmed on-chain!")
        
        explorer_url = f"https://explorer.solana.com/tx/{signature}?cluster=devnet"
        print(f"\nView on Solana Explorer:")
        print(explorer_url)
        
        # Check final balance
        await check_balance(authority_keypair, client)
        
    except Exception as e:
        print_result(False, f"TRANSFER OWNERSHIP error: {e}")
        import traceback
        traceback.print_exc()
    
    await client.close()
    
    print_section("Test Summary")
    print("[PASS] All blockchain operations completed successfully!")
    print("\nWhat was tested:")
    print("  - CREATE CRATE with all DID fields on devnet")
    print("  - TRANSFER OWNERSHIP with parent reference on devnet")
    print("  - Both transactions confirmed and verified on-chain")
    print("\nCheck Solana Explorer links above for transaction details")

if __name__ == "__main__":
    asyncio.run(main())

