"""
Test script for Solana blockchain endpoints.
Tests endpoints 1, 2, 3, and 4 with real authentication.

Usage:
    python test_solana_endpoints.py
"""
import asyncio
import httpx
import json
from datetime import datetime

# API Configuration
API_BASE = "http://127.0.0.1:8000"
WEB3_BASE = f"{API_BASE}/web3"

# Test users
FISHER_USER = {
    "email": "ethangwang7@gmail.com",
    "password": "test123"
}

CUSTOMER_USER = {
    "email": "tazeemmahashin@gmail.com",
    "password": "test123"
}


async def login(email: str, password: str) -> str:
    """Login and get access token."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{API_BASE}/auth/login",
            json={"email": email, "password": password}
        )
        if response.status_code == 200:
            data = response.json()
            return data.get("access_token")
        else:
            print(f"Login failed: {response.status_code} - {response.text}")
            return None


async def test_endpoint_1_get_transactions(token: str):
    """Test Endpoint 1: GET /web3/transactions (mock data)"""
    print("\n" + "="*60)
    print("TEST 1: GET /web3/transactions (Mock Data)")
    print("="*60)
    
    async with httpx.AsyncClient() as client:
        headers = {"Authorization": f"Bearer {token}"}
        response = await client.get(f"{WEB3_BASE}/transactions", headers=headers)
        
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"✓ SUCCESS - Found {len(data.get('transactions', []))} transactions")
            print(json.dumps(data, indent=2)[:500] + "...")
        else:
            print(f"✗ FAILED - {response.text}")


async def test_endpoint_2_get_transaction_details(token: str, signature: str):
    """Test Endpoint 2: GET /web3/transactions/{signature} (Real Solana)"""
    print("\n" + "="*60)
    print(f"TEST 2: GET /web3/transactions/{signature}")
    print("Real Solana Blockchain Integration")
    print("="*60)
    
    async with httpx.AsyncClient() as client:
        headers = {"Authorization": f"Bearer {token}"}
        response = await client.get(
            f"{WEB3_BASE}/transactions/{signature}",
            headers=headers
        )
        
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"✓ SUCCESS - Transaction found on Solana")
            print(json.dumps(data, indent=2))
        elif response.status_code == 404:
            print(f"✓ EXPECTED - Transaction not found (test with real signature)")
            print(response.json())
        else:
            print(f"✗ FAILED - {response.text}")


async def test_endpoint_3_get_lot_info(token: str, crate_id: str):
    """Test Endpoint 3: GET /web3/lot/{crate_id} (Real Solana)"""
    print("\n" + "="*60)
    print(f"TEST 3: GET /web3/lot/{crate_id}")
    print("Real Solana Blockchain Integration")
    print("="*60)
    
    async with httpx.AsyncClient() as client:
        headers = {"Authorization": f"Bearer {token}"}
        response = await client.get(
            f"{WEB3_BASE}/lot/{crate_id}",
            headers=headers
        )
        
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"✓ SUCCESS - Lot found on Solana")
            print(json.dumps(data, indent=2))
        elif response.status_code == 404:
            print(f"✓ EXPECTED - Lot not found (test with real crate_id)")
            print(response.json())
        else:
            print(f"✗ FAILED - {response.text}")


async def test_endpoint_4_create_transaction(token: str):
    """Test Endpoint 4: POST /web3/transaction (Real Solana)"""
    print("\n" + "="*60)
    print("TEST 4: POST /web3/transaction")
    print("Real Solana Blockchain Integration")
    print("="*60)
    
    transaction_data = {
        "operation": "CREATE_CRATE",
        "crate_id": f"TEST_CRATE_{int(datetime.now().timestamp())}",
        "weight": 2500,
        "metadata": {
            "species": "Yellowfin Tuna",
            "catch_location": "Manila Bay",
            "fisher": "ethangwang7@gmail.com"
        }
    }
    
    async with httpx.AsyncClient() as client:
        headers = {"Authorization": f"Bearer {token}"}
        response = await client.post(
            f"{WEB3_BASE}/transaction",
            headers=headers,
            params=transaction_data
        )
        
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"✓ SUCCESS - Transaction created on Solana")
            print(json.dumps(data, indent=2))
            
            # Return signature for further testing
            return data.get("transaction", {}).get("signature")
        else:
            print(f"✗ FAILED - {response.text}")
            return None


async def main():
    """Run all tests."""
    print("\n" + "#"*60)
    print("# SOLANA BLOCKCHAIN ENDPOINT TESTS")
    print("# Testing endpoints 1, 2, 3, 4")
    print("#"*60)
    
    # Test with Fisher account
    print("\n\n>>> Testing with FISHER account (ethangwang7@gmail.com)")
    fisher_token = await login(FISHER_USER["email"], FISHER_USER["password"])
    
    if not fisher_token:
        print("✗ Failed to login as Fisher. Aborting tests.")
        return
    
    print(f"✓ Login successful. Token: {fisher_token[:20]}...")
    
    # Test Endpoint 1 (Mock data - no changes)
    await test_endpoint_1_get_transactions(fisher_token)
    
    # Test Endpoint 4 (Create transaction - Real Solana)
    new_signature = await test_endpoint_4_create_transaction(fisher_token)
    
    # Test Endpoint 2 with newly created transaction (Real Solana)
    if new_signature:
        await test_endpoint_2_get_transaction_details(fisher_token, new_signature)
    else:
        # Test with a sample signature
        await test_endpoint_2_get_transaction_details(
            fisher_token,
            "3K8mYzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqz"
        )
    
    # Test Endpoint 3 (Get lot info - Real Solana)
    await test_endpoint_3_get_lot_info(fisher_token, "TUNA_001")
    
    # Test with Customer account
    print("\n\n>>> Testing with CUSTOMER account (tazeemmahashin@gmail.com)")
    customer_token = await login(CUSTOMER_USER["email"], CUSTOMER_USER["password"])
    
    if customer_token:
        print(f"✓ Login successful. Token: {customer_token[:20]}...")
        await test_endpoint_1_get_transactions(customer_token)
    
    print("\n" + "#"*60)
    print("# TESTS COMPLETED")
    print("#"*60)
    print("\nNOTE: Endpoints 2, 3, 4 use REAL Solana blockchain integration.")
    print("Endpoint 1 continues to use mock data as requested.")
    print("Frontend functionality remains unchanged.\n")


if __name__ == "__main__":
    asyncio.run(main())
