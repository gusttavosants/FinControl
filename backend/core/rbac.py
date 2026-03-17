"""RBAC (Role-Based Access Control) decorators and utilities"""
from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import User
from jose import JWTError, jwt
import os
from typing import Callable, Any


SECRET_KEY = os.environ.get("JWT_SECRET", "fincontrol-secret-key-change-in-production")
ALGORITHM = "HS256"


def get_current_user_from_token(token: str, db: Session) -> User:
    """Extract user from JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Token inválido")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")
    return user


def require_role(*roles: str) -> Callable:
    """Decorator to require specific roles"""
    def decorator(func: Callable) -> Callable:
        async def wrapper(*args, **kwargs) -> Any:
            # Extract user from kwargs (passed by FastAPI dependency injection)
            user = kwargs.get("user")
            if not user:
                raise HTTPException(status_code=401, detail="Usuário não autenticado")
            
            if user.role not in roles:
                raise HTTPException(
                    status_code=403,
                    detail=f"Acesso negado. Roles permitidas: {', '.join(roles)}"
                )
            
            if not user.is_active:
                raise HTTPException(status_code=403, detail="Usuário inativo")
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def require_admin(func: Callable) -> Callable:
    """Decorator to require admin role"""
    async def wrapper(*args, **kwargs) -> Any:
        user = kwargs.get("user")
        if not user:
            raise HTTPException(status_code=401, detail="Usuário não autenticado")
        
        if user.role != "admin":
            raise HTTPException(status_code=403, detail="Acesso apenas para administradores")
        
        if not user.is_active:
            raise HTTPException(status_code=403, detail="Usuário inativo")
        
        return await func(*args, **kwargs)
    return wrapper


# Role definitions
ROLES = {
    "user": {
        "description": "Usuário comum com acesso ao próprio dashboard",
        "permissions": ["read:own", "write:own", "delete:own"],
    },
    "moderator": {
        "description": "Moderador com acesso expandido",
        "permissions": ["read:all", "write:own", "delete:own", "moderate"],
    },
    "admin": {
        "description": "Administrador com acesso total",
        "permissions": ["read:all", "write:all", "delete:all", "manage:users", "manage:system"],
    },
}


def get_role_permissions(role: str) -> list:
    """Get permissions for a role"""
    return ROLES.get(role, {}).get("permissions", [])
