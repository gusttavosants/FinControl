from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import get_db
from models import User
from core.security import require_user
from services.transaction_service import TransactionService
from datetime import date

router = APIRouter()

@router.get("/summary")
def get_dashboard_summary(
    mes: int = Query(default=None),
    ano: int = Query(default=None),
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Get financial summary for dashboard"""
    hoje = date.today()
    if not mes:
        mes = hoje.month
    if not ano:
        ano = hoje.year
    
    summary = TransactionService.get_monthly_summary(db, user, mes, ano)
    return summary

@router.get("/categories")
def get_category_breakdown(
    mes: int = Query(default=None),
    ano: int = Query(default=None),
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Get spending breakdown by category"""
    hoje = date.today()
    if not mes:
        mes = hoje.month
    if not ano:
        ano = hoje.year
    
    categories = TransactionService.get_category_breakdown(db, user, mes, ano)
    return categories
