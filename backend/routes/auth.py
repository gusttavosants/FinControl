from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from schemas import UserRegister, UserLogin, UserResponse, TokenResponse
from services.user_service import UserService
from core.security import create_access_token, require_user
from models import User
from core.logging import logger

router = APIRouter()

@router.post("/register", response_model=TokenResponse)
def register(data: UserRegister, db: Session = Depends(get_db)):
    """Register a new user"""
    try:
        user = UserService.create_user(db, data.email, data.nome, data.senha)
        token = create_access_token(user.id)
        
        logger.info("User registered", user_id=user.id, email=user.email)
        
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "nome": user.nome,
                "email": user.email,
                "plan": user.plan,
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Registration failed", error=str(e))
        raise HTTPException(status_code=500, detail="Erro ao registrar usuário")

@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin, db: Session = Depends(get_db)):
    """Login with email and password"""
    user = UserService.authenticate_user(db, data.email, data.senha)
    if not user:
        logger.warning("Failed login attempt", email=data.email)
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")
    
    token = create_access_token(user.id)
    
    logger.info("User logged in", user_id=user.id, email=user.email)
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "nome": user.nome,
            "email": user.email,
            "plan": user.plan,
        }
    }

@router.get("/me", response_model=UserResponse)
def get_current_user_info(user: User = Depends(require_user)):
    """Get current user information"""
    return {
        "id": user.id,
        "nome": user.nome,
        "email": user.email,
        "plan": user.plan,
    }
