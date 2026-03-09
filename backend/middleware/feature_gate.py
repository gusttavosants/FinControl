from functools import wraps
from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session
from typing import Callable, List
from models import User
from services.plan_service import PlanService
from core.security import require_user
from database import get_db

def feature_gate(feature: str):
    """
    Decorator to restrict endpoint access based on user plan
    Usage: @feature_gate("export_enabled")
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, user: User = Depends(require_user), **kwargs):
            if not PlanService.check_feature_access(user, feature):
                plan = PlanService.get_user_plan(user)
                raise HTTPException(
                    status_code=403,
                    detail=f"Feature '{feature}' not available in {plan} plan. Upgrade to access."
                )
            return await func(*args, user=user, **kwargs)
        return wrapper
    return decorator

def require_plan(allowed_plans: List[str]):
    """
    Decorator to restrict endpoint to specific plans
    Usage: @require_plan(["pro", "premium"])
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, user: User = Depends(require_user), **kwargs):
            plan = PlanService.get_user_plan(user)
            if plan not in allowed_plans:
                raise HTTPException(
                    status_code=403,
                    detail=f"This feature requires {' or '.join(allowed_plans)} plan. Current plan: {plan}"
                )
            return await func(*args, user=user, **kwargs)
        return wrapper
    return decorator

def check_resource_limit(resource: str):
    """
    Decorator to check if user is within resource limits
    Usage: @check_resource_limit("transactions")
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, user: User = Depends(require_user), db: Session = Depends(get_db), **kwargs):
            within_limit, current = PlanService.check_limit(user, db, resource)
            if not within_limit:
                plan = PlanService.get_user_plan(user)
                limits = PlanService.get_plan_limits(plan)
                max_limit = limits.get(f"max_{resource}", 0)
                raise HTTPException(
                    status_code=403,
                    detail=f"Limit reached: {current}/{max_limit} {resource}. Upgrade your plan for more."
                )
            return await func(*args, user=user, db=db, **kwargs)
        return wrapper
    return decorator
