from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client
from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime
import httpx

from config import settings
from supabase import create_client
from posts.solana import build_create_crate_transaction, build_transfer_ownership_transaction

router = APIRouter(prefix="/web3", tags=["web3"])
security = HTTPBearer()

# Initialize Supabase client for auth operations
supabase_auth: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)


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

@router.get("/get-all-posts")
async def get_all_posts(current_user: dict = Depends(get_current_user)):
    """
    Get all posts from the database.
    """
    return {"message": "Hello, World!"}

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
            
            return CreateCrateResponse(
                success=True,
                message="Crate creation transaction built successfully. Please sign and submit the transaction.",
                crate_id=request.crate_id,
                user_id=user_id,
                validated=True,
                transaction=transaction_data["transaction"],
                crate_pubkey=transaction_data["crate_pubkey"],
                crate_keypair=transaction_data["crate_keypair"],
                accounts=transaction_data["accounts"],
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
        from posts.solana import SOLANA_RPC_URL
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