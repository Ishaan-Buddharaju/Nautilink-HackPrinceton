"""
Test script for validating FastAPI + Blockchain integration
Tests both create_crate and transfer_ownership endpoints end-to-end
"""
import os
import sys
import time
import requests
from dotenv import load_dotenv
from solders.keypair import Keypair
from solders.pubkey import Pubkey as PublicKey
from solana.rpc.api import Client
from solders.signature import Signature

# Load environment variables
load_dotenv()

# Configuration
API_BASE_URL = "http://localhost:8000"
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")  # Use SUPABASE_ANON_KEY from .env
SOLANA_RPC = "https://api.devnet.solana.com"
PROGRAM_ID = "6WVh9yhUaofmUMAsK1EuCJG5ptzZPzKqj7LcFDVzLgnA"

# Test credentials
TEST_EMAIL = "ethangwang7@gmail.com"
TEST_PASSWORD = "test123"

# Verify environment variables are loaded
if not SUPABASE_URL or not SUPABASE_KEY:
    print("\n[ERROR] Missing environment variables!")
    print(f"SUPABASE_URL: {'PASS' if SUPABASE_URL else ' Missing'}")
    print(f"SUPABASE_ANON_KEY: {'PASS' if SUPABASE_KEY else ' Missing'}")
    print("\nMake sure you have a .env file in the backend directory with:")
    print("  SUPABASE_URL=https://kbybqxergznphfrdzxmm.supabase.co")
    print("  SUPABASE_ANON_KEY=your_anon_key_here")
    sys.exit(1)

# Colors for output
RESET = "\033[0m"
GREEN = "\033[92m"
RED = "\033[91m"
BLUE = "\033[94m"
YELLOW = "\033[93m"


def print_section(title):
    """Print a section header"""
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}{title}{RESET}")
    print(f"{BLUE}{'='*60}{RESET}")


def print_result(test_name, passed, details=""):
    """Print test result without Unicode symbols"""
    status = f"{GREEN}[PASS]{RESET}" if passed else f"{RED}[FAIL]{RESET}"
    print(f"{status} {test_name}")
    if details:
        print(f"      {details}")


def get_auth_token():
    """Get JWT token from Supabase"""
    print_section("STEP 1: Authentication")
    
    try:
        response = requests.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            },
            headers={
                "apikey": SUPABASE_KEY,
                "Content-Type": "application/json"
            }
        )
        
        if response.status_code == 200:
            token = response.json()["access_token"]
            print_result("Supabase authentication", True, f"Token received")
            return token
        else:
            print_result("Supabase authentication", False, f"Status: {response.status_code}")
            print(f"      Response: {response.text}")
            return None
            
    except Exception as e:
        print_result("Supabase authentication", False, str(e))
        return None


def load_test_wallet():
    """Load the test wallet"""
    print_section("STEP 2: Wallet Setup")
    
    # Use the funded wallet provided
    wallet_address = "4oi4ZELW4QG6ntpeAcMMX676TNJiZJB7b44wjZ6L6duZ"
    
    # Check if we have the keypair file
    wallet_file = "test_wallet.json"
    if os.path.exists(wallet_file):
        import json
        with open(wallet_file, 'r') as f:
            keypair_data = json.load(f)
        keypair = Keypair.from_bytes(bytes(keypair_data))
        print_result("Load wallet from file", True, f"Address: {keypair.pubkey()}")
        return keypair
    else:
        print_result("Load wallet", False, f"Wallet file not found: {wallet_file}")
        print(f"      Using address: {wallet_address} (signing will not work)")
        return None


def test_create_crate(auth_token, wallet_keypair):
    """Test create_crate endpoint"""
    print_section("STEP 3: Test Create Crate")
    
    if not auth_token or not wallet_keypair:
        print_result("Create crate test", False, "Missing auth token or wallet")
        return None
    
    # Generate unique crate ID
    crate_id = f"TEST_CRATE_{int(time.time())}"
    
    payload = {
        "crate_id": crate_id,
        "crate_did": f"did:nautilink:crate:{crate_id}",
        "owner_did": "did:nautilink:user:test_owner",
        "device_did": "did:nautilink:device:scanner001",
        "location": "40.3573,-74.6672",
        "weight": 1500,
        "ipfs_cid": "QmTest123456789",
        "hash": "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3",
        "solana_wallet": str(wallet_keypair.pubkey())
    }
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/web3/create-crate",
            json=payload,
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            
            # Get the transaction
            tx_base64 = data.get("transaction")
            crate_pubkey = data.get("crate_pubkey")
            crate_keypair_b64 = data.get("crate_keypair")
            
            print_result("API build transaction", True, f"Crate pubkey: {crate_pubkey}")
            
            # Sign and send transaction
            from solana.rpc.api import Client
            from solders.transaction import VersionedTransaction
            from solders.keypair import Keypair as SoldersKeypair
            import base64
            
            client = Client(SOLANA_RPC)
            
            # Decode transaction
            tx_bytes = base64.b64decode(tx_base64)
            tx = VersionedTransaction.from_bytes(tx_bytes)
            
            # Decode crate keypair for signing
            crate_keypair_bytes = base64.b64decode(crate_keypair_b64)
            crate_keypair = SoldersKeypair.from_bytes(crate_keypair_bytes)
            
            # Sign the message with both keypairs
            message_to_sign = bytes(tx.message)
            sig1 = crate_keypair.sign_message(message_to_sign)
            sig2 = wallet_keypair.sign_message(message_to_sign)
            
            # Create signed transaction
            signed_tx = VersionedTransaction.populate(tx.message, [sig1, sig2])
            
            # Send transaction
            result = client.send_raw_transaction(bytes(signed_tx))
            signature = str(result.value)
            
            print_result("Submit transaction", True, f"Signature: {signature[:16]}...")
            
            # Wait for confirmation
            time.sleep(2)
            confirm_result = client.confirm_transaction(Signature.from_string(signature))
            
            if confirm_result.value:
                print_result("Transaction confirmed", True)
                print(f"      Explorer: https://explorer.solana.com/tx/{signature}?cluster=devnet")
                return crate_pubkey
            else:
                print_result("Transaction confirmed", False, "Not confirmed")
                return None
                
        else:
            print_result("Create crate API call", False, f"Status: {response.status_code}")
            print(f"      Response: {response.text}")
            return None
            
    except Exception as e:
        print_result("Create crate test", False, str(e))
        import traceback
        traceback.print_exc()
        return None


def test_transfer_ownership(auth_token, wallet_keypair, parent_crate_pubkey):
    """Test transfer_ownership endpoint"""
    print_section("STEP 4: Test Transfer Ownership")
    
    if not auth_token or not wallet_keypair or not parent_crate_pubkey:
        print_result("Transfer ownership test", False, "Missing required parameters")
        return False
    
    # Generate unique crate ID for the transfer
    crate_id = f"TEST_TRANSFER_{int(time.time())}"
    
    payload = {
        "crate_id": crate_id,
        "crate_did": f"did:nautilink:crate:{crate_id}",
        "owner_did": "did:nautilink:user:new_owner",
        "device_did": "did:nautilink:device:scanner002",
        "location": "40.3580,-74.6680",
        "weight": 1500,  # Must match parent weight
        "ipfs_cid": "QmTransfer123456789",
        "hash": "b775a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae4",
        "parent_crate_pubkey": parent_crate_pubkey,
        "solana_wallet": str(wallet_keypair.pubkey())
    }
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/web3/transfer-ownership-unsigned",
            json=payload,
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            
            # Get the transaction
            tx_base64 = data.get("transaction")
            new_crate_pubkey = data.get("crate_pubkey")
            crate_keypair_b64 = data.get("crate_keypair")
            
            print_result("API build transfer transaction", True, f"New crate: {new_crate_pubkey}")
            
            # Sign and send transaction
            from solana.rpc.api import Client
            from solders.transaction import VersionedTransaction
            from solders.keypair import Keypair as SoldersKeypair
            import base64
            
            client = Client(SOLANA_RPC)
            
            # Decode transaction
            tx_bytes = base64.b64decode(tx_base64)
            tx = VersionedTransaction.from_bytes(tx_bytes)
            
            # Decode crate keypair for signing
            crate_keypair_bytes = base64.b64decode(crate_keypair_b64)
            crate_keypair = SoldersKeypair.from_bytes(crate_keypair_bytes)
            
            # Sign with both keypairs
            signers = [crate_keypair, wallet_keypair]
            signed_tx = VersionedTransaction.populate(tx.message, signers)
            
            # Send transaction
            result = client.send_raw_transaction(bytes(signed_tx))
            signature = str(result.value)
            
            print_result("Submit transfer transaction", True, f"Signature: {signature[:16]}...")
            
            # Wait for confirmation
            time.sleep(2)
            confirm_result = client.confirm_transaction(Signature.from_string(signature))
            
            if confirm_result.value:
                print_result("Transfer confirmed", True)
                print(f"      Explorer: https://explorer.solana.com/tx/{signature}?cluster=devnet")
                return True
            else:
                print_result("Transfer confirmed", False, "Not confirmed")
                return False
                
        else:
            print_result("Transfer ownership API call", False, f"Status: {response.status_code}")
            print(f"      Response: {response.text}")
            return False
            
    except Exception as e:
        print_result("Transfer ownership test", False, str(e))
        import traceback
        traceback.print_exc()
        return False


def main():
    """Main test execution"""
    print(f"\n{YELLOW}{'='*60}{RESET}")
    print(f"{YELLOW}Nautilink API + Blockchain Integration Test{RESET}")
    print(f"{YELLOW}{'='*60}{RESET}")
    print(f"API: {API_BASE_URL}")
    print(f"Solana RPC: {SOLANA_RPC}")
    print(f"Program ID: {PROGRAM_ID}")
    
    # Step 1: Get auth token
    auth_token = get_auth_token()
    if not auth_token:
        print(f"\n{RED}FAILED: Could not authenticate{RESET}")
        return 1
    
    # Step 2: Load wallet
    wallet_keypair = load_test_wallet()
    if not wallet_keypair:
        print(f"\n{RED}FAILED: Could not load wallet{RESET}")
        return 1
    
    # Check wallet balance
    try:
        client = Client(SOLANA_RPC)
        balance = client.get_balance(wallet_keypair.pubkey()).value / 1e9
        print(f"      Balance: {balance:.4f} SOL")
        
        if balance < 0.01:
            print(f"      {YELLOW}WARNING: Low balance, may need airdrop{RESET}")
    except Exception as e:
        print(f"      {YELLOW}Could not check balance: {e}{RESET}")
    
    # Step 3: Test create crate
    crate_pubkey = test_create_crate(auth_token, wallet_keypair)
    if not crate_pubkey:
        print(f"\n{RED}FAILED: Could not create crate{RESET}")
        return 1
    
    # Step 4: Test transfer ownership
    transfer_success = test_transfer_ownership(auth_token, wallet_keypair, crate_pubkey)
    if not transfer_success:
        print(f"\n{YELLOW}WARNING: Transfer test failed (but create worked){RESET}")
    
    # Final summary
    print_section("FINAL SUMMARY")
    
    if crate_pubkey and transfer_success:
        print(f"{GREEN}[PASS] All tests passed!{RESET}\n")
        print("What was validated:")
        print("  - API authentication with Supabase")
        print("  - POST /web3/create-crate endpoint")
        print("  - POST /web3/transfer-ownership-unsigned endpoint")
        print("  - Transaction building with all DID fields")
        print("  - Blockchain submission and confirmation")
        print("  - End-to-end flow from API to on-chain")
        return 0
    elif crate_pubkey:
        print(f"{YELLOW}[PARTIAL] Create crate passed, transfer failed{RESET}")
        return 1
    else:
        print(f"{RED}[FAIL] Tests failed{RESET}")
        return 1


if __name__ == "__main__":
    sys.exit(main())

