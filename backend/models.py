from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Boolean, Text, ForeignKey, UniqueConstraint
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
    created_at = Column(DateTime, server_default=func.now())


class SharedAccount(Base):
    __tablename__ = "shared_accounts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    partner_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # null = pending invite
    partner_email = Column(String(255), nullable=False)  # email do convidado
    status = Column(String(20), nullable=False, default="pending")  # pending, active, rejected
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
    frequencia_recorrencia = Column(String(20), nullable=True)  # "mensal", "semanal", "anual"
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


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    titulo = Column(String(255), nullable=False)
    mensagem = Column(Text, nullable=False)
    tipo = Column(String(50), nullable=False)  # 'vencimento', 'orcamento', 'meta', 'sistema'
    lida = Column(Boolean, default=False)
    referencia_id = Column(Integer, nullable=True)  # ID da despesa/meta/orçamento relacionado
    referencia_tipo = Column(String(50), nullable=True)  # 'despesa', 'meta', 'orcamento'
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
