from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import User
from core.security import require_user
from middleware.feature_gate import check_resource_limit

router = APIRouter()

@router.post("/receitas")
@check_resource_limit("transactions")
def create_receita(user: User = Depends(require_user), db: Session = Depends(get_db)):
    """Create new receita - with transaction limit check"""
    # Implementation will use existing logic from main.py
    pass

@router.post("/despesas")
@check_resource_limit("transactions")
def create_despesa(user: User = Depends(require_user), db: Session = Depends(get_db)):
    """Create new despesa - with transaction limit check"""
    # Implementation will use existing logic from main.py
    pass
