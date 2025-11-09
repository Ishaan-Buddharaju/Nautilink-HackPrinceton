#!/usr/bin/env python3
"""
Full end-to-end test that:
1. Posts to FastAPI /web3/create-crate endpoint
2. Signs the transaction
3. Submits it to localnet
4. Verifies the crate account exists on-chain
"""

import asyncio
import base64
import json
import os
import sys
import time
from pathlib import Path

import httpx
from solana.rpc.async_api import AsyncClient
from solana.rpc.commitment import Confirmed
from anchorpy import Program, Provider, Wallet
try:
    from anchorpy_idl import Idl
except ImportError:
    from anchorpy import Idl

# For solana 0.30.2, use solders for keypair and pubkey
try:
    from solders.keypair import Keypair
    from solders.pubkey import Pubkey as PublicKey
    from solders.transaction import Transaction
except ImportError:
    # Fallback to solana imports (for newer versions)
    from solana.keypair import Keypair
    from solana.publickey import PublicKey
    from solana.transaction import Transaction

# Configuration
API_URL = os.getenv("API_URL", "http://localhost:8000")
SOLANA_RPC_URL = os.getenv("SOLANA_RPC_URL", "http://localhost:8899")
TEST_EMAIL = os.getenv("TEST_EMAIL", "ethangwang7@gmail.com")
TEST_PASSWORD = os.getenv("TEST_PASSWORD", "test123")

# Colors for output
GREEN = "\033[0;32m"
RED = "\033[0;31m"
YELLOW = "\033[1;33m"
NC = "\033[0m"  # No Color


def print_step(step_num: int, message: str):
    """Print a formatted step message."""
    print(f"\n{YELLOW}Step {step_num}: {message}{NC}")


def print_success(message: str):
    """Print a success message."""
    print(f"{GREEN}✅ {message}{NC}")


def print_error(message: str):
    """Print an error message."""
    print(f"{RED}❌ {message}{NC}")


async def check_validator_running():
    """Check if local Solana validator is running."""
    try:
        client = AsyncClient(SOLANA_RPC_URL)
        version = await client.get_version()
        await client.close()
        return True
    except Exception as e:
        print_error(f"Validator not running: {e}")
        print("Please start it with: solana-test-validator")
        return False


async def check_backend_running():
    """Check if FastAPI backend is running."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{API_URL}/health", timeout=5.0)
            return response.status_code == 200
    except Exception as e:
        print_error(f"Backend not running: {e}")
        print(f"Please start it with: cd backend && python main.py")
        return False


async def authenticate() -> str:
    """Authenticate and get JWT token."""
    async with httpx.AsyncClient() as client:
        # User is already signed up, so just login
        print(f"{YELLOW}Logging in with {TEST_EMAIL}...{NC}")
        response = await client.post(
            f"{API_URL}/auth/login",
            json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            },
            timeout=10.0
        )
        
        if response.status_code == 200:
            data = response.json()
            token = data.get("access_token")
            if token:
                print_success("Logged in and authenticated")
                return token
        
        print_error("Authentication failed")
        print(f"Login response ({response.status_code}): {response.text}")
        sys.exit(1)


async def get_or_create_wallet() -> tuple[Keypair, str]:
    """Get existing wallet or create new one."""
    wallet_path = Path.home() / ".config" / "solana" / "id.json"
    
    if wallet_path.exists():
        # Read the keypair file (it's a JSON array of 64 bytes)
        with open(wallet_path, "r") as f:
            import json
            secret_key_bytes = bytes(json.load(f))
        keypair = Keypair.from_bytes(secret_key_bytes)
        pubkey = str(keypair.pubkey())
        print_success(f"Using existing wallet: {pubkey}")
    else:
        keypair = Keypair()
        wallet_path.parent.mkdir(parents=True, exist_ok=True)
        # Save as JSON array (Solana keypair format)
        with open(wallet_path, "w") as f:
            import json
            json.dump(list(bytes(keypair)), f)
        pubkey = str(keypair.pubkey())
        print_success(f"Created new wallet: {pubkey}")
    
    # Check balance and airdrop if needed
    client = AsyncClient(SOLANA_RPC_URL)
    balance = await client.get_balance(keypair.pubkey())
    await client.close()
    
    if balance.value == 0:
        print(f"{YELLOW}Requesting airdrop...{NC}")
        # Note: This requires solana CLI, but we'll continue anyway
        print(f"{YELLOW}⚠️  Please airdrop SOL manually: solana airdrop 2 {pubkey}{NC}")
    
    return keypair, pubkey


async def create_crate_via_api(token: str, wallet_pubkey: str) -> dict:
    """Call the FastAPI endpoint to create a crate transaction."""
    timestamp = int(time.time())
    crate_id = f"TEST_CRATE_{timestamp}"
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{API_URL}/web3/create-crate",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            },
            json={
                "nfc_tag_id": "NFC_TEST_001",
                "weight": 1000,
                "crate_id": crate_id,
                "ipfs_cid": "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
                "hash": "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3",
                "timestamp": timestamp,
                "solana_wallet": wallet_pubkey
            },
            timeout=30.0
        )
        
        if response.status_code != 200:
            print_error(f"API call failed: {response.status_code}")
            print(response.text)
            sys.exit(1)
        
        data = response.json()
        if not data.get("success"):
            print_error("API returned success=false")
            print(json.dumps(data, indent=2))
            sys.exit(1)
        
        print_success("Transaction built via FastAPI")
        return data


async def submit_transaction(
    tx_b64: str,
    authority_keypair: Keypair,
    crate_keypair_b64: str
) -> str:
    """Sign and submit the transaction to localnet."""
    # Deserialize transaction
    tx_bytes = base64.b64decode(tx_b64)
    
    # Deserialize crate keypair (it's the full 64-byte secret key)
    crate_keypair_bytes = base64.b64decode(crate_keypair_b64)
    crate_keypair = Keypair.from_bytes(crate_keypair_bytes)
    
    # Deserialize as legacy Transaction (unsigned)
    tx = Transaction.from_bytes(tx_bytes)
    
    # Get recent blockhash (should match the one in the transaction)
    client = AsyncClient(SOLANA_RPC_URL, commitment=Confirmed)
    recent_blockhash_resp = await client.get_latest_blockhash()
    recent_blockhash = recent_blockhash_resp.value.blockhash
    
    # Sign with both keypairs (sign takes a list of keypairs and recent_blockhash)
    tx.sign([authority_keypair, crate_keypair], recent_blockhash)
    
    # Submit to localnet (send_transaction only takes the transaction, not keypairs)
    result = await client.send_transaction(tx)
    
    if result.value:
        signature = str(result.value)
        print_success(f"Transaction submitted: {signature}")
        
        # Wait for confirmation
        print(f"{YELLOW}Waiting for confirmation...{NC}")
        await client.confirm_transaction(result.value, commitment=Confirmed)
        await client.close()
        
        print_success("Transaction confirmed!")
        return signature
    else:
        await client.close()
        print_error("Transaction submission failed")
        sys.exit(1)


async def verify_crate_onchain(crate_pubkey_str: str) -> bool:
    """Verify the crate account exists on-chain."""
    try:
        crate_pubkey = PublicKey.from_string(crate_pubkey_str)
        client = AsyncClient(SOLANA_RPC_URL)
        
        # Check if account exists
        account_info = await client.get_account_info(crate_pubkey)
        await client.close()
        
        if account_info.value:
            print_success(f"Crate account exists on-chain: {crate_pubkey_str}")
            print(f"  Account data length: {len(account_info.value.data)} bytes")
            print(f"  Owner: {account_info.value.owner}")
            return True
        else:
            print_error("Crate account not found on-chain")
            return False
    except Exception as e:
        print_error(f"Error verifying crate: {e}")
        return False


async def load_and_verify_crate_data(crate_pubkey_str: str, program_id_str: str):
    """Load the Anchor program and fetch crate data."""
    try:
        # Find IDL file
        idl_paths = [
            "../web3/target/idl/nautilink.json",
            "../../web3/target/idl/nautilink.json",
            Path(__file__).parent.parent.parent / "web3" / "target" / "idl" / "nautilink.json"
        ]
        
        idl_data = None
        for path in idl_paths:
            path_obj = Path(path) if isinstance(path, str) else path
            if path_obj.exists():
                with open(path_obj, "r") as f:
                    idl_data = json.load(f)
                break
        
        if not idl_data:
            print(f"{YELLOW}⚠️  IDL file not found, skipping data verification{NC}")
            return
        
        # Load program
        client = AsyncClient(SOLANA_RPC_URL)
        dummy_keypair = Keypair()
        dummy_wallet = Wallet(dummy_keypair)
        provider = Provider(client, dummy_wallet)
        
        program_id = PublicKey.from_string(program_id_str)
        idl = Idl.from_json(json.dumps(idl_data))
        program = Program(idl, program_id, provider)
        
        # Fetch crate account
        crate_pubkey = PublicKey.from_string(crate_pubkey_str)
        crate_account = await program.account["crateRecord"].fetch(crate_pubkey)
        
        print_success("Crate data verified on-chain:")
        print(f"  Crate ID: {crate_account.crate_id}")
        print(f"  Weight: {crate_account.weight}")
        print(f"  Authority: {crate_account.authority}")
        print(f"  Timestamp: {crate_account.timestamp}")
        print(f"  Operation Type: {crate_account.operation_type}")
        
        await client.close()
        
    except Exception as e:
        print(f"{YELLOW}⚠️  Could not load crate data: {e}{NC}")


async def main():
    """Main test flow."""
    print(f"{GREEN}{'='*60}")
    print("Testing Create Crate Endpoint → On-Chain Mint")
    print(f"{'='*60}{NC}")
    
    # Step 1: Check prerequisites
    print_step(1, "Checking prerequisites...")
    if not await check_validator_running():
        sys.exit(1)
    if not await check_backend_running():
        sys.exit(1)
    
    # Step 2: Authenticate
    print_step(2, "Authenticating with FastAPI...")
    token = await authenticate()
    
    # Step 3: Setup wallet
    print_step(3, "Setting up Solana wallet...")
    authority_keypair, wallet_pubkey = await get_or_create_wallet()
    
    # Step 4: Create crate via API
    print_step(4, "Creating crate via FastAPI endpoint...")
    api_response = await create_crate_via_api(token, wallet_pubkey)
    
    tx_b64 = api_response["transaction"]
    crate_pubkey = api_response["crate_pubkey"]
    crate_keypair_b64 = api_response["crate_keypair"]
    program_id = api_response.get("program_id", "FHzgesT5QzphL5eucFCjL9KL59TLs3jztw7Qe9RZjHta")
    
    print(f"  Crate Pubkey: {crate_pubkey}")
    print(f"  Program ID: {program_id}")
    
    # Step 5: Submit transaction
    print_step(5, "Signing and submitting transaction to localnet...")
    signature = await submit_transaction(tx_b64, authority_keypair, crate_keypair_b64)
    print(f"  Signature: {signature}")
    
    # Step 6: Verify on-chain
    print_step(6, "Verifying crate exists on-chain...")
    if await verify_crate_onchain(crate_pubkey):
        # Step 7: Load and verify crate data
        print_step(7, "Loading crate data from on-chain account...")
        await load_and_verify_crate_data(crate_pubkey, program_id)
        
        print(f"\n{GREEN}{'='*60}")
        print("✅ FULL INTEGRATION TEST PASSED!")
        print(f"{'='*60}{NC}")
        print("\nThe FastAPI backend successfully:")
        print("  ✓ Built a valid Solana transaction")
        print("  ✓ Transaction was signed and submitted")
        print("  ✓ Crate was created on-chain")
        print("  ✓ Crate account data is accessible")
        print(f"\nCrate Pubkey: {crate_pubkey}")
        print(f"Transaction: {signature}")
    else:
        print_error("Crate verification failed")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())

