#!/usr/bin/env python3
"""
Check what PROGRAM_ID the code is actually loading
"""

import os
import sys
from dotenv import load_dotenv

print("="*60)
print("Checking PROGRAM_ID Configuration")
print("="*60)

# Load .env
load_dotenv()

# Check what's in environment
env_program_id = os.getenv("PROGRAM_ID")
print(f"\nPROGRAM_ID from .env: {env_program_id}")

# Check what solana.py sees
sys.path.insert(0, os.path.dirname(__file__))
from posts.solana import PROGRAM_ID, PROGRAM_ID_STR

print(f"PROGRAM_ID_STR in code: {PROGRAM_ID_STR}")
print(f"PROGRAM_ID object: {PROGRAM_ID}")

print("\n" + "="*60)
if PROGRAM_ID_STR == "6WVh9yhUaofmUMAsK1EuCJG5ptzZPzKqj7LcFDVzLgnA":
    print("[PASS] Correct program ID!")
else:
    print("[FAIL] Wrong program ID!")
    print("\nThe .env file likely has the old ID.")
    print("Update backend/.env to have:")
    print("PROGRAM_ID=6WVh9yhUaofmUMAsK1EuCJG5ptzZPzKqj7LcFDVzLgnA")
print("="*60)

