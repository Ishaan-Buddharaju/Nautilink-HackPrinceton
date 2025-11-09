"""
Test transfer ownership endpoint with user credentials.
"""

import sys
import os
import requests
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from config import settings
from supabase import create_client


def get_jwt_token(email, password):
    """Get JWT token by signing in to Supabase."""
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    
    try:
        print(f"Authenticating as {email}...")
        response = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
        
        if response.session:
            print("[SUCCESS] Authentication successful!")
            print(f"User ID: {response.user.id}")
            print(f"Email: {response.user.email}")
            return response.session.access_token
        else:
            print("[FAIL] Authentication failed - no session returned")
            return None
            
    except Exception as e:
        print(f"[ERROR] Authentication failed: {e}")
        return None


def test_transfer_ownership(jwt_token):
    """Test the transfer ownership endpoint."""
    
    url = "http://127.0.0.1:8000/web3/transfer-ownership"
    
    headers = {
        "Authorization": f"Bearer {jwt_token}",
        "Content-Type": "application/json"
    }
    
    # Test data - using values from Phase 2 validation
    payload = {
        "parent_crate_pubkey": "DtHLdSPxNwFw31JK8AYNiJx8r1YkQYcTw11qmH99HKYp",
        "crate_id": "CRATE_TEST_003",
        "weight": 1500,
        "hash": "b665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae4",
        "ipfs_cid": "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
        "solana_wallet": "6ZTB7UovQqYZmE37uRuBjQoPtvZHx2Par4rhD7mp8ge4"
    }
    
    print("\n" + "=" * 80)
    print("MAKING POST REQUEST")
    print("=" * 80)
    print(f"\nURL: {url}")
    print(f"\nPayload:")
    print(json.dumps(payload, indent=2))
    print("\nSending request...")
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=15)
        
        print("\n" + "=" * 80)
        print(f"RESPONSE - Status Code: {response.status_code}")
        print("=" * 80)
        
        if response.status_code == 200:
            data = response.json()
            print("\n*** SUCCESS ***\n")
            print(json.dumps(data, indent=2))
            
            print("\n" + "=" * 80)
            print("KEY INFORMATION:")
            print("=" * 80)
            print(f"Success: {data.get('success')}")
            print(f"Message: {data.get('message')}")
            print(f"Crate ID: {data.get('crate_id')}")
            print(f"New Crate Pubkey: {data.get('crate_pubkey')}")
            print(f"Parent Crate: {data.get('parent_crate')}")
            print(f"User ID: {data.get('user_id')}")
            print(f"Transaction Length: {len(data.get('transaction', ''))} characters")
            
            print("\n" + "=" * 80)
            print("ACCOUNTS:")
            print("=" * 80)
            accounts = data.get('accounts', {})
            for key, value in accounts.items():
                print(f"  {key:20s} {value}")
            
            return True
        else:
            print(f"\n[FAIL] Request failed with status {response.status_code}")
            print(f"\nResponse Body:")
            try:
                print(json.dumps(response.json(), indent=2))
            except:
                print(response.text)
            return False
            
    except requests.exceptions.ConnectionError:
        print("\n[ERROR] Could not connect to server")
        print("Make sure the server is running at http://127.0.0.1:8000")
        print("Run: python -m uvicorn main:app --reload")
        return False
    except Exception as e:
        print(f"\n[ERROR] Request failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    print("\n" + "=" * 80)
    print("TESTING TRANSFER OWNERSHIP ENDPOINT")
    print("=" * 80)
    
    # User credentials
    email = "ethangwang7@gmail.com"
    password = "test123"
    
    # Step 1: Get JWT token
    print("\nStep 1: Getting JWT Token...")
    print("-" * 80)
    jwt_token = get_jwt_token(email, password)
    
    if not jwt_token:
        print("\n[FAIL] Could not get JWT token")
        print("\nPossible issues:")
        print("1. User doesn't exist in Supabase")
        print("2. Password is incorrect")
        print("3. Supabase auth is not configured")
        return 1
    
    print(f"\nJWT Token (first 50 chars): {jwt_token[:50]}...")
    
    # Step 2: Test the API
    print("\n" + "-" * 80)
    print("Step 2: Testing Transfer Ownership Endpoint")
    print("-" * 80)
    
    success = test_transfer_ownership(jwt_token)
    
    if success:
        print("\n" + "=" * 80)
        print("*** ALL TESTS PASSED ***")
        print("=" * 80)
        print("\nThe transfer ownership endpoint is working correctly!")
        print("The transaction has been built and is ready for signing.")
        print("\nNext steps:")
        print("1. Client deserializes the transaction")
        print("2. Client signs with crate keypair (provided)")
        print("3. User signs with their Phantom wallet")
        print("4. Client submits to Solana blockchain")
        return 0
    else:
        print("\n" + "=" * 80)
        print("[FAIL] TEST FAILED")
        print("=" * 80)
        return 1


if __name__ == "__main__":
    sys.exit(main())

