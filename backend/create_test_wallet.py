"""
Export Solana CLI wallet to test_wallet.json for Python testing
Run this in WSL to export your funded wallet:
  cat ~/.config/solana/id.json > test_wallet.json
Then move it to the backend directory.

OR if you have a different wallet file path, specify it.
"""
import json
import sys
from solders.keypair import Keypair
from solders.pubkey import Pubkey

def import_wallet_from_file(wallet_path):
    """Import wallet from Solana CLI format"""
    try:
        with open(wallet_path, 'r') as f:
            keypair_data = json.load(f)
        
        keypair = Keypair.from_bytes(bytes(keypair_data))
        
        # Save to test_wallet.json
        with open('test_wallet.json', 'w') as f:
            json.dump(keypair_data, f)
        
        print("Wallet imported successfully!")
        print(f"Address: {keypair.pubkey()}")
        print("Saved to: test_wallet.json")
        return keypair
        
    except Exception as e:
        print(f"Error importing wallet: {e}")
        return None

def check_if_matches_expected():
    """Check if the wallet matches the expected funded address"""
    expected = "4oi4ZELW4QG6ntpeAcMMX676TNJiZJB7b44wjZ6L6duZ"
    
    try:
        with open('test_wallet.json', 'r') as f:
            keypair_data = json.load(f)
        keypair = Keypair.from_bytes(bytes(keypair_data))
        
        if str(keypair.pubkey()) == expected:
            print(f"[PASS] Wallet matches expected funded address: {expected}")
            return True
        else:
            print(f"[WARNING] Wallet address: {keypair.pubkey()}")
            print(f"[WARNING] Expected address: {expected}")
            print("This is a different wallet - make sure it has SOL!")
            return False
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    print("="*60)
    print("Import Funded Wallet for Testing")
    print("="*60)
    
    if len(sys.argv) > 1:
        # Import from specified file
        wallet_path = sys.argv[1]
        print(f"\nImporting from: {wallet_path}")
        import_wallet_from_file(wallet_path)
    else:
        # Check if test_wallet.json already exists
        import os
        if os.path.exists('test_wallet.json'):
            print("\nFound existing test_wallet.json")
            check_if_matches_expected()
        else:
            print("\nNo wallet file found!")
            print("\nTo import your funded wallet from WSL:")
            print("  1. In WSL, run: cat ~/.config/solana/id.json")
            print("  2. Copy the output (should be a JSON array of numbers)")
            print("  3. Save it to backend/test_wallet.json")
            print("\nOR run this script with the wallet file path:")
            print("  python create_test_wallet.py /path/to/wallet.json")
            print("\nOR in WSL, copy the file directly:")
            print("  cp ~/.config/solana/id.json /mnt/c/Users/lamam/OneDrive/Nautilink-HackPrinceton/backend/test_wallet.json")
