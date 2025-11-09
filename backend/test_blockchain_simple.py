#!/usr/bin/env python3
"""
Simple script to check if program is deployed and test basic connectivity
"""

import os
import sys
import asyncio
from dotenv import load_dotenv
from solana.rpc.async_api import AsyncClient
from solders.pubkey import Pubkey as PublicKey

load_dotenv()

SOLANA_RPC_URL = os.getenv("SOLANA_RPC_URL", "https://api.devnet.solana.com")
PROGRAM_ID = os.getenv("PROGRAM_ID", "6WVh9yhUaofmUMAsK1EuCJG5ptzZPzKqj7LcFDVzLgnA")

async def check_program():
    print("="*60)
    print("Checking Solana Program Deployment")
    print("="*60)
    print(f"RPC URL: {SOLANA_RPC_URL}")
    print(f"Program ID: {PROGRAM_ID}")
    
    client = AsyncClient(SOLANA_RPC_URL)
    
    try:
        program_pubkey = PublicKey.from_string(PROGRAM_ID)
        account_info = await client.get_account_info(program_pubkey)
        
        if account_info.value is None:
            print("\n[FAIL] Program account not found on devnet")
            print("The program needs to be deployed first")
            print("\nTo deploy:")
            print("1. In WSL, run: cd /mnt/c/Users/lamam/OneDrive/Nautilink-HackPrinceton/web3")
            print("2. Run: anchor build")
            print("3. Run: anchor deploy --provider.cluster devnet")
            print("4. Update backend/.env with the deployed PROGRAM_ID")
            await client.close()
            return False
        
        print("\n[PASS] Program found on devnet!")
        print(f"Owner: {account_info.value.owner}")
        print(f"Executable: {account_info.value.executable}")
        print(f"Data length: {len(account_info.value.data)} bytes")
        
        if account_info.value.executable:
            print("\n[PASS] Program is executable (deployed correctly)")
            explorer_url = f"https://explorer.solana.com/address/{PROGRAM_ID}?cluster=devnet"
            print(f"View on explorer: {explorer_url}")
            await client.close()
            return True
        else:
            print("\n[FAIL] Program exists but is not executable")
            await client.close()
            return False
            
    except Exception as e:
        print(f"\n[FAIL] Error checking program: {e}")
        await client.close()
        return False

if __name__ == "__main__":
    result = asyncio.run(check_program())
    sys.exit(0 if result else 1)

