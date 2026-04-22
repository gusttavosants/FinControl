from fastapi import APIRouter
from .auth import router as auth_router
from .dashboard import router as dashboard_router
from .transactions import router as transactions_router
from .plans import router as plans_router
from .health import router as health_router
from .payment import router as payment_router
from .admin import router as admin_router
from .chat import router as chat_router

api_router = APIRouter()

api_router.include_router(health_router, tags=["health"])
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(dashboard_router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(transactions_router, prefix="/transactions", tags=["transactions"])
api_router.include_router(plans_router, prefix="/plans", tags=["plans"])
api_router.include_router(payment_router, prefix="/payment", tags=["payment"])
api_router.include_router(admin_router, prefix="/admin", tags=["admin"])
api_router.include_router(chat_router, prefix="/chat", tags=["chat"])

__all__ = ["api_router"]
