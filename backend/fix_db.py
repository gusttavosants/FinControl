from sqlalchemy import text
from database import engine

def migrate():
    print("Iniciando migração manual...")
    with engine.connect() as conn:
        # Check if last_login exists
        result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='last_login'"))
        if not result.fetchone():
            print("Adicionando coluna 'last_login'...")
            conn.execute(text("ALTER TABLE users ADD COLUMN last_login TIMESTAMP WITHOUT TIME ZONE"))
            conn.commit()
        
        # Check if has_seen_tour exists
        result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='has_seen_tour'"))
        if not result.fetchone():
            print("Adicionando coluna 'has_seen_tour'...")
            conn.execute(text("ALTER TABLE users ADD COLUMN has_seen_tour BOOLEAN DEFAULT FALSE"))
            conn.commit()
            
    print("Migração concluída com sucesso!")

if __name__ == "__main__":
    migrate()
