"""
Tests for transfer_ownership instruction data builder.

This file validates that the instruction data is correctly serialized
for the transfer_ownership Solana instruction.
"""

import hashlib
import sys
import os

# Add parent directory to path to import from posts module
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from posts.solana import build_transfer_ownership_instruction_data, encode_string


def test_discriminator_calculation():
    """Test that the discriminator is calculated correctly."""
    print("=" * 60)
    print("TEST 1: Discriminator Calculation")
    print("=" * 60)
    
    # Calculate expected discriminator
    discriminator_input = b"global:transfer_ownership"
    expected_hash = hashlib.sha256(discriminator_input).digest()
    expected_discriminator = expected_hash[:8]
    
    print(f"Input: {discriminator_input}")
    print(f"SHA256 hash (first 32 bytes): {expected_hash.hex()}")
    print(f"Discriminator (first 8 bytes): {expected_discriminator.hex()}")
    print(f"Discriminator bytes: {list(expected_discriminator)}")
    
    # Build instruction data and extract discriminator
    test_data = build_transfer_ownership_instruction_data(
        crate_id="TEST_001",
        weight=1000,
        timestamp=1234567890,
        hash_str="a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3",
        ipfs_cid="QmTest123"
    )
    
    actual_discriminator = test_data[:8]
    print(f"\nActual discriminator from function: {actual_discriminator.hex()}")
    
    assert actual_discriminator == expected_discriminator, \
        f"Discriminator mismatch! Expected {expected_discriminator.hex()}, got {actual_discriminator.hex()}"
    
    print("✓ Discriminator calculation is CORRECT\n")


def test_string_encoding():
    """Test that strings are encoded with correct length prefix."""
    print("=" * 60)
    print("TEST 2: String Encoding")
    print("=" * 60)
    
    test_cases = [
        ("CRATE_001", "Simple ASCII string"),
        ("", "Empty string"),
        ("Test_123_ABC", "String with numbers and underscores"),
        ("QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG", "IPFS CID"),
    ]
    
    for test_string, description in test_cases:
        encoded = encode_string(test_string)
        
        # Extract length prefix (first 4 bytes, little-endian u32)
        length_bytes = encoded[:4]
        length = int.from_bytes(length_bytes, byteorder='little')
        
        # Extract string content
        content = encoded[4:]
        
        print(f"\nTest: {description}")
        print(f"  Input: '{test_string}'")
        print(f"  Expected length: {len(test_string)}")
        print(f"  Actual length prefix: {length}")
        print(f"  Content bytes: {content}")
        print(f"  Decoded content: '{content.decode('utf-8')}'")
        
        assert length == len(test_string), \
            f"Length mismatch for '{test_string}'"
        assert content == test_string.encode('utf-8'), \
            f"Content mismatch for '{test_string}'"
        
        print(f"  ✓ PASS")
    
    print("\n✓ All string encoding tests PASSED\n")


def test_full_instruction_data():
    """Test complete instruction data serialization."""
    print("=" * 60)
    print("TEST 3: Full Instruction Data Serialization")
    print("=" * 60)
    
    # Test parameters
    crate_id = "CRATE_002"
    weight = 1000  # u32
    timestamp = 1234567890  # i64
    hash_str = "b665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae4"
    ipfs_cid = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG"
    
    print(f"Input Parameters:")
    print(f"  crate_id: {crate_id}")
    print(f"  weight: {weight}")
    print(f"  timestamp: {timestamp}")
    print(f"  hash: {hash_str}")
    print(f"  ipfs_cid: {ipfs_cid}")
    
    # Build instruction data
    data = build_transfer_ownership_instruction_data(
        crate_id=crate_id,
        weight=weight,
        timestamp=timestamp,
        hash_str=hash_str,
        ipfs_cid=ipfs_cid,
    )
    
    print(f"\nSerialized Data:")
    print(f"  Total length: {len(data)} bytes")
    print(f"  Hex: {data.hex()}")
    
    # Validate structure
    offset = 0
    
    # 1. Discriminator (8 bytes)
    discriminator = data[offset:offset+8]
    offset += 8
    print(f"\n  [Offset {offset-8:3d}] Discriminator (8 bytes): {discriminator.hex()}")
    
    # 2. crate_id string (4 byte length + content)
    crate_id_len = int.from_bytes(data[offset:offset+4], byteorder='little')
    offset += 4
    crate_id_bytes = data[offset:offset+crate_id_len]
    offset += crate_id_len
    print(f"  [Offset {offset-crate_id_len-4:3d}] crate_id length: {crate_id_len}")
    print(f"  [Offset {offset-crate_id_len:3d}] crate_id content: {crate_id_bytes.decode('utf-8')}")
    
    # 3. weight (4 bytes u32)
    weight_bytes = data[offset:offset+4]
    weight_decoded = int.from_bytes(weight_bytes, byteorder='little')
    offset += 4
    print(f"  [Offset {offset-4:3d}] weight (u32): {weight_decoded}")
    
    # 4. timestamp (8 bytes i64)
    timestamp_bytes = data[offset:offset+8]
    timestamp_decoded = int.from_bytes(timestamp_bytes, byteorder='little', signed=True)
    offset += 8
    print(f"  [Offset {offset-8:3d}] timestamp (i64): {timestamp_decoded}")
    
    # 5. hash string (4 byte length + content)
    hash_len = int.from_bytes(data[offset:offset+4], byteorder='little')
    offset += 4
    hash_bytes = data[offset:offset+hash_len]
    offset += hash_len
    print(f"  [Offset {offset-hash_len-4:3d}] hash length: {hash_len}")
    print(f"  [Offset {offset-hash_len:3d}] hash content: {hash_bytes.decode('utf-8')}")
    
    # 6. ipfs_cid string (4 byte length + content)
    ipfs_len = int.from_bytes(data[offset:offset+4], byteorder='little')
    offset += 4
    ipfs_bytes = data[offset:offset+ipfs_len]
    offset += ipfs_len
    print(f"  [Offset {offset-ipfs_len-4:3d}] ipfs_cid length: {ipfs_len}")
    print(f"  [Offset {offset-ipfs_len:3d}] ipfs_cid content: {ipfs_bytes.decode('utf-8')}")
    
    # Validate all data was consumed
    assert offset == len(data), \
        f"Data length mismatch! Parsed {offset} bytes but data is {len(data)} bytes"
    
    # Validate decoded values match inputs
    assert crate_id_bytes.decode('utf-8') == crate_id
    assert weight_decoded == weight
    assert timestamp_decoded == timestamp
    assert hash_bytes.decode('utf-8') == hash_str
    assert ipfs_bytes.decode('utf-8') == ipfs_cid
    
    print(f"\n✓ Full instruction data serialization is CORRECT")
    print(f"✓ All {offset} bytes accounted for\n")


def test_parameter_order():
    """Test that parameters are in the correct order."""
    print("=" * 60)
    print("TEST 4: Parameter Order Validation")
    print("=" * 60)
    
    print("Expected order (from Rust):")
    print("  1. crate_id: String")
    print("  2. weight: u32")
    print("  3. timestamp: i64")
    print("  4. hash: String")
    print("  5. ipfs_cid: String")
    
    # Build with distinctive values
    data = build_transfer_ownership_instruction_data(
        crate_id="FIRST",
        weight=1111,
        timestamp=2222,
        hash_str="THIRD",
        ipfs_cid="FOURTH",
    )
    
    offset = 8  # Skip discriminator
    
    # Read first string (should be crate_id)
    str1_len = int.from_bytes(data[offset:offset+4], byteorder='little')
    offset += 4
    str1 = data[offset:offset+str1_len].decode('utf-8')
    offset += str1_len
    
    # Read u32 (should be weight)
    num1 = int.from_bytes(data[offset:offset+4], byteorder='little')
    offset += 4
    
    # Read i64 (should be timestamp)
    num2 = int.from_bytes(data[offset:offset+8], byteorder='little', signed=True)
    offset += 8
    
    # Read second string (should be hash)
    str2_len = int.from_bytes(data[offset:offset+4], byteorder='little')
    offset += 4
    str2 = data[offset:offset+str2_len].decode('utf-8')
    offset += str2_len
    
    # Read third string (should be ipfs_cid)
    str3_len = int.from_bytes(data[offset:offset+4], byteorder='little')
    offset += 4
    str3 = data[offset:offset+str3_len].decode('utf-8')
    offset += str3_len
    
    print(f"\nActual order (from serialized data):")
    print(f"  1. String: '{str1}' (expected 'FIRST')")
    print(f"  2. u32: {num1} (expected 1111)")
    print(f"  3. i64: {num2} (expected 2222)")
    print(f"  4. String: '{str2}' (expected 'THIRD')")
    print(f"  5. String: '{str3}' (expected 'FOURTH')")
    
    assert str1 == "FIRST", f"First parameter should be crate_id, got '{str1}'"
    assert num1 == 1111, f"Second parameter should be weight, got {num1}"
    assert num2 == 2222, f"Third parameter should be timestamp, got {num2}"
    assert str2 == "THIRD", f"Fourth parameter should be hash, got '{str2}'"
    assert str3 == "FOURTH", f"Fifth parameter should be ipfs_cid, got '{str3}'"
    
    print("\n✓ Parameter order is CORRECT\n")


def run_all_tests():
    """Run all tests for transfer_ownership instruction builder."""
    print("\n" + "=" * 60)
    print("TRANSFER OWNERSHIP INSTRUCTION BUILDER TESTS")
    print("=" * 60 + "\n")
    
    try:
        test_discriminator_calculation()
        test_string_encoding()
        test_full_instruction_data()
        test_parameter_order()
        
        print("=" * 60)
        print("✓✓✓ ALL TESTS PASSED ✓✓✓")
        print("=" * 60)
        print("\nPhase 1 Complete: Instruction data builder is working correctly!")
        print("Ready to proceed to Phase 2: Transaction Builder\n")
        return True
        
    except AssertionError as e:
        print("\n" + "=" * 60)
        print("✗✗✗ TEST FAILED ✗✗✗")
        print("=" * 60)
        print(f"\nError: {e}\n")
        return False
    except Exception as e:
        print("\n" + "=" * 60)
        print("✗✗✗ UNEXPECTED ERROR ✗✗✗")
        print("=" * 60)
        print(f"\nError: {type(e).__name__}: {e}\n")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)

