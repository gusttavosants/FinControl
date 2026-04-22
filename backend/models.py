from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Date,
    DateTime,
    Boolean,
    Text,
    ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base
from datetime import date


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nome = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    senha_hash = Column(String(255), nullable=False)
    plan = Column(String(20), nullable=False, default="trial")  # trial, basico, premium
    role = Column(String(20), nullable=False, default="user")  
    trial_until = Column(DateTime, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    last_login = Column(DateTime, nullable=True)
    has_seen_tour = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, server_default=func.now())


class SharedAccount(Base):
    __tablename__ = "shared_accounts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    partner_id = Column(
        Integer, ForeignKey("users.id"), nullable=True
    )  # null = pending invite
    partner_email = Column(String(255), nullable=False)  # email do convidado
    status = Column(
        String(20), nullable=False, default="pending"
    )  # pending, active, rejected
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    owner = relationship("User", foreign_keys=[owner_id])
    partner = relationship("User", foreign_keys=[partner_id])


class Receita(Base):
    __tablename__ = "receitas"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    descricao = Column(String(255), nullable=False)
    categoria = Column(String(100), nullable=False)
    valor = Column(Float, nullable=False)
    data = Column(Date, nullable=False)
    observacoes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Despesa(Base):
    __tablename__ = "despesas"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    descricao = Column(String(255), nullable=False)
    categoria = Column(String(100), nullable=False)
    valor = Column(Float, nullable=False)
    data_vencimento = Column(Date, nullable=False)
    data_pagamento = Column(Date, nullable=True)
    parcela_atual = Column(Integer, nullable=True)
    parcela_total = Column(Integer, nullable=True)
    pago = Column(Boolean, default=False)
    observacoes = Column(Text, nullable=True)
    recorrente = Column(Boolean, default=False)
    frequencia_recorrencia = Column(
        String(20), nullable=True
    )  # "mensal", "semanal", "anual"
    parcelas_restantes = Column(Integer, nullable=True)  # quantas parcelas ainda gerar
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class OrcamentoCategoria(Base):
    __tablename__ = "orcamento_categorias"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    categoria = Column(String(100), nullable=False)
    limite = Column(Float, nullable=False)
    mes = Column(Integer, nullable=False)
    ano = Column(Integer, nullable=False)


class Meta(Base):
    __tablename__ = "metas"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    descricao = Column(String(255), nullable=False)
    valor_alvo = Column(Float, nullable=False)
    valor_atual = Column(Float, nullable=False, default=0)
    prazo = Column(Date, nullable=True)
    concluida = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Investimento(Base):
    __tablename__ = "investimentos"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    ticker = Column(String(20), nullable=False)
    tipo = Column(String(20), nullable=False, default="acao")  # acao, fii, bdr, etf
    quantidade = Column(Float, nullable=False)
    preco_medio = Column(Float, nullable=False)
    data_compra = Column(Date, nullable=False)
    observacoes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    titulo = Column(String(255), nullable=False)
    mensagem = Column(Text, nullable=False)
    tipo = Column(String(50), nullable=False)
    lida = Column(Boolean, default=False)
    referencia_id = Column(Integer, nullable=True)
    referencia_tipo = Column(String(50), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    user_email = Column(String(255), nullable=True)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=True)
    entity_id = Column(Integer, nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=True)
    content = Column(Text, nullable=True)
    color = Column(String(20), nullable=True, default="yellow") # yellow, blue, green, etc
    is_financial = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User")


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User")
    messages = relationship("ChatMessage", cascade="all, delete-orphan", back_populates="session")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), nullable=False) # "user", "assistant", "tool"
    content = Column(Text, nullable=False)
    tool_calls = Column(Text, nullable=True) # Opcional: JSON strings for function calling tracking
    created_at = Column(DateTime, server_default=func.now())

    session = relationship("ChatSession", back_populates="messages")
