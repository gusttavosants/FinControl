import sys
import os

# Adiciona o diretório atual ao path para importar os módulos locais
sys.path.append(os.getcwd())

from database import SessionLocal, engine
from models import User, Base
import bcrypt
from datetime import datetime, timedelta

def hash_senha(senha: str) -> str:
    """Hash de senha seguindo o padrão do sistema"""
    return bcrypt.hashpw(senha[:72].encode(), bcrypt.gensalt()).decode()

def create_admin():
    # Inicializa o banco de dados caso não exista
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Verifica se já existe um admin
        existing_admin = db.query(User).filter(User.email == "admin@zencash.com").first()
        if existing_admin:
            print("[WARN] Usuario Admin ja existe.")
            return

        # Cria o novo admin
        admin = User(
            nome="Administrador Zen",
            email="admin@zencash.com",
            senha_hash=hash_senha("admin123"),
            role="admin",
            plan="premium",
            is_active=True,
            has_seen_tour=True,
            trial_until=datetime.now() + timedelta(days=365)
        )
        
        db.add(admin)
        db.commit()
        print("[OK] Usuario Admin criado com sucesso!")
        print("Email: admin@zencash.com")
        print("Senha: admin123")
    except Exception as e:
        print(f"[ERROR] Erro ao criar admin: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()
