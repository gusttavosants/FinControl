"""
Script para migrar dados de SQLite para PostgreSQL
Uso: python migrate_to_postgres.py
"""
import sqlite3
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from models import Base, User, Receita, Despesa, OrcamentoCategoria, Meta, Notification, SharedAccount
from database import SessionLocal
from dotenv import load_dotenv

load_dotenv()

SQLITE_DB = os.path.join(os.path.dirname(__file__), "financial.db")
POSTGRES_URL = os.getenv("DATABASE_URL")

if not POSTGRES_URL or not POSTGRES_URL.startswith("postgresql"):
    print("Erro: DATABASE_URL nao esta configurada ou nao e PostgreSQL")
    print("Configure a variavel DATABASE_URL no arquivo .env")
    exit(1)

print(f"Migrando de SQLite ({SQLITE_DB}) para PostgreSQL...")

sqlite_conn = sqlite3.connect(SQLITE_DB)
sqlite_conn.row_factory = sqlite3.Row
sqlite_cursor = sqlite_conn.cursor()

postgres_engine = create_engine(POSTGRES_URL)
Base.metadata.create_all(bind=postgres_engine)
PostgresSession = sessionmaker(bind=postgres_engine)
postgres_session = PostgresSession()

try:
    print("\n1. Migrando usuarios...")
    sqlite_cursor.execute("SELECT * FROM users")
    users = sqlite_cursor.fetchall()
    for row in users:
        user = User(
            id=row["id"],
            nome=row["nome"],
            email=row["email"],
            senha_hash=row["senha_hash"]
        )
        postgres_session.merge(user)
    postgres_session.commit()
    print(f"   {len(users)} usuarios migrados")

    print("\n2. Migrando receitas...")
    sqlite_cursor.execute("SELECT * FROM receitas")
    receitas = sqlite_cursor.fetchall()
    for row in receitas:
        receita = Receita(
            id=row["id"],
            user_id=row["user_id"],
            descricao=row["descricao"],
            categoria=row["categoria"],
            valor=row["valor"],
            data=row["data"],
            observacoes=row["observacoes"],
            created_at=row["created_at"],
            updated_at=row["updated_at"]
        )
        postgres_session.merge(receita)
    postgres_session.commit()
    print(f"   {len(receitas)} receitas migradas")

    print("\n3. Migrando despesas...")
    sqlite_cursor.execute("SELECT * FROM despesas")
    despesas = sqlite_cursor.fetchall()
    for row in despesas:
        despesa = Despesa(
            id=row["id"],
            user_id=row["user_id"],
            descricao=row["descricao"],
            categoria=row["categoria"],
            valor=row["valor"],
            data_vencimento=row["data_vencimento"],
            data_pagamento=row["data_pagamento"],
            pago=row["pago"],
            observacoes=row["observacoes"],
            parcela_atual=row["parcela_atual"],
            parcela_total=row["parcela_total"],
            recorrente=row["recorrente"],
            frequencia_recorrencia=row["frequencia_recorrencia"],
            parcelas_restantes=row["parcelas_restantes"],
            created_at=row["created_at"],
            updated_at=row["updated_at"]
        )
        postgres_session.merge(despesa)
    postgres_session.commit()
    print(f"   {len(despesas)} despesas migradas")

    print("\n4. Migrando orcamentos...")
    sqlite_cursor.execute("SELECT * FROM orcamento_categorias")
    orcamentos = sqlite_cursor.fetchall()
    for row in orcamentos:
        orcamento = OrcamentoCategoria(
            id=row["id"],
            user_id=row["user_id"],
            categoria=row["categoria"],
            limite=row["limite"],
            mes=row["mes"],
            ano=row["ano"],
            created_at=row["created_at"],
            updated_at=row["updated_at"]
        )
        postgres_session.merge(orcamento)
    postgres_session.commit()
    print(f"   {len(orcamentos)} orcamentos migrados")

    print("\n5. Migrando metas...")
    sqlite_cursor.execute("SELECT * FROM metas")
    metas = sqlite_cursor.fetchall()
    for row in metas:
        meta = Meta(
            id=row["id"],
            user_id=row["user_id"],
            descricao=row["descricao"],
            valor_alvo=row["valor_alvo"],
            valor_atual=row["valor_atual"],
            prazo=row["prazo"],
            concluida=row["concluida"],
            created_at=row["created_at"],
            updated_at=row["updated_at"]
        )
        postgres_session.merge(meta)
    postgres_session.commit()
    print(f"   {len(metas)} metas migradas")

    print("\n6. Migrando notificacoes...")
    sqlite_cursor.execute("SELECT * FROM notifications")
    notifications = sqlite_cursor.fetchall()
    for row in notifications:
        notification = Notification(
            id=row["id"],
            user_id=row["user_id"],
            titulo=row["titulo"],
            mensagem=row["mensagem"],
            tipo=row["tipo"],
            lida=row["lida"],
            referencia_id=row["referencia_id"],
            referencia_tipo=row["referencia_tipo"],
            created_at=row["created_at"]
        )
        postgres_session.merge(notification)
    postgres_session.commit()
    print(f"   {len(notifications)} notificacoes migradas")

    print("\n7. Migrando contas compartilhadas...")
    sqlite_cursor.execute("SELECT * FROM shared_accounts")
    shared_accounts = sqlite_cursor.fetchall()
    for row in shared_accounts:
        sa = SharedAccount(
            id=row["id"],
            owner_id=row["owner_id"],
            partner_id=row["partner_id"],
            partner_email=row["partner_email"],
            status=row["status"],
            created_at=row["created_at"],
            updated_at=row["updated_at"]
        )
        postgres_session.merge(sa)
    postgres_session.commit()
    print(f"   {len(shared_accounts)} contas compartilhadas migradas")

    print("\n" + "="*50)
    print("MIGRACAO CONCLUIDA COM SUCESSO!")
    print("="*50)
    print("\nProximos passos:")
    print("1. Teste a conexao com PostgreSQL localmente")
    print("2. Verifique se todos os dados foram migrados corretamente")
    print("3. Faca backup do arquivo SQLite como seguranca")
    print("4. Quando estiver pronto para producao, hospede o backend")

except Exception as e:
    postgres_session.rollback()
    print(f"\nErro durante migracao: {e}")
    import traceback
    traceback.print_exc()
finally:
    postgres_session.close()
    sqlite_conn.close()
