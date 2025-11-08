from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal
from datetime import datetime


class UserSignup(BaseModel):
    """Model for user registration."""
    email: EmailStr
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters")
    full_name: Optional[str] = None
    user_type: Literal["supplier", "regulator", "consumer"] = Field(..., description="User type: supplier, regulator, or consumer")
    metadata: Optional[dict] = None


class UserLogin(BaseModel):
    """Model for user login."""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """Model for user response data."""
    id: str
    email: str
    full_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    metadata: Optional[dict] = None

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """Model for authentication token response."""
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    expires_in: Optional[int] = None
    user: UserResponse


class PasswordResetRequest(BaseModel):
    """Model for password reset request."""
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Model for password reset confirmation."""
    token: str
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters")


class PasswordUpdate(BaseModel):
    """Model for password update."""
    current_password: str
    new_password: str = Field(..., min_length=6, description="Password must be at least 6 characters")


class UserUpdate(BaseModel):
    """Model for updating user profile."""
    full_name: Optional[str] = None
    metadata: Optional[dict] = None

