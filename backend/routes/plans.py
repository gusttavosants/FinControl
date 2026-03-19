from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User
from core.security import require_user
from services.plan_service import PlanService
from services.user_service import UserService
from pydantic import BaseModel

router = APIRouter()

class PlanUpgradeRequest(BaseModel):
    plan: str  # "free", "pro", "premium"

@router.get("/current")
def get_current_plan(user: User = Depends(require_user)):
    """Get user's current plan and limits"""
    plan = PlanService.get_user_plan(user)
    limits = PlanService.get_plan_limits(plan)
    
    return {
        "current_plan": plan,
        "limits": limits,
    }

@router.get("/available")
def get_available_plans():
    """Get all available plans and their features"""
    from core.config import settings
    
    return {
        "plans": [
            {
                "id": "free",
                "name": "Básico",
                "price": 9.99,
                "currency": "BRL",
                "features": {
                    "max_goals": settings.FREE_PLAN_LIMITS.get("max_goals"),
                    "max_investments": settings.FREE_PLAN_LIMITS.get("max_investments"),
                    "export_enabled": settings.FREE_PLAN_LIMITS.get("export_enabled"),
                    "ai_chat_enabled": settings.FREE_PLAN_LIMITS.get("ai_chat_enabled"),
                    "shared_account_enabled": settings.FREE_PLAN_LIMITS.get("shared_account_enabled"),
                },
            },
            {
                "id": "pro",
                "name": "Profissional",
                "price": 19.99,
                "currency": "BRL",
                "features": {
                    "max_goals": settings.PRO_PLAN_LIMITS.get("max_goals"),
                    "max_investments": settings.PRO_PLAN_LIMITS.get("max_investments"),
                    "export_enabled": settings.PRO_PLAN_LIMITS.get("export_enabled"),
                    "ai_chat_enabled": settings.PRO_PLAN_LIMITS.get("ai_chat_enabled"),
                    "shared_account_enabled": settings.PRO_PLAN_LIMITS.get("shared_account_enabled"),
                },
            },
            {
                "id": "premium",
                "name": "Premium",
                "price": 39.99,
                "currency": "BRL",
                "features": {
                    "max_goals": settings.PREMIUM_PLAN_LIMITS.get("max_goals"),
                    "max_investments": settings.PREMIUM_PLAN_LIMITS.get("max_investments"),
                    "export_enabled": settings.PREMIUM_PLAN_LIMITS.get("export_enabled"),
                    "ai_chat_enabled": settings.PREMIUM_PLAN_LIMITS.get("ai_chat_enabled"),
                    "shared_account_enabled": settings.PREMIUM_PLAN_LIMITS.get("shared_account_enabled"),
                },
            },
        ]
    }

@router.post("/upgrade")
def upgrade_plan(
    data: PlanUpgradeRequest,
    user: User = Depends(require_user),
    db: Session = Depends(get_db)
):
    """
    Upgrade user plan
    TODO: Integrate with payment gateway (Stripe/Mercado Pago)
    """
    if data.plan not in ["free", "pro", "premium"]:
        raise HTTPException(status_code=400, detail="Invalid plan")
    
    # TODO: Add payment verification here
    # For now, just update the plan directly (development only)
    
    updated_user = UserService.update_user_plan(db, user.id, data.plan)
    
    return {
        "success": True,
        "message": f"Plan upgraded to {data.plan}",
        "new_plan": updated_user.plan,
    }

@router.get("/usage")
def get_usage_stats(
    user: User = Depends(require_user),
    db: Session = Depends(get_db)
):
    """Get current usage statistics against plan limits"""
    plan = PlanService.get_user_plan(user)
    limits = PlanService.get_plan_limits(plan)
    
    # Get current usage
    _, transactions_count = PlanService.check_limit(user, db, "transactions")
    _, goals_count = PlanService.check_limit(user, db, "goals")
    _, investments_count = PlanService.check_limit(user, db, "investments")
    
    return {
        "plan": plan,
        "usage": {
            "transactions": {
                "current": transactions_count,
                "limit": limits.get("max_transactions", 0),
            },
            "goals": {
                "current": goals_count,
                "limit": limits.get("max_goals", 0),
            },
            "investments": {
                "current": investments_count,
                "limit": limits.get("max_investments", 0),
            },
        }
    }
