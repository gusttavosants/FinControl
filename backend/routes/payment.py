from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel

from database import get_db
from models import User
from models_payment import Subscription, Payment
from core.security import require_user
from services.payment_service import PaymentService
from core.logging import logger

router = APIRouter()

class CheckoutRequest(BaseModel):
    plan: str  # "pro" or "premium"
    payment_method: str  # "stripe" or "mercadopago"

class CancelSubscriptionRequest(BaseModel):
    reason: Optional[str] = None

@router.post("/checkout")
def create_checkout(
    data: CheckoutRequest,
    user: User = Depends(require_user),
    db: Session = Depends(get_db)
):
    """Create checkout session for subscription"""
    if data.plan not in ["pro", "premium"]:
        raise HTTPException(status_code=400, detail="Invalid plan")
    
    if data.payment_method == "stripe":
        result = PaymentService.create_stripe_checkout_session(user, data.plan, db)
        return {
            "success": True,
            "payment_method": "stripe",
            **result
        }
    
    elif data.payment_method == "mercadopago":
        result = PaymentService.create_mercadopago_preference(user, data.plan, db)
        return {
            "success": True,
            "payment_method": "mercadopago",
            **result
        }
    
    else:
        raise HTTPException(status_code=400, detail="Invalid payment method")

@router.get("/subscription")
def get_subscription(
    user: User = Depends(require_user),
    db: Session = Depends(get_db)
):
    """Get user's current subscription details"""
    subscription = db.query(Subscription).filter(
        Subscription.user_id == user.id
    ).first()
    
    if not subscription:
        return {
            "plan": "free",
            "status": "active",
            "has_subscription": False
        }
    
    return {
        "plan": subscription.plan,
        "status": subscription.status,
        "has_subscription": True,
        "current_period_start": subscription.current_period_start.isoformat() if subscription.current_period_start else None,
        "current_period_end": subscription.current_period_end.isoformat() if subscription.current_period_end else None,
        "cancel_at_period_end": subscription.cancel_at_period_end,
    }

@router.post("/subscription/cancel")
def cancel_subscription(
    data: CancelSubscriptionRequest,
    user: User = Depends(require_user),
    db: Session = Depends(get_db)
):
    """Cancel user subscription"""
    result = PaymentService.cancel_subscription(user, db)
    
    logger.info("Subscription canceled by user", 
               user_id=user.id, reason=data.reason)
    
    return result

@router.get("/payments/history")
def get_payment_history(
    user: User = Depends(require_user),
    db: Session = Depends(get_db)
):
    """Get user's payment history"""
    payments = db.query(Payment).filter(
        Payment.user_id == user.id
    ).order_by(Payment.created_at.desc()).limit(50).all()
    
    return [{
        "id": p.id,
        "amount": p.amount,
        "currency": p.currency,
        "status": p.status,
        "payment_method": p.payment_method,
        "description": p.description,
        "created_at": p.created_at.isoformat(),
    } for p in payments]

@router.post("/webhooks/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="stripe-signature"),
    db: Session = Depends(get_db)
):
    """Handle Stripe webhooks"""
    payload = await request.body()
    
    try:
        result = PaymentService.handle_stripe_webhook(payload, stripe_signature, db)
        return result
    except HTTPException as e:
        logger.error("Stripe webhook error", error=e.detail)
        raise
    except Exception as e:
        logger.error("Unexpected webhook error", error=str(e))
        raise HTTPException(status_code=500, detail="Webhook processing failed")

@router.post("/webhooks/mercadopago")
async def mercadopago_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """Handle MercadoPago webhooks"""
    data = await request.json()
    
    logger.info("MercadoPago webhook received", data=data)
    
    # TODO: Implement MercadoPago webhook handling
    # MercadoPago sends notifications for payment updates
    
    return {"status": "received"}
