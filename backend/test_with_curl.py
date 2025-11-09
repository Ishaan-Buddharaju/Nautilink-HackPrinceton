"""
Test Nautilink API with Python requests (equivalent to curl)
Then sign and submit transactions to blockchain
"""
import os
import json
import asyncio
import requests
from dotenv import load_dotenv
from solders.keypair import Keypair
from solders.pubkey import Pubkey as PublicKey
from solders.instruction import Instruction, AccountMeta
from solders.transaction import Transaction
from solders.message import Message as SolanaMessage
from solders.system_program import ID as SYSTEM_PROGRAM_ID
from solana.rpc.async_api import AsyncClient
from solders.signature import Signature as SolSignature
import struct
import time

load_dotenv()

# Configuration
API_URL = "http://localhost:8000"
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")
SOLANA_RPC = "https://api.devnet.solana.com"
PROGRAM_ID_STR = "6WVh9yhUaofmUMAsK1EuCJG5ptzZPzKqj7LcFDVzLgnA"

def load_wallet():
    """Load wallet from test_wallet.json"""
    with open('test_wallet.json', 'r') as f:
        keypair_data = json.load(f)
    return Keypair.from_bytes(bytes(keypair_data))

def authenticate():
    """Authenticate with Supabase"""
    print("\n[1/5] Authenticating with Supabase...")
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
        print(f"      [PASS] Authenticated")
        return token
    else:
        print(f"      [FAIL] Authentication failed: {response.status_code}")
        return None

def call_create_crate_api(auth_token: str, wallet_pubkey: str):
    """Call the create-crate API endpoint"""
    print("\n[2/5] Calling POST /web3/create-crate...")
    
    payload = {
        "crate_id": f"CURL_TEST_{int(time.time())}",
        "crate_did": "did:nautilink:crate:curl001",
        "owner_did": "did:nautilink:owner:test",
        "device_did": "did:nautilink:device:scanner01",
        "location": "40.7128,-74.0060",
        "weight": 5000,
        "ipfs_cid": "QmCurlTest123",
        "hash": "curlhash123",
        "solana_wallet": wallet_pubkey
    }
    
    response = requests.post(
        f"{API_URL}/web3/create-crate",
        json=payload,
        headers={
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        },
        timeout=30
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"      [PASS] API returned transaction")
        print(f"      Crate: {data['crate_pubkey']}")
        return data
    else:
        print(f"      [FAIL] API error: {response.status_code}")
        print(f"      {response.text}")
        return None

async def sign_and_submit(tx_base64: str, crate_keypair_b64: str, wallet_keypair: Keypair):
    """Sign and submit a transaction to Solana"""
    import base64
    from solders.transaction import VersionedTransaction
    
    # Decode transaction
    tx_bytes = base64.b64decode(tx_base64)
    
    # Decode crate keypair
    crate_keypair_bytes = base64.b64decode(crate_keypair_b64)
    crate_keypair = Keypair.from_bytes(crate_keypair_bytes)
    
    # Build and sign using native solders (like test_backend_sign.py)
    # Extract the message from VersionedTransaction
    vtx = VersionedTransaction.from_bytes(tx_bytes)
    
    # Get the message and recent blockhash
    message = vtx.message
    
    # Create a regular Transaction with both signers
    tx = Transaction([crate_keypair, wallet_keypair], message, message.recent_blockhash)
    
    # Send transaction
    client = AsyncClient(SOLANA_RPC)
    try:
        result = await client.send_transaction(tx)
        signature = str(result.value)
        
        print(f"      [PASS] Transaction sent!")
        print(f"      Signature: {signature}")
        
        # Wait for confirmation
        print(f"      Waiting for confirmation...")
        await asyncio.sleep(3)
        
        confirmation = await client.confirm_transaction(SolSignature.from_string(signature))
        
        await client.close()
        
        if confirmation.value:
            return signature, True
        else:
            return signature, False
            
    except Exception as e:
        await client.close()
        print(f"      [FAIL] Transaction error: {str(e)}")
        return None, False

async def test_full_flow():
    """Test the complete flow: API call + blockchain submission"""
    print("=" * 60)
    print("Nautilink Full Flow Test (Curl Equivalent + Blockchain)")
    print("=" * 60)
    
    # Load wallet
    print("\n[0/5] Loading wallet...")
    wallet = load_wallet()
    wallet_pubkey = str(wallet.pubkey())
    print(f"      [PASS] Wallet: {wallet_pubkey}")
    
    # Check balance
    client = AsyncClient(SOLANA_RPC)
    balance_resp = await client.get_balance(wallet.pubkey())
    balance = balance_resp.value / 1e9
    await client.close()
    print(f"      Balance: {balance} SOL")
    
    # Authenticate
    token = authenticate()
    if not token:
        return
    
    # Call API
    create_data = call_create_crate_api(token, wallet_pubkey)
    if not create_data:
        return
    
    # Sign and submit
    print("\n[3/5] Signing transaction with both keypairs...")
    tx_base64 = create_data["transaction"]
    crate_keypair_b64 = create_data["crate_keypair"]
    crate_pubkey = create_data["crate_pubkey"]
    
    print("\n[4/5] Submitting to Solana devnet...")
    signature, confirmed = await sign_and_submit(tx_base64, crate_keypair_b64, wallet)
    
    if signature and confirmed:
        print(f"      [PASS] Transaction confirmed!")
        print("\n" + "=" * 60)
        print("[PASS] CRATE MINTED ON DEVNET VIA API!")
        print("=" * 60)
        print(f"\nCrate Address: {crate_pubkey}")
        print(f"Transaction: https://explorer.solana.com/tx/{signature}?cluster=devnet")
        print(f"Account: https://explorer.solana.com/address/{crate_pubkey}?cluster=devnet")
        
        # Test transfer ownership
        await test_transfer_ownership(token, wallet, crate_pubkey)
    else:
        print("\n[FAIL] Transaction not confirmed")

async def test_transfer_ownership(auth_token: str, wallet: Keypair, parent_crate: str):
    """Test transfer ownership endpoint"""
    print("\n" + "=" * 60)
    print("Testing Transfer Ownership")
    print("=" * 60)
    
    print("\n[5/5] Calling POST /web3/transfer-ownership-unsigned...")
    
    payload = {
        "crate_id": f"CHILD_TEST_{int(time.time())}",
        "crate_did": "did:nautilink:crate:curl002",
        "owner_did": "did:nautilink:owner:test",
        "device_did": "did:nautilink:device:scanner01",
        "location": "40.7589,-73.9851",
        "parent_crate_pubkey": parent_crate,
        "weight": 3000,
        "ipfs_cid": "QmCurlTest456",
        "hash": "curlhash456",
        "solana_wallet": str(wallet.pubkey())
    }
    
    response = requests.post(
        f"{API_URL}/web3/transfer-ownership-unsigned",
        json=payload,
        headers={
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        },
        timeout=30
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"      [PASS] API returned transaction")
        print(f"      Child Crate: {data['crate_pubkey']}")
        
        # Sign and submit
        print("\n      Signing and submitting transfer transaction...")
        signature, confirmed = await sign_and_submit(
            data["transaction"],
            data["crate_keypair"],
            wallet
        )
        
        if signature and confirmed:
            print(f"      [PASS] Transfer confirmed!")
            print(f"\nChild Crate: {data['crate_pubkey']}")
            print(f"Transaction: https://explorer.solana.com/tx/{signature}?cluster=devnet")
        else:
            print(f"      [FAIL] Transfer not confirmed")
    else:
        print(f"      [FAIL] API error: {response.status_code}")
        print(f"      {response.text}")

if __name__ == "__main__":
    asyncio.run(test_full_flow())

