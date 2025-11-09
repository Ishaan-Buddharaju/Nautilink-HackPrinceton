"""
Simple working test to submit transactions to Solana devnet
"""
import os
import json
import base64
import asyncio
import requests
from dotenv import load_dotenv
from solders.keypair import Keypair
from solana.rpc.async_api import AsyncClient
from solders.transaction import VersionedTransaction

load_dotenv()

# Configuration
API_BASE_URL = "http://localhost:8000"
SOLANA_RPC = "https://api.devnet.solana.com"
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")

def load_wallet():
    """Load wallet from test_wallet.json"""
    with open('test_wallet.json', 'r') as f:
        keypair_data = json.load(f)
    return Keypair.from_bytes(bytes(keypair_data))

def authenticate():
    """Authenticate with Supabase"""
    print("\n[1/4] Authenticating...")
    response = requests.post(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        json={
            "email": "ethangwang7@gmail.com",
            "password": "test123"
        },
        headers={
            "apikey": SUPABASE_KEY,
            "Content-Type": "application/json"
        }
    )
    
    if response.status_code == 200:
        token = response.json()["access_token"]
        print("      [PASS] Authenticated successfully")
        return token
    else:
        print(f"      [FAIL] Authentication failed: {response.status_code}")
        return None

async def sign_and_send_transaction(tx_base64: str, crate_keypair_b64: str, wallet_keypair: Keypair):
    """Sign and send a transaction to Solana"""
    # Decode transaction
    tx_bytes = base64.b64decode(tx_base64)
    tx = VersionedTransaction.from_bytes(tx_bytes)
    
    # Decode crate keypair
    crate_keypair_bytes = base64.b64decode(crate_keypair_b64)
    crate_keypair = Keypair.from_bytes(crate_keypair_bytes)
    
    # Sign the message with both keypairs
    message_to_sign = bytes(tx.message)
    sig1 = crate_keypair.sign_message(message_to_sign)
    sig2 = wallet_keypair.sign_message(message_to_sign)
    
    # Create fully signed transaction
    signed_tx = VersionedTransaction.populate(tx.message, [sig1, sig2])
    
    # Send transaction
    client = AsyncClient(SOLANA_RPC)
    try:
        result = await client.send_transaction(signed_tx)
        signature = str(result.value)
        
        # Wait for confirmation
        await asyncio.sleep(3)
        confirmation = await client.confirm_transaction(signature)
        
        await client.close()
        return signature, confirmation.value
    except Exception as e:
        await client.close()
        raise e

async def test_create_crate(auth_token: str, wallet_keypair: Keypair):
    """Test creating a crate"""
    print("\n[2/4] Building create crate transaction...")
    
    payload = {
        "crate_id": f"TEST_CRATE_{int(asyncio.get_event_loop().time())}",
        "crate_did": "did:nautilink:crate:test001",
        "owner_did": "did:nautilink:owner:alice",
        "device_did": "did:nautilink:device:scanner01",
        "location": "40.7128,-74.0060",
        "weight": 5000,
        "ipfs_cid": "QmTest123",
        "hash": "abc123hash",
        "solana_wallet": str(wallet_keypair.pubkey())
    }
    
    response = requests.post(
        f"{API_BASE_URL}/web3/create-crate",
        json=payload,
        headers={
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        },
        timeout=30
    )
    
    if response.status_code != 200:
        print(f"      [FAIL] API error: {response.status_code}")
        print(f"        {response.text}")
        return None
    
    data = response.json()
    tx_base64 = data["transaction"]
    crate_keypair_b64 = data["crate_keypair"]
    crate_pubkey = data["crate_pubkey"]
    
    print(f"      [PASS] Transaction built")
    print(f"        Crate: {crate_pubkey}")
    
    print("\n[3/4] Signing and submitting transaction...")
    try:
        signature, confirmed = await sign_and_send_transaction(tx_base64, crate_keypair_b64, wallet_keypair)
        
        if confirmed:
            print(f"      [PASS] Transaction confirmed!")
            print(f"        Signature: {signature}")
            print(f"        Explorer: https://explorer.solana.com/tx/{signature}?cluster=devnet")
            return crate_pubkey
        else:
            print(f"      [FAIL] Transaction not confirmed")
            print(f"        Signature: {signature}")
            return None
            
    except Exception as e:
        print(f"      [FAIL] Transaction failed: {str(e)}")
        return None

async def main():
    """Main test flow"""
    print("=" * 60)
    print("Nautilink Blockchain Test - Simple Version")
    print("=" * 60)
    
    # Load wallet
    print("\n[0/4] Loading wallet...")
    wallet = load_wallet()
    print(f"      [PASS] Wallet loaded: {wallet.pubkey()}")
    
    # Authenticate
    token = authenticate()
    if not token:
        print("\n[FAIL] Test failed: Authentication error")
        return
    
    # Test create crate
    crate_pubkey = await test_create_crate(token, wallet)
    
    if crate_pubkey:
        print("\n" + "=" * 60)
        print("[PASS] TEST PASSED - Crate created on devnet!")
        print("=" * 60)
        print(f"\nCrate Public Key: {crate_pubkey}")
        print(f"View on Explorer: https://explorer.solana.com/address/{crate_pubkey}?cluster=devnet")
    else:
        print("\n" + "=" * 60)
        print("[FAIL] TEST FAILED")
        print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())

