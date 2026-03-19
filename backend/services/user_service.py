from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException
from models import User
from core.security import get_password_hash, verify_password

class UserService:
    """Service for user management operations"""
    
    @staticmethod
    def create_user(db: Session, email: str, nome: str, password: str, plan: str = "free") -> User:
        """Create a new user"""
        # Check if email already exists
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email já cadastrado")
        
        # Validate email format
        if "@" not in email or "." not in email:
            raise HTTPException(status_code=400, detail="Email inválido")
        
        # Validate password strength
        if len(password) < 6:
            raise HTTPException(status_code=400, detail="Senha deve ter no mínimo 6 caracteres")
        
        user = User(
            email=email,
            nome=nome,
            senha_hash=get_password_hash(password),
            plan=plan  # Plan chosen during registration
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    
    @staticmethod
    def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
        """Authenticate user with email and password"""
        user = db.query(User).filter(User.email == email).first()
        if not user:
            return None
        if not verify_password(password, user.senha_hash):
            return None
        return user
    
    @staticmethod
    def update_user_plan(db: Session, user_id: int, plan: str) -> User:
        """Update user's subscription plan"""
        if plan not in ['free', 'pro', 'premium']:
            raise HTTPException(status_code=400, detail="Plano inválido")
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")
        
        user.plan = plan
        db.commit()
        db.refresh(user)
        return user
