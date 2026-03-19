from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio

from core.config import settings
from core.logging import logger
from database import engine, Base
from routes import api_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle events for the application"""
    logger.info("Starting FinControl API", version=settings.VERSION)
    
    # Create database tables
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created")
    
    # Start background tasks
    asyncio.create_task(background_tasks())
    
    yield
    
    logger.info("Shutting down FinControl API")

async def background_tasks():
    """Background tasks that run periodically"""
    from database import SessionLocal
    
    while True:
        try:
            db = SessionLocal()
            try:
                # Generate notifications
                from main import generate_notifications, process_recurring_expenses
                result = generate_notifications(db)
                logger.info("Background task completed", task="notifications", result=result)
                
                # Process recurring expenses
                recurring_result = process_recurring_expenses(db)
                logger.info("Background task completed", task="recurring", result=recurring_result)
            finally:
                db.close()
            
            await asyncio.sleep(3600)  # Next run in one hour
        except Exception as e:
            logger.error("Background task failed", error=str(e))

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="API de Controle Financeiro Pessoal com sistema de planos",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routes
app.include_router(api_router, prefix="/api")

# Root endpoint
@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "status": "running",
        "docs": "/docs",
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main_v2:app", host="0.0.0.0", port=8000, reload=True)
