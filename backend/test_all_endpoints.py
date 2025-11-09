#!/usr/bin/env python3
"""
Comprehensive test of all API endpoints
Tests both API functionality and blockchain integration
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
    print(f"\n{'='*70}")
    print(f"{title}")
    print('='*70)

def print_result(success, message):
    symbol = "[PASS]" if success else "[FAIL]"
    print(f"{symbol} {message}")

def load_wallet():
    with open(WALLET_FILE, 'r') as f:
        data = json.load(f)
        return Keypair.from_bytes(bytes(data))

async def test_get_all_posts(headers):
    """Test GET /web3/get-all-posts"""
    print_section("Test 1: GET /web3/get-all-posts")
    try:
        response = requests.get(
            f"{API_BASE}/web3/get-all-posts",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            print_result(True, "GET endpoint working")
            print(f"Response: {result}")
            return True
        else:
            print_result(False, f"Status code: {response.status_code}")
            return False
    except Exception as e:
        print_result(False, f"Error: {e}")
        return False

async def test_create_crate(headers, authority_keypair, client):
    """Test POST /web3/create-crate with blockchain"""
    print_section("Test 2: POST /web3/create-crate (with blockchain)")
    
    authority_pubkey = str(authority_keypair.pubkey())
    
    try:
        create_data = {
            "crate_id": "FULL_TEST_001",
            "crate_did": "did:nautilink:crate:fulltest001",
            "owner_did": "did:nautilink:user:fulltest",
            "device_did": "did:nautilink:device:nfc001",
            "location": "40.7128,-74.0060",
            "weight": 5000,
            "ipfs_cid": "QmFullTestCID001",
            "hash": "fulltest001hash",
            "solana_wallet": authority_pubkey
        }
        
        print("Calling API...")
        response = requests.post(
            f"{API_BASE}/web3/create-crate",
            headers=headers,
            json=create_data,
            timeout=10
        )
        
        if response.status_code != 200:
            print_result(False, f"API returned {response.status_code}")
            print(response.text)
            return None
        
        result = response.json()
        
        if not result.get("success"):
            print_result(False, f"API call failed: {result}")
            return None
        
        print_result(True, "API returned transaction")
        print(f"  Crate account: {result['crate_pubkey']}")
        print(f"  JWT validated: {result['validated']}")
        
        # Sign and submit
        print("Signing and submitting to blockchain...")
        tx_bytes = base64.b64decode(result["transaction"])
        tx = Transaction.from_bytes(tx_bytes)
        
        crate_kp_bytes = base64.b64decode(result["crate_keypair"])
        crate_keypair = Keypair.from_bytes(crate_kp_bytes)
        
        tx.sign([crate_keypair, authority_keypair], tx.message.recent_blockhash)
        
        send_result = await client.send_raw_transaction(bytes(tx))
        signature = str(send_result.value)
        
        await client.confirm_transaction(Signature.from_string(signature))
        print_result(True, "CREATE CRATE confirmed on-chain")
        print(f"  Signature: {signature}")
        print(f"  Explorer: https://explorer.solana.com/tx/{signature}?cluster=devnet")
        
        return result['crate_pubkey']
        
    except Exception as e:
        print_result(False, f"Error: {e}")
        import traceback
        traceback.print_exc()
        return None

async def test_transfer_ownership_unsigned(headers, authority_keypair, parent_crate, client):
    """Test POST /web3/transfer-ownership-unsigned with blockchain"""
    print_section("Test 3: POST /web3/transfer-ownership-unsigned (with blockchain)")
    
    authority_pubkey = str(authority_keypair.pubkey())
    
    try:
        transfer_data = {
            "parent_crate_pubkey": parent_crate,
            "crate_id": "FULL_TEST_002",
            "crate_did": "did:nautilink:crate:fulltest002",
            "owner_did": "did:nautilink:user:newowner",
            "device_did": "did:nautilink:device:nfc002",
            "location": "40.7580,-73.9855",
            "weight": 5000,
            "hash": "fulltest002hash",
            "ipfs_cid": "QmFullTestTransfer002",
            "solana_wallet": authority_pubkey
        }
        
        print("Calling API...")
        response = requests.post(
            f"{API_BASE}/web3/transfer-ownership-unsigned",
            headers=headers,
            json=transfer_data,
            timeout=10
        )
        
        if response.status_code != 200:
            print_result(False, f"API returned {response.status_code}")
            print(response.text)
            return False
        
        result = response.json()
        
        if not result.get("success"):
            print_result(False, f"API call failed: {result}")
            return False
        
        print_result(True, "API returned transfer transaction")
        print(f"  New crate: {result['crate_pubkey']}")
        print(f"  Parent: {result['parent_crate']}")
        
        # Sign and submit
        print("Signing and submitting to blockchain...")
        tx_bytes = base64.b64decode(result["transaction"])
        tx = Transaction.from_bytes(tx_bytes)
        
        crate_kp_bytes = base64.b64decode(result["crate_keypair"])
        new_crate_keypair = Keypair.from_bytes(crate_kp_bytes)
        
        tx.sign([new_crate_keypair, authority_keypair], tx.message.recent_blockhash)
        
        send_result = await client.send_raw_transaction(bytes(tx))
        signature = str(send_result.value)
        
        await client.confirm_transaction(Signature.from_string(signature))
        print_result(True, "TRANSFER OWNERSHIP confirmed on-chain")
        print(f"  Signature: {signature}")
        print(f"  Explorer: https://explorer.solana.com/tx/{signature}?cluster=devnet")
        
        return True
        
    except Exception as e:
        print_result(False, f"Error: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_transfer_ownership_onchain(headers, parent_crate):
    """Test POST /web3/transfer-ownership (server-side signing)"""
    print_section("Test 4: POST /web3/transfer-ownership (server-side signing)")
    
    try:
        transfer_data = {
            "parent_crate_pubkey": parent_crate,
            "crate_id": "FULL_TEST_003",
            "crate_did": "did:nautilink:crate:fulltest003",
            "owner_did": "did:nautilink:user:serverowner",
            "device_did": "did:nautilink:device:nfc003",
            "location": "40.7589,-73.9851",
            "weight": 5000,
            "hash": "fulltest003hash",
            "ipfs_cid": "QmFullTestServerTransfer003"
        }
        
        print("Calling API (server will sign and submit)...")
        response = requests.post(
            f"{API_BASE}/web3/transfer-ownership",
            headers=headers,
            json=transfer_data,
            timeout=30  # Longer timeout since server does everything
        )
        
        if response.status_code != 200:
            print_result(False, f"API returned {response.status_code}")
            print(response.text)
            return False
        
        result = response.json()
        
        if not result.get("success"):
            print_result(False, f"API call failed: {result}")
            return False
        
        print_result(True, "Server-side transfer completed")
        print(f"  New crate: {result['crate_pubkey']}")
        print(f"  Parent: {result['parent_crate']}")
        print(f"  Signature: {result['transaction_signature']}")
        print(f"  Explorer: {result['explorer_url']}")
        
        return True
        
    except Exception as e:
        print_result(False, f"Error: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    print("="*70)
    print(" "*15 + "COMPREHENSIVE API ENDPOINT TEST")
    print("="*70)
    print(f"API: {API_BASE}")
    print(f"Blockchain: {SOLANA_RPC_URL}")
    print("\nThis will test ALL endpoints with full blockchain integration")
    
    # Login
    print_section("Authentication")
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
        print_result(True, "Authenticated with Supabase")
        
    except Exception as e:
        print_result(False, f"Login error: {e}")
        sys.exit(1)
    
    headers = {
        "Authorization": f"Bearer {jwt_token}",
        "Content-Type": "application/json"
    }
    
    # Load wallet
    print("\nLoading test wallet...")
    authority_keypair = load_wallet()
    authority_pubkey = str(authority_keypair.pubkey())
    print(f"Wallet: {authority_pubkey}")
    
    client = AsyncClient(SOLANA_RPC_URL)
    balance = await client.get_balance(authority_keypair.pubkey())
    balance_sol = balance.value / 1_000_000_000
    print(f"Balance: {balance_sol} SOL")
    
    if balance_sol < 0.1:
        print_result(False, "Insufficient balance")
        await client.close()
        sys.exit(1)
    
    # Test all endpoints
    results = {
        "get_all_posts": False,
        "create_crate": False,
        "transfer_unsigned": False,
        "transfer_onchain": False
    }
    
    # Test 1: GET endpoint
    results["get_all_posts"] = await test_get_all_posts(headers)
    
    # Test 2: CREATE CRATE
    crate_pubkey = await test_create_crate(headers, authority_keypair, client)
    results["create_crate"] = crate_pubkey is not None
    
    if crate_pubkey:
        # Test 3: TRANSFER OWNERSHIP (unsigned)
        results["transfer_unsigned"] = await test_transfer_ownership_unsigned(
            headers, authority_keypair, crate_pubkey, client
        )
        
        # Test 4: TRANSFER OWNERSHIP (server-side)
        results["transfer_onchain"] = await test_transfer_ownership_onchain(
            headers, crate_pubkey
        )
    
    # Final balance
    balance = await client.get_balance(authority_keypair.pubkey())
    balance_sol = balance.value / 1_000_000_000
    print(f"\nFinal balance: {balance_sol} SOL")
    
    await client.close()
    
    # Summary
    print_section("TEST SUMMARY")
    print(f"GET  /web3/get-all-posts:                  {'[PASS]' if results['get_all_posts'] else '[FAIL]'}")
    print(f"POST /web3/create-crate:                   {'[PASS]' if results['create_crate'] else '[FAIL]'}")
    print(f"POST /web3/transfer-ownership-unsigned:    {'[PASS]' if results['transfer_unsigned'] else '[FAIL]'}")
    print(f"POST /web3/transfer-ownership:             {'[PASS]' if results['transfer_onchain'] else '[FAIL]'}")
    
    total = sum(results.values())
    print(f"\nTotal: {total}/4 endpoints passed")
    
    if total == 4:
        print("\n" + "="*70)
        print(" "*20 + "ALL TESTS PASSED! ✓")
        print("="*70)
        print("\nYour API is fully functional with blockchain integration!")
    else:
        print("\n" + "="*70)
        print(f" "*15 + f"{4-total} TEST(S) FAILED")
        print("="*70)

if __name__ == "__main__":
    asyncio.run(main())

