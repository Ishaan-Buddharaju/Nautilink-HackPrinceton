from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client
from typing import Optional, List, Dict, Any, Set
from collections import deque
from pydantic import BaseModel, Field
from datetime import datetime
import httpx
import base64
import uuid
import io

# Optional PIL import for image processing
try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    Image = None

from config import settings
from supabase import create_client
from posts.solana_simple import (
    build_create_crate_transaction,
    build_transfer_ownership_transaction,
    PROGRAM_ID,
    SOLANA_RPC_URL
)
# Keep load_program from the old module for legacy endpoints
from posts.solana import load_program

router = APIRouter(prefix="/web3", tags=["web3"])
security = HTTPBearer()

# Initialize Supabase client for auth operations
supabase_auth: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)

# Initialize Supabase client for database/storage operations
# Use anon key for now (service role key is optional)
supabase_db: Client = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_ANON_KEY
)


# Pydantic models for request/response
class CreateCrateRequest(BaseModel):
    """Request model for creating a new crate."""
    crate_id: str = Field(..., description="Unique crate identifier", min_length=1)
    crate_did: str = Field(..., description="Decentralized Identifier (DID) for the crate", min_length=1)
    owner_did: str = Field(..., description="Decentralized Identifier (DID) for the owner", min_length=1)
    device_did: str = Field(..., description="Decentralized Identifier (DID) for the NFC/scanner device", min_length=1)
    location: str = Field(..., description="Location as lat,long string", min_length=1)
    weight: int = Field(..., description="Weight in grams", gt=0)
    ipfs_cid: str = Field(..., description="IPFS content ID for metadata", min_length=1)
    hash: str = Field(..., description="SHA256 hash of crate data", min_length=1)
    timestamp: Optional[int] = Field(None, description="Unix timestamp (defaults to now)")
    solana_wallet: Optional[str] = Field(None, description="User's Solana wallet public key")
    image: Optional[str] = Field(None, description="Optional base64 encoded image to store off-chain")
    supply_chain_stage: Optional[str] = Field(None, description="Supply chain stage (e.g., fisher, fishery, processor, distributor, retailer)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "crate_id": "CRATE_001",
                "crate_did": "did:nautilink:crate:001",
                "owner_did": "did:nautilink:user:alice",
                "device_did": "did:nautilink:device:nfc001",
                "location": "40.7128,-74.0060",
                "weight": 1000,
                "ipfs_cid": "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
                "hash": "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3",
                "timestamp": 1234567890,
                "solana_wallet": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
            }
        }


class CreateCrateResponse(BaseModel):
    """Response model for create crate endpoint."""
    success: bool
    message: str
    crate_id: str
    user_id: str
    validated: bool = Field(..., description="Whether JWT token was successfully verified")
    transaction: Optional[str] = Field(None, description="Base64 encoded unsigned transaction")
    crate_pubkey: Optional[str] = Field(None, description="Public key of the crate account")
    crate_keypair: Optional[str] = Field(None, description="Base64 encoded keypair for signing")
    accounts: Optional[dict] = Field(None, description="Account addresses for the transaction")
    image_url: Optional[str] = Field(None, description="URL of uploaded image if provided")
    offchain_stored: bool = Field(False, description="Whether crate data was stored off-chain")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Crate creation transaction built successfully",
                "crate_id": "CRATE_001",
                "user_id": "user-uuid-here",
                "validated": True,
                "transaction": "AQAAAAAAAAAAAA...",
                "crate_pubkey": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
                "crate_keypair": "...",
                "accounts": {
                    "crate_record": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
                    "authority": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
                    "system_program": "11111111111111111111111111111111"
                }
            }
        }


class TransferOwnershipRequest(BaseModel):
    """Request model for transferring crate ownership."""
    parent_crate_pubkey: str = Field(..., description="Public key of the parent crate being transferred", min_length=32)
    crate_id: str = Field(..., description="Unique identifier for the new crate record", min_length=1)
    crate_did: str = Field(..., description="Decentralized Identifier (DID) for the crate", min_length=1)
    owner_did: str = Field(..., description="Decentralized Identifier (DID) for the new owner", min_length=1)
    device_did: str = Field(..., description="Decentralized Identifier (DID) for the NFC/scanner device", min_length=1)
    location: str = Field(..., description="Location as lat,long string", min_length=1)
    weight: int = Field(..., description="Weight in grams (must match parent crate)", gt=0)
    hash: str = Field(..., description="SHA256 hash of crate data", min_length=1)
    ipfs_cid: str = Field(..., description="IPFS content ID for metadata", min_length=1)
    timestamp: Optional[int] = Field(None, description="Unix timestamp (defaults to now)")
    solana_wallet: Optional[str] = Field(None, description="New owner's Solana wallet public key")
    
    class Config:
        json_schema_extra = {
            "example": {
                "parent_crate_pubkey": "DtHLdSPxNwFw31JK8AYNiJx8r1YkQYcTw11qmH99HKYp",
                "crate_id": "CRATE_002",
                "crate_did": "did:nautilink:crate:002",
                "owner_did": "did:nautilink:user:bob",
                "device_did": "did:nautilink:device:nfc002",
                "location": "40.7580,-73.9855",
                "weight": 1000,
                "hash": "b665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae4",
                "ipfs_cid": "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
                "timestamp": 1234567890,
                "solana_wallet": "6ZTB7UovQqYZmE37uRuBjQoPtvZHx2Par4rhD7mp8ge4"
            }
        }


class TransferOwnershipResponse(BaseModel):
    """Response model for transfer ownership endpoint."""
    success: bool
    message: str
    crate_id: str
    user_id: str
    validated: bool = Field(..., description="Whether JWT token was successfully verified")
    transaction: Optional[str] = Field(None, description="Base64 encoded unsigned transaction")
    crate_pubkey: Optional[str] = Field(None, description="Public key of the new crate account")
    crate_keypair: Optional[str] = Field(None, description="Base64 encoded keypair for signing")
    parent_crate: Optional[str] = Field(None, description="Public key of the parent crate")
    accounts: Optional[dict] = Field(None, description="Account addresses for the transaction")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Transfer ownership transaction built successfully",
                "crate_id": "CRATE_002",
                "user_id": "user-uuid-here",
                "validated": True,
                "transaction": "AQAAAAAAAAAAAA...",
                "crate_pubkey": "EH9HZ1VwEkfLQwgLd3fbEHm7fr6vt8T1o899ZWojiyJq",
                "crate_keypair": "...",
                "parent_crate": "DtHLdSPxNwFw31JK8AYNiJx8r1YkQYcTw11qmH99HKYp",
                "accounts": {
                    "crate_record": "EH9HZ1VwEkfLQwgLd3fbEHm7fr6vt8T1o899ZWojiyJq",
                    "authority": "6ZTB7UovQqYZmE37uRuBjQoPtvZHx2Par4rhD7mp8ge4",
                    "parent_crate": "DtHLdSPxNwFw31JK8AYNiJx8r1YkQYcTw11qmH99HKYp",
                    "system_program": "11111111111111111111111111111111"
                }
            }
        }


class TransferOwnershipOnChainResponse(BaseModel):
    """Response model for server-side signed and submitted transfer ownership."""
    success: bool
    message: str
    crate_id: str
    user_id: str
    crate_pubkey: str = Field(..., description="Public key of the new crate account created on-chain")
    parent_crate: str = Field(..., description="Public key of the parent crate")
    transaction_signature: str = Field(..., description="Solana transaction signature (proof of on-chain submission)")
    explorer_url: str = Field(..., description="Solana explorer URL to view transaction")
    accounts: dict = Field(..., description="Account addresses involved in the transaction")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Transfer ownership completed and recorded on Solana blockchain",
                "crate_id": "CRATE_002",
                "user_id": "user-uuid-here",
                "crate_pubkey": "EH9HZ1VwEkfLQwgLd3fbEHm7fr6vt8T1o899ZWojiyJq",
                "parent_crate": "DtHLdSPxNwFw31JK8AYNiJx8r1YkQYcTw11qmH99HKYp",
                "transaction_signature": "5J8...",
                "explorer_url": "https://explorer.solana.com/tx/5J8...?cluster=devnet",
                "accounts": {
                    "crate_record": "EH9HZ1VwEkfLQwgLd3fbEHm7fr6vt8T1o899ZWojiyJq",
                    "authority": "6ZTB7UovQqYZmE37uRuBjQoPtvZHx2Par4rhD7mp8ge4",
                    "parent_crate": "DtHLdSPxNwFw31JK8AYNiJx8r1YkQYcTw11qmH99HKYp"
                }
            }
        }


class CrateNode(BaseModel):
    """Represents a single crate in the supply chain."""
    pubkey: str = Field(..., description="Public key of the crate account")
    crate_id: str = Field(..., description="Unique crate identifier")
    authority: str = Field(..., description="Current owner's wallet address")
    weight: int = Field(..., description="Weight in grams")
    timestamp: int = Field(..., description="Unix timestamp")
    hash: str = Field(..., description="SHA256 hash")
    ipfs_cid: str = Field(..., description="IPFS content ID")
    operation_type: str = Field(..., description="Created, Transferred, Mixed, or Split")
    parent_crates: List[str] = Field(default_factory=list, description="Parent crate public keys")
    child_crates: List[str] = Field(default_factory=list, description="Child crate public keys")
    parent_weights: List[int] = Field(default_factory=list, description="Original weights of parent crates")
    split_distribution: Optional[List[int]] = Field(None, description="Weight distribution if split operation")
    is_root: bool = Field(False, description="True if this is a root crate (no parents)")
    depth: int = Field(0, description="Depth from root (0 for root crates)")


class SupplyChainGraph(BaseModel):
    """Complete supply chain graph with all crates and relationships."""
    total_crates: int = Field(..., description="Total number of crates")
    root_crates: List[str] = Field(..., description="Public keys of root crates (original creations)")
    crates: Dict[str, CrateNode] = Field(..., description="Map of pubkey -> CrateNode")
    lineages: Dict[str, List[str]] = Field(..., description="Map of crate pubkey -> lineage path to root(s)")


class GetAllCratesResponse(BaseModel):
    """Response model for get all crates endpoint."""
    success: bool
    message: str
    graph: SupplyChainGraph


class CrateHistoryResponse(BaseModel):
    """Response model for get crate history endpoint."""
    success: bool
    message: str
    crate_pubkey: str = Field(..., description="Public key of the requested crate")
    current_crate: CrateNode = Field(..., description="Current crate details")
    lineage_path: List[str] = Field(..., description="Path from root to current crate (pubkeys)")
    history: List[CrateNode] = Field(..., description="Complete history from root to current crate with full details")
    root_crate: CrateNode = Field(..., description="Root crate (original creation)")
    depth: int = Field(..., description="Depth from root (0 = root crate)")
    is_root: bool = Field(..., description="Whether this is a root crate")


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    Dependency to get the current authenticated user from the JWT token.
    Verifies the token with Supabase by making a direct HTTP request to the user endpoint.
    """
    try:
        token = credentials.credentials
        
        # Make a direct HTTP request to Supabase's user endpoint to verify the token
        # This is more reliable than using the Python client's get_user() method
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.SUPABASE_URL}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": settings.SUPABASE_ANON_KEY,
                },
                timeout=10.0,
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid authentication credentials",
                )
            
            user_data = response.json()
            
            if not user_data or "id" not in user_data:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid authentication credentials",
                )
            
            # Convert to dict format matching the expected structure
            user_dict = {
                "id": user_data.get("id"),
                "email": user_data.get("email", ""),
                "created_at": user_data.get("created_at"),
                "updated_at": user_data.get("updated_at"),
                "user_metadata": user_data.get("user_metadata", {}),
                "app_metadata": user_data.get("app_metadata", {}),
            }
            return user_dict
            
    except HTTPException:
        raise
    except httpx.HTTPError as e:
        # Network or HTTP errors
        print(f"HTTP error during auth: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not verify authentication credentials",
        )
    except Exception as e:
        # Log the actual error for debugging
        error_msg = str(e)
        print(f"Auth error: {error_msg}")  # Debug log
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {error_msg}",
        )


async def upload_image_to_supabase(image_base64: str, crate_pubkey: str) -> Optional[str]:
    """
    Upload a base64 encoded image to Supabase Storage.
    
    Args:
        image_base64: Base64 encoded image string (with or without data URL prefix)
        crate_pubkey: Crate public key to use in filename
    
    Returns:
        Public URL of the uploaded image, or None if upload fails
    """
    try:
        # Remove data URL prefix if present (e.g., "data:image/jpeg;base64,...")
        if "," in image_base64:
            image_base64 = image_base64.split(",")[1]
        
        # Decode base64 image
        image_bytes = base64.b64decode(image_base64)
        
        # Validate it's actually an image by trying to open it
        if not PIL_AVAILABLE:
            print("Warning: PIL/Pillow not available, skipping image validation")
            # Still try to upload without validation
            ext = "jpg"  # Default extension
        else:
            try:
                img = Image.open(io.BytesIO(image_bytes))
                # Convert to RGB if necessary (handles RGBA, P, etc.)
                if img.mode in ('RGBA', 'LA', 'P'):
                    rgb_img = Image.new('RGB', img.size, (255, 255, 255))
                    if img.mode == 'P':
                        img = img.convert('RGBA')
                    rgb_img.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
                    img = rgb_img
                
                # Determine file extension from image format
                format_map = {
                    'JPEG': 'jpg',
                    'PNG': 'png',
                    'WEBP': 'webp',
                    'GIF': 'gif'
                }
                ext = format_map.get(img.format, 'jpg')
            except Exception as img_error:
                print(f"Invalid image data: {str(img_error)}")
                return None
            
            # Generate unique filename
            filename = f"{crate_pubkey[:16]}_{uuid.uuid4().hex[:8]}.{ext}"
            file_path = f"crate-images/{filename}"
            
            # Upload to Supabase Storage
            # Create bucket if it doesn't exist (this might fail if bucket exists, that's ok)
            try:
                supabase_db.storage.create_bucket("crate-images", {"public": True})
            except Exception:
                pass  # Bucket might already exist
            
            # Upload the image
            # Supabase Python client expects bytes or file-like object
            response = supabase_db.storage.from_("crate-images").upload(
                file_path,
                image_bytes,
                file_options={"content-type": f"image/{ext}", "upsert": "false"}
            )
            
            # Check if upload was successful
            if response and hasattr(response, 'path'):
                # Get public URL - construct it manually or use get_public_url
                public_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/crate-images/{file_path}"
                print(f"✓ Image uploaded successfully: {public_url}")
                return public_url
            elif response:
                # Try to get public URL using the client method
                try:
                    public_url_response = supabase_db.storage.from_("crate-images").get_public_url(file_path)
                    if public_url_response:
                        public_url = public_url_response if isinstance(public_url_response, str) else str(public_url_response)
                        print(f"✓ Image uploaded successfully: {public_url}")
                        return public_url
                except Exception as url_error:
                    # Fallback to manual URL construction
                    public_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/crate-images/{file_path}"
                    print(f"✓ Image uploaded (using fallback URL): {public_url}")
                    return public_url
            else:
                print("Failed to upload image: No response from Supabase")
                return None
            
    except Exception as e:
        print(f"Error uploading image to Supabase: {str(e)}")
        import traceback
        traceback.print_exc()
        return None


async def store_crate_offchain(
    crate_pubkey: str,
    crate_id: str,
    crate_did: str,
    owner_did: str,
    device_did: str,
    location: str,
    weight: int,
    timestamp: int,
    hash_str: str,
    ipfs_cid: str,
    user_id: str,
    user_email: str,
    solana_wallet: str,
    image_url: Optional[str] = None,
    supply_chain_stage: Optional[str] = None
) -> bool:
    """
    Store crate data in Supabase database for fast queries and correlation.
    
    Args:
        crate_pubkey: Public key of the crate account
        crate_id: Unique crate identifier
        crate_did: Crate DID
        owner_did: Owner DID
        device_did: Device DID
        location: Location string
        weight: Weight in grams
        timestamp: Unix timestamp
        hash_str: SHA256 hash
        ipfs_cid: IPFS content ID
        user_id: Supabase user ID
        user_email: User email for correlation
        solana_wallet: Solana wallet address
        image_url: Optional image URL
        supply_chain_stage: Optional supply chain stage (fisher, fishery, processor, etc.)
    
    Returns:
        True if stored successfully, False otherwise
    """
    try:
        crate_data = {
            "crate_pubkey": crate_pubkey,
            "crate_id": crate_id,
            "crate_did": crate_did,
            "owner_did": owner_did,
            "device_did": device_did,
            "location": location,
            "weight": weight,
            "timestamp": timestamp,
            "hash": hash_str,
            "ipfs_cid": ipfs_cid,
            "owner_user_id": user_id,
            "owner_email": user_email,
            "solana_wallet": solana_wallet,
            "image_url": image_url,
            "supply_chain_stage": supply_chain_stage,
            # created_at and updated_at are handled by database defaults and triggers
        }
        
        # Insert into Supabase 'crates' table
        # Note: Table must exist in your Supabase database
        response = supabase_db.table("crates").insert(crate_data).execute()
        
        if response.data:
            print(f"✓ Crate stored off-chain: {crate_id} ({crate_pubkey[:8]}...)")
            return True
        else:
            print(f"Failed to store crate off-chain: {response}")
            return False
            
    except Exception as e:
        print(f"Error storing crate off-chain: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def fetch_all_crate_accounts() -> List[Dict[str, Any]]:
    """
    Fetch all CrateRecord accounts owned by the Nautilink program from Solana.
    
    Uses get_program_accounts to retrieve all accounts owned by the program,
    then deserializes each account using Anchor's account decoder.
    
    Returns:
        List of dictionaries containing deserialized crate data with the following keys:
        - pubkey: Public key of the crate account
        - authority: Current owner's wallet address
        - crate_id: Unique crate identifier
        - weight: Weight in grams
        - timestamp: Unix timestamp
        - hash: SHA256 hash
        - ipfs_cid: IPFS content ID
        - parent_crates: List of parent crate public keys
        - child_crates: List of child crate public keys
        - parent_weights: List of original weights of parent crates
        - split_distribution: Weight distribution if split operation (optional)
        - operation_type: Type of operation (Created, Transferred, Mixed, Split)
    
    Raises:
        Exception: If program accounts cannot be fetched or deserialized
    """
    from solana.rpc.async_api import AsyncClient
    
    try:
        # Load program for deserialization
        program = await load_program()
        client = AsyncClient(SOLANA_RPC_URL)
        
        print(f"Fetching all accounts for program: {PROGRAM_ID}")
        
        # Get all accounts owned by the program
        # Using get_program_accounts with base64 encoding
        accounts_response = await client.get_program_accounts(
            PROGRAM_ID,
            encoding="base64",
            commitment="confirmed"
        )
        
        print(f"Found {len(accounts_response.value)} accounts")
        
        crates = []
        
        # Deserialize each account
        for account_info in accounts_response.value:
            pubkey = str(account_info.pubkey)
            account_data = account_info.account.data
            
            try:
                # Decode base64 data
                if isinstance(account_data, list):
                    # Data is already a list of bytes
                    data_bytes = bytes(account_data)
                elif isinstance(account_data, str):
                    # Data is base64 string
                    data_bytes = base64.b64decode(account_data)
                else:
                    print(f"Skipping account {pubkey}: unexpected data type")
                    continue
                
                # Skip if data is too small (needs at least 8 bytes for discriminator)
                if len(data_bytes) < 8:
                    print(f"Skipping account {pubkey}: data too small ({len(data_bytes)} bytes)")
                    continue
                
                # Deserialize using Anchor's account decoder
                # Skip the 8-byte discriminator (first 8 bytes)
                account_data_bytes = data_bytes[8:]
                
                # Use the program's account decoder for CrateRecord
                crate_record = program.account["CrateRecord"].coder.accounts.decode(account_data_bytes)
                
                # Convert to dictionary
                crate_dict = {
                    "pubkey": pubkey,
                    "authority": str(crate_record.authority),
                    "crate_id": crate_record.crate_id,
                    "weight": crate_record.weight,
                    "timestamp": crate_record.timestamp,
                    "hash": crate_record.hash,
                    "ipfs_cid": crate_record.ipfs_cid,
                    "parent_crates": [str(p) for p in crate_record.parent_crates],
                    "child_crates": [str(c) for c in crate_record.child_crates],
                    "parent_weights": list(crate_record.parent_weights),
                    "split_distribution": list(crate_record.split_distribution) if hasattr(crate_record, 'split_distribution') and crate_record.split_distribution else None,
                    "operation_type": str(crate_record.operation_type),
                }
                
                crates.append(crate_dict)
                print(f"✓ Deserialized crate: {crate_dict['crate_id']} ({pubkey[:8]}...)")
                
            except Exception as e:
                print(f"Error deserializing account {pubkey}: {str(e)}")
                import traceback
                traceback.print_exc()
                continue
        
        await client.close()
        print(f"Successfully fetched {len(crates)} crate accounts")
        return crates
        
    except Exception as e:
        print(f"Error fetching crate accounts: {str(e)}")
        import traceback
        traceback.print_exc()
        raise


def build_supply_chain_graph(crates: List[Dict[str, Any]]) -> SupplyChainGraph:
    """
    Build a complete supply chain graph from crate data.
    
    This function:
    1. Creates CrateNode objects for each crate
    2. Identifies root crates (those with no parents)
    3. Calculates depth from root using BFS
    4. Builds lineage paths tracing back to root crates
    
    Args:
        crates: List of crate dictionaries from Solana accounts
        
    Returns:
        SupplyChainGraph with all crates, relationships, and lineage paths
    """
    # Create map of pubkey -> CrateNode
    crate_map: Dict[str, CrateNode] = {}
    root_crates: Set[str] = set()
    
    # First pass: create all nodes
    for crate_data in crates:
        pubkey = crate_data["pubkey"]
        is_root = len(crate_data["parent_crates"]) == 0
        
        node = CrateNode(
            pubkey=pubkey,
            crate_id=crate_data["crate_id"],
            authority=crate_data["authority"],
            weight=crate_data["weight"],
            timestamp=crate_data["timestamp"],
            hash=crate_data["hash"],
            ipfs_cid=crate_data["ipfs_cid"],
            operation_type=crate_data["operation_type"],
            parent_crates=crate_data["parent_crates"],
            child_crates=crate_data["child_crates"],
            parent_weights=crate_data["parent_weights"],
            split_distribution=crate_data.get("split_distribution"),
            is_root=is_root,
            depth=0,  # Will calculate in second pass
        )
        
        crate_map[pubkey] = node
        if is_root:
            root_crates.add(pubkey)
    
    # Second pass: calculate depths using BFS from root crates
    visited = set()
    queue = deque()
    
    # Start BFS from all root crates
    for root_pubkey in root_crates:
        queue.append((root_pubkey, 0))
        visited.add(root_pubkey)
        crate_map[root_pubkey].depth = 0
    
    # BFS to assign depths
    while queue:
        current_pubkey, depth = queue.popleft()
        current_node = crate_map[current_pubkey]
        
        # Visit all children
        for child_pubkey in current_node.child_crates:
            if child_pubkey in crate_map and child_pubkey not in visited:
                visited.add(child_pubkey)
                child_node = crate_map[child_pubkey]
                child_node.depth = depth + 1
                queue.append((child_pubkey, depth + 1))
    
    # Handle unvisited nodes (orphaned crates or cycles)
    for pubkey, node in crate_map.items():
        if pubkey not in visited:
            # Try to find minimum depth from any parent
            if node.parent_crates:
                min_parent_depth = min(
                    (crate_map[p].depth for p in node.parent_crates if p in crate_map),
                    default=-1
                )
                node.depth = min_parent_depth + 1 if min_parent_depth >= 0 else 0
            else:
                # No parents but not marked as root - treat as root
                node.is_root = True
                node.depth = 0
                root_crates.add(pubkey)
    
    # Third pass: build lineage paths (trace back to root for each crate)
    lineages: Dict[str, List[str]] = {}
    
    def trace_to_roots(pubkey: str, visited_path: Set[str] = None) -> List[List[str]]:
        """
        Recursively trace back to all root crates.
        Returns list of paths, where each path is a list of pubkeys from root to this crate.
        """
        if visited_path is None:
            visited_path = set()
        
        if pubkey in visited_path:
            # Cycle detected, return empty
            return []
        
        if pubkey not in crate_map:
            return []
        
        node = crate_map[pubkey]
        
        # If root, return path with just this pubkey
        if node.is_root:
            return [[pubkey]]
        
        # If no parents, treat as root
        if not node.parent_crates:
            return [[pubkey]]
        
        # Trace through all parents (for mix operations)
        all_paths = []
        visited_path.add(pubkey)
        
        for parent_pubkey in node.parent_crates:
            parent_paths = trace_to_roots(parent_pubkey, visited_path.copy())
            for parent_path in parent_paths:
                if parent_path:
                    # Prepend current crate to each path
                    all_paths.append([pubkey] + parent_path)
        
        visited_path.remove(pubkey)
        
        # If no paths found, return current crate as endpoint
        if not all_paths:
            return [[pubkey]]
        
        return all_paths
    
    # Build lineage for all crates
    # For simplicity, store the shortest path to root (first path)
    for pubkey in crate_map:
        paths = trace_to_roots(pubkey)
        if paths:
            # Store the shortest path (or first path if equal length)
            lineages[pubkey] = min(paths, key=len) if paths else [pubkey]
        else:
            lineages[pubkey] = [pubkey]
    
    return SupplyChainGraph(
        total_crates=len(crate_map),
        root_crates=list(root_crates),
        crates={pubkey: node for pubkey, node in crate_map.items()},
        lineages=lineages,
    )


@router.get("/get-all-crates", response_model=GetAllCratesResponse, status_code=status.HTTP_200_OK)
async def get_all_crates(
    current_user: dict = Depends(get_current_user)
) -> GetAllCratesResponse:
    """
    Get all crates in the supply chain and build the complete graph.
    
    This endpoint:
    1. Fetches all CrateRecord accounts from the Solana program
    2. Deserializes each account to extract crate data
    3. Builds a graph structure showing parent-child relationships
    4. Traces lineage paths back to root crates (original creations)
    
    **Response Structure:**
    - `graph.crates`: Map of all crates by public key
    - `graph.root_crates`: List of root crate pubkeys (original creations)
    - `graph.lineages`: Map of crate pubkey -> path to root
    - Each crate includes depth, operation type, and relationships
    
    **Use Cases:**
    - View complete supply chain
    - Trace any crate back to its origin
    - Identify root crates vs. transferred/split crates
    - Build visualization of supply chain relationships
    
    Args:
        current_user: Authenticated user from JWT token (auto-injected)
    
    Returns:
        GetAllCratesResponse with complete supply chain graph
    
    Raises:
        HTTPException 401: Invalid or missing JWT token
        HTTPException 500: Failed to fetch or deserialize accounts
    """
    try:
        # Step 1: Fetch all crate accounts from Solana
        print("Fetching all crate accounts from Solana...")
        crates = await fetch_all_crate_accounts()
        
        if not crates:
            return GetAllCratesResponse(
                success=True,
                message="No crates found in the supply chain",
                graph=SupplyChainGraph(
                    total_crates=0,
                    root_crates=[],
                    crates={},
                    lineages={},
                ),
            )
        
        print(f"Found {len(crates)} crate accounts")
        
        # Step 2: Build supply chain graph
        print("Building supply chain graph...")
        graph = build_supply_chain_graph(crates)
        
        print(f"✓ Built graph with {graph.total_crates} crates, {len(graph.root_crates)} root crates")
        
        return GetAllCratesResponse(
            success=True,
            message=f"Successfully retrieved {graph.total_crates} crates from supply chain",
            graph=graph,
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_all_crates: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch supply chain data: {str(e)}"
        )


@router.get("/get-crate-history/{crate_pubkey}", response_model=CrateHistoryResponse, status_code=status.HTTP_200_OK)
async def get_crate_history(
    crate_pubkey: str,
    current_user: dict = Depends(get_current_user)
) -> CrateHistoryResponse:
    """
    Get the complete history of a specific crate, tracing back to its root.
    
    This endpoint:
    1. Fetches all crate accounts from the Solana program
    2. Builds the supply chain graph
    3. Traces the lineage path for the specified crate back to its root
    4. Returns the complete history with full details of each crate in the chain
    
    **Response Structure:**
    - `current_crate`: Full details of the requested crate
    - `lineage_path`: List of pubkeys from root to current crate
    - `history`: List of CrateNode objects in chronological order (root → current)
    - `root_crate`: The original crate this one traces back to
    - `depth`: How many generations from the root
    - `is_root`: Whether this crate is itself a root
    
    **Use Cases:**
    - Trace a specific crate back to its origin
    - View complete provenance/history of a crate
    - Verify supply chain integrity
    - Display lineage visualization
    
    Args:
        crate_pubkey: Public key of the crate to trace (path parameter)
        current_user: Authenticated user from JWT token (auto-injected)
    
    Returns:
        CrateHistoryResponse with complete lineage history
    
    Raises:
        HTTPException 401: Invalid or missing JWT token
        HTTPException 404: Crate not found
        HTTPException 500: Failed to fetch or process data
    """
    try:
        # Step 1: Fetch all crate accounts from Solana
        print(f"Fetching crate history for: {crate_pubkey}")
        crates = await fetch_all_crate_accounts()
        
        if not crates:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No crates found in the supply chain"
            )
        
        # Step 2: Build supply chain graph
        graph = build_supply_chain_graph(crates)
        
        # Step 3: Check if crate exists
        if crate_pubkey not in graph.crates:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Crate not found: {crate_pubkey}"
            )
        
        current_crate = graph.crates[crate_pubkey]
        lineage_path = graph.lineages.get(crate_pubkey, [crate_pubkey])
        
        # Step 4: Build history list (root to current, in chronological order)
        # Reverse the lineage path to go from root to current
        history_path = list(reversed(lineage_path))
        history = [graph.crates[pubkey] for pubkey in history_path if pubkey in graph.crates]
        
        # Get root crate (first in history, or current if it's a root)
        root_crate = history[0] if history else current_crate
        
        print(f"✓ Found history: {len(history)} crates, depth: {current_crate.depth}")
        
        return CrateHistoryResponse(
            success=True,
            message=f"Successfully retrieved history for crate {current_crate.crate_id}",
            crate_pubkey=crate_pubkey,
            current_crate=current_crate,
            lineage_path=lineage_path,
            history=history,
            root_crate=root_crate,
            depth=current_crate.depth,
            is_root=current_crate.is_root,
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_crate_history: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch crate history: {str(e)}"
        )


@router.post("/create-crate", response_model=CreateCrateResponse, status_code=status.HTTP_200_OK)
async def create_crate(
    request: CreateCrateRequest,
    current_user: dict = Depends(get_current_user)
) -> CreateCrateResponse:
    try:

        user_id = current_user.get("id")
        user_email = current_user.get("email", "")
        
        # Validate timestamp or set to current time
        timestamp = request.timestamp if request.timestamp else int(datetime.utcnow().timestamp())
        
        # Additional validation: Check if user has Solana wallet
        # First check request body, then user metadata
        solana_wallet = request.solana_wallet
        if not solana_wallet:
            user_metadata = current_user.get("user_metadata", {})
            solana_wallet = user_metadata.get("solana_wallet")
        
        if not solana_wallet:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Solana wallet address is required. Please provide it in the request or set it in your user profile."
            )
        
        # # Validate NFC tag exists in database (optional check)
        # # This could verify the NFC tag is registered in your system
        # try:
        #     # Check if NFC tag exists in Supabase (if you have an nfc_tags table)
        #     # For now, we'll just log it
        #     print(f"Processing NFC tag: {request.nfc_tag_id} for user: {user_id}")
        # except Exception as e:
        #     # If NFC tag validation fails, we can still proceed
        #     # but log the warning
        #     print(f"Warning: Could not validate NFC tag: {str(e)}")
        
        if request.weight <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Weight must be greater than 0"
            )
        
        # Step 4: Build Solana transaction
        try:
            transaction_data = await build_create_crate_transaction(
                authority_pubkey=solana_wallet,
                crate_id=request.crate_id,
                crate_did=request.crate_did,
                owner_did=request.owner_did,
                device_did=request.device_did,
                location=request.location,
                weight=request.weight,
                timestamp=timestamp,
                hash_str=request.hash,
                ipfs_cid=request.ipfs_cid,
            )
            
            crate_pubkey = transaction_data["crate_pubkey"]
            image_url = None
            offchain_stored = False
            
            # Step 5: Upload image to Supabase Storage (if provided)
            if request.image:
                print("Uploading image to Supabase Storage...")
                image_url = await upload_image_to_supabase(request.image, crate_pubkey)
                if not image_url:
                    print("Warning: Image upload failed, but continuing with crate creation")
            
            # Step 6: Store crate data off-chain in Supabase database
            print("Storing crate data off-chain...")
            offchain_stored = await store_crate_offchain(
                crate_pubkey=crate_pubkey,
                crate_id=request.crate_id,
                crate_did=request.crate_did,
                owner_did=request.owner_did,
                device_did=request.device_did,
                location=request.location,
                weight=request.weight,
                timestamp=timestamp,
                hash_str=request.hash,
                ipfs_cid=request.ipfs_cid,
                user_id=user_id,
                user_email=user_email,
                solana_wallet=solana_wallet,
                image_url=image_url,
                supply_chain_stage=request.supply_chain_stage
            )
            
            if not offchain_stored:
                print("Warning: Off-chain storage failed, but transaction was built successfully")
            
            return CreateCrateResponse(
                success=True,
                message="Crate creation transaction built successfully. Please sign and submit the transaction." + 
                        (" Off-chain data stored." if offchain_stored else ""),
                crate_id=request.crate_id,
                user_id=user_id,
                validated=True,
                transaction=transaction_data["transaction"],
                crate_pubkey=crate_pubkey,
                crate_keypair=transaction_data["crate_keypair"],
                accounts=transaction_data["accounts"],
                image_url=image_url,
                offchain_stored=offchain_stored,
            )
        except FileNotFoundError as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Solana program configuration error: {str(e)}. Please ensure IDL file exists."
            )
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid Solana wallet address: {str(e)}"
            )
        except Exception as e:
            print(f"Error building Solana transaction: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to build Solana transaction: {str(e)}"
            )
        
    except HTTPException:
        # Re-raise HTTP exceptions (like 400, 401, etc.)
        raise
    except Exception as e:
        # Log unexpected errors
        print(f"Error in create_crate: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.post("/transfer-ownership-unsigned", response_model=TransferOwnershipResponse, status_code=status.HTTP_200_OK)
async def transfer_ownership_unsigned(
    request: TransferOwnershipRequest,
    current_user: dict = Depends(get_current_user)
) -> TransferOwnershipResponse:
    """
    Transfer ownership of a crate to a new owner.
    
    This endpoint builds an unsigned Solana transaction for the transfer_ownership
    instruction defined in the smart contract. The weight must match the parent 
    crate's weight exactly - this is validated on-chain by the Solana program.
    
    **Key Points:**
    - Creates a NEW crate record (doesn't modify the parent)
    - Links the new record to the parent crate
    - Weight MUST match parent (validated on-chain)
    - Requires JWT authentication
    - Returns unsigned transaction for client-side signing
    
    **Client Signing Requirements:**
    The returned transaction must be signed with TWO keypairs:
    1. Authority (new owner's wallet) - User signs via Phantom/wallet
    2. Crate record keypair - Provided in response, client must sign with this
    
    Args:
        request: Transfer ownership request with parent crate info and metadata
        current_user: Authenticated user from JWT token (auto-injected)
    
    Returns:
        TransferOwnershipResponse with unsigned transaction and signing data
    
    Raises:
        HTTPException 400: Invalid input parameters
        HTTPException 401: Invalid or missing JWT token
        HTTPException 500: Transaction building failed
    """
    try:
        # Step 1: Extract user information
        user_id = current_user.get("id")
        user_email = current_user.get("email", "")
        
        # Step 2: Validate timestamp or set to current time
        timestamp = request.timestamp if request.timestamp else int(datetime.utcnow().timestamp())
        
        # Step 3: Get Solana wallet address (new owner)
        # Check request body first, then fall back to user metadata
        solana_wallet = request.solana_wallet
        if not solana_wallet:
            user_metadata = current_user.get("user_metadata", {})
            solana_wallet = user_metadata.get("solana_wallet")
        
        if not solana_wallet:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Solana wallet address is required. Please provide it in the request or set it in your user profile."
            )
        
        # Step 4: Validate weight (basic check - detailed validation happens on-chain)
        if request.weight <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Weight must be greater than 0"
            )
        
        # Step 5: Validate parent crate public key format
        if not request.parent_crate_pubkey or len(request.parent_crate_pubkey) < 32:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid parent crate public key. Must be a valid Solana address."
            )
        
        # Step 6: Build Solana transaction for transfer ownership
        try:
            transaction_data = await build_transfer_ownership_transaction(
                authority_pubkey=solana_wallet,
                parent_crate_pubkey=request.parent_crate_pubkey,
                crate_id=request.crate_id,
                crate_did=request.crate_did,
                owner_did=request.owner_did,
                device_did=request.device_did,
                location=request.location,
                weight=request.weight,
                timestamp=timestamp,
                hash_str=request.hash,
                ipfs_cid=request.ipfs_cid,
            )
            
            # Step 7: Return successful response with transaction data
            return TransferOwnershipResponse(
                success=True,
                message="Transfer ownership transaction built successfully. Please sign with both the authority wallet and crate keypair, then submit to Solana.",
                crate_id=request.crate_id,
                user_id=user_id,
                validated=True,
                transaction=transaction_data["transaction"],
                crate_pubkey=transaction_data["crate_pubkey"],
                crate_keypair=transaction_data["crate_keypair"],
                parent_crate=transaction_data["parent_crate"],
                accounts=transaction_data["accounts"],
            )
            
        except FileNotFoundError as e:
            # IDL file not found - configuration issue
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Solana program configuration error: {str(e)}. Please ensure the program IDL file exists."
            )
        except ValueError as e:
            # Invalid Solana addresses
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid Solana address: {str(e)}. Please check the wallet address and parent crate public key."
            )
        except Exception as e:
            # Unexpected errors during transaction building
            print(f"Error building Solana transfer transaction: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to build Solana transaction: {str(e)}"
            )
        
    except HTTPException:
        # Re-raise HTTP exceptions (like 400, 401, etc.)
        raise
    except Exception as e:
        # Log unexpected errors
        print(f"Error in transfer_ownership: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.post("/transfer-ownership", response_model=TransferOwnershipOnChainResponse, status_code=status.HTTP_200_OK)
async def transfer_ownership(
    request: TransferOwnershipRequest,
    current_user: dict = Depends(get_current_user)
) -> TransferOwnershipOnChainResponse:
    """
    Transfer ownership of a crate - COMPLETE SERVER-SIDE SOLUTION.
    
    This endpoint:
    1. Builds the transaction
    2. Signs it server-side
    3. Submits to Solana blockchain
    4. Waits for confirmation
    5. Returns the transaction signature
    
    The transaction is recorded on-chain and can be verified on Solana Explorer.
    """
    try:
        from solana.rpc.async_api import AsyncClient
        from solders.keypair import Keypair
        from solders.transaction import Transaction
        from solders.pubkey import Pubkey as PublicKey
        import base64
        
        user_id = current_user.get("id")
        timestamp = request.timestamp if request.timestamp else int(datetime.utcnow().timestamp())
        
        # For server-side signing, generate/use a server-controlled authority keypair
        # NOTE: In production, load this from secure environment variable or key management service
        authority_keypair = Keypair()  # Server wallet that will own the crate
        solana_wallet = str(authority_keypair.pubkey())
        
        print(f"Server authority wallet: {solana_wallet}")
        
        # Fund the authority wallet on devnet (only works on devnet/testnet)
        if "devnet" in SOLANA_RPC_URL or "testnet" in SOLANA_RPC_URL:
            print("Requesting airdrop for authority wallet...")
            client_temp = AsyncClient(SOLANA_RPC_URL)
            try:
                airdrop_sig = await client_temp.request_airdrop(authority_keypair.pubkey(), 2_000_000_000)  # 2 SOL
                print(f"Airdrop requested: {airdrop_sig.value}")
                await client_temp.confirm_transaction(airdrop_sig.value)
                print("Airdrop confirmed")
                await client_temp.close()
            except Exception as e:
                print(f"Airdrop failed (may already have funds): {e}")
                await client_temp.close()
        
        # Validate inputs
        if request.weight <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Weight must be > 0")
        
        if not request.parent_crate_pubkey or len(request.parent_crate_pubkey) < 32:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid parent crate pubkey")
        
        # Step 1: Build the transaction
        print(f"Building transaction for user {user_id}...")
        transaction_data = await build_transfer_ownership_transaction(
            authority_pubkey=solana_wallet,
            parent_crate_pubkey=request.parent_crate_pubkey,
            crate_id=request.crate_id,
            crate_did=request.crate_did,
            owner_did=request.owner_did,
            device_did=request.device_did,
            location=request.location,
            weight=request.weight,
            timestamp=timestamp,
            hash_str=request.hash,
            ipfs_cid=request.ipfs_cid,
        )
        
        # Step 2: Deserialize transaction and keypairs
        print("Deserializing transaction...")
        tx_bytes = base64.b64decode(transaction_data["transaction"])
        tx = Transaction.from_bytes(tx_bytes)
        
        crate_kp_bytes = base64.b64decode(transaction_data["crate_keypair"])
        crate_keypair = Keypair.from_bytes(crate_kp_bytes)
        
        # Step 3: Sign with both keypairs
        print("Signing transaction...")
        # Both crate_keypair and authority_keypair need to sign
        tx.sign([crate_keypair, authority_keypair], tx.message.recent_blockhash)
        
        # Step 4: Submit to Solana
        print("Submitting to Solana...")
        client = AsyncClient(SOLANA_RPC_URL)
        
        try:
            # Send transaction
            result = await client.send_raw_transaction(bytes(tx))
            signature = str(result.value)
            print(f"Transaction submitted: {signature}")
            
            # Wait for confirmation
            print("Waiting for confirmation...")
            confirmation = await client.confirm_transaction(signature)
            
            await client.close()
            
            # Build explorer URL
            cluster = "devnet" if "devnet" in SOLANA_RPC_URL else "mainnet"
            explorer_url = f"https://explorer.solana.com/tx/{signature}?cluster={cluster}"
            
            print(f"✓ Transaction confirmed: {signature}")
            
            return TransferOwnershipOnChainResponse(
                success=True,
                message=f"Transfer ownership completed and recorded on Solana blockchain. Transaction: {signature}",
                crate_id=request.crate_id,
                user_id=user_id,
                crate_pubkey=transaction_data["crate_pubkey"],
                parent_crate=transaction_data["parent_crate"],
                transaction_signature=signature,
                explorer_url=explorer_url,
                accounts=transaction_data["accounts"],
            )
            
        except Exception as e:
            await client.close()
            print(f"Blockchain submission failed: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to submit to blockchain: {str(e)}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in transfer_ownership: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )