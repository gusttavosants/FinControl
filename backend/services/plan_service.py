from typing import Dict, Any
from sqlalchemy.orm import Session
from models import User
from core.config import settings

class PlanService:
    """Service to manage user plans and feature access"""
    
    @staticmethod
    def get_user_plan(user: User) -> str:
        """Get user's current plan (free, pro, premium)"""
        return getattr(user, 'plan', 'free')
    
    @staticmethod
    def get_plan_limits(plan: str) -> Dict[str, Any]:
        """Get limits for a specific plan"""
        limits_map = {
            'free': settings.FREE_PLAN_LIMITS,
            'pro': settings.PRO_PLAN_LIMITS,
            'premium': settings.PREMIUM_PLAN_LIMITS,
        }
        return limits_map.get(plan, settings.FREE_PLAN_LIMITS)
    
    @staticmethod
    def check_feature_access(user: User, feature: str) -> bool:
        """Check if user has access to a feature"""
        plan = PlanService.get_user_plan(user)
        limits = PlanService.get_plan_limits(plan)
        return limits.get(f"{feature}_enabled", False)
    
    @staticmethod
    def check_limit(user: User, db: Session, resource: str) -> tuple[bool, int]:
        """
        Check if user is within limits for a resource
        Returns: (within_limit, current_count)
        """
        plan = PlanService.get_user_plan(user)
        limits = PlanService.get_plan_limits(plan)
        max_limit = limits.get(f"max_{resource}", 0)
        
        # If unlimited (-1), always allow
        if max_limit == -1:
            return True, 0
        
        # Count current usage
        from models import Receita, Despesa, Meta, Investimento
        
        count_map = {
            'transactions': lambda: (
                db.query(Receita).filter(Receita.user_id == user.id).count() +
                db.query(Despesa).filter(Despesa.user_id == user.id).count()
            ),
            'goals': lambda: db.query(Meta).filter(Meta.user_id == user.id).count(),
            'investments': lambda: db.query(Investimento).filter(Investimento.user_id == user.id).count(),
        }
        
        current_count = count_map.get(resource, lambda: 0)()
        return current_count < max_limit, current_count
