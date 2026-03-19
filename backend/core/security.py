from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from database import get_db
from models import User
from .config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)


def create_access_token(user_id: int) -> str:
    """Create JWT access token for user"""
    expire = datetime.utcnow() + timedelta(days=settings.ACCESS_TOKEN_EXPIRE_DAYS)
    return jwt.encode(
        {"sub": str(user_id), "exp": expire},
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Get current authenticated user from JWT token"""
    if not credentials:
        return None
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM]
        )
        user_id = int(payload.get("sub"))
    except (JWTError, ValueError, TypeError):
        return None
    return db.query(User).filter(User.id == user_id).first()


async def require_user(
    request: Request,
    user: Optional[User] = Depends(get_current_user)
) -> User:
    """Require authenticated user and handle trial/demo mode (read-only)"""
    if not user:
        raise HTTPException(status_code=401, detail="Não autorizado. Faça login.")
    
    # Trial Mode: Only permit GET/HEAD/OPTIONS requests (Read-Only)
    if user.role == "trial" and request.method not in ["GET", "HEAD", "OPTIONS"]:
        raise HTTPException(
            status_code=403, 
            detail="Modo de demonstração: Você não tem permissão para realizar alterações."
        )
        
    return user


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash password"""
    return pwd_context.hash(password)
