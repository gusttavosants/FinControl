from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import date, datetime


# --- Auth Schemas ---
class UserRegister(BaseModel):
    nome: str
    email: str
    senha: str


class UserLogin(BaseModel):
    email: str
    senha: str


class UserResponse(BaseModel):
    id: int
    nome: str
    email: str

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# --- Receita Schemas ---
class ReceitaBase(BaseModel):
    descricao: str
    categoria: str
    valor: float
    data: date
    observacoes: Optional[str] = None


class ReceitaCreate(ReceitaBase):
    pass


class ReceitaUpdate(BaseModel):
    descricao: Optional[str] = None
    categoria: Optional[str] = None
    valor: Optional[float] = None
    data: Optional[date] = None
    observacoes: Optional[str] = None


class ReceitaResponse(ReceitaBase):
    id: int

    class Config:
        from_attributes = True


# --- Despesa Schemas ---
class DespesaBase(BaseModel):
    descricao: str
    categoria: str
    valor: float
    data_vencimento: date
    data_pagamento: Optional[date] = None
    parcela_atual: Optional[int] = None
    parcela_total: Optional[int] = None
    pago: bool = False
    observacoes: Optional[str] = None
    recorrente: Optional[bool] = False
    frequencia_recorrencia: Optional[str] = None
    parcelas_restantes: Optional[int] = None


class DespesaCreate(DespesaBase):
    pass


class DespesaUpdate(BaseModel):
    descricao: Optional[str] = None
    categoria: Optional[str] = None
    valor: Optional[float] = None
    data_vencimento: Optional[date] = None
    data_pagamento: Optional[date] = None
    parcela_atual: Optional[int] = None
    parcela_total: Optional[int] = None
    pago: Optional[bool] = None
    observacoes: Optional[str] = None
    recorrente: Optional[bool] = None
    frequencia_recorrencia: Optional[str] = None
    parcelas_restantes: Optional[int] = None


class DespesaResponse(DespesaBase):
    id: int

    class Config:
        from_attributes = True


# --- Orcamento Schemas ---
class OrcamentoCreate(BaseModel):
    categoria: str
    limite: float
    mes: int
    ano: int


class OrcamentoResponse(OrcamentoCreate):
    id: int

    class Config:
        from_attributes = True


# --- Meta Schemas ---
class MetaCreate(BaseModel):
    descricao: str
    valor_alvo: float
    valor_atual: float = 0
    prazo: Optional[date] = None


class MetaUpdate(BaseModel):
    descricao: Optional[str] = None
    valor_alvo: Optional[float] = None
    valor_atual: Optional[float] = None
    prazo: Optional[date] = None
    concluida: Optional[bool] = None


class MetaResponse(BaseModel):
    id: int
    descricao: str
    valor_alvo: float
    valor_atual: float
    prazo: Optional[date] = None
    concluida: bool

    class Config:
        from_attributes = True


# --- Dashboard Schemas ---
class DashboardSummary(BaseModel):
    total_receitas: float
    total_despesas: float
    saldo: float
    despesas_pagas: float
    despesas_pendentes: float
    total_receitas_count: int
    total_despesas_count: int
    despesas_pagas_count: int


class CategoriaGasto(BaseModel):
    categoria: str
    total: float
    percentual: float


class EvolucaoMensal(BaseModel):
    mes: str
    receitas: float
    despesas: float
    saldo: float


class ProximoVencimento(BaseModel):
    id: int
    descricao: str
    categoria: str
    valor: float
    data_vencimento: date
    dias_restantes: int
    status: str


# --- Chat Schemas ---
class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []


class ChatAction(BaseModel):
    type: str
    data: Optional[dict] = None


class ChatResponse(BaseModel):
    reply: str
    actions: List[ChatAction] = []


# --- SharedAccount Schemas ---
class SharedAccountInvite(BaseModel):
    partner_email: str


class SharedAccountResponse(BaseModel):
    id: int
    owner_id: int
    owner_name: Optional[str] = None
    owner_email: Optional[str] = None
    partner_id: Optional[int] = None
    partner_name: Optional[str] = None
    partner_email: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# --- Notification Schemas ---
class NotificationCreate(BaseModel):
    titulo: str
    mensagem: str
    tipo: str
    referencia_id: Optional[int] = None
    referencia_tipo: Optional[str] = None


class NotificationResponse(BaseModel):
    id: int
    titulo: str
    mensagem: str
    tipo: str
    lida: bool
    referencia_id: Optional[int] = None
    referencia_tipo: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
