from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv(override=True)

def get_database_url():
    """Dynamically loads DATABASE_URL from environment"""
    database_url = os.getenv("DATABASE_URL")
    
    if not database_url:
        DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "financial.db")
        database_url = f"sqlite:///{DB_PATH}"
    
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
    
    return database_url

DATABASE_URL = get_database_url()

if DATABASE_URL.startswith("postgresql"):
    # Para Supabase, adiciona SSL
    engine = create_engine(
        DATABASE_URL, 
        pool_pre_ping=True, 
        pool_size=10, 
        max_overflow=20,
        connect_args={"sslmode": "require"}
    )
else:
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
