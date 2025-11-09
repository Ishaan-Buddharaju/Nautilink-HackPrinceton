"""
Simplified Solana transaction builder that doesn't rely on IDL parsing.
Manually constructs transactions for better compatibility.
"""
import os
import base64
import struct
from typing import Dict, Any
from dotenv import load_dotenv
from solana.rpc.async_api import AsyncClient
from solders.pubkey import Pubkey as PublicKey
from solders.keypair import Keypair
from solders.transaction import Transaction
from solders.message import Message as SolanaMessage
from solders.instruction import Instruction, AccountMeta
from solders.system_program import ID as SYSTEM_PROGRAM_ID

load_dotenv()

# Solana configuration
SOLANA_RPC_URL = os.getenv("SOLANA_RPC_URL", "https://api.devnet.solana.com")
PROGRAM_ID_STR = os.getenv("PROGRAM_ID", "6WVh9yhUaofmUMAsK1EuCJG5ptzZPzKqj7LcFDVzLgnA")
PROGRAM_ID = PublicKey.from_string(PROGRAM_ID_STR) if PROGRAM_ID_STR else None

# Instruction discriminators (first 8 bytes of SHA256 of "global:instruction_name")
CREATE_CRATE_DISCRIMINATOR = bytes([52, 253, 8, 10, 147, 201, 59, 115])
TRANSFER_OWNERSHIP_DISCRIMINATOR = bytes([160, 168, 253, 232, 132, 158, 208, 133])


def serialize_string(s: str) -> bytes:
    """Serialize a string as length-prefixed UTF-8 bytes."""
    utf8_bytes = s.encode('utf-8')
    length = len(utf8_bytes)
    return struct.pack('<I', length) + utf8_bytes


def serialize_u64(value: int) -> bytes:
    """Serialize a u64 as little-endian bytes."""
    return struct.pack('<Q', value)


def serialize_i64(value: int) -> bytes:
    """Serialize an i64 as little-endian bytes."""
    return struct.pack('<q', value)


async def build_create_crate_transaction(
    authority_pubkey: str,
    crate_id: str,
    crate_did: str,
    owner_did: str,
    device_did: str,
    location: str,
    weight: int,
    timestamp: int,
    hash_str: str,
    ipfs_cid: str,
) -> Dict[str, Any]:
    """
    Build an unsigned Solana transaction for creating a crate.
    """
    try:
        # Validate authority public key
        authority = PublicKey.from_string(authority_pubkey)
        
        # Generate new keypair for crate record
        crate_keypair = Keypair()
        crate_pubkey = crate_keypair.pubkey()
        
        # Build instruction data: discriminator + args
        instruction_data = CREATE_CRATE_DISCRIMINATOR
        instruction_data += serialize_string(crate_id)
        instruction_data += serialize_string(crate_did)
        instruction_data += serialize_string(owner_did)
        instruction_data += serialize_string(device_did)
        instruction_data += serialize_string(location)
        instruction_data += serialize_u64(weight)
        instruction_data += serialize_i64(timestamp)
        instruction_data += serialize_string(hash_str)
        instruction_data += serialize_string(ipfs_cid)
        
        # Build instruction
        accounts = [
            AccountMeta(pubkey=crate_pubkey, is_signer=True, is_writable=True),
            AccountMeta(pubkey=authority, is_signer=True, is_writable=True),
            AccountMeta(pubkey=SYSTEM_PROGRAM_ID, is_signer=False, is_writable=False),
        ]
        
        instruction = Instruction(
            program_id=PROGRAM_ID,
            accounts=accounts,
            data=instruction_data,
        )
        
        # Get recent blockhash
        client = AsyncClient(SOLANA_RPC_URL)
        recent_blockhash_resp = await client.get_latest_blockhash()
        recent_blockhash = recent_blockhash_resp.value.blockhash
        await client.close()
        
        # Create transaction with correct argument order
        solana_message = SolanaMessage.new_with_blockhash([instruction], authority, recent_blockhash)
        message = Transaction.new_unsigned(solana_message)
        
        # Serialize transaction (unsigned)
        transaction_bytes = bytes(message)
        transaction_base64 = base64.b64encode(transaction_bytes).decode('utf-8')
        
        # Serialize keypair for client
        keypair_bytes = bytes(crate_keypair)
        keypair_base64 = base64.b64encode(keypair_bytes).decode('utf-8')
        
        return {
            "transaction": transaction_base64,
            "crate_keypair": keypair_base64,
            "crate_pubkey": str(crate_pubkey),
            "authority": str(authority),
            "accounts": {
                "crate_record": str(crate_pubkey),
                "authority": str(authority),
                "system_program": str(SYSTEM_PROGRAM_ID),
            },
            "program_id": str(PROGRAM_ID),
        }
        
    except Exception as e:
        print(f"Error building transaction: {str(e)}")
        raise


async def build_transfer_ownership_transaction(
    authority_pubkey: str,
    parent_crate_pubkey: str,
    crate_id: str,
    crate_did: str,
    owner_did: str,
    device_did: str,
    location: str,
    weight: int,
    timestamp: int,
    hash_str: str,
    ipfs_cid: str,
) -> Dict[str, Any]:
    """
    Build an unsigned Solana transaction for transferring crate ownership.
    """
    try:
        # Validate public keys
        authority = PublicKey.from_string(authority_pubkey)
        parent_crate = PublicKey.from_string(parent_crate_pubkey)
        
        # Generate new keypair for crate record
        crate_keypair = Keypair()
        crate_pubkey = crate_keypair.pubkey()
        
        # Build instruction data
        instruction_data = TRANSFER_OWNERSHIP_DISCRIMINATOR
        instruction_data += serialize_string(crate_id)
        instruction_data += serialize_string(crate_did)
        instruction_data += serialize_string(owner_did)
        instruction_data += serialize_string(device_did)
        instruction_data += serialize_string(location)
        instruction_data += serialize_u64(weight)
        instruction_data += serialize_i64(timestamp)
        instruction_data += serialize_string(hash_str)
        instruction_data += serialize_string(ipfs_cid)
        
        # Build instruction
        accounts = [
            AccountMeta(pubkey=crate_pubkey, is_signer=True, is_writable=True),
            AccountMeta(pubkey=parent_crate, is_signer=False, is_writable=False),
            AccountMeta(pubkey=authority, is_signer=True, is_writable=True),
            AccountMeta(pubkey=SYSTEM_PROGRAM_ID, is_signer=False, is_writable=False),
        ]
        
        instruction = Instruction(
            program_id=PROGRAM_ID,
            accounts=accounts,
            data=instruction_data,
        )
        
        # Get recent blockhash
        client = AsyncClient(SOLANA_RPC_URL)
        recent_blockhash_resp = await client.get_latest_blockhash()
        recent_blockhash = recent_blockhash_resp.value.blockhash
        await client.close()
        
        # Create transaction with correct argument order
        solana_message = SolanaMessage.new_with_blockhash([instruction], authority, recent_blockhash)
        message = Transaction.new_unsigned(solana_message)
        
        # Serialize transaction (unsigned)
        transaction_bytes = bytes(message)
        transaction_base64 = base64.b64encode(transaction_bytes).decode('utf-8')
        
        # Serialize keypair for client
        keypair_bytes = bytes(crate_keypair)
        keypair_base64 = base64.b64encode(keypair_bytes).decode('utf-8')
        
        return {
            "transaction": transaction_base64,
            "crate_keypair": keypair_base64,
            "crate_pubkey": str(crate_pubkey),
            "parent_crate": str(parent_crate),
            "authority": str(authority),
            "accounts": {
                "crate_record": str(crate_pubkey),
                "parent_crate": str(parent_crate),
                "authority": str(authority),
                "system_program": str(SYSTEM_PROGRAM_ID),
            },
            "program_id": str(PROGRAM_ID),
        }
        
    except Exception as e:
        print(f"Error building transfer transaction: {str(e)}")
        raise

