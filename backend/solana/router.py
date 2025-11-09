from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Header
from pydantic import BaseModel
import jwt
import os
from supabase import create_client, Client
from dotenv import load_dotenv
from .service import get_solana_service
from config import settings
from supabase import create_client

router = APIRouter(prefix="/web3", tags=["web3"])
security = HTTPBearer()

# Initialize Supabase client for auth operations
supabase_auth: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    Dependency to get the current authenticated user from the JWT token.
    """
    try:
        token = credentials.credentials
        # Create a temporary client and set the authorization header
        # The Supabase Python client's get_user() verifies the token
        temp_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
        # Set the session using the access token
        # Note: set_session requires both access_token and refresh_token
        # For token verification, we'll use the token directly in the headers
        temp_client.postgrest.auth(token)
        user_response = temp_client.auth.get_user()
        
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
            )
        user = user_response.user
        # Convert user to dict format
        user_dict = {
            "id": user.id,
            "email": user.email or "",
            "created_at": user.created_at,
            "updated_at": user.updated_at,
            "user_metadata": user.user_metadata or {},
            "app_metadata": getattr(user, "app_metadata", {}),
        }
        return user_dict
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}",
        )
    
@router.get("/transactions")
async def get_user_transactions(current_user: dict = Depends(get_current_user)):
    """
    Get all blockchain transactions for the authenticated user.
    Returns list of transactions from Solana blockchain.
    """
    try:
        # TODO: Replace with actual Solana blockchain queries
        # For now, return mock data structure
        transactions = [
            {
                "id": "1",
                "number": 1,
                "timestamp": "2024-11-02T12:00:00Z",
                "signature": "3K8mYzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqz",
                "slot": "245891234",
                "status": "Finalized",
                "operation": "CREATE_CRATE",
                "crateId": "TUNA_001",
                "weight": 2500,
                "programId": "FHzgesT5QzphL5eucFCjL9KL59TLs3jztw7Qe9RZjHta"
            },
            {
                "id": "2",
                "number": 2,
                "timestamp": "2024-11-03T12:00:00Z",
                "signature": "4L9nZzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqzqz",
                "slot": "245891235",
                "status": "Finalized",
                "operation": "TRANSFER_OWNERSHIP",
                "crateId": "TUNA_001",
                "weight": 2500,
                "programId": "FHzgesT5QzphL5eucFCjL9KL59TLs3jztw7Qe9RZjHta"
            }
        ]
        return {"transactions": transactions}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch transactions: {str(e)}"
        )


@router.get("/transactions/{signature}")
async def get_transaction_details(signature: str, current_user: dict = Depends(get_current_user)):
    """
    Get detailed information about a specific blockchain transaction from Solana.
    Real blockchain integration - fetches actual transaction data.
    """
    try:
        solana_service = get_solana_service()
        transaction_detail = await solana_service.get_transaction_by_signature(signature)
        
        if not transaction_detail:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Transaction {signature} not found on Solana blockchain"
            )
        
        return transaction_detail
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch transaction details: {str(e)}"
        )


@router.get("/lot/{crate_id}")
async def get_lot_info(crate_id: str, current_user: dict = Depends(get_current_user)):
    """
    Get full supply chain history for a specific crate/lot from Solana blockchain.
    Real blockchain integration - fetches actual lot data and transaction history.
    """
    try:
        solana_service = get_solana_service()
        lot_info = await solana_service.get_lot_by_crate_id(crate_id, current_user.get("id"))
        
        if not lot_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Lot/Crate {crate_id} not found on Solana blockchain"
            )
        
        return lot_info
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch lot info: {str(e)}"
        )


@router.post("/transaction")
async def create_transaction(
    operation: str,
    crate_id: str,
    weight: int,
    wallet_address: Optional[str] = None,
    metadata: Optional[dict] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new blockchain transaction on Solana.
    Real blockchain integration - creates actual on-chain transactions.
    
    Available operations:
    - CREATE_CRATE: Create a new seafood crate record
    - TRANSFER_OWNERSHIP: Transfer crate to new owner
    - MIX_CRATES: Combine multiple crates
    - SPLIT_CRATE: Split crate into smaller units
    """
    try:
        # Validate operation type
        valid_operations = ["CREATE_CRATE", "TRANSFER_OWNERSHIP", "MIX_CRATES", "SPLIT_CRATE"]
        if operation not in valid_operations:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid operation. Must be one of: {', '.join(valid_operations)}"
            )
        
        # Get user's wallet address from metadata or parameter
        user_wallet = wallet_address or current_user.get("user_metadata", {}).get("wallet_address")
        
        # Create transaction on Solana
        solana_service = get_solana_service()
        transaction = await solana_service.create_transaction(
            operation=operation,
            crate_id=crate_id,
            weight=weight,
            user_wallet=user_wallet,
            metadata=metadata
        )
        
        return {
            "success": True,
            "transaction": transaction,
            "message": f"{operation} transaction created successfully on Solana blockchain",
            "explorerUrl": f"https://explorer.solana.com/tx/{transaction['signature']}?cluster=devnet"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create transaction: {str(e)}"
        )
