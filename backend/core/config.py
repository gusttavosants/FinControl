import os
from typing import List
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # App
    APP_NAME: str = "FinControl"
    VERSION: str = "2.0.0"
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    
    # Security
    JWT_SECRET: str = os.getenv("JWT_SECRET", "fincontrol-secret-key-change-in-production")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_DAYS: int = 30
    
    # CORS
    ALLOWED_ORIGINS: List[str] = []
    if os.getenv("ALLOWED_ORIGINS"):
        ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS").split(",")
    ALLOWED_ORIGINS += [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://fin-control-peach.vercel.app",
    ]
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./financial.db")
    
    # External APIs
    BRAPI_BASE_URL: str = "https://brapi.dev/api"
    BRAPI_TIMEOUT: int = 10
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    
    # Plans & Features
    FREE_PLAN_LIMITS = {
        "max_transactions": 100,
        "max_goals": 3,
        "max_investments": 10,
        "export_enabled": False,
        "ai_chat_enabled": False,
        "shared_account_enabled": False,
    }
    
    PRO_PLAN_LIMITS = {
        "max_transactions": 1000,
        "max_goals": 20,
        "max_investments": 100,
        "export_enabled": True,
        "ai_chat_enabled": True,
        "shared_account_enabled": True,
    }
    
    PREMIUM_PLAN_LIMITS = {
        "max_transactions": -1,  # unlimited
        "max_goals": -1,
        "max_investments": -1,
        "export_enabled": True,
        "ai_chat_enabled": True,
        "shared_account_enabled": True,
    }

settings = Settings()
