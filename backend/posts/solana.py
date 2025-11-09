import json
import os
import base64
from dataclasses import dataclass
from typing import Dict, Any

from dotenv import load_dotenv
from solana.rpc.async_api import AsyncClient
from anchorpy import Program, Provider, Wallet
try:
    from anchorpy_idl import Idl
except ImportError:
    from anchorpy import Idl

# For solana 0.30.2, use solders for Keypair, Pubkey, and Transaction
# solders.pubkey.Pubkey has find_program_address method
try:
    from solders.keypair import Keypair
    from solders.pubkey import Pubkey as PublicKey
    from solders.transaction import Transaction
except ImportError:
    # Fallback to solana imports (for newer versions)
    from solana.keypair import Keypair
    from solana.publickey import PublicKey
    from solana.transaction import Transaction

load_dotenv()

# Solana configuration
SOLANA_RPC_URL = os.getenv("SOLANA_RPC_URL", "https://api.devnet.solana.com")
PROGRAM_ID_STR = os.getenv("PROGRAM_ID", "FHzgesT5QzphL5eucFCjL9KL59TLs3jztw7Qe9RZjHta")
# Use from_string for solders.pubkey.Pubkey
PROGRAM_ID = PublicKey.from_string(PROGRAM_ID_STR) if PROGRAM_ID_STR else None
IDL_PATH = os.getenv("IDL_PATH", "../web3/target/idl/nautilink.json")

@dataclass
class SolanaClient:
    client: AsyncClient
    wallet: Wallet
    program: Program
    provider: Provider

def create_solana_client():
    client = AsyncClient(endpoint=os.getenv("SOLANA_ENDPOINT"))
    wallet = Wallet(Keypair.from_mnemonic(os.getenv("SOLANA_MNEMONIC")))
    provider = Provider(client, wallet)
    program = Program(os.getenv("SOLANA_PROGRAM_ID"), provider=provider)
    return SolanaClient(client, wallet, program, provider)

async def get_config_pda() -> PublicKey:
    # PDA seeds must match what you used in your Seahorse/Anchor program
    config_pda, _ = PublicKey.find_program_address(
        [b"registry_config"],
        PROGRAM_ID,
    )
    return config_pda


async def get_lot_pda(creator: PublicKey, lot_id: int) -> PublicKey:
    # lot seeds must match your program's lot.init(seeds=[...])
    # Here we assume seeds=["lot", creator, lot_id]
    lot_pda, _ = PublicKey.find_program_address(
        [
            b"lot",
            bytes(creator),
            lot_id.to_bytes(8, byteorder="little"),  # u64
        ],
        PROGRAM_ID,
    )
    return lot_pda


def load_idl_data() -> dict:
    """Load IDL data from file."""
    idl_paths = [
        IDL_PATH,
        os.path.join(os.path.dirname(__file__), IDL_PATH),
        os.path.join(os.path.dirname(__file__), "..", "..", "web3", "target", "idl", "nautilink.json"),
    ]
    
    for path in idl_paths:
        if path and os.path.exists(path):
            with open(path, "r") as f:
                return json.load(f)
    
    raise FileNotFoundError(
        f"IDL file not found. Tried: {idl_paths}. "
        "Please build the Anchor program with 'anchor build' or set IDL_PATH environment variable."
    )


def encode_string(s: str) -> bytes:
    """Encode a string for Anchor serialization (length-prefixed UTF-8)."""
    s_bytes = s.encode('utf-8')
    # Anchor uses u32 length prefix (little-endian)
    length_bytes = len(s_bytes).to_bytes(4, byteorder='little')
    return length_bytes + s_bytes


def build_create_crate_instruction_data(
    crate_id: str,
    crate_did: str,
    owner_did: str,
    device_did: str,
    location: str,
    weight: int,
    timestamp: int,
    hash_str: str,
    ipfs_cid: str,
) -> bytes:
    """
    Manually build the instruction data for create_crate.
    Discriminator: [52, 253, 8, 10, 147, 201, 59, 115] (from IDL)
    Args: 9 strings + u32 + i64
    """
    # Instruction discriminator (8 bytes)
    discriminator = bytes([52, 253, 8, 10, 147, 201, 59, 115])
    
    # Encode all arguments
    data = discriminator
    data += encode_string(crate_id)
    data += encode_string(crate_did)
    data += encode_string(owner_did)
    data += encode_string(device_did)
    data += encode_string(location)
    data += weight.to_bytes(4, byteorder='little')  # u32
    data += timestamp.to_bytes(8, byteorder='little', signed=True)  # i64
    data += encode_string(hash_str)
    data += encode_string(ipfs_cid)
    
    return data


async def build_create_crate_transaction(
    authority_pubkey: str,
    crate_id: str,
    weight: int,
    timestamp: int,
    hash_str: str,
    ipfs_cid: str,
) -> Dict[str, Any]:
    """
    Build an unsigned Solana transaction for creating a crate.
    
    Returns:
        Dictionary with transaction, crate_keypair, crate_pubkey, accounts, etc.
    """
    try:
        # Validate authority public key
        authority = PublicKey.from_string(authority_pubkey)
        
        # Generate new keypair for crate record
        crate_keypair = Keypair()
        crate_pubkey = crate_keypair.pubkey()
        
        # Build instruction data manually (workaround for anchorpy String type issue)
        instruction_data = build_create_crate_instruction_data(
            crate_id=crate_id,
            crate_did=f"did:crate:{crate_id}",
            owner_did=f"did:owner:{str(authority)}",
            device_did="did:device:nfc001",
            location="0,0",
            weight=weight,
            timestamp=timestamp,
            hash_str=hash_str,
            ipfs_cid=ipfs_cid,
        )
        
        # Build instruction manually
        from solders.instruction import Instruction, AccountMeta
        
        accounts = [
            AccountMeta(crate_pubkey, is_signer=True, is_writable=True),  # crate_record
            AccountMeta(authority, is_signer=True, is_writable=True),  # authority
            AccountMeta(PublicKey.from_string("11111111111111111111111111111111"), is_signer=False, is_writable=False),  # system_program
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
        
        # Build transaction using legacy Transaction format (for unsigned transactions)
        from solders.message import Message
        from solders.transaction import Transaction as LegacyTransaction
        
        # Create message with instruction
        message = Message.new_with_blockhash(
            [instruction],
            authority,
            recent_blockhash,
        )
        
        # Create legacy transaction (unsigned)
        # This format allows unsigned transactions that can be signed later
        transaction = LegacyTransaction.new_unsigned(message)
        
        # Serialize transaction (unsigned, will be signed by client)
        transaction_serialized = bytes(transaction)
        transaction_base64 = base64.b64encode(transaction_serialized).decode('utf-8')
        
        # Serialize keypair for client (needed for signing)
        keypair_secret = bytes(crate_keypair)
        keypair_base64 = base64.b64encode(keypair_secret).decode('utf-8')
        
        return {
            "transaction": transaction_base64,
            "crate_keypair": keypair_base64,
            "crate_pubkey": str(crate_pubkey),
            "authority": str(authority),
            "accounts": {
                "crate_record": str(crate_pubkey),
                "authority": str(authority),
                "system_program": "11111111111111111111111111111111",
            },
            "program_id": str(PROGRAM_ID),
        }
        
    except Exception as e:
        print(f"Error building transaction: {str(e)}")
        raise

