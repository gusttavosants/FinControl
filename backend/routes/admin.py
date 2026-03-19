from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User
from core.security import require_user
from services.analytics_service import AnalyticsService

router = APIRouter()

def require_admin(user: User = Depends(require_user)) -> User:
    """Require user to be admin"""
    import os
    admin_emails = os.getenv("ADMIN_EMAILS", "").split(",")
    
    if user.role != "admin" and user.email not in admin_emails:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return user

@router.post("/users/{user_id}/upgrade")
def upgrade_user(
    user_id: int,
    role: str = "user",
    plan: str = "pro",
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Upgrade user access (admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    user.role = role
    user.plan = plan
    db.commit()
    db.refresh(user)
    return {
        "status": "success", 
        "user": {
            "id": user.id,
            "email": user.email, 
            "role": user.role, 
            "plan": user.plan
        }
    }

@router.get("/metrics")
def get_business_metrics(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get overall business metrics (admin only)"""
    return AnalyticsService.get_business_metrics(db)

@router.get("/engagement")
def get_engagement_metrics(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get user engagement metrics (admin only)"""
    return AnalyticsService.get_user_engagement_metrics(db)

@router.get("/revenue-chart")
def get_revenue_chart(
    months: int = 6,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get revenue chart data (admin only)"""
    return AnalyticsService.get_revenue_chart_data(db, months)
