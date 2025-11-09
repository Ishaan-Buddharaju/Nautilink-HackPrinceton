#!/usr/bin/env python3
"""
Post-build script to fix IDL compatibility issues with anchorpy 0.18.0.
This script normalizes account definitions to ensure compatibility.
Run this after 'anchor build' to fix the generated IDL.
"""

import json
import sys
from pathlib import Path

IDL_PATH = Path(__file__).parent / "target" / "idl" / "nautilink.json"

def fix_idl():
    """Fix IDL account definitions for anchorpy compatibility."""
    if not IDL_PATH.exists():
        print(f"❌ IDL file not found: {IDL_PATH}")
        print("   Please run 'anchor build' first.")
        sys.exit(1)
    
    with open(IDL_PATH, 'r') as f:
        data = json.load(f)
    
    fixed_count = 0
    
    # Fix accounts in all instructions
    for inst in data.get('instructions', []):
        for acc in inst.get('accounts', []):
            if isinstance(acc, dict) and 'name' in acc:
                # Accounts with addresses (like system_program) should only have name and address
                if 'address' in acc:
                    # Remove any writable/signer flags from accounts with addresses
                    if 'writable' in acc:
                        del acc['writable']
                        fixed_count += 1
                    if 'signer' in acc:
                        del acc['signer']
                        fixed_count += 1
                else:
                    # Regular accounts must have both writable and signer flags
                    if 'writable' not in acc:
                        acc['writable'] = False
                        fixed_count += 1
                    if 'signer' not in acc:
                        acc['signer'] = False
                        fixed_count += 1
    
    # Save the fixed IDL
    with open(IDL_PATH, 'w') as f:
        json.dump(data, f, indent=2)
    
    print(f"✅ Fixed {fixed_count} account definition(s) in IDL")
    print(f"   IDL file: {IDL_PATH}")
    
    # Verify the fix works
    try:
        from anchorpy import Idl
        with open(IDL_PATH, 'r') as f:
            idl = Idl.from_json(f.read())
        print("✅ IDL is now parseable by anchorpy!")
        return 0
    except Exception as e:
        print(f"⚠️  Warning: IDL still cannot be parsed by anchorpy: {e}")
        print("   This may indicate a deeper compatibility issue.")
        print("   Consider upgrading anchorpy or downgrading Anchor CLI.")
        return 1

if __name__ == "__main__":
    sys.exit(fix_idl())

