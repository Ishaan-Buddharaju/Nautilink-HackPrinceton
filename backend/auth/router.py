from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client
from typing import Optional

from auth.models import (
    UserSignup,
    UserLogin,
    UserResponse,
    TokenResponse,
    PasswordResetRequest,
    PasswordResetConfirm,
    PasswordUpdate,
    UserUpdate,
)
from config import settings
from supabase import create_client

router = APIRouter(prefix="/auth", tags=["authentication"])
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


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(user_data: UserSignup):
    """
    Register a new user.
    """
    try:
        # Prepare user metadata
        # Store both user_type and roles for compatibility
        user_metadata = {
            "user_type": user_data.user_type,
            "roles": [user_data.user_type]  # Also store as roles array for frontend compatibility
        }
        if user_data.full_name:
            user_metadata["full_name"] = user_data.full_name
        if user_data.metadata:
            user_metadata.update(user_data.metadata)

        # Sign up the user
        response = supabase_auth.auth.sign_up(
            {
                "email": user_data.email,
                "password": user_data.password,
                "options": {
                    "data": user_metadata
                }
            }
        )

        if not response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create user",
            )

        # Build user response
        user_response = UserResponse(
            id=response.user.id,
            email=response.user.email or "",
            full_name=user_metadata.get("full_name"),
            created_at=response.user.created_at,
            updated_at=response.user.updated_at,
            metadata=response.user.user_metadata,
        )

        # Build token response
        token_response = TokenResponse(
            access_token=response.session.access_token if response.session else "",
            refresh_token=response.session.refresh_token if response.session else None,
            token_type="bearer",
            expires_in=response.session.expires_in if response.session else None,
            user=user_response,
        )

        return token_response

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Registration failed: {str(e)}",
        )


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """
    Authenticate a user and return access tokens.
    """
    try:
        response = supabase_auth.auth.sign_in_with_password(
            {
                "email": credentials.email,
                "password": credentials.password,
            }
        )

        if not response.user or not response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        # Build user response
        user_response = UserResponse(
            id=response.user.id,
            email=response.user.email or "",
            full_name=response.user.user_metadata.get("full_name") if response.user.user_metadata else None,
            created_at=response.user.created_at,
            updated_at=response.user.updated_at,
            metadata=response.user.user_metadata,
        )

        # Build token response
        token_response = TokenResponse(
            access_token=response.session.access_token,
            refresh_token=response.session.refresh_token,
            token_type="bearer",
            expires_in=response.session.expires_in,
            user=user_response,
        )

        return token_response

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Login failed: {str(e)}",
        )


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """
    Logout the current user (revoke the session).
    """
    try:
        supabase_auth.auth.sign_out()
        return {"message": "Successfully logged out"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Logout failed: {str(e)}",
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """
    Get the current authenticated user's information.
    """
    return UserResponse(
        id=current_user.get("id"),
        email=current_user.get("email", ""),
        full_name=current_user.get("user_metadata", {}).get("full_name"),
        created_at=current_user.get("created_at"),
        updated_at=current_user.get("updated_at"),
        metadata=current_user.get("user_metadata"),
    )


@router.put("/me", response_model=UserResponse)
async def update_user_profile(
    user_update: UserUpdate,
    current_user: dict = Depends(get_current_user),
):
    """
    Update the current user's profile.
    """
    try:
        # Prepare update data
        update_data = {}
        if user_update.full_name is not None:
            update_data["full_name"] = user_update.full_name
        if user_update.metadata is not None:
            update_data.update(user_update.metadata)

        # Update user metadata
        response = supabase_auth.auth.update_user(
            {
                "data": update_data
            }
        )

        if not response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update user",
            )

        return UserResponse(
            id=response.user.id,
            email=response.user.email or "",
            full_name=response.user.user_metadata.get("full_name") if response.user.user_metadata else None,
            created_at=response.user.created_at,
            updated_at=response.user.updated_at,
            metadata=response.user.user_metadata,
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Update failed: {str(e)}",
        )


@router.post("/refresh")
async def refresh_token(refresh_token: str):
    """
    Refresh the access token using a refresh token.
    """
    try:
        response = supabase_auth.auth.refresh_session(refresh_token)

        if not response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            )

        return TokenResponse(
            access_token=response.session.access_token,
            refresh_token=response.session.refresh_token,
            token_type="bearer",
            expires_in=response.session.expires_in,
            user=UserResponse(
                id=response.user.id,
                email=response.user.email or "",
                full_name=response.user.user_metadata.get("full_name") if response.user.user_metadata else None,
                created_at=response.user.created_at,
                updated_at=response.user.updated_at,
                metadata=response.user.user_metadata,
            ),
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token refresh failed: {str(e)}",
        )


@router.post("/forgot-password")
async def forgot_password(request: PasswordResetRequest):
    """
    Send a password reset email to the user.
    """
    try:
        supabase_auth.auth.reset_password_for_email(
            request.email,
            {
                "redirect_to": f"{settings.SUPABASE_URL}/auth/reset-password",
            }
        )
        return {"message": "Password reset email sent successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to send reset email: {str(e)}",
        )


@router.post("/reset-password")
async def reset_password(confirm: PasswordResetConfirm):
    """
    Reset password using the token from the reset email.
    Note: This endpoint requires the user to be authenticated with the reset token.
    The token should be used to set the session first.
    """
    try:
        # Exchange the reset token for a session
        # Note: In Supabase, password reset typically happens through email link
        # This endpoint assumes the token is a valid session token
        response = supabase_auth.auth.update_user(
            {
                "password": confirm.password,
            }
        )

        if not response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to reset password",
            )

        return {"message": "Password reset successfully"}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Password reset failed: {str(e)}",
        )


@router.post("/change-password")
async def change_password(
    password_update: PasswordUpdate,
    current_user: dict = Depends(get_current_user),
):
    """
    Change the current user's password.
    """
    try:
        # First verify the current password by attempting to sign in
        try:
            supabase_auth.auth.sign_in_with_password(
                {
                    "email": current_user.get("email"),
                    "password": password_update.current_password,
                }
            )
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current password is incorrect",
            )

        # Update the password
        response = supabase_auth.auth.update_user(
            {
                "password": password_update.new_password,
            }
        )

        if not response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update password",
            )

        return {"message": "Password updated successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Password update failed: {str(e)}",
        )

