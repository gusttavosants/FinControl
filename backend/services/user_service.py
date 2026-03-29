from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException
from models import User
from core.security import get_password_hash, verify_password
from core.logging import logger
from datetime import datetime, timedelta

class UserService:
    """Service for user management operations"""
    
    @staticmethod
    def create_user(db: Session, email: str, nome: str, senha: str, plan: str):
        # Validação de e-mail duplicado
        logger.debug(f"Attempting to create user: {email}")
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            logger.warning(f"Registration failed: Email already exists: {email}")
            raise HTTPException(status_code=400, detail="Este e-mail já está cadastrado no ZenCash.")
        
        # Validação de senha
        if len(senha) < 6:
            logger.warning(f"Registration failed: Password too short for email: {email}")
            raise HTTPException(status_code=400, detail="A senha deve ter pelo menos 6 caracteres.")

        # Validação de plano
        allowed_plans = ["trial", "basico", "premium"]
        if plan not in allowed_plans:
            # Fallback seguro para trial se vier lixo ou plano legado
            plan = "trial"

        try:
            senha_hash = get_password_hash(senha)
            new_user = User(
                email=email,
                nome=nome,
                senha_hash=senha_hash,
                plan=plan,
                trial_until=datetime.utcnow() + timedelta(days=7) if plan == "trial" else None,
                role="user",
                is_active=True
            )
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            logger.info(f"User created successfully: {email} (ID: {new_user.id})")
            return new_user
        except Exception as e:
            db.rollback()
            logger.error(f"Critical error during user creation: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Erro interno ao criar conta: {str(e)}")
    
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
        if plan not in ['trial', 'basico', 'premium']:
            raise HTTPException(status_code=400, detail="Plano inválido")
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")
        
        user.plan = plan
        db.commit()
        db.refresh(user)
        return user
