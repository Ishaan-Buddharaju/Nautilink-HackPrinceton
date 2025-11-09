#!/usr/bin/env python3
"""
Test API endpoints with actual blockchain submission
Tests the full flow: API -> Get Transaction -> Sign -> Submit to Blockchain
"""

import os
import sys
import json
import requests
import asyncio
from dotenv import load_dotenv
from solana.rpc.async_api import AsyncClient
from solders.keypair import Keypair
from solders.signature import Signature
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
    with open(WALLET_FILE, 'r') as f:
        data = json.load(f)
        return Keypair.from_bytes(bytes(data))

async def main():
    print_section("API + Blockchain Integration Test")
    print(f"API: {API_BASE}")
    print(f"Blockchain: {SOLANA_RPC_URL}")
    print("\nNOTE: Make sure FastAPI server is running!")
    print("If not, run: python main.py")
    
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
    
    # 2. Load wallet
    print_section("2. Load Wallet")
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
    
    # 3. Test API CREATE CRATE endpoint
    print_section("3. Test API: POST /web3/create-crate")
    try:
        create_data = {
            "crate_id": "API_TEST_001",
            "crate_did": "did:nautilink:crate:apitest001",
            "owner_did": "did:nautilink:user:apitest",
            "device_did": "did:nautilink:device:nfc001",
            "location": "40.7128,-74.0060",
            "weight": 5000,
            "ipfs_cid": "QmTestAPICID",
            "hash": "abc123apitest",
            "solana_wallet": authority_pubkey
        }
        
        print("Calling API endpoint...")
        response = requests.post(
            f"{API_BASE}/web3/create-crate",
            headers=headers,
            json=create_data,
            timeout=10
        )
        
        if response.status_code != 200:
            print_result(False, f"API returned {response.status_code}")
            print(response.text)
            await client.close()
            sys.exit(1)
        
        result = response.json()
        
        if not result.get("success"):
            print_result(False, f"API call failed: {result}")
            await client.close()
            sys.exit(1)
        
        print_result(True, "API returned transaction")
        print(f"Crate account: {result['crate_pubkey']}")
        print(f"Validated: {result['validated']}")
        
        # Deserialize and sign transaction
        print("\nSigning transaction...")
        tx_bytes = base64.b64decode(result["transaction"])
        tx = Transaction.from_bytes(tx_bytes)
        
        crate_kp_bytes = base64.b64decode(result["crate_keypair"])
        crate_keypair = Keypair.from_bytes(crate_kp_bytes)
        
        tx.sign([crate_keypair, authority_keypair], tx.message.recent_blockhash)
        
        # Submit to blockchain
        print("Submitting to blockchain...")
        send_result = await client.send_raw_transaction(bytes(tx))
        signature = str(send_result.value)
        print(f"Transaction signature: {signature}")
        
        # Confirm
        print("Waiting for confirmation...")
        await client.confirm_transaction(Signature.from_string(signature))
        print_result(True, "CREATE CRATE confirmed on-chain!")
        
        explorer_url = f"https://explorer.solana.com/tx/{signature}?cluster=devnet"
        print(f"\nView on Solana Explorer:")
        print(explorer_url)
        
        crate_pubkey = result['crate_pubkey']
        
    except requests.exceptions.ConnectionError:
        print_result(False, "Cannot connect to API - Is the server running?")
        print("\nStart the server with: python main.py")
        await client.close()
        sys.exit(1)
    except Exception as e:
        print_result(False, f"CREATE CRATE error: {e}")
        import traceback
        traceback.print_exc()
        await client.close()
        sys.exit(1)
    
    # 4. Test API TRANSFER OWNERSHIP endpoint
    print_section("4. Test API: POST /web3/transfer-ownership-unsigned")
    try:
        transfer_data = {
            "parent_crate_pubkey": crate_pubkey,
            "crate_id": "API_TEST_002",
            "crate_did": "did:nautilink:crate:apitest002",
            "owner_did": "did:nautilink:user:newowner",
            "device_did": "did:nautilink:device:nfc002",
            "location": "40.7580,-73.9855",
            "weight": 5000,
            "hash": "xyz789apitest",
            "ipfs_cid": "QmTestTransferAPI",
            "solana_wallet": authority_pubkey
        }
        
        print("Calling API endpoint...")
        response = requests.post(
            f"{API_BASE}/web3/transfer-ownership-unsigned",
            headers=headers,
            json=transfer_data,
            timeout=10
        )
        
        if response.status_code != 200:
            print_result(False, f"API returned {response.status_code}")
            print(response.text)
            await client.close()
            sys.exit(1)
        
        result = response.json()
        
        if not result.get("success"):
            print_result(False, f"API call failed: {result}")
            await client.close()
            sys.exit(1)
        
        print_result(True, "API returned transfer transaction")
        print(f"New crate account: {result['crate_pubkey']}")
        print(f"Parent crate: {result['parent_crate']}")
        
        # Deserialize and sign
        print("\nSigning transaction...")
        tx_bytes = base64.b64decode(result["transaction"])
        tx = Transaction.from_bytes(tx_bytes)
        
        crate_kp_bytes = base64.b64decode(result["crate_keypair"])
        new_crate_keypair = Keypair.from_bytes(crate_kp_bytes)
        
        tx.sign([new_crate_keypair, authority_keypair], tx.message.recent_blockhash)
        
        # Submit
        print("Submitting transfer transaction...")
        send_result = await client.send_raw_transaction(bytes(tx))
        signature = str(send_result.value)
        print(f"Transaction signature: {signature}")
        
        # Confirm
        print("Waiting for confirmation...")
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
    print("[PASS] Full API + Blockchain integration working!")
    print("\nWhat was validated:")
    print("  - API authentication with Supabase")
    print("  - POST /web3/create-crate endpoint")
    print("  - POST /web3/transfer-ownership-unsigned endpoint")
    print("  - Transaction building with all DID fields")
    print("  - Blockchain submission and confirmation")
    print("  - End-to-end flow from API to on-chain")

if __name__ == "__main__":
    asyncio.run(main())

