from fastapi import FastAPI, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import List, Optional
from datetime import date, datetime, timedelta
from dateutil.relativedelta import relativedelta
from database import engine, get_db, Base
from models import Receita, Despesa, OrcamentoCategoria, Meta, User, Notification, SharedAccount
import os
from dotenv import load_dotenv

load_dotenv()

Base.metadata.create_all(bind=engine)
import pandas as pd
import io
import re
from schemas import (
    ReceitaCreate, ReceitaUpdate, ReceitaResponse,
    DespesaCreate, DespesaUpdate, DespesaResponse,
    OrcamentoCreate, OrcamentoResponse,
    MetaCreate, MetaUpdate, MetaResponse,
    DashboardSummary, CategoriaGasto, EvolucaoMensal, ProximoVencimento,
    UserRegister, UserLogin, UserResponse, TokenResponse,
    ChatRequest, ChatResponse, NotificationCreate, NotificationResponse,
    SharedAccountInvite, SharedAccountResponse,
)
from passlib.context import CryptContext
from jose import JWTError, jwt

SECRET_KEY = os.environ.get("JWT_SECRET", "fincontrol-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

app = FastAPI(title="Controle Financeiro Pessoal", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Executa tarefas automáticas no startup do servidor"""
    from database import SessionLocal
    db = SessionLocal()
    try:
        # Gera notificações automaticamente
        result = generate_notifications(db)
        print(f"✅ Startup: {result['message']}")

        # Processa recorrências
        recurring_result = process_recurring_expenses(db)
        print(f"✅ Startup: {recurring_result['message']}")
    except Exception as e:
        print(f"❌ Erro no startup: {str(e)}")
    finally:
        db.close()


def create_access_token(user_id: int) -> str:
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    return jwt.encode({"sub": str(user_id), "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> Optional[User]:
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
    except (JWTError, ValueError, TypeError):
        return None
    return db.query(User).filter(User.id == user_id).first()


def require_user(user: Optional[User] = Depends(get_current_user)) -> User:
    if not user:
        raise HTTPException(status_code=401, detail="Não autorizado. Faça login.")
    return user

def get_account_user_ids(user: User, db: Session) -> List[int]:
    """Return list of user IDs that share the same financial data.
    If user has an active shared account, returns both user IDs.
    Otherwise returns just the user's own ID."""
    shared = db.query(SharedAccount).filter(
        SharedAccount.status == "active",
        (SharedAccount.owner_id == user.id) | (SharedAccount.partner_id == user.id)
    ).first()
    if shared:
        return [shared.owner_id, shared.partner_id]
    return [user.id]


def _build_shared_response(sa: SharedAccount, db: Session) -> dict:
    """Build a SharedAccountResponse dict with owner/partner names."""
    owner = db.query(User).filter(User.id == sa.owner_id).first()
    partner = db.query(User).filter(User.id == sa.partner_id).first() if sa.partner_id else None
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
        raise HTTPException(status_code=400, detail="Você não pode convidar a si mesmo.")

    # Check if user already has an active shared account
    existing_active = db.query(SharedAccount).filter(
        SharedAccount.status == "active",
        (SharedAccount.owner_id == user.id) | (SharedAccount.partner_id == user.id)
    ).first()
    if existing_active:
        raise HTTPException(status_code=400, detail="Você já possui uma conta compartilhada ativa.")

    # Check if there's already a pending invite from this user
    existing_pending = db.query(SharedAccount).filter(
        SharedAccount.owner_id == user.id,
        SharedAccount.status == "pending",
    ).first()
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


@app.post("/api/shared-account/{account_id}/accept", response_model=SharedAccountResponse)
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
    existing_active = db.query(SharedAccount).filter(
        SharedAccount.status == "active",
        (SharedAccount.owner_id == user.id) | (SharedAccount.partner_id == user.id)
    ).first()
    if existing_active:
        raise HTTPException(status_code=400, detail="Você já possui uma conta compartilhada ativa.")

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
        raise HTTPException(status_code=404, detail="Conta compartilhada não encontrada.")
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
    active = db.query(SharedAccount).filter(
        SharedAccount.status == "active",
        (SharedAccount.owner_id == user.id) | (SharedAccount.partner_id == user.id)
    ).first()
    if active:
        return {"type": "active", "account": _build_shared_response(active, db)}

    # Pending invite sent by user
    sent = db.query(SharedAccount).filter(
        SharedAccount.owner_id == user.id,
        SharedAccount.status == "pending",
    ).first()
    if sent:
        return {"type": "pending_sent", "account": _build_shared_response(sent, db)}

    # Pending invite received by user
    received = db.query(SharedAccount).filter(
        SharedAccount.partner_email == user.email,
        SharedAccount.status == "pending",
    ).first()
    if received:
        return {"type": "pending_received", "account": _build_shared_response(received, db)}

    return {"type": "none", "account": None}


CATEGORIAS_RECEITA = [
    "Salário", "Freelance", "Investimentos", "Aluguel Recebido",
    "Comissão", "Bônus", "Outros"
]

CATEGORIAS_DESPESA = [
    "Alimentação", "Aluguel", "Carne", "Crédito", "Débito",
    "Diversos", "Empréstimo", "Financiamento", "Gás",
    "Hipermercado", "Locação", "Uber/Transporte", "Vestuário"
]


# ==================== AUTH ====================
@app.post("/api/auth/register", response_model=TokenResponse, status_code=201)
def register(data: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    if len(data.senha) < 6:
        raise HTTPException(status_code=400, detail="Senha deve ter pelo menos 6 caracteres")
    user = User(
        nome=data.nome,
        email=data.email,
        senha_hash=pwd_context.hash(data.senha),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(user.id)
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@app.post("/api/auth/login", response_model=TokenResponse)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not pwd_context.verify(data.senha, user.senha_hash):
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")
    token = create_access_token(user.id)
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@app.get("/api/auth/me", response_model=UserResponse)
def get_me(user: User = Depends(require_user)):
    return user


@app.post("/api/auth/refresh", response_model=TokenResponse)
def refresh_token(user: User = Depends(require_user), db: Session = Depends(get_db)):
    token = create_access_token(user.id)
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


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
):
    user_ids = get_account_user_ids(user, db)
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
def obter_receita(receita_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)):
    user_ids = get_account_user_ids(user, db)
    receita = db.query(Receita).filter(
        Receita.id == receita_id,
        (Receita.user_id.in_(user_ids)) | (Receita.user_id == None)
    ).first()
    if not receita:
        raise HTTPException(status_code=404, detail="Receita não encontrada")
    return receita


@app.post("/api/receitas", response_model=ReceitaResponse, status_code=201)
def criar_receita(receita: ReceitaCreate, user: User = Depends(require_user), db: Session = Depends(get_db)):
    db_receita = Receita(**receita.model_dump(), user_id=user.id)
    db.add(db_receita)
    db.commit()
    db.refresh(db_receita)
    return db_receita


@app.put("/api/receitas/{receita_id}", response_model=ReceitaResponse)
def atualizar_receita(receita_id: int, receita: ReceitaUpdate, user: User = Depends(require_user), db: Session = Depends(get_db)):
    user_ids = get_account_user_ids(user, db)
    db_receita = db.query(Receita).filter(
        Receita.id == receita_id,
        (Receita.user_id.in_(user_ids)) | (Receita.user_id == None)
    ).first()
    if not db_receita:
        raise HTTPException(status_code=404, detail="Receita não encontrada")
    update_data = receita.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_receita, key, value)
    db.commit()
    db.refresh(db_receita)
    return db_receita


@app.delete("/api/receitas/{receita_id}", status_code=204)
def deletar_receita(receita_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)):
    user_ids = get_account_user_ids(user, db)
    db_receita = db.query(Receita).filter(
        Receita.id == receita_id,
        (Receita.user_id.in_(user_ids)) | (Receita.user_id == None)
    ).first()
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
):
    user_ids = get_account_user_ids(user, db)
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
def obter_despesa(despesa_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)):
    user_ids = get_account_user_ids(user, db)
    despesa = db.query(Despesa).filter(
        Despesa.id == despesa_id,
        (Despesa.user_id.in_(user_ids)) | (Despesa.user_id == None)
    ).first()
    if not despesa:
        raise HTTPException(status_code=404, detail="Despesa não encontrada")
    return despesa


@app.post("/api/despesas", response_model=List[DespesaResponse], status_code=201)
def criar_despesa(despesa: DespesaCreate, user: User = Depends(require_user), db: Session = Depends(get_db)):
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
def atualizar_despesa(despesa_id: int, despesa: DespesaUpdate, user: User = Depends(require_user), db: Session = Depends(get_db)):
    user_ids = get_account_user_ids(user, db)
    db_despesa = db.query(Despesa).filter(
        Despesa.id == despesa_id,
        (Despesa.user_id.in_(user_ids)) | (Despesa.user_id == None)
    ).first()
    if not db_despesa:
        raise HTTPException(status_code=404, detail="Despesa não encontrada")
    update_data = despesa.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_despesa, key, value)
    db.commit()
    db.refresh(db_despesa)
    return db_despesa


@app.delete("/api/despesas/{despesa_id}", status_code=204)
def deletar_despesa(despesa_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)):
    user_ids = get_account_user_ids(user, db)
    db_despesa = db.query(Despesa).filter(
        Despesa.id == despesa_id,
        (Despesa.user_id.in_(user_ids)) | (Despesa.user_id == None)
    ).first()
    if not db_despesa:
        raise HTTPException(status_code=404, detail="Despesa não encontrada")
    db.delete(db_despesa)
    db.commit()


@app.patch("/api/despesas/{despesa_id}/pagar", response_model=DespesaResponse)
def marcar_pago(despesa_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)):
    user_ids = get_account_user_ids(user, db)
    db_despesa = db.query(Despesa).filter(
        Despesa.id == despesa_id,
        (Despesa.user_id.in_(user_ids)) | (Despesa.user_id == None)
    ).first()
    if not db_despesa:
        raise HTTPException(status_code=404, detail="Despesa não encontrada")
    db_despesa.pago = not db_despesa.pago
    db_despesa.data_pagamento = date.today() if db_despesa.pago else None
    db.commit()
    db.refresh(db_despesa)
    return db_despesa


# ==================== NOTIFICATIONS ====================
@app.get("/api/notifications", response_model=List[NotificationResponse])
def listar_notifications(user: User = Depends(require_user), db: Session = Depends(get_db)):
    user_ids = get_account_user_ids(user, db)
    return db.query(Notification).filter(
        (Notification.user_id.in_(user_ids)) | (Notification.user_id == None)
    ).order_by(Notification.created_at.desc()).all()


@app.get("/api/notifications/unread", response_model=List[NotificationResponse])
def listar_notifications_unread(user: User = Depends(require_user), db: Session = Depends(get_db)):
    user_ids = get_account_user_ids(user, db)
    return db.query(Notification).filter(
        Notification.lida == False,
        (Notification.user_id.in_(user_ids)) | (Notification.user_id == None)
    ).order_by(Notification.created_at.desc()).all()


@app.patch("/api/notifications/{notification_id}/read")
def marcar_notification_lida(notification_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)):
    user_ids = get_account_user_ids(user, db)
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        (Notification.user_id.in_(user_ids)) | (Notification.user_id == None)
    ).first()
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
    despesas_proximas = db.query(Despesa).filter(
        Despesa.pago == False,
        Despesa.data_vencimento >= hoje,
        Despesa.data_vencimento <= limite,
    ).all()

    for despesa in despesas_proximas:
        dias_restantes = (despesa.data_vencimento - hoje).days

        # Verificar se já existe notificação para este vencimento
        existing = db.query(Notification).filter(
            Notification.referencia_id == despesa.id,
            Notification.referencia_tipo == "despesa",
            Notification.tipo == "vencimento"
        ).first()

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
            referencia_id=despesa.id,
            referencia_tipo="despesa"
        )
        db.add(notification)
        created += 1

    # Notificações para orçamentos ultrapassados
    hoje = date.today()
    mes_atual = hoje.month
    ano_atual = hoje.year

    orcamentos = db.query(OrcamentoCategoria).filter(
        OrcamentoCategoria.mes == mes_atual,
        OrcamentoCategoria.ano == ano_atual
    ).all()

    for orc in orcamentos:
        gasto = db.query(func.coalesce(func.sum(Despesa.valor), 0)).filter(
            Despesa.categoria == orc.categoria,
            extract("month", Despesa.data_vencimento) == mes_atual,
            extract("year", Despesa.data_vencimento) == ano_atual,
        ).scalar()

        if gasto > orc.limite:
            # Verificar se já existe notificação
            existing = db.query(Notification).filter(
                Notification.referencia_id == orc.id,
                Notification.referencia_tipo == "orcamento",
                Notification.tipo == "orcamento"
            ).first()

            if not existing:
                notification = Notification(
                    titulo="💰 Orçamento Excedido",
                    mensagem=f"O orçamento da categoria '{orc.categoria}' foi excedido. Gasto: R$ {gasto:.2f}, Limite: R$ {orc.limite:.2f}",
                    tipo="orcamento",
                    referencia_id=orc.id,
                    referencia_tipo="orcamento"
                )
                db.add(notification)
                created += 1

    db.commit()
    return {"message": f"{created} notificações criadas", "created": created}


@app.delete("/api/notifications/{notification_id}", status_code=204)
def deletar_notification(notification_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)):
    user_ids = get_account_user_ids(user, db)
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        (Notification.user_id.in_(user_ids)) | (Notification.user_id == None)
    ).first()
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
):
    hoje = date.today()
    if not mes:
        mes = hoje.month
    if not ano:
        ano = hoje.year
    user_ids = get_account_user_ids(user, db)
    uid_filter_r = (Receita.user_id.in_(user_ids)) | (Receita.user_id == None)
    uid_filter_d = (Despesa.user_id.in_(user_ids)) | (Despesa.user_id == None)

    receitas = db.query(func.coalesce(func.sum(Receita.valor), 0)).filter(
        uid_filter_r,
        extract("month", Receita.data) == mes,
        extract("year", Receita.data) == ano,
    ).scalar()

    despesas = db.query(func.coalesce(func.sum(Despesa.valor), 0)).filter(
        uid_filter_d,
        extract("month", Despesa.data_vencimento) == mes,
        extract("year", Despesa.data_vencimento) == ano,
    ).scalar()

    despesas_pagas = db.query(func.coalesce(func.sum(Despesa.valor), 0)).filter(
        uid_filter_d,
        extract("month", Despesa.data_vencimento) == mes,
        extract("year", Despesa.data_vencimento) == ano,
        Despesa.pago == True,
    ).scalar()

    receitas_count = db.query(func.count(Receita.id)).filter(
        uid_filter_r,
        extract("month", Receita.data) == mes,
        extract("year", Receita.data) == ano,
    ).scalar()

    despesas_count = db.query(func.count(Despesa.id)).filter(
        uid_filter_d,
        extract("month", Despesa.data_vencimento) == mes,
        extract("year", Despesa.data_vencimento) == ano,
    ).scalar()

    despesas_pagas_count = db.query(func.count(Despesa.id)).filter(
        uid_filter_d,
        extract("month", Despesa.data_vencimento) == mes,
        extract("year", Despesa.data_vencimento) == ano,
        Despesa.pago == True,
    ).scalar()

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
):
    hoje = date.today()
    if not mes:
        mes = hoje.month
    if not ano:
        ano = hoje.year
    user_ids = get_account_user_ids(user, db)
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
):
    hoje = date.today()
    resultado = []
    nomes_meses = [
        "", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
        "Jul", "Ago", "Set", "Out", "Nov", "Dez"
    ]
    user_ids = get_account_user_ids(user, db)
    uid_filter_r = (Receita.user_id.in_(user_ids)) | (Receita.user_id == None)
    uid_filter_d = (Despesa.user_id.in_(user_ids)) | (Despesa.user_id == None)

    for i in range(meses - 1, -1, -1):
        d = hoje - timedelta(days=i * 30)
        m = d.month
        a = d.year

        receitas = db.query(func.coalesce(func.sum(Receita.valor), 0)).filter(
            uid_filter_r,
            extract("month", Receita.data) == m,
            extract("year", Receita.data) == a,
        ).scalar()

        despesas = db.query(func.coalesce(func.sum(Despesa.valor), 0)).filter(
            uid_filter_d,
            extract("month", Despesa.data_vencimento) == m,
            extract("year", Despesa.data_vencimento) == a,
        ).scalar()

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
):
    hoje = date.today()
    limite = hoje + timedelta(days=dias)
    user_ids = get_account_user_ids(user, db)

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
):
    hoje = date.today()
    if not mes:
        mes = hoje.month
    if not ano:
        ano = hoje.year
    user_ids = get_account_user_ids(user, db)
    uid_filter_r = (Receita.user_id.in_(user_ids)) | (Receita.user_id == None)
    uid_filter_d = (Despesa.user_id.in_(user_ids)) | (Despesa.user_id == None)

    receitas = db.query(Receita).filter(
        uid_filter_r,
        extract("month", Receita.data) == mes,
        extract("year", Receita.data) == ano,
    ).all()

    despesas = db.query(Despesa).filter(
        uid_filter_d,
        extract("month", Despesa.data_vencimento) == mes,
        extract("year", Despesa.data_vencimento) == ano,
    ).all()

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
):
    hoje = date.today()
    resultado = []
    nomes_meses = [
        "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ]
    user_ids = get_account_user_ids(user, db)
    uid_filter_r = (Receita.user_id.in_(user_ids)) | (Receita.user_id == None)
    uid_filter_d = (Despesa.user_id.in_(user_ids)) | (Despesa.user_id == None)

    for i in range(meses - 1, -1, -1):
        d = hoje - timedelta(days=i * 30)
        m = d.month
        a = d.year

        receitas = db.query(func.coalesce(func.sum(Receita.valor), 0)).filter(
            uid_filter_r,
            extract("month", Receita.data) == m,
            extract("year", Receita.data) == a,
        ).scalar()

        despesas = db.query(func.coalesce(func.sum(Despesa.valor), 0)).filter(
            uid_filter_d,
            extract("month", Despesa.data_vencimento) == m,
            extract("year", Despesa.data_vencimento) == a,
        ).scalar()

        resultado.append({
            "mes": f"{nomes_meses[m]} {a}",
            "mes_num": m,
            "ano": a,
            "receitas": float(receitas),
            "despesas": float(despesas),
            "saldo": float(receitas) - float(despesas),
            "economia": round(
                (float(receitas) - float(despesas)) / float(receitas) * 100, 1
            ) if float(receitas) > 0 else 0,
        })

    return resultado


# ==================== ORCAMENTO ====================
@app.get("/api/orcamento", response_model=List[OrcamentoResponse])
def listar_orcamentos(
    mes: int = Query(default=None),
    ano: int = Query(default=None),
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    hoje = date.today()
    if not mes:
        mes = hoje.month
    if not ano:
        ano = hoje.year
    user_ids = get_account_user_ids(user, db)
    return db.query(OrcamentoCategoria).filter(
        (OrcamentoCategoria.user_id.in_(user_ids)) | (OrcamentoCategoria.user_id == None),
        OrcamentoCategoria.mes == mes,
        OrcamentoCategoria.ano == ano,
    ).all()


@app.post("/api/orcamento", response_model=OrcamentoResponse, status_code=201)
def criar_orcamento(orc: OrcamentoCreate, user: User = Depends(require_user), db: Session = Depends(get_db)):
    user_ids = get_account_user_ids(user, db)
    existente = db.query(OrcamentoCategoria).filter(
        (OrcamentoCategoria.user_id.in_(user_ids)) | (OrcamentoCategoria.user_id == None),
        OrcamentoCategoria.categoria == orc.categoria,
        OrcamentoCategoria.mes == orc.mes,
        OrcamentoCategoria.ano == orc.ano,
    ).first()
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
def deletar_orcamento(orc_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)):
    user_ids = get_account_user_ids(user, db)
    orc = db.query(OrcamentoCategoria).filter(
        OrcamentoCategoria.id == orc_id,
        (OrcamentoCategoria.user_id.in_(user_ids)) | (OrcamentoCategoria.user_id == None),
    ).first()
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
):
    hoje = date.today()
    if not mes:
        mes = hoje.month
    if not ano:
        ano = hoje.year
    user_ids = get_account_user_ids(user, db)
    uid_filter_d = (Despesa.user_id.in_(user_ids)) | (Despesa.user_id == None)

    orcamentos = db.query(OrcamentoCategoria).filter(
        (OrcamentoCategoria.user_id.in_(user_ids)) | (OrcamentoCategoria.user_id == None),
        OrcamentoCategoria.mes == mes,
        OrcamentoCategoria.ano == ano,
    ).all()

    resultado = []
    for orc in orcamentos:
        gasto = db.query(func.coalesce(func.sum(Despesa.valor), 0)).filter(
            uid_filter_d,
            Despesa.categoria == orc.categoria,
            extract("month", Despesa.data_vencimento) == mes,
            extract("year", Despesa.data_vencimento) == ano,
        ).scalar()

        resultado.append({
            "id": orc.id,
            "categoria": orc.categoria,
            "limite": orc.limite,
            "gasto": float(gasto),
            "restante": orc.limite - float(gasto),
            "percentual": round(float(gasto) / orc.limite * 100, 1) if orc.limite > 0 else 0,
        })

    return resultado


# ==================== METAS ====================
@app.get("/api/metas", response_model=List[MetaResponse])
def listar_metas(user: User = Depends(require_user), db: Session = Depends(get_db)):
    user_ids = get_account_user_ids(user, db)
    return db.query(Meta).filter(
        (Meta.user_id.in_(user_ids)) | (Meta.user_id == None)
    ).order_by(Meta.concluida.asc(), Meta.prazo.asc()).all()


@app.post("/api/metas", response_model=MetaResponse, status_code=201)
def criar_meta(meta: MetaCreate, user: User = Depends(require_user), db: Session = Depends(get_db)):
    db_meta = Meta(**meta.model_dump(), user_id=user.id)
    db.add(db_meta)
    db.commit()
    db.refresh(db_meta)
    return db_meta


@app.put("/api/metas/{meta_id}", response_model=MetaResponse)
def atualizar_meta(meta_id: int, meta: MetaUpdate, user: User = Depends(require_user), db: Session = Depends(get_db)):
    user_ids = get_account_user_ids(user, db)
    db_meta = db.query(Meta).filter(
        Meta.id == meta_id,
        (Meta.user_id.in_(user_ids)) | (Meta.user_id == None)
    ).first()
    if not db_meta:
        raise HTTPException(status_code=404, detail="Meta não encontrada")
    update_data = meta.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_meta, key, value)
    db.commit()
    db.refresh(db_meta)
    return db_meta


@app.delete("/api/metas/{meta_id}", status_code=204)
def deletar_meta(meta_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)):
    user_ids = get_account_user_ids(user, db)
    db_meta = db.query(Meta).filter(
        Meta.id == meta_id,
        (Meta.user_id.in_(user_ids)) | (Meta.user_id == None)
    ).first()
    if not db_meta:
        raise HTTPException(status_code=404, detail="Meta não encontrada")
    db.delete(db_meta)
    db.commit()


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
        Receita(descricao="Salário Mensal", categoria="Salário", valor=5500.00, data=date(ano, mes, 5)),
        Receita(descricao="Freelance Website", categoria="Freelance", valor=2000.00, data=date(ano, mes, 15)),
        Receita(descricao="Rendimento CDB", categoria="Investimentos", valor=350.00, data=date(ano, mes, 1)),
        Receita(descricao="Bônus Trimestral", categoria="Bônus", valor=1200.00, data=date(ano, mes, 20)),
    ]

    despesas = [
        Despesa(descricao="Aluguel Apartamento", categoria="Aluguel", valor=1800.00, data_vencimento=date(ano, mes, 10), pago=True, data_pagamento=date(ano, mes, 9)),
        Despesa(descricao="Supermercado Extra", categoria="Hipermercado", valor=650.00, data_vencimento=date(ano, mes, 5), pago=True, data_pagamento=date(ano, mes, 5)),
        Despesa(descricao="Conta de Gás", categoria="Gás", valor=85.00, data_vencimento=date(ano, mes, 12), pago=True, data_pagamento=date(ano, mes, 12)),
        Despesa(descricao="Parcela Notebook", categoria="Crédito", valor=450.00, data_vencimento=date(ano, mes, 15), parcela_atual=3, parcela_total=10, pago=False),
        Despesa(descricao="Uber Mensal", categoria="Uber/Transporte", valor=280.00, data_vencimento=date(ano, mes, 20), pago=False),
        Despesa(descricao="Financiamento Carro", categoria="Financiamento", valor=1200.00, data_vencimento=date(ano, mes, 18), parcela_atual=24, parcela_total=48, pago=False),
        Despesa(descricao="Açougue", categoria="Carne", valor=320.00, data_vencimento=date(ano, mes, 8), pago=True, data_pagamento=date(ano, mes, 8)),
        Despesa(descricao="Roupas Shopping", categoria="Vestuário", valor=350.00, data_vencimento=date(ano, mes, 22), parcela_atual=1, parcela_total=3, pago=False),
        Despesa(descricao="Empréstimo Pessoal", categoria="Empréstimo", valor=500.00, data_vencimento=date(ano, mes, 25), pago=False),
        Despesa(descricao="Restaurante", categoria="Alimentação", valor=180.00, data_vencimento=date(ano, mes, 14), pago=True, data_pagamento=date(ano, mes, 14)),
        Despesa(descricao="Locação Equipamento", categoria="Locação", valor=200.00, data_vencimento=date(ano, mes, 28), pago=False),
        Despesa(descricao="Diversos", categoria="Diversos", valor=150.00, data_vencimento=date(ano, mes, 16), pago=False),
    ]

    # Previous month data
    mes_ant = mes - 1 if mes > 1 else 12
    ano_ant = ano if mes > 1 else ano - 1

    receitas_ant = [
        Receita(descricao="Salário Mensal", categoria="Salário", valor=5500.00, data=date(ano_ant, mes_ant, 5)),
        Receita(descricao="Freelance App", categoria="Freelance", valor=1500.00, data=date(ano_ant, mes_ant, 20)),
        Receita(descricao="Rendimento CDB", categoria="Investimentos", valor=320.00, data=date(ano_ant, mes_ant, 1)),
    ]

    despesas_ant = [
        Despesa(descricao="Aluguel Apartamento", categoria="Aluguel", valor=1800.00, data_vencimento=date(ano_ant, mes_ant, 10), pago=True, data_pagamento=date(ano_ant, mes_ant, 9)),
        Despesa(descricao="Supermercado", categoria="Hipermercado", valor=580.00, data_vencimento=date(ano_ant, mes_ant, 5), pago=True, data_pagamento=date(ano_ant, mes_ant, 5)),
        Despesa(descricao="Parcela Notebook", categoria="Crédito", valor=450.00, data_vencimento=date(ano_ant, mes_ant, 15), parcela_atual=2, parcela_total=10, pago=True, data_pagamento=date(ano_ant, mes_ant, 15)),
        Despesa(descricao="Financiamento Carro", categoria="Financiamento", valor=1200.00, data_vencimento=date(ano_ant, mes_ant, 18), parcela_atual=23, parcela_total=48, pago=True, data_pagamento=date(ano_ant, mes_ant, 18)),
        Despesa(descricao="Uber", categoria="Uber/Transporte", valor=250.00, data_vencimento=date(ano_ant, mes_ant, 20), pago=True, data_pagamento=date(ano_ant, mes_ant, 20)),
        Despesa(descricao="Alimentação", categoria="Alimentação", valor=200.00, data_vencimento=date(ano_ant, mes_ant, 14), pago=True, data_pagamento=date(ano_ant, mes_ant, 14)),
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
    "descricao": ["descricao", "descrição", "nome", "titulo", "título", "item", "despesa"],
    "categoria": ["categoria", "tipo", "group", "grupo"],
    "valor": ["valor", "value", "preco", "preço", "total", "montante", "quantia"],
    "data_vencimento": ["data", "date", "vencimento", "datavencimento", "data_vencimento", "datadespesa"],
    "pago": ["pago", "paid", "status", "situacao", "situação", "quitado"],
    "observacoes": ["observacoes", "observações", "obs", "notas", "notes", "comentario"],
    "parcela_atual": ["parcelaatual", "parcela_atual", "parcela", "numparcela"],
    "parcela_total": ["parcelatotal", "parcela_total", "totalparcelas", "numparcelas"],
}

COLUMN_MAP_RECEITA = {
    "descricao": ["descricao", "descrição", "nome", "titulo", "título", "item", "receita"],
    "categoria": ["categoria", "tipo", "group", "grupo", "fonte"],
    "valor": ["valor", "value", "preco", "preço", "total", "montante", "quantia"],
    "data": ["data", "date", "datarecebimento", "data_recebimento", "datarecebida"],
    "observacoes": ["observacoes", "observações", "obs", "notas", "notes", "comentario"],
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
                raise HTTPException(status_code=400, detail="Não foi possível ler o arquivo CSV")
        elif filename.endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(content), engine="openpyxl")
        else:
            raise HTTPException(status_code=400, detail="Formato não suportado. Use .xlsx, .xls ou .csv")
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
        preview_rows.append({str(c): (str(v) if pd.notna(v) else "") for c, v in row.items()})

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
                raise HTTPException(status_code=400, detail="Não foi possível ler o CSV")
        elif filename.endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(content), engine="openpyxl")
        else:
            raise HTTPException(status_code=400, detail="Formato não suportado. Use .xlsx, .xls ou .csv")
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
            raise HTTPException(status_code=400, detail="Coluna de valor não encontrada na planilha")

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

                data_venc = parse_date_value(row.get(date_col)) if date_col else date.today()
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
            raise HTTPException(status_code=400, detail="Coluna de valor não encontrada na planilha")

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

                data_rec = parse_date_value(row.get(date_col)) if date_col else date.today()
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
async def chat_upload_endpoint(file: UploadFile = File(...), db: Session = Depends(get_db)):
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
):
    hoje = date.today()
    if not mes:
        mes = hoje.month
    if not ano:
        ano = hoje.year
    user_ids = get_account_user_ids(user, db)

    receitas = db.query(Receita).filter(
        (Receita.user_id.in_(user_ids)) | (Receita.user_id == None),
        extract("month", Receita.data) == mes,
        extract("year", Receita.data) == ano,
    ).all()

    despesas = db.query(Despesa).filter(
        (Despesa.user_id.in_(user_ids)) | (Despesa.user_id == None),
        extract("month", Despesa.data_vencimento) == mes,
        extract("year", Despesa.data_vencimento) == ano,
    ).all()

    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        # Receitas sheet
        if receitas:
            df_rec = pd.DataFrame([{
                "Descrição": r.descricao,
                "Categoria": r.categoria,
                "Valor": r.valor,
                "Data": r.data.strftime("%d/%m/%Y") if r.data else "",
                "Observações": r.observacoes or "",
            } for r in receitas])
            df_rec.to_excel(writer, sheet_name="Receitas", index=False)
        else:
            pd.DataFrame({"Mensagem": ["Nenhuma receita neste mês"]}).to_excel(writer, sheet_name="Receitas", index=False)

        # Despesas sheet
        if despesas:
            df_desp = pd.DataFrame([{
                "Descrição": d.descricao,
                "Categoria": d.categoria,
                "Valor": d.valor,
                "Vencimento": d.data_vencimento.strftime("%d/%m/%Y") if d.data_vencimento else "",
                "Pago": "Sim" if d.pago else "Não",
                "Parcela": f"{d.parcela_atual}/{d.parcela_total}" if d.parcela_total else "",
                "Observações": d.observacoes or "",
            } for d in despesas])
            df_desp.to_excel(writer, sheet_name="Despesas", index=False)
        else:
            pd.DataFrame({"Mensagem": ["Nenhuma despesa neste mês"]}).to_excel(writer, sheet_name="Despesas", index=False)

        # Resumo sheet
        total_rec = sum(r.valor for r in receitas)
        total_desp = sum(d.valor for d in despesas)
        total_pagas = sum(d.valor for d in despesas if d.pago)
        df_resumo = pd.DataFrame([{
            "Total Receitas": total_rec,
            "Total Despesas": total_desp,
            "Saldo": total_rec - total_desp,
            "Despesas Pagas": total_pagas,
            "Despesas Pendentes": total_desp - total_pagas,
        }])
        df_resumo.to_excel(writer, sheet_name="Resumo", index=False)

    output.seek(0)
    nomes_meses = ["", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
                   "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
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
):
    hoje = date.today()
    if not mes:
        mes = hoje.month
    if not ano:
        ano = hoje.year
    user_ids = get_account_user_ids(user, db)

    output = io.StringIO()

    if tipo == "receitas":
        receitas = db.query(Receita).filter(
            (Receita.user_id.in_(user_ids)) | (Receita.user_id == None),
            extract("month", Receita.data) == mes,
            extract("year", Receita.data) == ano,
        ).all()
        df = pd.DataFrame([{
            "Descrição": r.descricao,
            "Categoria": r.categoria,
            "Valor": r.valor,
            "Data": r.data.strftime("%d/%m/%Y") if r.data else "",
        } for r in receitas]) if receitas else pd.DataFrame()
    else:
        despesas = db.query(Despesa).filter(
            (Despesa.user_id.in_(user_ids)) | (Despesa.user_id == None),
            extract("month", Despesa.data_vencimento) == mes,
            extract("year", Despesa.data_vencimento) == ano,
        ).all()
        df = pd.DataFrame([{
            "Descrição": d.descricao,
            "Categoria": d.categoria,
            "Valor": d.valor,
            "Vencimento": d.data_vencimento.strftime("%d/%m/%Y") if d.data_vencimento else "",
            "Pago": "Sim" if d.pago else "Não",
        } for d in despesas]) if despesas else pd.DataFrame()

    df.to_csv(output, index=False, encoding="utf-8-sig")
    output.seek(0)

    nomes_meses = ["", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
                   "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
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
):
    query = f"%{q}%"
    user_ids = get_account_user_ids(user, db)

    receitas = db.query(Receita).filter(
        (Receita.user_id.in_(user_ids)) | (Receita.user_id == None),
        Receita.descricao.ilike(query) | Receita.categoria.ilike(query)
    ).limit(10).all()

    despesas = db.query(Despesa).filter(
        (Despesa.user_id.in_(user_ids)) | (Despesa.user_id == None),
        Despesa.descricao.ilike(query) | Despesa.categoria.ilike(query)
    ).limit(10).all()

    results = []
    for r in receitas:
        results.append({
            "id": r.id,
            "tipo": "receita",
            "descricao": r.descricao,
            "categoria": r.categoria,
            "valor": r.valor,
            "data": r.data.isoformat() if r.data else None,
        })
    for d in despesas:
        results.append({
            "id": d.id,
            "tipo": "despesa",
            "descricao": d.descricao,
            "categoria": d.categoria,
            "valor": d.valor,
            "data": d.data_vencimento.isoformat() if d.data_vencimento else None,
            "pago": d.pago,
        })

    results.sort(key=lambda x: x.get("data") or "", reverse=True)
    return results


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
