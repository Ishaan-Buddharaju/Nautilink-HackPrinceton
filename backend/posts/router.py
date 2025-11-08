from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client
from typing import Optional

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

@router.get("/get-all-posts")
async def get_all_posts(current_user: dict = Depends(get_current_user)):
    """
    Get all posts from the database.
    """
    return {"message": "Hello, World!"}