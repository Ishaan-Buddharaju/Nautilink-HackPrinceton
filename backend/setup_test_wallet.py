#!/usr/bin/env python3
"""
Generate or load a persistent test wallet for devnet testing
"""

import os
import json
from solders.keypair import Keypair

WALLET_FILE = "test_wallet.json"

def create_or_load_wallet():
    """Create a new wallet or load existing one"""
    
    if os.path.exists(WALLET_FILE):
        print(f"Loading existing wallet from {WALLET_FILE}...")
        with open(WALLET_FILE, 'r') as f:
            data = json.load(f)
            keypair = Keypair.from_bytes(bytes(data))
            print(f"Wallet loaded: {keypair.pubkey()}")
            return keypair
    else:
        print("Creating new test wallet...")
        keypair = Keypair()
        
        # Save to file
        with open(WALLET_FILE, 'w') as f:
            json.dump(list(bytes(keypair)), f)
        
        print(f"New wallet created: {keypair.pubkey()}")
        print(f"Wallet saved to {WALLET_FILE}")
        return keypair

if __name__ == "__main__":
    print("="*60)
    print("Test Wallet Setup")
    print("="*60)
    
    wallet = create_or_load_wallet()
    
    print("\n" + "="*60)
    print("Fund this wallet manually:")
    print("="*60)
    print(f"Wallet Address: {wallet.pubkey()}")
    print("\nOption 1 - Web Faucet:")
    print(f"  Visit: https://faucet.solana.com")
    print(f"  Paste address: {wallet.pubkey()}")
    print(f"  Click 'Confirm Airdrop'")
    print("\nOption 2 - CLI (if you have Solana CLI in WSL):")
    print(f"  solana airdrop 2 {wallet.pubkey()} --url https://api.devnet.solana.com")
    print("\nOption 3 - QuickNode Faucet:")
    print(f"  Visit: https://faucet.quicknode.com/solana/devnet")
    print(f"  Paste address: {wallet.pubkey()}")
    print("\nAfter funding, run: python test_blockchain_funded.py")
    print("="*60)

