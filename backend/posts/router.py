from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client
from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime
import httpx

from config import settings
from supabase import create_client
from posts.solana import build_create_crate_transaction

router = APIRouter(prefix="/web3", tags=["web3"])
security = HTTPBearer()

# Initialize Supabase client for auth operations
supabase_auth: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)


# Pydantic models for request/response
class CreateCrateRequest(BaseModel):
    """Request model for creating a new crate."""
    nfc_tag_id: str = Field(..., description="NFC tag ID from IoT device", min_length=1)
    weight: int = Field(..., description="Weight in grams", gt=0)
    crate_id: str = Field(..., description="Unique crate identifier", min_length=1)
    ipfs_cid: str = Field(..., description="IPFS content ID for metadata", min_length=1)
    hash: str = Field(..., description="SHA256 hash of crate data", min_length=1)
    timestamp: Optional[int] = Field(None, description="Unix timestamp (defaults to now)")
    solana_wallet: Optional[str] = Field(None, description="User's Solana wallet public key")
    
    class Config:
        json_schema_extra = {
            "example": {
                "nfc_tag_id": "NFC_DEVICE_001",
                "weight": 1000,
                "crate_id": "CRATE_001",
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
