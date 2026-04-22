import os
from typing import List
from dotenv import load_dotenv

load_dotenv(override=True)

class Settings:
    # App
    APP_NAME: str = "ZenCash"
    VERSION: str = "2.0.0"
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    
    # Security
    JWT_SECRET: str = os.getenv("JWT_SECRET", "zencash-serenity-key-2026")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_DAYS: int = 30
    
    # CORS
    ALLOWED_ORIGINS: List[str] = []
    origins_env = os.getenv("ALLOWED_ORIGINS")
    if origins_env:
        ALLOWED_ORIGINS = origins_env.split(",")
    ALLOWED_ORIGINS += [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://zencash-peach.vercel.app",
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
        "max_transactions": -1,  # unlimited (as requested)
        "max_goals": 3,
        "max_investments": 10,
        "export_enabled": False,
        "ai_chat_enabled": False,
        "shared_account_enabled": False,
    }
    
    PRO_PLAN_LIMITS = {
        "max_transactions": -1,  # unlimited
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

    # Gemini
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

    # OpenRouter
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    OPENROUTER_MODEL: str = os.getenv("OPENROUTER_MODEL", "nvidia/nemotron-3-nano-30b-a3b:free")

settings = Settings()
