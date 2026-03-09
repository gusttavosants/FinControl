from typing import Dict, Any, List
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from models import User, Receita, Despesa, Meta, Investimento
from models_payment import Subscription, Payment

class AnalyticsService:
    """Service for business analytics and metrics"""
    
    @staticmethod
    def get_business_metrics(db: Session) -> Dict[str, Any]:
        """Get overall business metrics for admin dashboard"""
        
        # User metrics
        total_users = db.query(User).count()
        new_users_this_month = db.query(User).filter(
            extract('month', User.created_at) == datetime.utcnow().month,
            extract('year', User.created_at) == datetime.utcnow().year
        ).count()
        
        # Subscription metrics
        active_subscriptions = db.query(Subscription).filter(
            Subscription.status == 'active',
            Subscription.plan != 'free'
        ).count()
        
        pro_count = db.query(Subscription).filter(
            Subscription.plan == 'pro',
            Subscription.status == 'active'
        ).count()
        
        premium_count = db.query(Subscription).filter(
            Subscription.plan == 'premium',
            Subscription.status == 'active'
        ).count()
        
        # Revenue metrics
        mrr = AnalyticsService._calculate_mrr(db)
        total_revenue = db.query(func.sum(Payment.amount)).filter(
            Payment.status == 'succeeded'
        ).scalar() or 0
        
        revenue_this_month = db.query(func.sum(Payment.amount)).filter(
            Payment.status == 'succeeded',
            extract('month', Payment.created_at) == datetime.utcnow().month,
            extract('year', Payment.created_at) == datetime.utcnow().year
        ).scalar() or 0
        
        # Churn rate
        churn_rate = AnalyticsService._calculate_churn_rate(db)
        
        # Conversion rate
        conversion_rate = (active_subscriptions / total_users * 100) if total_users > 0 else 0
        
        return {
            "users": {
                "total": total_users,
                "new_this_month": new_users_this_month,
                "active_paid": active_subscriptions,
                "free_users": total_users - active_subscriptions,
            },
            "subscriptions": {
                "total_paid": active_subscriptions,
                "pro": pro_count,
                "premium": premium_count,
                "conversion_rate": round(conversion_rate, 2),
            },
            "revenue": {
                "mrr": round(mrr, 2),
                "total_lifetime": round(total_revenue, 2),
                "this_month": round(revenue_this_month, 2),
            },
            "metrics": {
                "churn_rate": round(churn_rate, 2),
                "arpu": round(mrr / active_subscriptions, 2) if active_subscriptions > 0 else 0,
            }
        }
    
    @staticmethod
    def _calculate_mrr(db: Session) -> float:
        """Calculate Monthly Recurring Revenue"""
        pro_count = db.query(Subscription).filter(
            Subscription.plan == 'pro',
            Subscription.status == 'active'
        ).count()
        
        premium_count = db.query(Subscription).filter(
            Subscription.plan == 'premium',
            Subscription.status == 'active'
        ).count()
        
        return (pro_count * 19.90) + (premium_count * 39.90)
    
    @staticmethod
    def _calculate_churn_rate(db: Session) -> float:
        """Calculate monthly churn rate"""
        start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0)
        
        canceled_this_month = db.query(Subscription).filter(
            Subscription.status == 'canceled',
            Subscription.updated_at >= start_of_month
        ).count()
        
        active_start_month = db.query(Subscription).filter(
            Subscription.status == 'active',
            Subscription.created_at < start_of_month
        ).count()
        
        return (canceled_this_month / active_start_month * 100) if active_start_month > 0 else 0
    
    @staticmethod
    def get_user_engagement_metrics(db: Session) -> Dict[str, Any]:
        """Get user engagement metrics"""
        
        # Active users (created transaction in last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        
        active_users = db.query(User.id).join(Receita).filter(
            Receita.created_at >= thirty_days_ago
        ).union(
            db.query(User.id).join(Despesa).filter(
                Despesa.created_at >= thirty_days_ago
            )
        ).distinct().count()
        
        total_users = db.query(User).count()
        
        # Average transactions per user
        total_transactions = (
            db.query(Receita).count() + 
            db.query(Despesa).count()
        )
        avg_transactions = total_transactions / total_users if total_users > 0 else 0
        
        # Users with goals
        users_with_goals = db.query(User.id).join(Meta).distinct().count()
        
        # Users with investments
        users_with_investments = db.query(User.id).join(Investimento).distinct().count()
        
        return {
            "active_users_30d": active_users,
            "engagement_rate": round(active_users / total_users * 100, 2) if total_users > 0 else 0,
            "avg_transactions_per_user": round(avg_transactions, 2),
            "users_with_goals": users_with_goals,
            "users_with_investments": users_with_investments,
        }
    
    @staticmethod
    def get_revenue_chart_data(db: Session, months: int = 6) -> List[Dict[str, Any]]:
        """Get revenue data for chart (last N months)"""
        data = []
        
        for i in range(months):
            date = datetime.utcnow() - timedelta(days=30 * i)
            month = date.month
            year = date.year
            
            revenue = db.query(func.sum(Payment.amount)).filter(
                Payment.status == 'succeeded',
                extract('month', Payment.created_at) == month,
                extract('year', Payment.created_at) == year
            ).scalar() or 0
            
            new_subs = db.query(Subscription).filter(
                Subscription.status == 'active',
                extract('month', Subscription.created_at) == month,
                extract('year', Subscription.created_at) == year
            ).count()
            
            data.append({
                "month": date.strftime("%b %Y"),
                "revenue": round(revenue, 2),
                "new_subscriptions": new_subs,
            })
        
        return list(reversed(data))
    
    @staticmethod
    def track_event(db: Session, user_id: int, event_name: str, properties: Dict[str, Any] = None):
        """Track user event for analytics"""
        # This is a simple implementation
        # In production, integrate with Mixpanel, Amplitude, or PostHog
        from core.logging import logger
        
        logger.info("Event tracked", 
                   user_id=user_id, 
                   event=event_name, 
                   properties=properties or {})
        
        # TODO: Send to analytics platform
        # mixpanel.track(user_id, event_name, properties)
