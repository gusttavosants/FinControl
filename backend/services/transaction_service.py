from typing import List
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import extract
from models import Receita, Despesa, User
from datetime import date
from core.cache import cache_result, invalidate_user_cache

class TransactionService:
    """Service for transaction operations"""
    
    @staticmethod
    def get_account_user_ids(user: User, db: Session) -> List[int]:
        """
        Return list of user IDs that share the same financial data.
        If user has an active shared account, returns both user IDs.
        Otherwise returns just the user's own ID.
        """
        from models import SharedAccount
        
        shared = db.query(SharedAccount).filter(
            SharedAccount.status == "active",
            (SharedAccount.owner_id == user.id) | (SharedAccount.partner_id == user.id)
        ).first()
        
        if shared:
            return [shared.owner_id, shared.partner_id]
        return [user.id]
    
    @staticmethod
    @cache_result(ttl=300, key_prefix="summary")
    def get_monthly_summary(db: Session, user: User, mes: int, ano: int) -> dict:
        """Get financial summary for a specific month (cached for 5 minutes)"""
        user_ids = TransactionService.get_account_user_ids(user, db)
        
        receitas = db.query(Receita).filter(
            (Receita.user_id.in_(user_ids)) | (Receita.user_id == None),
            extract("month", Receita.data) == mes,
            extract("year", Receita.data) == ano,
        ).all()
        
        despesas = db.query(Despesa).filter(
            (Despesa.user_id.in_(user_ids)) | (Despesa.user_id == None),
            extract("month", Despesa.data_vencimento) == mes,
            extract("year", Despesa.data_vencimento) == ano,
        ).all()
        
        total_receitas = sum(r.valor for r in receitas)
        total_despesas = sum(d.valor for d in despesas)
        despesas_pagas = sum(d.valor for d in despesas if d.pago)
        despesas_pendentes = total_despesas - despesas_pagas
        
        return {
            "total_receitas": total_receitas,
            "total_despesas": total_despesas,
            "saldo": total_receitas - total_despesas,
            "despesas_pagas": despesas_pagas,
            "despesas_pendentes": despesas_pendentes,
            "total_receitas_count": len(receitas),
            "total_despesas_count": len(despesas),
            "despesas_pagas_count": sum(1 for d in despesas if d.pago),
        }
    
    @staticmethod
    @cache_result(ttl=300, key_prefix="categories")
    def get_category_breakdown(db: Session, user: User, mes: int, ano: int) -> List[dict]:
        """Get spending breakdown by category (cached for 5 minutes)"""
        user_ids = TransactionService.get_account_user_ids(user, db)
        
        despesas = db.query(Despesa).filter(
            (Despesa.user_id.in_(user_ids)) | (Despesa.user_id == None),
            extract("month", Despesa.data_vencimento) == mes,
            extract("year", Despesa.data_vencimento) == ano,
        ).all()
        
        category_totals = {}
        for d in despesas:
            cat = d.categoria or "Outros"
            category_totals[cat] = category_totals.get(cat, 0) + d.valor
        
        total = sum(category_totals.values())
        
        result = []
        for cat, valor in sorted(category_totals.items(), key=lambda x: x[1], reverse=True):
            result.append({
                "categoria": cat,
                "total": valor,
                "percentual": (valor / total * 100) if total > 0 else 0
            })
        
        return result
