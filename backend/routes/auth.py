from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from schemas import UserRegister, UserLogin, UserResponse, TokenResponse
from services.user_service import UserService
from core.security import create_access_token, require_user
from models import User
from core.logging import logger
from datetime import datetime, timedelta

router = APIRouter()

@router.post("/register", response_model=TokenResponse)
def register(data: UserRegister, db: Session = Depends(get_db)):
    """Register a new user"""
    try:
        user = UserService.create_user(db, data.email, data.nome, data.senha, data.plan)
        token = create_access_token(user.id)
        
        logger.info("User registered", user_id=user.id, email=user.email)
        
        from core.rbac import log_audit
        log_audit(
            db=db,
            user_id=user.id,
            user_email=user.email,
            action="REGISTRO",
            details=f"Novo usuário registrado no plano {data.plan}"
        )
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
    
    # Check for welcome message or return message
    message = None
    show_tour = False
    now = datetime.utcnow()
    
    if not user.last_login:
        message = f"Bem-vindo(a), {user.nome}! É ótimo ter você aqui pela primeira vez."
        show_tour = not user.has_seen_tour
    elif (now - user.last_login) > timedelta(days=3):
        message = f"Bom ter você de volta, {user.nome}! Sentimos sua falta."
    
    # Update last login
    user.last_login = now
    db.commit()
    
    token = create_access_token(user.id)
    
    logger.info("User logged in", user_id=user.id, email=user.email)
    
    from core.rbac import log_audit
    log_audit(
        db=db,
        user_id=user.id,
        user_email=user.email,
        action="LOGIN",
        details="Usuário realizou login no sistema"
    )
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user,
        "message": message,
        "show_tour": show_tour
    }

@router.get("/me", response_model=UserResponse)
def get_current_user_info(user: User = Depends(require_user)):
    """Get current user information"""
    return user

@router.post("/demo", response_model=TokenResponse)
def demo_login(db: Session = Depends(get_db)):
    """Access application in trial mode (read-only)"""
    demo_email = "demo@fincontrol.com"
    demo_user = db.query(User).filter(User.email == demo_email).first()
    
    if not demo_user:
        demo_user = User(
            nome="Visitante (Demo)",
            email=demo_email,
            senha_hash="demo-mode-restricted", # No real password login for this
            plan="free",
            role="trial",
            is_active=True
        )
        db.add(demo_user)
        db.commit()
        db.refresh(demo_user)
    
    token = create_access_token(demo_user.id)
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": demo_user
    }

@router.post("/refresh", response_model=TokenResponse)
def refresh_token(user: User = Depends(require_user), db: Session = Depends(get_db)):
    """Refresh user token"""
    token = create_access_token(user.id)
    return TokenResponse(
        access_token=token, 
        user=UserResponse.model_validate(user)
    )
