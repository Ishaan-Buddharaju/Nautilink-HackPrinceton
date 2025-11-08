#!/usr/bin/env python3
"""
Quick script to test JWT token retrieval and create-crate endpoint.
"""
import requests
import json
import sys

BASE_URL = "http://localhost:8000"

def login(email: str, password: str):
    """Login and get JWT token."""
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": email, "password": password}
    )
    
    if response.status_code == 200:
        data = response.json()
        print("✅ Login successful!")
        print(f"Access Token: {data['access_token'][:50]}...")
        return data['access_token']
    else:
        print(f"❌ Login failed: {response.status_code}")
        print(response.text)
        return None

def signup(email: str, password: str, user_type: str = "fisherman"):
    """Sign up a new user and get JWT token."""
    response = requests.post(
        f"{BASE_URL}/auth/signup",
        json={
            "email": email,
            "password": password,
            "user_type": user_type,
            "full_name": "Test User"
        }
    )
    
    if response.status_code == 201:
        data = response.json()
        print("✅ Signup successful!")
        print(f"Access Token: {data['access_token'][:50]}...")
        return data['access_token']
    else:
        print(f"❌ Signup failed: {response.status_code}")
        print(response.text)
        return None

def test_create_crate(token: str):
    """Test the create-crate endpoint."""
    response = requests.post(
        f"{BASE_URL}/web3/create-crate",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        },
        json={
            "nfc_tag_id": "NFC_DEVICE_001",
            "weight": 1000,
            "crate_id": "CRATE_001",
            "ipfs_cid": "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
            "hash": "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3",
            "solana_wallet": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
        }
    )
    
    if response.status_code == 200:
        print("\n✅ Create crate successful!")
        print(json.dumps(response.json(), indent=2))
    else:
        print(f"\n❌ Create crate failed: {response.status_code}")
        print(response.text)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage:")
        print("  python test_jwt.py login <email> <password>")
        print("  python test_jwt.py signup <email> <password>")
        sys.exit(1)
    
    command = sys.argv[1]
    email = sys.argv[2]
    password = sys.argv[3] if len(sys.argv) > 3 else None
    
    if command == "login":
        if not password:
            print("❌ Password required for login")
            sys.exit(1)
        token = login(email, password)
        if token:
            test_create_crate(token)
    
    elif command == "signup":
        if not password:
            print("❌ Password required for signup")
            sys.exit(1)
        token = signup(email, password)
        if token:
            test_create_crate(token)
    
    else:
        print(f"❌ Unknown command: {command}")
        print("Use 'login' or 'signup'")

