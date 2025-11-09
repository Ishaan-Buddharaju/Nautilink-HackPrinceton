#!/usr/bin/env python3
"""
Test script for validating on-chain blockchain interactions
This tests actual transaction submission to Solana devnet

Set SKIP_BLOCKCHAIN=1 to only test transaction building without submission
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

# Load environment variables
load_dotenv()

API_BASE = "http://localhost:8000"
EMAIL = "ethangwang7@gmail.com"
PASSWORD = "test123"
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SOLANA_RPC_URL = os.getenv("SOLANA_RPC_URL", "https://api.devnet.solana.com")
SKIP_BLOCKCHAIN = os.getenv("SKIP_BLOCKCHAIN", "0") == "1"

def print_section(title):
    print(f"\n{'='*60}")
    print(f"{title}")
    print('='*60)

def print_result(success, message):
    symbol = "[PASS]" if success else "[FAIL]"
    print(f"{symbol} {message}")

async def fund_wallet_if_needed(keypair, client, required_sol=2.0):
    """Request airdrop if wallet balance is low"""
    try:
        balance = await client.get_balance(keypair.pubkey())
        balance_sol = balance.value / 1_000_000_000
        print(f"Wallet balance: {balance_sol} SOL")
        
        if balance_sol < 0.5:
            print(f"Balance too low, requesting airdrop ({required_sol} SOL)...")
            
            # Try airdrop with retries
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    airdrop_amount = int(required_sol * 1_000_000_000)
                    airdrop_sig = await client.request_airdrop(keypair.pubkey(), airdrop_amount)
                    print(f"Airdrop signature: {airdrop_sig.value}")
                    
                    # Wait for confirmation
                    await asyncio.sleep(2)
                    await client.confirm_transaction(airdrop_sig.value)
                    
                    # Check new balance
                    new_balance = await client.get_balance(keypair.pubkey())
                    new_balance_sol = new_balance.value / 1_000_000_000
                    print(f"New balance: {new_balance_sol} SOL")
                    
                    if new_balance_sol >= 0.5:
                        print("[PASS] Wallet funded successfully")
                        return True
                    else:
                        print(f"Balance still low, retry {attempt + 1}/{max_retries}")
                        await asyncio.sleep(5)
                        
                except Exception as e:
                    print(f"Airdrop attempt {attempt + 1} failed: {e}")
                    if attempt < max_retries - 1:
                        await asyncio.sleep(5)
            
            # Final balance check
            final_balance = await client.get_balance(keypair.pubkey())
            final_balance_sol = final_balance.value / 1_000_000_000
            
            if final_balance_sol < 0.1:
                print(f"[FAIL] Unable to fund wallet after {max_retries} attempts")
                print(f"Current balance: {final_balance_sol} SOL")
                print(f"\nManual funding required:")
                print(f"Visit: https://faucet.solana.com")
                print(f"Or run: solana airdrop 2 {keypair.pubkey()}")
                return False
                
        return True
        
    except Exception as e:
        print(f"[FAIL] Error funding wallet: {e}")
        return False

async def verify_transaction_on_chain(client, signature):
    """Verify a transaction was confirmed on-chain"""
    try:
        result = await client.get_transaction(signature)
        if result.value:
            print_result(True, f"Transaction verified on-chain")
            return True
        else:
            print_result(False, f"Transaction not found on-chain")
            return False
    except Exception as e:
        print_result(False, f"Error verifying transaction: {e}")
        return False

async def main():
    print_section("Blockchain Interaction Testing")
    print(f"Solana RPC: {SOLANA_RPC_URL}")
    print(f"API Base: {API_BASE}")
    
    if SKIP_BLOCKCHAIN:
        print("\n[INFO] SKIP_BLOCKCHAIN enabled - will only test transaction building")
        print("[INFO] Transactions will NOT be submitted to blockchain")
    
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        print("[FAIL] Missing Supabase credentials")
        sys.exit(1)
    
    # 1. Login to get JWT
    print_section("1. Authenticate with Supabase")
    try:
        login_response = requests.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers={
                "apikey": SUPABASE_ANON_KEY,
                "Content-Type": "application/json"
            },
            json={
                "email": EMAIL,
                "password": PASSWORD
            }
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
    
    # 2. Create keypair for authority (wallet that will own crates)
    print_section("2. Setup Solana Wallet")
    authority_keypair = Keypair()
    authority_pubkey = str(authority_keypair.pubkey())
    print(f"Authority wallet: {authority_pubkey}")
    
    # Fund the wallet
    client = AsyncClient(SOLANA_RPC_URL)
    
    if not SKIP_BLOCKCHAIN:
        funded = await fund_wallet_if_needed(authority_keypair, client, required_sol=2.0)
        if not funded:
            print("[FAIL] Cannot proceed without funded wallet")
            print("[INFO] Run with SKIP_BLOCKCHAIN=1 to test without blockchain submission")
            await client.close()
            sys.exit(1)
    else:
        print("[INFO] Skipping wallet funding (SKIP_BLOCKCHAIN mode)")
    
    # 3. Test CREATE CRATE with server-side signing (end-to-end)
    print_section("3. Test CREATE CRATE (build transaction)")
    try:
        create_data = {
            "crate_id": "BLOCKCHAIN_TEST_001",
            "crate_did": "did:nautilink:crate:blockchain001",
            "owner_did": "did:nautilink:user:testuser",
            "device_did": "did:nautilink:device:nfc001",
            "location": "40.7128,-74.0060",
            "weight": 5000,
            "ipfs_cid": "QmTestBlockchainCID123",
            "hash": "abc123def456blockchaintest",
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
        
        # Deserialize and sign transaction
        tx_bytes = base64.b64decode(result["transaction"])
        tx = Transaction.from_bytes(tx_bytes)
        
        crate_kp_bytes = base64.b64decode(result["crate_keypair"])
        crate_keypair = Keypair.from_bytes(crate_kp_bytes)
        
        crate_pubkey = result["crate_pubkey"]
        print(f"Crate account: {crate_pubkey}")
        
        if SKIP_BLOCKCHAIN:
            print("[INFO] Skipping blockchain submission (SKIP_BLOCKCHAIN mode)")
            print_result(True, "CREATE CRATE transaction built successfully")
            print(f"Transaction size: {len(bytes(tx))} bytes")
        else:
            # Sign with both keypairs
            tx.sign([crate_keypair, authority_keypair], tx.message.recent_blockhash)
            
            # Submit to blockchain
            print("Submitting transaction to blockchain...")
            send_result = await client.send_raw_transaction(bytes(tx))
            signature = str(send_result.value)
            print(f"Transaction signature: {signature}")
            
            # Wait for confirmation
            print("Waiting for confirmation...")
            confirmation = await client.confirm_transaction(signature)
            print_result(True, f"CREATE CRATE confirmed on-chain")
            
            explorer_url = f"https://explorer.solana.com/tx/{signature}?cluster=devnet"
            print(f"View on explorer: {explorer_url}")
            
            # Verify on-chain
            await verify_transaction_on_chain(client, signature)
        
    except Exception as e:
        print_result(False, f"CREATE CRATE blockchain error: {e}")
        import traceback
        traceback.print_exc()
        await client.close()
        sys.exit(1)
    
    # 4. Test TRANSFER OWNERSHIP
    print_section("4. Test TRANSFER OWNERSHIP (build and submit)")
    try:
        # Create new owner keypair
        new_owner_keypair = Keypair()
        new_owner_pubkey = str(new_owner_keypair.pubkey())
        print(f"New owner wallet: {new_owner_pubkey}")
        
        # Fund new owner
        if not SKIP_BLOCKCHAIN:
            funded = await fund_wallet_if_needed(new_owner_keypair, client, required_sol=2.0)
            if not funded:
                print("[FAIL] Cannot fund new owner wallet, skipping transfer test")
                await client.close()
                return
        else:
            print("[INFO] Skipping wallet funding for new owner (SKIP_BLOCKCHAIN mode)")
        
        transfer_data = {
            "parent_crate_pubkey": crate_pubkey,
            "crate_id": "BLOCKCHAIN_TEST_002",
            "crate_did": "did:nautilink:crate:blockchain002",
            "owner_did": "did:nautilink:user:newowner",
            "device_did": "did:nautilink:device:nfc002",
            "location": "40.7580,-73.9855",
            "weight": 5000,  # Must match parent
            "hash": "xyz789transfer",
            "ipfs_cid": "QmTestTransferCID456",
            "solana_wallet": new_owner_pubkey
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
        
        if SKIP_BLOCKCHAIN:
            print("[INFO] Skipping blockchain submission (SKIP_BLOCKCHAIN mode)")
            print_result(True, "TRANSFER OWNERSHIP transaction built successfully")
            print(f"Transaction size: {len(bytes(tx))} bytes")
        else:
            # Sign with both keypairs
            tx.sign([new_crate_keypair, new_owner_keypair], tx.message.recent_blockhash)
            
            # Submit
            print("Submitting transfer transaction...")
            send_result = await client.send_raw_transaction(bytes(tx))
            signature = str(send_result.value)
            print(f"Transaction signature: {signature}")
            
            # Confirm
            print("Waiting for confirmation...")
            confirmation = await client.confirm_transaction(signature)
            print_result(True, f"TRANSFER OWNERSHIP confirmed on-chain")
            
            explorer_url = f"https://explorer.solana.com/tx/{signature}?cluster=devnet"
            print(f"View on explorer: {explorer_url}")
            
            # Verify
            await verify_transaction_on_chain(client, signature)
        
    except Exception as e:
        print_result(False, f"TRANSFER OWNERSHIP blockchain error: {e}")
        import traceback
        traceback.print_exc()
    
    await client.close()
    
    print_section("Blockchain Test Summary")
    if SKIP_BLOCKCHAIN:
        print("All transaction building operations tested")
        print("Transactions were NOT submitted to blockchain (SKIP_BLOCKCHAIN mode)")
        print("\nTo test actual blockchain submission:")
        print("Run without SKIP_BLOCKCHAIN=1")
    else:
        print("All on-chain operations tested")
        print("Check Solana Explorer links above to verify transactions")

if __name__ == "__main__":
    asyncio.run(main())

