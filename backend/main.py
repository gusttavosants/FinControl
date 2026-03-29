from fastapi import FastAPI, Depends, HTTPException, Query, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import List, Optional
from datetime import date, datetime, timedelta
from dateutil.relativedelta import relativedelta
from database import engine, get_db, Base
from models import (
    Receita,
    Despesa,
    OrcamentoCategoria,
    Meta,
    User,
    Notification,
    SharedAccount,
    Investimento,
    AuditLog,
    Note,
)
import os
from dotenv import load_dotenv

load_dotenv()

import pandas as pd
import io
import re
import httpx
from schemas import (
    ReceitaCreate,
    ReceitaUpdate,
    ReceitaResponse,
    DespesaCreate,
    DespesaUpdate,
    DespesaResponse,
    OrcamentoCreate,
    OrcamentoResponse,
    MetaCreate,
    MetaUpdate,
    MetaResponse,
    DashboardSummary,
    CategoriaGasto,
    EvolucaoMensal,
    ProximoVencimento,
    UserRegister,
    UserLogin,
    UserResponse,
    TokenResponse,
    ChatRequest,
    ChatResponse,
    NotificationCreate,
    NotificationResponse,
    SharedAccountInvite,
    SharedAccountResponse,
    InvestimentoCreate,
    InvestimentoUpdate,
    InvestimentoResponse,
    UserAdminResponse,
    UserRoleUpdate,
    UserStatusUpdate,
    AuditLogResponse,
    UserPlanUpdate,
    NoteCreate,
    NoteUpdate,
    NoteResponse,
)
import bcrypt
from jose import JWTError, jwt
from core.rbac import require_admin, get_role_permissions, ROLES, log_audit
from services.plan_service import PlanService
from fastapi import Header

from core.config import settings
SECRET_KEY = settings.JWT_SECRET
ALGORITHM = settings.JWT_ALGORITHM
ACCESS_TOKEN_EXPIRE_DAYS = settings.ACCESS_TOKEN_EXPIRE_DAYS
from core.security import require_user, get_current_user


# Funções de hash/verify com bcrypt puro
def hash_senha(senha: str) -> str:
    """Hash de senha com truncamento para limite de bcrypt (72 caracteres)"""
    return bcrypt.hashpw(senha[:72].encode(), bcrypt.gensalt()).decode()


def verify_senha(senha: str, hash: str) -> bool:
    """Verifica senha com truncamento"""
    return bcrypt.checkpw(senha[:72].encode(), hash.encode())


security = HTTPBearer(auto_error=False)

app = FastAPI(title="ZenCash - API de Paz Financeira", version="1.0.0")

# Auto-create tables on startup (Zen Governance)
Base.metadata.create_all(bind=engine)

# CORS Configuration
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

# Permissive for local development to avoid CORS headaches
if ENVIRONMENT == "development":
    ALLOWED_ORIGINS = ["*"]
else:
    ALLOWED_ORIGINS = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://zeencash.vercel.app",
        "https://fincontrol-mgrk.onrender.com",
    ]
    env_origins = os.getenv("ALLOWED_ORIGINS", "").split(",")
    ALLOWED_ORIGINS.extend([o.strip() for o in env_origins if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# Include modular routes from the routes/ directory
from routes import api_router
app.include_router(api_router, prefix="/api")


# ==================== ROOT ROUTE ====================
@app.get("/", include_in_schema=False)
def root():
    """Root endpoint - returns API info"""
    return {
        "app": "ZenCash - Elite",
        "version": "2.1.0",
        "status": "running",
        "docs": "/docs",
        "health": "/api/health",
    }


@app.get("/api/health")
def health_check():
    """Health check endpoint - tests database connection"""
    try:
        from sqlalchemy import text
        from database import SessionLocal

        db = SessionLocal()

        # Test if we can execute a simple query
        result = db.execute(text("SELECT NOW()")).fetchone()
        db.close()

        return {
            "status": "healthy",
            "app": "ZenCash - Elite",
            "version": "2.1.0",
            "database": "connected",
            "timestamp": str(result[0]) if result else None,
        }
    except Exception as e:
        return {"status": "error", "database": "disconnected", "error": str(e)}


@app.get("/api/debug/db")
def debug_database():
    """Debug endpoint - detailed database info"""
    import os
    from database import DATABASE_URL

    # Mask password
    masked_url = (
        DATABASE_URL.replace(os.getenv("DATABASE_URL", ""), "***MASKED***")
        if DATABASE_URL
        else "NOT SET"
    )
    if "://" in masked_url and "@" in masked_url:
        parts = masked_url.split("@")
        masked_url = parts[0].split("://")[0] + "://***:***@" + parts[1]

    info = {"database_url": masked_url, "db_connection": "testing..."}

    try:
        from sqlalchemy import text, inspect
        from database import SessionLocal, engine

        db = SessionLocal()

        # Test connection
        result = db.execute(text("SELECT NOW()")).fetchone()
        info["db_connection"] = "✅ Connected"
        info["current_time"] = str(result[0])

        # List tables
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        info["tables"] = tables

        db.close()
    except Exception as e:
        info["db_connection"] = f"❌ Error: {str(e)}"

    return info


@app.on_event("startup")
async def startup_event():
    """Executa tarefas automáticas no startup do servidor"""
    try:
        # Inicializa tabelas do banco de dados
        Base.metadata.create_all(bind=engine)
        print("[OK] Database tables initialized")
    except Exception as e:
        print(f"[ERROR] Erro ao inicializar database: {str(e)}")

    from database import SessionLocal

    db = SessionLocal()
    try:
        # Gera notificações automaticamente
        result = generate_notifications(db)
        print(f"[OK] Startup: {result['message']}")

        # Processa recorrências
        recurring_result = process_recurring_expenses(db)
        print(f"[OK] Startup: {recurring_result['message']}")
    except Exception as e:
        print(f"[ERROR] Erro no startup: {str(e)}")
    finally:
        db.close()


def create_access_token(user_id: int) -> str:
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    return jwt.encode(
        {"sub": str(user_id), "exp": expire}, SECRET_KEY, algorithm=ALGORITHM
    )


# Redundant get_current_user and require_user removed to use core.security


@app.put("/api/users/me/tour")
def mark_tour_seen(user: User = Depends(require_user), db: Session = Depends(get_db)):
    """Marca que o usuário já viu o tour inicial"""
    user.has_seen_tour = True
    db.commit()
    return {"message": "Tour marcado como visto"}


def get_account_user_ids(user: User, db: Session, shared_mode: bool = True) -> List[int]:
    """Return list of user IDs that share the same financial data.
    If user has an active shared account AND shared_mode is True, returns both user IDs.
    Otherwise returns just the user's own ID."""
    if not shared_mode:
        return [user.id]
        
    shared = (
        db.query(SharedAccount)
        .filter(
            SharedAccount.status == "active",
            (SharedAccount.owner_id == user.id) | (SharedAccount.partner_id == user.id),
        )
        .first()
    )
    if shared:
        return [shared.owner_id, shared.partner_id]
    return [user.id]


def get_shared_mode(x_shared_mode: Optional[str] = Header("true")) -> bool:
    """Dependency to extract shared mode from header"""
    return (x_shared_mode or "true").lower() != "false"


def _build_shared_response(sa: SharedAccount, db: Session) -> dict:
    """Build a SharedAccountResponse dict with owner/partner names."""
    owner = db.query(User).filter(User.id == sa.owner_id).first()
    partner = (
        db.query(User).filter(User.id == sa.partner_id).first()
        if sa.partner_id
        else None
    )
    return {
        "id": sa.id,
        "owner_id": sa.owner_id,
        "owner_name": owner.nome if owner else None,
        "owner_email": owner.email if owner else None,
        "partner_id": sa.partner_id,
        "partner_name": partner.nome if partner else None,
        "partner_email": sa.partner_email,
        "status": sa.status,
        "created_at": sa.created_at,
    }


# ==================== SHARED ACCOUNT (PLANO CASAL) ====================
@app.post("/api/shared-account/invite", response_model=SharedAccountResponse)
def invite_partner(
    data: SharedAccountInvite,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Invite a partner by email to share financial data."""
    if data.partner_email == user.email:
        raise HTTPException(
            status_code=400, detail="Você não pode convidar a si mesmo."
        )

    # Check if user already has an active shared account
    existing_active = (
        db.query(SharedAccount)
        .filter(
            SharedAccount.status == "active",
            (SharedAccount.owner_id == user.id) | (SharedAccount.partner_id == user.id),
        )
        .first()
    )
    if existing_active:
        raise HTTPException(
            status_code=400, detail="Você já possui uma conta compartilhada ativa."
        )

    # Check if there's already a pending invite from this user
    existing_pending = (
        db.query(SharedAccount)
        .filter(
            SharedAccount.owner_id == user.id,
            SharedAccount.status == "pending",
        )
        .first()
    )
    if existing_pending:
        # Update the pending invite
        existing_pending.partner_email = data.partner_email
        existing_pending.partner_id = None
        # Check if partner already has an account
        partner = db.query(User).filter(User.email == data.partner_email).first()
        if partner:
            existing_pending.partner_id = partner.id
        db.commit()
        db.refresh(existing_pending)
        return _build_shared_response(existing_pending, db)

    # Check if partner user exists
    partner = db.query(User).filter(User.email == data.partner_email).first()

    sa = SharedAccount(
        owner_id=user.id,
        partner_email=data.partner_email,
        partner_id=partner.id if partner else None,
        status="pending",
    )
    db.add(sa)
    db.commit()
    db.refresh(sa)
    return _build_shared_response(sa, db)


@app.post(
    "/api/shared-account/{account_id}/accept", response_model=SharedAccountResponse
)
def accept_invite(
    account_id: int,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Accept a shared account invitation."""
    sa = db.query(SharedAccount).filter(SharedAccount.id == account_id).first()
    if not sa:
        raise HTTPException(status_code=404, detail="Convite não encontrado.")
    if sa.partner_email != user.email:
        raise HTTPException(status_code=403, detail="Este convite não é para você.")
    if sa.status != "pending":
        raise HTTPException(status_code=400, detail="Este convite já foi processado.")

    # Check if user already has an active shared account
    existing_active = (
        db.query(SharedAccount)
        .filter(
            SharedAccount.status == "active",
            (SharedAccount.owner_id == user.id) | (SharedAccount.partner_id == user.id),
        )
        .first()
    )
    if existing_active:
        raise HTTPException(
            status_code=400, detail="Você já possui uma conta compartilhada ativa."
        )

    sa.partner_id = user.id
    sa.status = "active"
    db.commit()
    db.refresh(sa)
    return _build_shared_response(sa, db)


@app.post("/api/shared-account/{account_id}/reject")
def reject_invite(
    account_id: int,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Reject a shared account invitation."""
    sa = db.query(SharedAccount).filter(SharedAccount.id == account_id).first()
    if not sa:
        raise HTTPException(status_code=404, detail="Convite não encontrado.")
    if sa.partner_email != user.email:
        raise HTTPException(status_code=403, detail="Este convite não é para você.")
    if sa.status != "pending":
        raise HTTPException(status_code=400, detail="Este convite já foi processado.")

    sa.status = "rejected"
    db.commit()
    return {"message": "Convite recusado."}


@app.delete("/api/shared-account/{account_id}")
def remove_shared_account(
    account_id: int,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Remove/cancel a shared account (either owner or partner can do this)."""
    sa = db.query(SharedAccount).filter(SharedAccount.id == account_id).first()
    if not sa:
        raise HTTPException(
            status_code=404, detail="Conta compartilhada não encontrada."
        )
    if sa.owner_id != user.id and sa.partner_id != user.id:
        raise HTTPException(status_code=403, detail="Você não tem permissão.")

    db.delete(sa)
    db.commit()
    return {"message": "Conta compartilhada removida."}


@app.get("/api/shared-account/status")
def shared_account_status(
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Get current shared account status for the logged-in user."""
    # Active shared account
    active = (
        db.query(SharedAccount)
        .filter(
            SharedAccount.status == "active",
            (SharedAccount.owner_id == user.id) | (SharedAccount.partner_id == user.id),
        )
        .first()
    )
    if active:
        return {"type": "active", "account": _build_shared_response(active, db)}

    # Pending invite sent by user
    sent = (
        db.query(SharedAccount)
        .filter(
            SharedAccount.owner_id == user.id,
            SharedAccount.status == "pending",
        )
        .first()
    )
    if sent:
        return {"type": "pending_sent", "account": _build_shared_response(sent, db)}

    # Pending invite received by user
    received = (
        db.query(SharedAccount)
        .filter(
            SharedAccount.partner_email == user.email,
            SharedAccount.status == "pending",
        )
        .first()
    )
    if received:
        return {
            "type": "pending_received",
            "account": _build_shared_response(received, db),
        }

    return {"type": "none", "account": None}


CATEGORIAS_RECEITA = [
    "Salário",
    "Freelance",
    "Investimentos",
    "Aluguel Recebido",
    "Comissão",
    "Bônus",
    "Outros",
]

CATEGORIAS_DESPESA = [
    "Alimentação",
    "Aluguel",
    "Carne",
    "Crédito",
    "Débito",
    "Diversos",
    "Empréstimo",
    "Financiamento",
    "Gás",
    "Hipermercado",
    "Locação",
    "Uber/Transporte",
    "Vestuário",
]


# AUTH routes removed from here as they are correctly handled by routes/auth.py


# ==================== ADMIN ENDPOINTS ====================
@app.get("/api/admin/users", response_model=List[UserAdminResponse])
def list_users(
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    """List all users (admin only)"""
    if user.role != "admin":
        raise HTTPException(
            status_code=403, detail="Acesso apenas para administradores"
        )

    users = db.query(User).offset(skip).limit(limit).all()
    return users


@app.get("/api/admin/users/{user_id}", response_model=UserAdminResponse)
def get_user_admin(
    user_id: int,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Get specific user details (admin only)"""
    if user.role != "admin":
        raise HTTPException(
            status_code=403, detail="Acesso apenas para administradores"
        )

    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    return target_user


@app.put("/api/admin/users/{user_id}/role")
def update_user_role(
    user_id: int,
    data: UserRoleUpdate,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Update user role (admin only) - Prevent removing last admin"""
    if user.role != "admin":
        raise HTTPException(
            status_code=403, detail="Acesso apenas para administradores"
        )

    if data.role not in ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"Role inválida. Roles disponíveis: {', '.join(ROLES.keys())}",
        )

    if user_id == user.id and data.role != "admin":
        raise HTTPException(
            status_code=400, detail="Você não pode remover a própria permissão de admin"
        )

    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    old_role = target_user.role
    target_user.role = data.role
    db.commit()
    db.refresh(target_user)

    log_audit(
        db=db,
        user_id=user.id,
        user_email=user.email,
        action="UPDATE_USER_ROLE",
        entity_type="user",
        entity_id=user_id,
        details=f"Changed role from {old_role} to {data.role}",
    )

    print(
        f"✅ Admin {user.email} changed user {target_user.email} role from {old_role} to {data.role}"
    )

    return {
        "message": f"Role do usuário alterado de {old_role} para {data.role}",
        "user": UserAdminResponse.model_validate(target_user),
    }


@app.put("/api/admin/users/{user_id}/status")
def update_user_status(
    user_id: int,
    data: UserStatusUpdate,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Activate or deactivate user (admin only)"""
    if user.role != "admin":
        raise HTTPException(
            status_code=403, detail="Acesso apenas para administradores"
        )

    if user_id == user.id and not data.is_active:
        raise HTTPException(
            status_code=400, detail="Você não pode desativar a própria conta"
        )

    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    target_user.is_active = data.is_active
    db.commit()
    db.refresh(target_user)

    status = "ativado" if data.is_active else "desativado"
    
    log_audit(
        db=db,
        user_id=user.id,
        user_email=user.email,
        action="UPDATE_USER_STATUS",
        entity_type="user",
        entity_id=user_id,
        details=f"Status alterado para {status}"
    )

    return {
        "message": f"Usuário {status}",
        "user": UserAdminResponse.model_validate(target_user),
    }


@app.put("/api/admin/users/{user_id}/plan")
def update_user_plan(
    user_id: int,
    data: UserPlanUpdate,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Atualiza o plano de um usuário (apenas admin)"""
    if user.role != "admin":
        raise HTTPException(
            status_code=403, detail="Acesso apenas para administradores"
        )

    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    target_user.plan = data.plan
    db.commit()
    db.refresh(target_user)
    
    log_audit(
        db=db,
        user_id=user.id,
        user_email=user.email,
        action="UPDATE_USER_PLAN",
        entity_type="user",
        entity_id=user_id,
        details=f"Plano alterado para {data.plan}"
    )
    
    return {
        "message": f"Plano do usuário atualizado para {data.plan}",
        "user": UserAdminResponse.model_validate(target_user)
    }


@app.get("/api/admin/logs", response_model=List[AuditLogResponse])
def listar_audit_logs(
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
    limit: int = Query(100, ge=1, le=1000),
):
    """Lista os logs de auditoria do sistema (apenas admin)"""
    if user.role != "admin":
        raise HTTPException(
            status_code=403, detail="Acesso apenas para administradores"
        )
        
    return db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()


@app.get("/api/admin/roles")
def get_roles_info(user: User = Depends(require_user)):
    """Get available roles and their permissions (admin only)"""
    if user.role != "admin":
        raise HTTPException(
            status_code=403, detail="Acesso apenas para administradores"
        )

    return {
        "roles": ROLES,
        "current_user_role": user.role,
    }


@app.post("/api/admin/seed-admin")
def seed_admin(
    email: str = Query(...),
    senha: str = Query(...),
    db: Session = Depends(get_db),
):
    """
    Create first admin user (only works if no admin exists or db is empty).
    Usage: POST /api/admin/seed-admin?email=admin@email.com&senha=password123
    """
    # Check if any admin exists
    admin_exists = db.query(User).filter(User.role == "admin").first()
    if admin_exists:
        raise HTTPException(
            status_code=400,
            detail="Admin já existe no sistema. Use os endpoints normais para gerenciar usuários.",
        )

    # Check if email already exists
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")

    if len(senha) < 6:
        raise HTTPException(
            status_code=400, detail="Senha deve ter pelo menos 6 caracteres"
        )

    # Create admin user
    admin_user = User(
        nome="Administrador",
        email=email,
        senha_hash=hash_senha(senha),
        role="admin",
        is_active=True,
        plan="premium",
    )
    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)

    print(f"✅ Admin user created: {email}")

    # Create token
    token = create_access_token(admin_user.id)
    return {
        "message": "Admin criado com sucesso",
        "access_token": token,
        "token_type": "bearer",
        "user": UserAdminResponse.model_validate(admin_user),
    }


# ==================== CATEGORIAS ====================
@app.get("/api/categorias/receita", response_model=List[str])
def get_categorias_receita():
    return CATEGORIAS_RECEITA


@app.get("/api/categorias/despesa", response_model=List[str])
def get_categorias_despesa():
    return CATEGORIAS_DESPESA


# ==================== RECEITAS ====================
@app.get("/api/receitas", response_model=List[ReceitaResponse])
def listar_receitas(
    mes: Optional[int] = None,
    ano: Optional[int] = None,
    categoria: Optional[str] = None,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
    shared: bool = Depends(get_shared_mode),
):
    user_ids = get_account_user_ids(user, db, shared_mode=shared)
    query = db.query(Receita).filter(
        (Receita.user_id.in_(user_ids)) | (Receita.user_id == None)
    )
    if mes:
        query = query.filter(extract("month", Receita.data) == mes)
    if ano:
        query = query.filter(extract("year", Receita.data) == ano)
    if categoria:
        query = query.filter(Receita.categoria == categoria)
    return query.order_by(Receita.data.desc()).all()


@app.get("/api/receitas/{receita_id}", response_model=ReceitaResponse)
def obter_receita(
    receita_id: int, 
    user: User = Depends(require_user), 
    db: Session = Depends(get_db),
    shared: bool = Depends(get_shared_mode),
):
    user_ids = get_account_user_ids(user, db, shared_mode=shared)
    receita = (
        db.query(Receita)
        .filter(
            Receita.id == receita_id,
            (Receita.user_id.in_(user_ids)) | (Receita.user_id == None),
        )
        .first()
    )
    if not receita:
        raise HTTPException(status_code=404, detail="Receita não encontrada")
    return receita


@app.post("/api/receitas", response_model=ReceitaResponse, status_code=201)
def criar_receita(
    receita: ReceitaCreate,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    db_receita = Receita(**receita.model_dump(), user_id=user.id)
    db.add(db_receita)
    db.commit()
    db.refresh(db_receita)
    
    # Log receita creation
    log_audit(
        db=db,
        user_id=user.id,
        user_email=user.email,
        action="CREATE_RECEITA",
        entity_type="receita",
        entity_id=db_receita.id,
        details=f"Receita criada: {db_receita.descricao} (R$ {db_receita.valor})"
    )
    
    return db_receita


@app.put("/api/receitas/{receita_id}", response_model=ReceitaResponse)
def atualizar_receita(
    receita_id: int,
    receita: ReceitaUpdate,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
    shared: bool = Depends(get_shared_mode),
):
    user_ids = get_account_user_ids(user, db, shared_mode=shared)
    db_receita = (
        db.query(Receita)
        .filter(
            Receita.id == receita_id,
            (Receita.user_id.in_(user_ids)) | (Receita.user_id == None),
        )
        .first()
    )
    if not db_receita:
        raise HTTPException(status_code=404, detail="Receita não encontrada")
    update_data = receita.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_receita, key, value)
    db.commit()
    db.refresh(db_receita)
    return db_receita


@app.delete("/api/receitas/{receita_id}", status_code=204)
def deletar_receita(
    receita_id: int, 
    user: User = Depends(require_user), 
    db: Session = Depends(get_db),
    shared: bool = Depends(get_shared_mode),
):
    user_ids = get_account_user_ids(user, db, shared_mode=shared)
    db_receita = (
        db.query(Receita)
        .filter(
            Receita.id == receita_id,
            (Receita.user_id.in_(user_ids)) | (Receita.user_id == None),
        )
        .first()
    )
    if not db_receita:
        raise HTTPException(status_code=404, detail="Receita não encontrada")
    db.delete(db_receita)
    db.commit()


# ==================== DESPESAS ====================
@app.get("/api/despesas", response_model=List[DespesaResponse])
def listar_despesas(
    mes: Optional[int] = None,
    ano: Optional[int] = None,
    categoria: Optional[str] = None,
    pago: Optional[bool] = None,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
    shared: bool = Depends(get_shared_mode),
):
    user_ids = get_account_user_ids(user, db, shared_mode=shared)
    query = db.query(Despesa).filter(
        (Despesa.user_id.in_(user_ids)) | (Despesa.user_id == None)
    )
    if mes:
        query = query.filter(extract("month", Despesa.data_vencimento) == mes)
    if ano:
        query = query.filter(extract("year", Despesa.data_vencimento) == ano)
    if categoria:
        query = query.filter(Despesa.categoria == categoria)
    if pago is not None:
        query = query.filter(Despesa.pago == pago)
    return query.order_by(Despesa.data_vencimento.asc()).all()


@app.get("/api/despesas/{despesa_id}", response_model=DespesaResponse)
def obter_despesa(
    despesa_id: int, 
    user: User = Depends(require_user), 
    db: Session = Depends(get_db),
    shared: bool = Depends(get_shared_mode),
):
    user_ids = get_account_user_ids(user, db, shared_mode=shared)
    despesa = (
        db.query(Despesa)
        .filter(
            Despesa.id == despesa_id,
            (Despesa.user_id.in_(user_ids)) | (Despesa.user_id == None),
        )
        .first()
    )
    if not despesa:
        raise HTTPException(status_code=404, detail="Despesa não encontrada")
    return despesa


@app.post("/api/despesas", response_model=List[DespesaResponse], status_code=201)
def criar_despesa(
    despesa: DespesaCreate,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    dados = despesa.model_dump()
    parcela_atual = dados.get("parcela_atual")
    parcela_total = dados.get("parcela_total")

    # If installments are specified and there are future ones to create
    if parcela_atual and parcela_total and parcela_total > 1:
        criadas = []
        data_base = dados["data_vencimento"]
        for i in range(parcela_total - parcela_atual + 1):
            parcela_dados = dict(dados)
            parcela_dados["parcela_atual"] = parcela_atual + i
            parcela_dados["data_vencimento"] = data_base + relativedelta(months=i)
            parcela_dados["pago"] = False
            parcela_dados["data_pagamento"] = None
            db_despesa = Despesa(**parcela_dados, user_id=user.id)
            db.add(db_despesa)
            db.flush()
            criadas.append(db_despesa)
        db.commit()
        for d in criadas:
            db.refresh(d)
        return criadas
    else:
        db_despesa = Despesa(**dados, user_id=user.id)
        db.add(db_despesa)
        db.commit()
        db.refresh(db_despesa)
        return [db_despesa]


@app.put("/api/despesas/{despesa_id}", response_model=DespesaResponse)
def atualizar_despesa(
    despesa_id: int,
    despesa: DespesaUpdate,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    user_ids = get_account_user_ids(user, db)
    db_despesa = (
        db.query(Despesa)
        .filter(
            Despesa.id == despesa_id,
            (Despesa.user_id.in_(user_ids)) | (Despesa.user_id == None),
        )
        .first()
    )
    if not db_despesa:
        raise HTTPException(status_code=404, detail="Despesa não encontrada")
    update_data = despesa.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_despesa, key, value)
    db.commit()
    db.refresh(db_despesa)
    return db_despesa


@app.delete("/api/despesas/{despesa_id}", status_code=204)
def deletar_despesa(
    despesa_id: int, 
    user: User = Depends(require_user), 
    db: Session = Depends(get_db),
    shared: bool = Depends(get_shared_mode),
):
    user_ids = get_account_user_ids(user, db, shared_mode=shared)
    db_despesa = (
        db.query(Despesa)
        .filter(
            Despesa.id == despesa_id,
            (Despesa.user_id.in_(user_ids)) | (Despesa.user_id == None),
        )
        .first()
    )
    if not db_despesa:
        raise HTTPException(status_code=404, detail="Despesa não encontrada")
    db.delete(db_despesa)
    db.commit()


@app.patch("/api/despesas/{despesa_id}/pagar", response_model=DespesaResponse)
def marcar_pago(
    despesa_id: int, 
    user: User = Depends(require_user), 
    db: Session = Depends(get_db),
    shared: bool = Depends(get_shared_mode),
):
    user_ids = get_account_user_ids(user, db, shared_mode=shared)
    db_despesa = (
        db.query(Despesa)
        .filter(
            Despesa.id == despesa_id,
            (Despesa.user_id.in_(user_ids)) | (Despesa.user_id == None),
        )
        .first()
    )
    if not db_despesa:
        raise HTTPException(status_code=404, detail="Despesa não encontrada")
    db_despesa.pago = not db_despesa.pago
    db_despesa.data_pagamento = date.today() if db_despesa.pago else None
    db.commit()
    db.refresh(db_despesa)
    return db_despesa


# ==================== NOTIFICATIONS ====================
@app.get("/api/notifications", response_model=List[NotificationResponse])
def listar_notifications(
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
    shared: bool = Depends(get_shared_mode),
):
    user_ids = get_account_user_ids(user, db, shared_mode=shared)
    return (
        db.query(Notification)
        .filter((Notification.user_id.in_(user_ids)) | (Notification.user_id == None))
        .order_by(Notification.created_at.desc())
        .all()
    )


@app.get("/api/notifications/unread", response_model=List[NotificationResponse])
def listar_notifications_unread(
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
    shared: bool = Depends(get_shared_mode),
):
    user_ids = get_account_user_ids(user, db, shared_mode=shared)
    return (
        db.query(Notification)
        .filter(
            Notification.lida == False,
            (Notification.user_id.in_(user_ids)) | (Notification.user_id == None),
        )
        .order_by(Notification.created_at.desc())
        .all()
    )


@app.patch("/api/notifications/{notification_id}/read")
def marcar_notification_lida(
    notification_id: int,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
    shared: bool = Depends(get_shared_mode),
):
    user_ids = get_account_user_ids(user, db, shared_mode=shared)
    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            (Notification.user_id.in_(user_ids)) | (Notification.user_id == None),
        )
        .first()
    )
    if not notification:
        raise HTTPException(status_code=404, detail="Notificação não encontrada")
    notification.lida = True
    db.commit()
    return {"message": "Notificação marcada como lida"}


@app.post("/api/notifications/generate")
def generate_notifications(db: Session = Depends(get_db)):
    """Gera notificações automaticamente para vencimentos próximos"""
    hoje = date.today()
    created = 0

    # Vencimentos próximos (até 7 dias)
    limite = hoje + timedelta(days=7)
    despesas_proximas = (
        db.query(Despesa)
        .filter(
            Despesa.pago == False,
            Despesa.data_vencimento >= hoje,
            Despesa.data_vencimento <= limite,
        )
        .all()
    )

    for despesa in despesas_proximas:
        dias_restantes = (despesa.data_vencimento - hoje).days

        # Verificar se já existe notificação para este vencimento
        existing = (
            db.query(Notification)
            .filter(
                Notification.referencia_id == despesa.id,
                Notification.referencia_tipo == "despesa",
                Notification.tipo == "vencimento",
            )
            .first()
        )

        if existing:
            continue

        # Criar notificação baseada na urgência
        if dias_restantes <= 1:
            titulo = "🚨 VENCIMENTO URGENTE!"
            mensagem = f"A despesa '{despesa.descricao}' vence HOJE!"
        elif dias_restantes <= 3:
            titulo = "⚠️ Vencimento Próximo"
            mensagem = f"A despesa '{despesa.descricao}' vence em {dias_restantes} dias"
        else:
            titulo = "📅 Vencimento em Breve"
            mensagem = f"A despesa '{despesa.descricao}' vence em {dias_restantes} dias"

        notification = Notification(
            titulo=titulo,
            mensagem=mensagem,
            tipo="vencimento",
            user_id=despesa.user_id,
            referencia_id=despesa.id,
            referencia_tipo="despesa",
        )
        db.add(notification)
        created += 1

    # Notificações para orçamentos ultrapassados
    hoje = date.today()
    mes_atual = hoje.month
    ano_atual = hoje.year

    orcamentos = (
        db.query(OrcamentoCategoria)
        .filter(
            OrcamentoCategoria.mes == mes_atual, OrcamentoCategoria.ano == ano_atual
        )
        .all()
    )

    for orc in orcamentos:
        gasto = (
            db.query(func.coalesce(func.sum(Despesa.valor), 0))
            .filter(
                Despesa.user_id == orc.user_id,
                Despesa.categoria == orc.categoria,
                extract("month", Despesa.data_vencimento) == mes_atual,
                extract("year", Despesa.data_vencimento) == ano_atual,
            )
            .scalar()
        )

        if gasto > orc.limite:
            # Verificar se já existe notificação
            existing = (
                db.query(Notification)
                .filter(
                    Notification.referencia_id == orc.id,
                    Notification.referencia_tipo == "orcamento",
                    Notification.tipo == "orcamento",
                )
                .first()
            )

            if not existing:
                notification = Notification(
                    titulo="💰 Orçamento Excedido",
                    mensagem=f"O orçamento da categoria '{orc.categoria}' foi excedido. Gasto: R$ {gasto:.2f}, Limite: R$ {orc.limite:.2f}",
                    tipo="orcamento",
                    user_id=orc.user_id,
                    referencia_id=orc.id,
                    referencia_tipo="orcamento",
                )
                db.add(notification)
                created += 1

    db.commit()
    return {"message": f"{created} notificações criadas", "created": created}


@app.delete("/api/notifications/{notification_id}", status_code=204)
def deletar_notification(
    notification_id: int,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
    shared: bool = Depends(get_shared_mode),
):
    user_ids = get_account_user_ids(user, db, shared_mode=shared)
    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            (Notification.user_id.in_(user_ids)) | (Notification.user_id == None),
        )
        .first()
    )
    if not notification:
        raise HTTPException(status_code=404, detail="Notificação não encontrada")
    db.delete(notification)
    db.commit()


@app.get("/api/dashboard/resumo", response_model=DashboardSummary)
def dashboard_resumo(
    mes: int = Query(default=None),
    ano: int = Query(default=None),
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
    shared: bool = Depends(get_shared_mode),
):
    hoje = date.today()
    if not mes:
        mes = hoje.month
    if not ano:
        ano = hoje.year
    user_ids = get_account_user_ids(user, db, shared_mode=shared)
    uid_filter_r = (Receita.user_id.in_(user_ids)) | (Receita.user_id == None)
    uid_filter_d = (Despesa.user_id.in_(user_ids)) | (Despesa.user_id == None)

    receitas = (
        db.query(func.coalesce(func.sum(Receita.valor), 0))
        .filter(
            uid_filter_r,
            extract("month", Receita.data) == mes,
            extract("year", Receita.data) == ano,
        )
        .scalar()
    )

    despesas = (
        db.query(func.coalesce(func.sum(Despesa.valor), 0))
        .filter(
            uid_filter_d,
            extract("month", Despesa.data_vencimento) == mes,
            extract("year", Despesa.data_vencimento) == ano,
        )
        .scalar()
    )

    despesas_pagas = (
        db.query(func.coalesce(func.sum(Despesa.valor), 0))
        .filter(
            uid_filter_d,
            extract("month", Despesa.data_vencimento) == mes,
            extract("year", Despesa.data_vencimento) == ano,
            Despesa.pago == True,
        )
        .scalar()
    )

    receitas_count = (
        db.query(func.count(Receita.id))
        .filter(
            uid_filter_r,
            extract("month", Receita.data) == mes,
            extract("year", Receita.data) == ano,
        )
        .scalar()
    )

    despesas_count = (
        db.query(func.count(Despesa.id))
        .filter(
            uid_filter_d,
            extract("month", Despesa.data_vencimento) == mes,
            extract("year", Despesa.data_vencimento) == ano,
        )
        .scalar()
    )

    despesas_pagas_count = (
        db.query(func.count(Despesa.id))
        .filter(
            uid_filter_d,
            extract("month", Despesa.data_vencimento) == mes,
            extract("year", Despesa.data_vencimento) == ano,
            Despesa.pago == True,
        )
        .scalar()
    )

    return DashboardSummary(
        total_receitas=float(receitas),
        total_despesas=float(despesas),
        saldo=float(receitas) - float(despesas),
        despesas_pagas=float(despesas_pagas),
        despesas_pendentes=float(despesas) - float(despesas_pagas),
        total_receitas_count=receitas_count,
        total_despesas_count=despesas_count,
        despesas_pagas_count=despesas_pagas_count,
    )


@app.get("/api/dashboard/categorias", response_model=List[CategoriaGasto])
def dashboard_categorias(
    mes: int = Query(default=None),
    ano: int = Query(default=None),
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
    shared: bool = Depends(get_shared_mode),
):
    hoje = date.today()
    if not mes:
        mes = hoje.month
    if not ano:
        ano = hoje.year
    user_ids = get_account_user_ids(user, db, shared_mode=shared)
    uid_filter_d = (Despesa.user_id.in_(user_ids)) | (Despesa.user_id == None)

    resultados = (
        db.query(Despesa.categoria, func.sum(Despesa.valor).label("total"))
        .filter(
            uid_filter_d,
            extract("month", Despesa.data_vencimento) == mes,
            extract("year", Despesa.data_vencimento) == ano,
        )
        .group_by(Despesa.categoria)
        .order_by(func.sum(Despesa.valor).desc())
        .all()
    )

    total_geral = sum(r.total for r in resultados) if resultados else 1

    return [
        CategoriaGasto(
            categoria=r.categoria,
            total=float(r.total),
            percentual=round(float(r.total) / total_geral * 100, 1),
        )
        for r in resultados
    ]


@app.get("/api/dashboard/evolucao", response_model=List[EvolucaoMensal])
def dashboard_evolucao(
    meses: int = Query(default=6),
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
    shared: bool = Depends(get_shared_mode),
):
    hoje = date.today()
    resultado = []
    nomes_meses = [
        "",
        "Jan",
        "Fev",
        "Mar",
        "Abr",
        "Mai",
        "Jun",
        "Jul",
        "Ago",
        "Set",
        "Out",
        "Nov",
        "Dez",
    ]
    user_ids = get_account_user_ids(user, db, shared_mode=shared)
    uid_filter_r = (Receita.user_id.in_(user_ids)) | (Receita.user_id == None)
    uid_filter_d = (Despesa.user_id.in_(user_ids)) | (Despesa.user_id == None)

    for i in range(meses - 1, -1, -1):
        d = hoje - timedelta(days=i * 30)
        m = d.month
        a = d.year

        receitas = (
            db.query(func.coalesce(func.sum(Receita.valor), 0))
            .filter(
                uid_filter_r,
                extract("month", Receita.data) == m,
                extract("year", Receita.data) == a,
            )
            .scalar()
        )

        despesas = (
            db.query(func.coalesce(func.sum(Despesa.valor), 0))
            .filter(
                uid_filter_d,
                extract("month", Despesa.data_vencimento) == m,
                extract("year", Despesa.data_vencimento) == a,
            )
            .scalar()
        )

        resultado.append(
            EvolucaoMensal(
                mes=f"{nomes_meses[m]}/{a}",
                receitas=float(receitas),
                despesas=float(despesas),
                saldo=float(receitas) - float(despesas),
            )
        )

    return resultado


@app.get("/api/dashboard/vencimentos", response_model=List[ProximoVencimento])
def proximos_vencimentos(
    dias: int = Query(default=30),
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
    shared: bool = Depends(get_shared_mode),
):
    hoje = date.today()
    limite = hoje + timedelta(days=dias)
    user_ids = get_account_user_ids(user, db, shared_mode=shared)

    despesas = (
        db.query(Despesa)
        .filter(
            (Despesa.user_id.in_(user_ids)) | (Despesa.user_id == None),
            Despesa.pago == False,
            Despesa.data_vencimento >= hoje,
            Despesa.data_vencimento <= limite,
        )
        .order_by(Despesa.data_vencimento.asc())
        .limit(10)
        .all()
    )

    resultado = []
    for d in despesas:
        dias_rest = (d.data_vencimento - hoje).days
        if dias_rest <= 3:
            status = "URGENTE"
        elif dias_rest <= 7:
            status = "PROXIMO"
        else:
            status = "NORMAL"

        resultado.append(
            ProximoVencimento(
                id=d.id,
                descricao=d.descricao,
                categoria=d.categoria,
                valor=d.valor,
                data_vencimento=d.data_vencimento,
                dias_restantes=dias_rest,
                status=status,
            )
        )

    return resultado


# ==================== RELATORIOS ====================
@app.get("/api/relatorios/mensal")
def relatorio_mensal(
    mes: int = Query(default=None),
    ano: int = Query(default=None),
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
    shared: bool = Depends(get_shared_mode),
):
    hoje = date.today()
    if not mes:
        mes = hoje.month
    if not ano:
        ano = hoje.year
    user_ids = get_account_user_ids(user, db, shared_mode=shared)
    uid_filter_r = (Receita.user_id.in_(user_ids)) | (Receita.user_id == None)
    uid_filter_d = (Despesa.user_id.in_(user_ids)) | (Despesa.user_id == None)

    receitas = (
        db.query(Receita)
        .filter(
            uid_filter_r,
            extract("month", Receita.data) == mes,
            extract("year", Receita.data) == ano,
        )
        .all()
    )

    despesas = (
        db.query(Despesa)
        .filter(
            uid_filter_d,
            extract("month", Despesa.data_vencimento) == mes,
            extract("year", Despesa.data_vencimento) == ano,
        )
        .all()
    )

    total_receitas = sum(r.valor for r in receitas)
    total_despesas = sum(d.valor for d in despesas)
    total_pagas = sum(d.valor for d in despesas if d.pago)
    total_pendentes = total_despesas - total_pagas

    categorias_despesa = {}
    for d in despesas:
        if d.categoria not in categorias_despesa:
            categorias_despesa[d.categoria] = 0
        categorias_despesa[d.categoria] += d.valor

    categorias_receita = {}
    for r in receitas:
        if r.categoria not in categorias_receita:
            categorias_receita[r.categoria] = 0
        categorias_receita[r.categoria] += r.valor

    return {
        "mes": mes,
        "ano": ano,
        "total_receitas": total_receitas,
        "total_despesas": total_despesas,
        "saldo": total_receitas - total_despesas,
        "total_pagas": total_pagas,
        "total_pendentes": total_pendentes,
        "categorias_despesa": categorias_despesa,
        "categorias_receita": categorias_receita,
        "receitas": [ReceitaResponse.model_validate(r) for r in receitas],
        "despesas": [DespesaResponse.model_validate(d) for d in despesas],
    }


@app.get("/api/relatorios/comparativo")
def relatorio_comparativo(
    meses: int = Query(default=12),
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
    shared: bool = Depends(get_shared_mode),
):
    hoje = date.today()
    resultado = []
    nomes_meses = [
        "",
        "Janeiro",
        "Fevereiro",
        "Março",
        "Abril",
        "Maio",
        "Junho",
        "Julho",
        "Agosto",
        "Setembro",
        "Outubro",
        "Novembro",
        "Dezembro",
    ]
    user_ids = get_account_user_ids(user, db, shared_mode=shared)
    uid_filter_r = (Receita.user_id.in_(user_ids)) | (Receita.user_id == None)
    uid_filter_d = (Despesa.user_id.in_(user_ids)) | (Despesa.user_id == None)

    for i in range(meses - 1, -1, -1):
        d = hoje - timedelta(days=i * 30)
        m = d.month
        a = d.year

        receitas = (
            db.query(func.coalesce(func.sum(Receita.valor), 0))
            .filter(
                uid_filter_r,
                extract("month", Receita.data) == m,
                extract("year", Receita.data) == a,
            )
            .scalar()
        )

        despesas = (
            db.query(func.coalesce(func.sum(Despesa.valor), 0))
            .filter(
                uid_filter_d,
                extract("month", Despesa.data_vencimento) == m,
                extract("year", Despesa.data_vencimento) == a,
            )
            .scalar()
        )

        resultado.append(
            {
                "mes": f"{nomes_meses[m]} {a}",
                "mes_num": m,
                "ano": a,
                "receitas": float(receitas),
                "despesas": float(despesas),
                "saldo": float(receitas) - float(despesas),
                "economia": round(
                    (float(receitas) - float(despesas)) / float(receitas) * 100, 1
                )
                if float(receitas) > 0
                else 0,
            }
        )

    return resultado


# ==================== ORCAMENTO ====================
@app.get("/api/orcamento", response_model=List[OrcamentoResponse])
def listar_orcamentos(
    mes: int = Query(default=None),
    ano: int = Query(default=None),
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
    shared: bool = Depends(get_shared_mode),
):
    hoje = date.today()
    if not mes:
        mes = hoje.month
    if not ano:
        ano = hoje.year
    user_ids = get_account_user_ids(user, db, shared_mode=shared)
    return (
        db.query(OrcamentoCategoria)
        .filter(
            (OrcamentoCategoria.user_id.in_(user_ids))
            | (OrcamentoCategoria.user_id == None),
            OrcamentoCategoria.mes == mes,
            OrcamentoCategoria.ano == ano,
        )
        .all()
    )


@app.post("/api/orcamento", response_model=OrcamentoResponse, status_code=201)
def criar_orcamento(
    orc: OrcamentoCreate,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
    shared: bool = Depends(get_shared_mode),
):
    user_ids = get_account_user_ids(user, db, shared_mode=shared)
    existente = (
        db.query(OrcamentoCategoria)
        .filter(
            (OrcamentoCategoria.user_id.in_(user_ids))
            | (OrcamentoCategoria.user_id == None),
            OrcamentoCategoria.categoria == orc.categoria,
            OrcamentoCategoria.mes == orc.mes,
            OrcamentoCategoria.ano == orc.ano,
        )
        .first()
    )
    if existente:
        existente.limite = orc.limite
        db.commit()
        db.refresh(existente)
        return existente
    db_orc = OrcamentoCategoria(**orc.model_dump(), user_id=user.id)
    db.add(db_orc)
    db.commit()
    db.refresh(db_orc)
    return db_orc


@app.delete("/api/orcamento/{orc_id}", status_code=204)
def deletar_orcamento(
    orc_id: int,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
    shared: bool = Depends(get_shared_mode),
):
    user_ids = get_account_user_ids(user, db, shared_mode=shared)
    orc = (
        db.query(OrcamentoCategoria)
        .filter(
            OrcamentoCategoria.id == orc_id,
            (OrcamentoCategoria.user_id.in_(user_ids))
            | (OrcamentoCategoria.user_id == None),
        )
        .first()
    )
    if not orc:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")
    db.delete(orc)
    db.commit()


@app.get("/api/orcamento/resumo")
def orcamento_resumo(
    mes: int = Query(default=None),
    ano: int = Query(default=None),
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
    shared: bool = Depends(get_shared_mode),
):
    hoje = date.today()
    if not mes:
        mes = hoje.month
    if not ano:
        ano = hoje.year
    user_ids = get_account_user_ids(user, db, shared_mode=shared)
    uid_filter_d = (Despesa.user_id.in_(user_ids)) | (Despesa.user_id == None)

    orcamentos = (
        db.query(OrcamentoCategoria)
        .filter(
            (OrcamentoCategoria.user_id.in_(user_ids))
            | (OrcamentoCategoria.user_id == None),
            OrcamentoCategoria.mes == mes,
            OrcamentoCategoria.ano == ano,
        )
        .all()
    )

    resultado = []
    for orc in orcamentos:
        gasto = (
            db.query(func.coalesce(func.sum(Despesa.valor), 0))
            .filter(
                uid_filter_d,
                Despesa.categoria == orc.categoria,
                extract("month", Despesa.data_vencimento) == mes,
                extract("year", Despesa.data_vencimento) == ano,
            )
            .scalar()
        )

        resultado.append(
            {
                "id": orc.id,
                "categoria": orc.categoria,
                "limite": orc.limite,
                "gasto": float(gasto),
                "restante": orc.limite - float(gasto),
                "percentual": round(float(gasto) / orc.limite * 100, 1)
                if orc.limite > 0
                else 0,
            }
        )

    return resultado


# ==================== METAS ====================
@app.get("/api/metas", response_model=List[MetaResponse])
def listar_metas(
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
    shared: bool = Depends(get_shared_mode),
):
    user_ids = get_account_user_ids(user, db, shared_mode=shared)
    return (
        db.query(Meta)
        .filter((Meta.user_id.in_(user_ids)) | (Meta.user_id == None))
        .order_by(Meta.concluida.asc(), Meta.prazo.asc())
        .all()
    )


@app.post("/api/metas", response_model=MetaResponse, status_code=201)
def criar_meta(
    meta: MetaCreate,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
    shared: bool = Depends(get_shared_mode),
):
    # Verificação de limites baseada no PlanService
    is_allowed, count = PlanService.check_limit(user, db, "goals")
    
    if not is_allowed:
        raise HTTPException(
            status_code=403, 
            detail=f"Limite de Metas atingido para o seu plano ({user.plan.upper()}). Remova metas antigas ou faça um upgrade."
        )

    db_meta = Meta(**meta.model_dump(), user_id=user.id)
    db.add(db_meta)
    db.commit()
    db.refresh(db_meta)
    return db_meta


@app.put("/api/metas/{meta_id}", response_model=MetaResponse)
def atualizar_meta(
    meta_id: int,
    meta: MetaUpdate,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
    shared: bool = Depends(get_shared_mode),
):
    user_ids = get_account_user_ids(user, db, shared_mode=shared)
    db_meta = (
        db.query(Meta)
        .filter(
            Meta.id == meta_id, (Meta.user_id.in_(user_ids)) | (Meta.user_id == None)
        )
        .first()
    )
    if not db_meta:
        raise HTTPException(status_code=404, detail="Meta não encontrada")
    update_data = meta.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_meta, key, value)
    db.commit()
    db.refresh(db_meta)
    return db_meta


@app.delete("/api/metas/{meta_id}", status_code=204)
def deletar_meta(
    meta_id: int,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
    shared: bool = Depends(get_shared_mode),
):
    user_ids = get_account_user_ids(user, db, shared_mode=shared)
    db_meta = (
        db.query(Meta)
        .filter(
            Meta.id == meta_id, (Meta.user_id.in_(user_ids)) | (Meta.user_id == None)
        )
        .first()
    )
    if not db_meta:
        raise HTTPException(status_code=404, detail="Meta não encontrada")
    db.delete(db_meta)
    db.commit()


# ==================== ADMIN METRICS ====================
@app.get("/api/admin/metrics")
def admin_metrics(
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Get business metrics (admin only)"""
    if user.role != "admin":
        raise HTTPException(
            status_code=403, detail="Acesso apenas para administradores"
        )

    total_users = db.query(User).count()
    hoje = date.today()
    mes = hoje.month
    ano = hoje.year

    users_this_month = (
        db.query(User)
        .filter(
            extract("month", User.created_at) == mes,
            extract("year", User.created_at) == ano,
        )
        .count()
    )

    free_users = db.query(User).filter(User.plan == "free").count()
    pro_users = db.query(User).filter(User.plan == "pro").count()
    premium_users = db.query(User).filter(User.plan == "premium").count()

    total_paid = pro_users + premium_users
    conversion_rate = (total_paid / total_users * 100) if total_users > 0 else 0

    mrr = (pro_users * 19.90) + (premium_users * 29.90)

    return {
        "users": {
            "total": total_users,
            "new_this_month": users_this_month,
            "active_paid": total_paid,
            "free_users": free_users,
        },
        "subscriptions": {
            "total_paid": total_paid,
            "pro": pro_users,
            "premium": premium_users,
            "conversion_rate": round(conversion_rate, 2),
        },
        "revenue": {
            "mrr": mrr,
            "total_lifetime": mrr * 12,
            "this_month": mrr,
        },
        "metrics": {
            "churn_rate": 0.0,
            "arpu": mrr / total_users if total_users > 0 else 0,
        },
    }


@app.get("/api/admin/engagement")
def admin_engagement(
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Get engagement metrics (admin only)"""
    if user.role != "admin":
        raise HTTPException(
            status_code=403, detail="Acesso apenas para administradores"
        )

    total_users = db.query(User).count()
    hoje = date.today()
    limite_30d = hoje - timedelta(days=30)

    active_users_30d = (
        db.query(User)
        .filter(
            User.is_active == True,
        )
        .count()
    )

    total_receitas = db.query(Receita).count()
    total_despesas = db.query(Despesa).count()
    total_transacoes = total_receitas + total_despesas

    avg_transactions = total_transacoes / total_users if total_users > 0 else 0
    engagement_rate = (active_users_30d / total_users * 100) if total_users > 0 else 0

    users_with_goals = db.query(Meta).distinct(Meta.user_id).count()
    users_with_investments = (
        db.query(Investimento).distinct(Investimento.user_id).count()
    )

    return {
        "active_users_30d": active_users_30d,
        "engagement_rate": round(engagement_rate, 1),
        "avg_transactions_per_user": round(avg_transactions, 1),
        "users_with_goals": users_with_goals,
        "users_with_investments": users_with_investments,
    }


@app.get("/api/admin/revenue-chart")
def admin_revenue_chart(
    meses: int = Query(default=6),
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Get revenue chart data (admin only)"""
    if user.role != "admin":
        raise HTTPException(
            status_code=403, detail="Acesso apenas para administradores"
        )

    hoje = date.today()
    nomes_meses = [
        "",
        "Jan",
        "Fev",
        "Mar",
        "Abr",
        "Mai",
        "Jun",
        "Jul",
        "Ago",
        "Set",
        "Out",
        "Nov",
        "Dez",
    ]
    resultado = []

    for i in range(meses - 1, -1, -1):
        d = hoje - timedelta(days=i * 30)
        m = d.month
        a = d.year

        receitas = (
            db.query(func.coalesce(func.sum(Receita.valor), 0))
            .filter(
                extract("month", Receita.data) == m,
                extract("year", Receita.data) == a,
            )
            .scalar()
        )

        despesas = (
            db.query(func.coalesce(func.sum(Despesa.valor), 0))
            .filter(
                extract("month", Despesa.data_vencimento) == m,
                extract("year", Despesa.data_vencimento) == a,
            )
            .scalar()
        )

        new_subscriptions = (
            db.query(User)
            .filter(
                extract("month", User.created_at) == m,
                extract("year", User.created_at) == a,
            )
            .count()
        )

        resultado.append(
            {
                "month": f"{nomes_meses[m]}/{a}",
                "revenue": float(receitas),
                "expenses": float(despesas),
                "new_subscriptions": new_subscriptions,
            }
        )

    return resultado




@app.get("/api/admin/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    user_id: Optional[int] = None,
    action: Optional[str] = None,
):
    """Get audit logs (admin only)"""
    if user.role != "admin":
        raise HTTPException(
            status_code=403, detail="Acesso apenas para administradores"
        )

    query = db.query(AuditLog).order_by(AuditLog.created_at.desc())

    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    if action:
        query = query.filter(AuditLog.action.contains(action))

    return query.offset(skip).limit(limit).all()


@app.get("/api/admin/users/{target_user_id}/activity")
def get_user_activity(
    target_user_id: int,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=200),
):
    """Get activity logs for a specific user (admin only)"""
    if user.role != "admin":
        raise HTTPException(
            status_code=403, detail="Acesso apenas para administradores"
        )

    target = db.query(User).filter(User.id == target_user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    logs = (
        db.query(AuditLog)
        .filter(AuditLog.user_id == target_user_id)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .all()
    )

    return {
        "user": {
            "id": target.id,
            "nome": target.nome,
            "email": target.email,
            "role": target.role,
            "plan": target.plan,
            "is_active": target.is_active,
            "created_at": target.created_at,
        },
        "activity": logs,
    }


# ==================== SEED DATA ====================
@app.post("/api/seed")
def seed_data(db: Session = Depends(get_db)):
    hoje = date.today()
    mes = hoje.month
    ano = hoje.year

    receitas_existentes = db.query(Receita).count()
    if receitas_existentes > 0:
        return {"message": "Dados já existem"}

    receitas = [
        Receita(
            descricao="Salário Mensal",
            categoria="Salário",
            valor=5500.00,
            data=date(ano, mes, 5),
        ),
        Receita(
            descricao="Freelance Website",
            categoria="Freelance",
            valor=2000.00,
            data=date(ano, mes, 15),
        ),
        Receita(
            descricao="Rendimento CDB",
            categoria="Investimentos",
            valor=350.00,
            data=date(ano, mes, 1),
        ),
        Receita(
            descricao="Bônus Trimestral",
            categoria="Bônus",
            valor=1200.00,
            data=date(ano, mes, 20),
        ),
    ]

    despesas = [
        Despesa(
            descricao="Aluguel Apartamento",
            categoria="Aluguel",
            valor=1800.00,
            data_vencimento=date(ano, mes, 10),
            pago=True,
            data_pagamento=date(ano, mes, 9),
        ),
        Despesa(
            descricao="Supermercado Extra",
            categoria="Hipermercado",
            valor=650.00,
            data_vencimento=date(ano, mes, 5),
            pago=True,
            data_pagamento=date(ano, mes, 5),
        ),
        Despesa(
            descricao="Conta de Gás",
            categoria="Gás",
            valor=85.00,
            data_vencimento=date(ano, mes, 12),
            pago=True,
            data_pagamento=date(ano, mes, 12),
        ),
        Despesa(
            descricao="Parcela Notebook",
            categoria="Crédito",
            valor=450.00,
            data_vencimento=date(ano, mes, 15),
            parcela_atual=3,
            parcela_total=10,
            pago=False,
        ),
        Despesa(
            descricao="Uber Mensal",
            categoria="Uber/Transporte",
            valor=280.00,
            data_vencimento=date(ano, mes, 20),
            pago=False,
        ),
        Despesa(
            descricao="Financiamento Carro",
            categoria="Financiamento",
            valor=1200.00,
            data_vencimento=date(ano, mes, 18),
            parcela_atual=24,
            parcela_total=48,
            pago=False,
        ),
        Despesa(
            descricao="Açougue",
            categoria="Carne",
            valor=320.00,
            data_vencimento=date(ano, mes, 8),
            pago=True,
            data_pagamento=date(ano, mes, 8),
        ),
        Despesa(
            descricao="Roupas Shopping",
            categoria="Vestuário",
            valor=350.00,
            data_vencimento=date(ano, mes, 22),
            parcela_atual=1,
            parcela_total=3,
            pago=False,
        ),
        Despesa(
            descricao="Empréstimo Pessoal",
            categoria="Empréstimo",
            valor=500.00,
            data_vencimento=date(ano, mes, 25),
            pago=False,
        ),
        Despesa(
            descricao="Restaurante",
            categoria="Alimentação",
            valor=180.00,
            data_vencimento=date(ano, mes, 14),
            pago=True,
            data_pagamento=date(ano, mes, 14),
        ),
        Despesa(
            descricao="Locação Equipamento",
            categoria="Locação",
            valor=200.00,
            data_vencimento=date(ano, mes, 28),
            pago=False,
        ),
        Despesa(
            descricao="Diversos",
            categoria="Diversos",
            valor=150.00,
            data_vencimento=date(ano, mes, 16),
            pago=False,
        ),
    ]

    # Previous month data
    mes_ant = mes - 1 if mes > 1 else 12
    ano_ant = ano if mes > 1 else ano - 1

    receitas_ant = [
        Receita(
            descricao="Salário Mensal",
            categoria="Salário",
            valor=5500.00,
            data=date(ano_ant, mes_ant, 5),
        ),
        Receita(
            descricao="Freelance App",
            categoria="Freelance",
            valor=1500.00,
            data=date(ano_ant, mes_ant, 20),
        ),
        Receita(
            descricao="Rendimento CDB",
            categoria="Investimentos",
            valor=320.00,
            data=date(ano_ant, mes_ant, 1),
        ),
    ]

    despesas_ant = [
        Despesa(
            descricao="Aluguel Apartamento",
            categoria="Aluguel",
            valor=1800.00,
            data_vencimento=date(ano_ant, mes_ant, 10),
            pago=True,
            data_pagamento=date(ano_ant, mes_ant, 9),
        ),
        Despesa(
            descricao="Supermercado",
            categoria="Hipermercado",
            valor=580.00,
            data_vencimento=date(ano_ant, mes_ant, 5),
            pago=True,
            data_pagamento=date(ano_ant, mes_ant, 5),
        ),
        Despesa(
            descricao="Parcela Notebook",
            categoria="Crédito",
            valor=450.00,
            data_vencimento=date(ano_ant, mes_ant, 15),
            parcela_atual=2,
            parcela_total=10,
            pago=True,
            data_pagamento=date(ano_ant, mes_ant, 15),
        ),
        Despesa(
            descricao="Financiamento Carro",
            categoria="Financiamento",
            valor=1200.00,
            data_vencimento=date(ano_ant, mes_ant, 18),
            parcela_atual=23,
            parcela_total=48,
            pago=True,
            data_pagamento=date(ano_ant, mes_ant, 18),
        ),
        Despesa(
            descricao="Uber",
            categoria="Uber/Transporte",
            valor=250.00,
            data_vencimento=date(ano_ant, mes_ant, 20),
            pago=True,
            data_pagamento=date(ano_ant, mes_ant, 20),
        ),
        Despesa(
            descricao="Alimentação",
            categoria="Alimentação",
            valor=200.00,
            data_vencimento=date(ano_ant, mes_ant, 14),
            pago=True,
            data_pagamento=date(ano_ant, mes_ant, 14),
        ),
    ]

    for r in receitas + receitas_ant:
        db.add(r)
    for d in despesas + despesas_ant:
        db.add(d)

    db.commit()
    return {"message": "Dados de exemplo criados com sucesso!"}


# ==================== IMPORTAR PLANILHA ====================
def normalize_col(name: str) -> str:
    """Normalize column name for matching."""
    if not isinstance(name, str):
        return ""
    return re.sub(r"[^a-z0-9]", "", name.lower().strip())


COLUMN_MAP_DESPESA = {
    "descricao": [
        "descricao",
        "descrição",
        "nome",
        "titulo",
        "título",
        "item",
        "despesa",
    ],
    "categoria": ["categoria", "tipo", "group", "grupo"],
    "valor": ["valor", "value", "preco", "preço", "total", "montante", "quantia"],
    "data_vencimento": [
        "data",
        "date",
        "vencimento",
        "datavencimento",
        "data_vencimento",
        "datadespesa",
    ],
    "pago": ["pago", "paid", "status", "situacao", "situação", "quitado"],
    "observacoes": [
        "observacoes",
        "observações",
        "obs",
        "notas",
        "notes",
        "comentario",
    ],
    "parcela_atual": ["parcelaatual", "parcela_atual", "parcela", "numparcela"],
    "parcela_total": ["parcelatotal", "parcela_total", "totalparcelas", "numparcelas"],
}

COLUMN_MAP_RECEITA = {
    "descricao": [
        "descricao",
        "descrição",
        "nome",
        "titulo",
        "título",
        "item",
        "receita",
    ],
    "categoria": ["categoria", "tipo", "group", "grupo", "fonte"],
    "valor": ["valor", "value", "preco", "preço", "total", "montante", "quantia"],
    "data": ["data", "date", "datarecebimento", "data_recebimento", "datarecebida"],
    "observacoes": [
        "observacoes",
        "observações",
        "obs",
        "notas",
        "notes",
        "comentario",
    ],
}


def match_columns(df_columns: list, col_map: dict) -> dict:
    """Auto-match DataFrame columns to expected fields."""
    mapping = {}
    normalized = {normalize_col(c): c for c in df_columns}
    for field, aliases in col_map.items():
        for alias in aliases:
            norm_alias = normalize_col(alias)
            if norm_alias in normalized:
                mapping[field] = normalized[norm_alias]
                break
    return mapping


def parse_date_value(val) -> Optional[date]:
    """Try to parse various date formats."""
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    if isinstance(val, (datetime, date)):
        return val if isinstance(val, date) else val.date()
    if isinstance(val, pd.Timestamp):
        return val.date()
    s = str(val).strip()
    for fmt in ["%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%m/%d/%Y", "%d.%m.%Y", "%Y/%m/%d"]:
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def parse_bool_value(val) -> bool:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return False
    s = str(val).strip().lower()
    return s in ["true", "1", "sim", "yes", "s", "pago", "quitado", "x"]


def parse_float_value(val) -> Optional[float]:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip().replace("R$", "").replace("r$", "").replace(" ", "")
    s = s.replace(".", "").replace(",", ".") if "," in s else s
    try:
        return float(s)
    except ValueError:
        return None


@app.post("/api/import/preview")
async def import_preview(
    file: UploadFile = File(...),
    tipo: str = Form("despesa"),
):
    """Read spreadsheet and return preview of parsed data + detected columns."""
    content = await file.read()
    filename = file.filename or ""

    try:
        if filename.endswith(".csv"):
            for enc in ["utf-8", "latin-1", "cp1252"]:
                try:
                    df = pd.read_csv(io.BytesIO(content), encoding=enc)
                    break
                except UnicodeDecodeError:
                    continue
            else:
                raise HTTPException(
                    status_code=400, detail="Não foi possível ler o arquivo CSV"
                )
        elif filename.endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(content), engine="openpyxl")
        else:
            raise HTTPException(
                status_code=400, detail="Formato não suportado. Use .xlsx, .xls ou .csv"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao ler arquivo: {str(e)}")

    if df.empty:
        raise HTTPException(status_code=400, detail="Planilha está vazia")

    col_map = COLUMN_MAP_DESPESA if tipo == "despesa" else COLUMN_MAP_RECEITA
    mapping = match_columns(list(df.columns), col_map)

    preview_rows = []
    for _, row in df.head(10).iterrows():
        preview_rows.append(
            {str(c): (str(v) if pd.notna(v) else "") for c, v in row.items()}
        )

    return {
        "columns": list(df.columns.astype(str)),
        "mapping": mapping,
        "total_rows": len(df),
        "preview": preview_rows,
        "tipo": tipo,
    }


@app.post("/api/import/execute")
async def import_execute(
    file: UploadFile = File(...),
    tipo: str = Form("despesa"),
    db: Session = Depends(get_db),
):
    """Parse spreadsheet and insert records into the database."""
    content = await file.read()
    filename = file.filename or ""

    try:
        if filename.endswith(".csv"):
            for enc in ["utf-8", "latin-1", "cp1252"]:
                try:
                    df = pd.read_csv(io.BytesIO(content), encoding=enc)
                    break
                except UnicodeDecodeError:
                    continue
            else:
                raise HTTPException(
                    status_code=400, detail="Não foi possível ler o CSV"
                )
        elif filename.endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(content), engine="openpyxl")
        else:
            raise HTTPException(
                status_code=400, detail="Formato não suportado. Use .xlsx, .xls ou .csv"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao ler arquivo: {str(e)}")

    if df.empty:
        raise HTTPException(status_code=400, detail="Planilha está vazia")

    col_map = COLUMN_MAP_DESPESA if tipo == "despesa" else COLUMN_MAP_RECEITA
    mapping = match_columns(list(df.columns), col_map)

    inserted = 0
    errors = []

    if tipo == "despesa":
        desc_col = mapping.get("descricao")
        cat_col = mapping.get("categoria")
        val_col = mapping.get("valor")
        date_col = mapping.get("data_vencimento")
        pago_col = mapping.get("pago")
        obs_col = mapping.get("observacoes")
        parc_atual_col = mapping.get("parcela_atual")
        parc_total_col = mapping.get("parcela_total")

        if not val_col:
            raise HTTPException(
                status_code=400, detail="Coluna de valor não encontrada na planilha"
            )

        for idx, row in df.iterrows():
            try:
                valor = parse_float_value(row.get(val_col))
                if valor is None or valor <= 0:
                    errors.append(f"Linha {idx + 2}: valor inválido")
                    continue

                descricao = str(row.get(desc_col, "")) if desc_col else ""
                if not descricao or descricao == "nan":
                    descricao = f"Importado #{idx + 1}"

                categoria = str(row.get(cat_col, "")) if cat_col else "Diversos"
                if not categoria or categoria == "nan":
                    categoria = "Diversos"

                data_venc = (
                    parse_date_value(row.get(date_col)) if date_col else date.today()
                )
                if not data_venc:
                    data_venc = date.today()

                pago = parse_bool_value(row.get(pago_col)) if pago_col else False
                obs = str(row.get(obs_col, "")) if obs_col else None
                if obs == "nan":
                    obs = None

                parc_atual = None
                parc_total = None
                if parc_atual_col:
                    try:
                        parc_atual = int(float(row.get(parc_atual_col, 0)))
                    except (ValueError, TypeError):
                        pass
                if parc_total_col:
                    try:
                        parc_total = int(float(row.get(parc_total_col, 0)))
                    except (ValueError, TypeError):
                        pass

                despesa = Despesa(
                    descricao=descricao,
                    categoria=categoria,
                    valor=valor,
                    data_vencimento=data_venc,
                    pago=pago,
                    data_pagamento=data_venc if pago else None,
                    observacoes=obs,
                    parcela_atual=parc_atual,
                    parcela_total=parc_total,
                )
                db.add(despesa)
                inserted += 1
            except Exception as e:
                errors.append(f"Linha {idx + 2}: {str(e)}")

    else:  # receita
        desc_col = mapping.get("descricao")
        cat_col = mapping.get("categoria")
        val_col = mapping.get("valor")
        date_col = mapping.get("data")
        obs_col = mapping.get("observacoes")

        if not val_col:
            raise HTTPException(
                status_code=400, detail="Coluna de valor não encontrada na planilha"
            )

        for idx, row in df.iterrows():
            try:
                valor = parse_float_value(row.get(val_col))
                if valor is None or valor <= 0:
                    errors.append(f"Linha {idx + 2}: valor inválido")
                    continue

                descricao = str(row.get(desc_col, "")) if desc_col else ""
                if not descricao or descricao == "nan":
                    descricao = f"Importado #{idx + 1}"

                categoria = str(row.get(cat_col, "")) if cat_col else "Outros"
                if not categoria or categoria == "nan":
                    categoria = "Outros"

                data_rec = (
                    parse_date_value(row.get(date_col)) if date_col else date.today()
                )
                if not data_rec:
                    data_rec = date.today()

                obs = str(row.get(obs_col, "")) if obs_col else None
                if obs == "nan":
                    obs = None

                receita = Receita(
                    descricao=descricao,
                    categoria=categoria,
                    valor=valor,
                    data=data_rec,
                    observacoes=obs,
                )
                db.add(receita)
                inserted += 1
            except Exception as e:
                errors.append(f"Linha {idx + 2}: {str(e)}")

    db.commit()

    return {
        "message": f"{inserted} registro(s) importado(s) com sucesso!",
        "inserted": inserted,
        "errors": errors[:20],
        "total_errors": len(errors),
    }


# ==================== CHAT AI AGENT ====================
from agent import process_recurring_expenses, chat_with_agent, import_spreadsheet


@app.post("/api/chat", response_model=ChatResponse)
def chat_endpoint(req: ChatRequest, db: Session = Depends(get_db)):
    history = [{"role": m.role, "content": m.content} for m in req.history]
    result = chat_with_agent(req.message, history, db)
    return ChatResponse(
        reply=result["reply"],
        actions=[{"type": a["type"], "data": a.get("data")} for a in result["actions"]],
    )


@app.post("/api/chat/upload", response_model=ChatResponse)
async def chat_upload_endpoint(
    file: UploadFile = File(...), db: Session = Depends(get_db)
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Nenhum arquivo enviado")

    allowed = (".xlsx", ".xls", ".csv")
    if not any(file.filename.lower().endswith(ext) for ext in allowed):
        return ChatResponse(
            reply="❌ Formato não suportado. Envie um arquivo **.xlsx**, **.xls** ou **.csv**.",
            actions=[],
        )

    contents = await file.read()
    result = import_spreadsheet(contents, file.filename, db)
    return ChatResponse(
        reply=result["reply"],
        actions=[{"type": a["type"], "data": a.get("data")} for a in result["actions"]],
    )


@app.post("/api/recurring/process")
def process_recurring_endpoint(db: Session = Depends(get_db)):
    result = process_recurring_expenses(db)
    return result


# ==================== EXPORTAR RELATÓRIOS ====================
@app.get("/api/export/excel")
def export_excel(
    mes: int = Query(default=None),
    ano: int = Query(default=None),
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
    shared: bool = Depends(get_shared_mode),
):
    hoje = date.today()
    if not mes:
        mes = hoje.month
    if not ano:
        ano = hoje.year
    user_ids = get_account_user_ids(user, db, shared_mode=shared)

    receitas = (
        db.query(Receita)
        .filter(
            (Receita.user_id.in_(user_ids)) | (Receita.user_id == None),
            extract("month", Receita.data) == mes,
            extract("year", Receita.data) == ano,
        )
        .all()
    )

    despesas = (
        db.query(Despesa)
        .filter(
            (Despesa.user_id.in_(user_ids)) | (Despesa.user_id == None),
            extract("month", Despesa.data_vencimento) == mes,
            extract("year", Despesa.data_vencimento) == ano,
        )
        .all()
    )

    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        # Receitas sheet
        if receitas:
            df_rec = pd.DataFrame(
                [
                    {
                        "Descrição": r.descricao,
                        "Categoria": r.categoria,
                        "Valor": r.valor,
                        "Data": r.data.strftime("%d/%m/%Y") if r.data else "",
                        "Observações": r.observacoes or "",
                    }
                    for r in receitas
                ]
            )
            df_rec.to_excel(writer, sheet_name="Receitas", index=False)
        else:
            pd.DataFrame({"Mensagem": ["Nenhuma receita neste mês"]}).to_excel(
                writer, sheet_name="Receitas", index=False
            )

        # Despesas sheet
        if despesas:
            df_desp = pd.DataFrame(
                [
                    {
                        "Descrição": d.descricao,
                        "Categoria": d.categoria,
                        "Valor": d.valor,
                        "Vencimento": d.data_vencimento.strftime("%d/%m/%Y")
                        if d.data_vencimento
                        else "",
                        "Pago": "Sim" if d.pago else "Não",
                        "Parcela": f"{d.parcela_atual}/{d.parcela_total}"
                        if d.parcela_total
                        else "",
                        "Observações": d.observacoes or "",
                    }
                    for d in despesas
                ]
            )
            df_desp.to_excel(writer, sheet_name="Despesas", index=False)
        else:
            pd.DataFrame({"Mensagem": ["Nenhuma despesa neste mês"]}).to_excel(
                writer, sheet_name="Despesas", index=False
            )

        # Resumo sheet
        total_rec = sum(r.valor for r in receitas)
        total_desp = sum(d.valor for d in despesas)
        total_pagas = sum(d.valor for d in despesas if d.pago)
        df_resumo = pd.DataFrame(
            [
                {
                    "Total Receitas": total_rec,
                    "Total Despesas": total_desp,
                    "Saldo": total_rec - total_desp,
                    "Despesas Pagas": total_pagas,
                    "Despesas Pendentes": total_desp - total_pagas,
                }
            ]
        )
        df_resumo.to_excel(writer, sheet_name="Resumo", index=False)

    output.seek(0)
    nomes_meses = [
        "",
        "Janeiro",
        "Fevereiro",
        "Março",
        "Abril",
        "Maio",
        "Junho",
        "Julho",
        "Agosto",
        "Setembro",
        "Outubro",
        "Novembro",
        "Dezembro",
    ]
    filename = f"Relatorio_{nomes_meses[mes]}_{ano}.xlsx"

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@app.get("/api/export/csv")
def export_csv(
    tipo: str = Query(default="despesas"),
    mes: int = Query(default=None),
    ano: int = Query(default=None),
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
    shared: bool = Depends(get_shared_mode),
):
    hoje = date.today()
    if not mes:
        mes = hoje.month
    if not ano:
        ano = hoje.year
    user_ids = get_account_user_ids(user, db, shared_mode=shared)

    output = io.StringIO()

    if tipo == "receitas":
        receitas = (
            db.query(Receita)
            .filter(
                (Receita.user_id.in_(user_ids)) | (Receita.user_id == None),
                extract("month", Receita.data) == mes,
                extract("year", Receita.data) == ano,
            )
            .all()
        )
        df = (
            pd.DataFrame(
                [
                    {
                        "Descrição": r.descricao,
                        "Categoria": r.categoria,
                        "Valor": r.valor,
                        "Data": r.data.strftime("%d/%m/%Y") if r.data else "",
                    }
                    for r in receitas
                ]
            )
            if receitas
            else pd.DataFrame()
        )
    else:
        despesas = (
            db.query(Despesa)
            .filter(
                (Despesa.user_id.in_(user_ids)) | (Despesa.user_id == None),
                extract("month", Despesa.data_vencimento) == mes,
                extract("year", Despesa.data_vencimento) == ano,
            )
            .all()
        )
        df = (
            pd.DataFrame(
                [
                    {
                        "Descrição": d.descricao,
                        "Categoria": d.categoria,
                        "Valor": d.valor,
                        "Vencimento": d.data_vencimento.strftime("%d/%m/%Y")
                        if d.data_vencimento
                        else "",
                        "Pago": "Sim" if d.pago else "Não",
                    }
                    for d in despesas
                ]
            )
            if despesas
            else pd.DataFrame()
        )

    df.to_csv(output, index=False, encoding="utf-8-sig")
    output.seek(0)

    nomes_meses = [
        "",
        "Jan",
        "Fev",
        "Mar",
        "Abr",
        "Mai",
        "Jun",
        "Jul",
        "Ago",
        "Set",
        "Out",
        "Nov",
        "Dez",
    ]
    filename = f"{tipo}_{nomes_meses[mes]}_{ano}.csv"

    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8-sig")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# ==================== BUSCA GLOBAL ====================
@app.get("/api/search")
def global_search(
    q: str = Query(..., min_length=1),
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
    shared: bool = Depends(get_shared_mode),
):
    query = f"%{q}%"
    user_ids = get_account_user_ids(user, db, shared_mode=shared)

    receitas = (
        db.query(Receita)
        .filter(
            (Receita.user_id.in_(user_ids)) | (Receita.user_id == None),
            Receita.descricao.ilike(query) | Receita.categoria.ilike(query),
        )
        .limit(10)
        .all()
    )

    despesas = (
        db.query(Despesa)
        .filter(
            (Despesa.user_id.in_(user_ids)) | (Despesa.user_id == None),
            Despesa.descricao.ilike(query) | Despesa.categoria.ilike(query),
        )
        .limit(10)
        .all()
    )

    results = []
    for r in receitas:
        results.append(
            {
                "id": r.id,
                "tipo": "receita",
                "descricao": r.descricao,
                "categoria": r.categoria,
                "valor": r.valor,
                "data": r.data.isoformat() if r.data else None,
            }
        )
    for d in despesas:
        results.append(
            {
                "id": d.id,
                "tipo": "despesa",
                "descricao": d.descricao,
                "categoria": d.categoria,
                "valor": d.valor,
                "data": d.data_vencimento.isoformat() if d.data_vencimento else None,
                "pago": d.pago,
            }
        )

    investimentos = (
        db.query(Investimento)
        .filter(
            (Investimento.user_id.in_(user_ids)) | (Investimento.user_id == None),
            Investimento.ticker.ilike(query) | Investimento.observacoes.ilike(query),
        )
        .limit(10)
        .all()
    )

    for inv in investimentos:
        results.append(
            {
                "id": inv.id,
                "tipo": "investimento",
                "descricao": inv.ticker,
                "categoria": inv.tipo,
                "valor": inv.quantidade * inv.preco_medio,
                "data": inv.data_compra.isoformat() if inv.data_compra else None,
                "quantidade": inv.quantidade,
                "preco_medio": inv.preco_medio,
            }
        )

    results.sort(key=lambda x: x.get("data") or "", reverse=True)
    return results


# ===================== INVESTIMENTOS =====================

BRAPI_BASE = "https://brapi.dev/api"
BRAPI_TOKEN = os.environ.get("BRAPI_TOKEN", "")





@app.get("/api/investimentos", response_model=List[InvestimentoResponse])
def listar_investimentos(
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
    shared: bool = Depends(get_shared_mode),
):
    user_ids = get_account_user_ids(user, db, shared_mode=shared)
    return (
        db.query(Investimento)
        .filter((Investimento.user_id.in_(user_ids)) | (Investimento.user_id == None))
        .order_by(Investimento.data_compra.desc())
        .all()
    )


@app.post("/api/investimentos", response_model=InvestimentoResponse)
def criar_investimento(
    data: InvestimentoCreate,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
    shared: bool = Depends(get_shared_mode),
):
    # Verificação de limites baseada no PlanService
    is_allowed, count = PlanService.check_limit(user, db, "investments")
    
    if not is_allowed:
        raise HTTPException(
            status_code=403, 
            detail=f"Limite de Ativos atingido para o seu plano ({user.plan.upper()}). Remova ativos antigos ou faça um upgrade."
        )

    inv = Investimento(
        user_id=user.id,
        ticker=data.ticker.upper().strip(),
        tipo=data.tipo,
        quantidade=data.quantidade,
        preco_medio=data.preco_medio,
        data_compra=data.data_compra,
        observacoes=data.observacoes,
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return inv


@app.put("/api/investimentos/{inv_id}", response_model=InvestimentoResponse)
def atualizar_investimento(
    inv_id: int,
    data: InvestimentoUpdate,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    user_ids = get_account_user_ids(user, db)
    inv = (
        db.query(Investimento)
        .filter(
            Investimento.id == inv_id,
            (Investimento.user_id.in_(user_ids)) | (Investimento.user_id == None),
        )
        .first()
    )
    if not inv:
        raise HTTPException(status_code=404, detail="Investimento não encontrado")
    for field, value in data.dict(exclude_unset=True).items():
        if value is not None:
            if field == "ticker":
                value = value.upper().strip()
            setattr(inv, field, value)
    db.commit()
    db.refresh(inv)
    return inv


@app.delete("/api/investimentos/{inv_id}", status_code=204)
def deletar_investimento(
    inv_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)
):
    user_ids = get_account_user_ids(user, db)
    inv = (
        db.query(Investimento)
        .filter(
            Investimento.id == inv_id,
            (Investimento.user_id.in_(user_ids)) | (Investimento.user_id == None),
        )
        .first()
    )
    if not inv:
        raise HTTPException(status_code=404, detail="Investimento não encontrado")
    db.delete(inv)
    db.commit()
    return None


@app.get("/api/cotacao/{ticker}")
async def get_cotacao(ticker: str):
    """Proxy para BRAPI - busca cotação atual de um ticker"""
    try:
        params = {}
        if BRAPI_TOKEN:
            params["token"] = BRAPI_TOKEN
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{BRAPI_BASE}/quote/{ticker.upper()}", params=params
            )
            if resp.status_code != 200:
                raise HTTPException(
                    status_code=resp.status_code, detail="Erro ao buscar cotação"
                )
            return resp.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Timeout ao buscar cotação")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro: {str(e)}")


@app.get("/api/cotacao/{ticker}/historico")
async def get_historico(ticker: str, range: str = "1mo"):
    """Proxy para BRAPI - busca histórico de preços"""
    try:
        params = {"range": range, "interval": "1d"}
        if BRAPI_TOKEN:
            params["token"] = BRAPI_TOKEN
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{BRAPI_BASE}/quote/{ticker.upper()}", params=params
            )
            if resp.status_code != 200:
                raise HTTPException(
                    status_code=resp.status_code, detail="Erro ao buscar histórico"
                )
            return resp.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Timeout ao buscar histórico")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro: {str(e)}")


@app.get("/api/cotacoes/batch")
async def get_cotacoes_batch(
    tickers: str = Query(..., description="Tickers separados por vírgula"),
):
    """Busca cotações de múltiplos tickers de uma vez"""
    try:
        ticker_list = tickers.upper().strip()
        params = {}
        if BRAPI_TOKEN:
            params["token"] = BRAPI_TOKEN
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(f"{BRAPI_BASE}/quote/{ticker_list}", params=params)
            if resp.status_code != 200:
                raise HTTPException(
                    status_code=resp.status_code, detail="Erro ao buscar cotações"
                )
            return resp.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Timeout ao buscar cotações")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro: {str(e)}")


@app.get("/api/investimentos/resumo")
def resumo_investimentos(
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
    shared: bool = Depends(get_shared_mode),
):
    """Retorna resumo da carteira de investimentos"""
    user_ids = get_account_user_ids(user, db, shared_mode=shared)
    investimentos = (
        db.query(Investimento)
        .filter((Investimento.user_id.in_(user_ids)) | (Investimento.user_id == None))
        .all()
    )

    total_investido = sum(i.quantidade * i.preco_medio for i in investimentos)
    por_tipo = {}
    for inv in investimentos:
        if inv.tipo not in por_tipo:
            por_tipo[inv.tipo] = {"total_investido": 0, "quantidade_ativos": 0}
        por_tipo[inv.tipo]["total_investido"] += inv.quantidade * inv.preco_medio
        por_tipo[inv.tipo]["quantidade_ativos"] += 1

    return {
        "total_investido": total_investido,
        "total_ativos": len(investimentos),
        "por_tipo": por_tipo,
        "tickers": list(set(i.ticker for i in investimentos)),
    }


# --- Notes Routes ---

@app.post("/api/notes", response_model=NoteResponse, tags=["Notes"])
async def create_note(
    note: NoteCreate,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    db_note = Note(
        user_id=user.id,
        title=note.title,
        content=note.content,
        color=note.color,
        is_financial=note.is_financial
    )
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    return db_note


@app.get("/api/notes", response_model=List[NoteResponse], tags=["Notes"])
async def list_notes(
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    return db.query(Note).filter(Note.user_id == user.id).order_by(Note.updated_at.desc()).all()


@app.get("/api/notes/{note_id}", response_model=NoteResponse, tags=["Notes"])
async def get_note(
    note_id: int,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Nota não encontrada")
    return note


@app.put("/api/notes/{note_id}", response_model=NoteResponse, tags=["Notes"])
async def update_note(
    note_id: int,
    note_update: NoteUpdate,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    db_note = db.query(Note).filter(Note.id == note_id, Note.user_id == user.id).first()
    if not db_note:
        raise HTTPException(status_code=404, detail="Nota não encontrada")
    
    if note_update.title is not None:
        db_note.title = note_update.title
    if note_update.content is not None:
        db_note.content = note_update.content
    if note_update.color is not None:
        db_note.color = note_update.color
    if note_update.is_financial is not None:
        db_note.is_financial = note_update.is_financial

    db.commit()
    db.refresh(db_note)
    return db_note


@app.delete("/api/notes/{note_id}", tags=["Notes"])
async def delete_note(
    note_id: int,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    db_note = db.query(Note).filter(Note.id == note_id, Note.user_id == user.id).first()
    if not db_note:
        raise HTTPException(status_code=404, detail="Nota não encontrada")
    
    db.delete(db_note)
    db.commit()
    return {"message": "Nota excluída com sucesso"}


@app.post("/api/notes/{note_id}/process", tags=["Notes"])
async def process_note(
    note_id: int,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Nota não encontrada")
    
    if not note.is_financial:
        return {"message": "Nota não está marcada para leitura do sistema", "data": []}

    # Basic extraction logic (could be replaced by LLM call)
    text = note.content or ""
    # Look for patterns like "DD/MM R$ X,XX Descrição" or "Descrição R$ X,XX"
    # match 32,50 or 1.200,50
    pattern = r"R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})"
    amounts = re.findall(pattern, text)
    
    extractions = []
    for amt in amounts:
        val = float(amt.replace(".", "").replace(",", "."))
        extractions.append({
            "value": val,
            "description": "Lançamento extraído da nota",
            "type": "despesa" if "pago" in text.lower() or "gasto" in text.lower() else "receita"
        })

    return {
        "message": f"Identificamos {len(extractions)} possíveis lançamentos na sua nota",
        "data": extractions
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
