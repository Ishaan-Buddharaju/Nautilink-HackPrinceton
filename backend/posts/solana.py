import json
import os
import base64
from dataclasses import dataclass
from typing import Dict, Any

from dotenv import load_dotenv
from solana.rpc.async_api import AsyncClient
from solders.pubkey import Pubkey as PublicKey
from solders.keypair import Keypair
from solders.transaction import Transaction
from anchorpy import Program, Provider, Wallet, Idl

load_dotenv()

# Solana configuration
SOLANA_RPC_URL = os.getenv("SOLANA_RPC_URL", "https://api.devnet.solana.com")
PROGRAM_ID_STR = os.getenv("PROGRAM_ID", "6WVh9yhUaofmUMAsK1EuCJG5ptzZPzKqj7LcFDVzLgnA")
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


async def load_program() -> Program:
    """Load the Anchor program from IDL file."""
    if not PROGRAM_ID:
        raise ValueError("PROGRAM_ID not set in environment variables")
    
    client = AsyncClient(SOLANA_RPC_URL)
    
    # Try to find IDL file
    idl_paths = [
        IDL_PATH,
        os.path.join(os.path.dirname(__file__), IDL_PATH),
        os.path.join(os.path.dirname(__file__), "..", "..", "web3", "target", "idl", "nautilink.json"),
    ]
    
    idl_data = None
    for path in idl_paths:
        if path and os.path.exists(path):
            with open(path, "r") as f:
                idl_data = json.load(f)
            break
    
    if not idl_data:
        raise FileNotFoundError(
            f"IDL file not found. Tried: {idl_paths}. "
            "Please build the Anchor program with 'anchor build' or set IDL_PATH environment variable."
        )
    
    # Create dummy wallet for provider (not used for signing)
    dummy_keypair = Keypair()
    dummy_wallet = Wallet(dummy_keypair)
    provider = Provider(client, dummy_wallet)
    
    # Create program instance
    idl = Idl.from_json(json.dumps(idl_data))
    program = Program(idl, PROGRAM_ID, provider)
    
    return program


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
    
    Returns:
        Dictionary with transaction, crate_keypair, crate_pubkey, accounts, etc.
    """
    try:
        # Validate authority public key
        authority = PublicKey.from_string(authority_pubkey)
        
        # Generate new keypair for crate record
        crate_keypair = Keypair()
        crate_pubkey = crate_keypair.pubkey()
        
        # Load program
        program = await load_program()
        
        # Build create_crate instruction
        instruction = program.methods.create_crate(
            crate_id,
            crate_did,
            owner_did,
            device_did,
            location,
            weight,
            timestamp,
            hash_str,
            ipfs_cid,
        ).accounts({
            "crate_record": crate_pubkey,
            "authority": authority,
            "system_program": PublicKey.from_string("11111111111111111111111111111111"),
        }).instruction()
        
        # Get recent blockhash
        client = AsyncClient(SOLANA_RPC_URL)
        recent_blockhash = await client.get_latest_blockhash()
        
        # Create transaction
        transaction = Transaction()
        transaction.add(instruction)
        transaction.recent_blockhash = recent_blockhash.value.blockhash
        transaction.fee_payer = authority
        
        # Serialize transaction (unsigned)
        transaction_serialized = transaction.serialize(verify_signatures=False)
        transaction_base64 = base64.b64encode(transaction_serialized).decode('utf-8')
        
        # Serialize keypair for client (needed for signing)
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
                "system_program": "11111111111111111111111111111111",
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
    
    Returns:
        Dictionary with transaction, crate_keypair, crate_pubkey, accounts, etc.
    """
    try:
        # Validate authority public key
        authority = PublicKey.from_string(authority_pubkey)
        parent_crate = PublicKey.from_string(parent_crate_pubkey)
        
        # Generate new keypair for crate record
        crate_keypair = Keypair()
        crate_pubkey = crate_keypair.pubkey()
        
        # Load program
        program = await load_program()
        
        # Build transfer_ownership instruction
        instruction = program.methods.transfer_ownership(
            crate_id,
            crate_did,
            owner_did,
            device_did,
            location,
            weight,
            timestamp,
            hash_str,
            ipfs_cid,
        ).accounts({
            "crate_record": crate_pubkey,
            "parent_crate": parent_crate,
            "authority": authority,
            "system_program": PublicKey.from_string("11111111111111111111111111111111"),
        }).instruction()
        
        # Get recent blockhash
        client = AsyncClient(SOLANA_RPC_URL)
        recent_blockhash = await client.get_latest_blockhash()
        
        # Create transaction
        transaction = Transaction()
        transaction.add(instruction)
        transaction.recent_blockhash = recent_blockhash.value.blockhash
        transaction.fee_payer = authority
        
        # Serialize transaction (unsigned)
        transaction_serialized = transaction.serialize(verify_signatures=False)
        transaction_base64 = base64.b64encode(transaction_serialized).decode('utf-8')
        
        # Serialize keypair for client (needed for signing)
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
                "system_program": "11111111111111111111111111111111",
            },
            "program_id": str(PROGRAM_ID),
        }
        
    except Exception as e:
        print(f"Error building transfer transaction: {str(e)}")
        raise

