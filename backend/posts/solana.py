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
PROGRAM_ID_STR = os.getenv("PROGRAM_ID", "6WVh9yhUaofmUMAsK1EuCJG5ptzZPzKqj7LcFDVzLgnA")
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
    Build the instruction data for create_crate.
    
    This function serializes the parameters for the create_crate instruction
    according to Anchor's serialization format.
    
    Args:
        crate_id: Unique identifier for the crate
        crate_did: Decentralized Identifier (DID) for the crate
        owner_did: Decentralized Identifier (DID) for the owner
        device_did: Decentralized Identifier (DID) for the NFC/scanner device
        location: Location as lat,long string
        weight: Weight in grams
        timestamp: Unix timestamp for when the crate is created
        hash_str: SHA256 hash of crate data for integrity verification
        ipfs_cid: IPFS content ID where metadata is stored
    
    Returns:
        bytes: Serialized instruction data with discriminator + encoded parameters
        
    Note:
        Parameter order must match the Rust function signature exactly:
        pub fn create_crate(ctx, crate_id, crate_did, owner_did, device_did, location, weight, timestamp, hash, ipfs_cid)
    """
    import hashlib
    
    # Calculate instruction discriminator
    # Anchor uses: sha256("global:<function_name>")[:8]
    discriminator_input = b"global:create_crate"
    discriminator_hash = hashlib.sha256(discriminator_input).digest()
    discriminator = discriminator_hash[:8]
    
    # Build instruction data: discriminator + parameters
    data = discriminator
    
    # Encode parameters in order matching Rust function signature
    data += encode_string(crate_id)                                    # String
    data += encode_string(crate_did)                                   # String
    data += encode_string(owner_did)                                   # String
    data += encode_string(device_did)                                  # String
    data += encode_string(location)                                    # String
    data += weight.to_bytes(4, byteorder='little')                     # u32
    data += timestamp.to_bytes(8, byteorder='little', signed=True)     # i64
    data += encode_string(hash_str)                                    # String
    data += encode_string(ipfs_cid)                                    # String
    
    return data


def build_transfer_ownership_instruction_data(
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
    Build the instruction data for transfer_ownership.
    
    This function serializes the parameters for the transfer_ownership instruction
    according to Anchor's serialization format.
    
    Args:
        crate_id: Unique identifier for the new crate record
        crate_did: Decentralized Identifier (DID) for the crate
        owner_did: Decentralized Identifier (DID) for the new owner
        device_did: Decentralized Identifier (DID) for the NFC/scanner device
        location: Location as lat,long string
        weight: Weight in grams (must match parent crate's weight - validated on-chain)
        timestamp: Unix timestamp for when the transfer occurs
        hash_str: SHA256 hash of crate data for integrity verification
        ipfs_cid: IPFS content ID where metadata is stored
    
    Returns:
        bytes: Serialized instruction data with discriminator + encoded parameters
        
    Note:
        Parameter order must match the Rust function signature exactly:
        pub fn transfer_ownership(ctx, crate_id, crate_did, owner_did, device_did, location, weight, timestamp, hash, ipfs_cid)
    """
    import hashlib
    
    # Calculate instruction discriminator
    # Anchor uses: sha256("global:<function_name>")[:8]
    discriminator_input = b"global:transfer_ownership"
    discriminator_hash = hashlib.sha256(discriminator_input).digest()
    discriminator = discriminator_hash[:8]
    
    # Build instruction data: discriminator + parameters
    data = discriminator
    
    # Encode parameters in order matching Rust function signature
    data += encode_string(crate_id)                                    # String
    data += encode_string(crate_did)                                   # String
    data += encode_string(owner_did)                                   # String
    data += encode_string(device_did)                                  # String
    data += encode_string(location)                                    # String
    data += weight.to_bytes(4, byteorder='little')                     # u32
    data += timestamp.to_bytes(8, byteorder='little', signed=True)     # i64
    data += encode_string(hash_str)                                    # String
    data += encode_string(ipfs_cid)                                    # String
    
    return data


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
        
        # Build instruction data matching the Rust contract signature
        instruction_data = build_create_crate_instruction_data(
            crate_id=crate_id,
            crate_did=crate_did,
            owner_did=owner_did,
            device_did=device_did,
            location=location,
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
    
    This function creates a complete transaction that:
    1. Creates a new crate record (with a new keypair)
    2. Links it to the parent crate being transferred
    3. Sets the new owner as the authority
    
    The transaction must be signed by:
    - The authority (new owner's wallet)
    - The new crate record keypair (generated here)
    
    Args:
        authority_pubkey: Public key of the new owner (will sign the transaction)
        parent_crate_pubkey: Public key of the parent crate being transferred
        crate_id: Unique identifier for the new crate record
        crate_did: Decentralized Identifier (DID) for the crate
        owner_did: Decentralized Identifier (DID) for the new owner
        device_did: Decentralized Identifier (DID) for the NFC/scanner device
        location: Location as lat,long string
        weight: Weight in grams (MUST match parent crate's weight - validated on-chain)
        timestamp: Unix timestamp for when the transfer occurs
        hash_str: SHA256 hash of crate data for integrity verification
        ipfs_cid: IPFS content ID where metadata is stored
    
    Returns:
        Dictionary containing:
            - transaction: Base64-encoded unsigned transaction
            - crate_keypair: Base64-encoded keypair for the new crate (client must sign with this)
            - crate_pubkey: Public key of the new crate account
            - authority: Public key of the new owner
            - parent_crate: Public key of the parent crate
            - accounts: Dictionary of all account addresses
            - program_id: The Solana program ID
    
    Raises:
        ValueError: If public keys are invalid
        Exception: If transaction building fails
        
    Note:
        The weight MUST match the parent crate's weight. This is validated on-chain
        by the smart contract, not here in the API.
    """
    try:
        # Step 1: Validate and parse authority public key
        authority = PublicKey.from_string(authority_pubkey)
        
        # Step 2: Validate and parse parent crate public key
        parent_crate = PublicKey.from_string(parent_crate_pubkey)
        
        # Step 3: Generate new keypair for the new crate record
        # This is a brand new account that will be initialized on-chain
        crate_keypair = Keypair()
        crate_pubkey = crate_keypair.pubkey()
        
        # Step 4: Build instruction data with updated parameters
        instruction_data = build_transfer_ownership_instruction_data(
            crate_id=crate_id,
            crate_did=crate_did,
            owner_did=owner_did,
            device_did=device_did,
            location=location,
            weight=weight,
            timestamp=timestamp,
            hash_str=hash_str,
            ipfs_cid=ipfs_cid,
        )
        
        # Step 5: Import required Solana types
        from solders.instruction import Instruction, AccountMeta
        
        # Step 6: Set up accounts in the order required by TransferOwnership context
        # This MUST match the order in the Rust struct:
        # pub struct TransferOwnership<'info> {
        #     pub crate_record: Account<'info, CrateRecord>,  // NEW record (init)
        #     pub authority: Signer<'info>,                    // NEW owner (signer)
        #     pub parent_crate: Account<'info, CrateRecord>,   // OLD record (read-only)
        #     pub system_program: Program<'info, System>,
        # }
        accounts = [
            # Account 0: crate_record - NEW account to be initialized
            AccountMeta(crate_pubkey, is_signer=True, is_writable=True),
            
            # Account 1: authority - NEW owner who signs the transaction
            AccountMeta(authority, is_signer=True, is_writable=True),
            
            # Account 2: parent_crate - The crate being transferred (read-only)
            AccountMeta(parent_crate, is_signer=False, is_writable=False),
            
            # Account 3: system_program - Solana system program (for account creation)
            AccountMeta(
                PublicKey.from_string("11111111111111111111111111111111"),
                is_signer=False,
                is_writable=False
            ),
        ]
        
        # Step 7: Create the instruction
        instruction = Instruction(
            program_id=PROGRAM_ID,
            accounts=accounts,
            data=instruction_data,
        )
        
        # Step 8: Get recent blockhash from Solana network
        # This is required for all transactions and prevents replay attacks
        client = AsyncClient(SOLANA_RPC_URL)
        recent_blockhash_resp = await client.get_latest_blockhash()
        recent_blockhash = recent_blockhash_resp.value.blockhash
        await client.close()
        
        # Step 9: Build the transaction message
        from solders.message import Message
        from solders.transaction import Transaction as LegacyTransaction
        
        # Create message with the instruction
        # The payer (authority) will pay for transaction fees
        message = Message.new_with_blockhash(
            [instruction],
            authority,  # Payer
            recent_blockhash,
        )
        
        # Step 10: Create an unsigned transaction
        # The client will sign this with both the authority wallet and crate keypair
        transaction = LegacyTransaction.new_unsigned(message)
        
        # Step 11: Serialize the transaction for transmission
        transaction_serialized = bytes(transaction)
        transaction_base64 = base64.b64encode(transaction_serialized).decode('utf-8')
        
        # Step 12: Serialize the crate keypair for the client
        # The client needs this to sign as the new crate account
        keypair_secret = bytes(crate_keypair)
        keypair_base64 = base64.b64encode(keypair_secret).decode('utf-8')
        
        # Step 13: Return all data needed by the client
        return {
            "transaction": transaction_base64,
            "crate_keypair": keypair_base64,
            "crate_pubkey": str(crate_pubkey),
            "authority": str(authority),
            "parent_crate": str(parent_crate),
            "accounts": {
                "crate_record": str(crate_pubkey),
                "authority": str(authority),
                "parent_crate": str(parent_crate),
                "system_program": "11111111111111111111111111111111",
            },
            "program_id": str(PROGRAM_ID),
        }
        
    except Exception as e:
        print(f"Error building transfer ownership transaction: {str(e)}")
        raise

