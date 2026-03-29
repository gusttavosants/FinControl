import os
import stripe
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from fastapi import HTTPException

from models import User
from models_payment import Subscription, Payment
from core.logging import logger
from core.config import settings

# Initialize payment gateways
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

class PaymentService:
    """Service for handling payments and subscriptions"""
    
    # Plan pricing (in cents for Stripe)
    PLAN_PRICES = {
        "trial": {
            "amount": 0,
            "stripe_price_id": None,
        },
        "basico": {
            "amount": 990,  # R$ 9.90
            "stripe_price_id": os.getenv("STRIPE_BASICO_PRICE_ID"),
        },
        "pro": {
            "amount": 1990,  # R$ 19.90
            "stripe_price_id": os.getenv("STRIPE_PRO_PRICE_ID"),
        },
        "premium": {
            "amount": 3999,  # R$ 39.99
            "stripe_price_id": os.getenv("STRIPE_PREMIUM_PRICE_ID"),
        }
    }
    
    @staticmethod
    def create_stripe_checkout_session(
        user: User,
        plan: str,
        db: Session
    ) -> Dict[str, Any]:
        """Create Stripe checkout session for subscription"""
        if plan not in ["basico", "pro", "premium"]:
            raise HTTPException(status_code=400, detail="Invalid plan")
        
        try:
            # Get or create Stripe customer
            subscription = db.query(Subscription).filter(
                Subscription.user_id == user.id
            ).first()
            
            if subscription and subscription.stripe_customer_id:
                customer_id = subscription.stripe_customer_id
            else:
                customer = stripe.Customer.create(
                    email=user.email,
                    name=user.nome,
                    metadata={"user_id": user.id}
                )
                customer_id = customer.id
                
                # Create or update subscription record
                if not subscription:
                    subscription = Subscription(
                        user_id=user.id,
                        plan="free",
                        stripe_customer_id=customer_id
                    )
                    db.add(subscription)
                else:
                    subscription.stripe_customer_id = customer_id
                db.commit()
            
            # Create checkout session
            price_id = PaymentService.PLAN_PRICES[plan]["stripe_price_id"]
            
            session = stripe.checkout.Session.create(
                customer=customer_id,
                payment_method_types=["card"],
                line_items=[{
                    "price": price_id,
                    "quantity": 1,
                }],
                mode="subscription",
                success_url=f"{os.getenv('FRONTEND_URL')}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url=f"{os.getenv('FRONTEND_URL')}/checkout/cancel",
                metadata={
                    "user_id": user.id,
                    "plan": plan,
                }
            )
            
            logger.info("Stripe checkout session created", 
                       user_id=user.id, plan=plan, session_id=session.id)
            
            return {
                "checkout_url": session.url,
                "session_id": session.id,
            }
            
        except stripe.error.StripeError as e:
            logger.error("Stripe error", error=str(e), user_id=user.id)
            raise HTTPException(status_code=500, detail=f"Payment error: {str(e)}")
    
    
    @staticmethod
    def handle_stripe_webhook(payload: bytes, sig_header: str, db: Session) -> Dict[str, Any]:
        """Handle Stripe webhook events"""
        webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
        
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, webhook_secret
            )
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid payload")
        except stripe.error.SignatureVerificationError:
            raise HTTPException(status_code=400, detail="Invalid signature")
        
        event_type = event["type"]
        data = event["data"]["object"]
        
        logger.info("Stripe webhook received", event_type=event_type)
        
        # Handle different event types
        if event_type == "checkout.session.completed":
            return PaymentService._handle_checkout_completed(data, db)
        
        elif event_type == "customer.subscription.updated":
            return PaymentService._handle_subscription_updated(data, db)
        
        elif event_type == "customer.subscription.deleted":
            return PaymentService._handle_subscription_deleted(data, db)
        
        elif event_type == "invoice.payment_succeeded":
            return PaymentService._handle_payment_succeeded(data, db)
        
        elif event_type == "invoice.payment_failed":
            return PaymentService._handle_payment_failed(data, db)
        
        return {"status": "ignored"}
    
    @staticmethod
    def _handle_checkout_completed(session: Dict, db: Session) -> Dict[str, Any]:
        """Handle successful checkout"""
        user_id = int(session["metadata"]["user_id"])
        plan = session["metadata"]["plan"]
        
        subscription = db.query(Subscription).filter(
            Subscription.user_id == user_id
        ).first()
        
        if subscription:
            subscription.plan = plan
            subscription.status = "active"
            subscription.stripe_subscription_id = session.get("subscription")
            subscription.current_period_start = datetime.utcnow()
            subscription.current_period_end = datetime.utcnow() + timedelta(days=30)
        else:
            subscription = Subscription(
                user_id=user_id,
                plan=plan,
                status="active",
                stripe_customer_id=session["customer"],
                stripe_subscription_id=session.get("subscription"),
                current_period_start=datetime.utcnow(),
                current_period_end=datetime.utcnow() + timedelta(days=30)
            )
            db.add(subscription)
        
        # Update user plan
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.plan = plan
        
        db.commit()
        
        logger.info("Subscription activated", user_id=user_id, plan=plan)
        return {"status": "success"}
    
    @staticmethod
    def _handle_subscription_updated(subscription_data: Dict, db: Session) -> Dict[str, Any]:
        """Handle subscription update"""
        stripe_sub_id = subscription_data["id"]
        
        subscription = db.query(Subscription).filter(
            Subscription.stripe_subscription_id == stripe_sub_id
        ).first()
        
        if subscription:
            subscription.status = subscription_data["status"]
            subscription.current_period_start = datetime.fromtimestamp(
                subscription_data["current_period_start"]
            )
            subscription.current_period_end = datetime.fromtimestamp(
                subscription_data["current_period_end"]
            )
            subscription.cancel_at_period_end = subscription_data.get("cancel_at_period_end", False)
            db.commit()
        
        return {"status": "success"}
    
    @staticmethod
    def _handle_subscription_deleted(subscription_data: Dict, db: Session) -> Dict[str, Any]:
        """Handle subscription cancellation"""
        stripe_sub_id = subscription_data["id"]
        
        subscription = db.query(Subscription).filter(
            Subscription.stripe_subscription_id == stripe_sub_id
        ).first()
        
        if subscription:
            subscription.status = "canceled"
            subscription.plan = "free"
            
            # Update user plan
            user = db.query(User).filter(User.id == subscription.user_id).first()
            if user:
                user.plan = "free"
            
            db.commit()
            
            logger.info("Subscription canceled", user_id=subscription.user_id)
        
        return {"status": "success"}
    
    @staticmethod
    def _handle_payment_succeeded(invoice: Dict, db: Session) -> Dict[str, Any]:
        """Handle successful payment"""
        customer_id = invoice["customer"]
        
        subscription = db.query(Subscription).filter(
            Subscription.stripe_customer_id == customer_id
        ).first()
        
        if subscription:
            payment = Payment(
                user_id=subscription.user_id,
                subscription_id=subscription.id,
                amount=invoice["amount_paid"] / 100,
                currency=invoice["currency"].upper(),
                status="succeeded",
                payment_method="stripe",
                stripe_payment_intent_id=invoice.get("payment_intent"),
                description=f"Subscription payment - {subscription.plan}"
            )
            db.add(payment)
            db.commit()
            
            logger.info("Payment succeeded", user_id=subscription.user_id, amount=payment.amount)
        
        return {"status": "success"}
    
    @staticmethod
    def _handle_payment_failed(invoice: Dict, db: Session) -> Dict[str, Any]:
        """Handle failed payment"""
        customer_id = invoice["customer"]
        
        subscription = db.query(Subscription).filter(
            Subscription.stripe_customer_id == customer_id
        ).first()
        
        if subscription:
            subscription.status = "past_due"
            
            payment = Payment(
                user_id=subscription.user_id,
                subscription_id=subscription.id,
                amount=invoice["amount_due"] / 100,
                currency=invoice["currency"].upper(),
                status="failed",
                payment_method="stripe",
                error_message="Payment failed"
            )
            db.add(payment)
            db.commit()
            
            logger.warning("Payment failed", user_id=subscription.user_id)
        
        return {"status": "success"}
    

    @staticmethod
    def create_stripe_portal_session(user: User, db: Session) -> Dict[str, Any]:
        """Create Stripe customer portal session for subscription management"""
        subscription = db.query(Subscription).filter(
            Subscription.user_id == user.id
        ).first()
        
        if not subscription or not subscription.stripe_customer_id:
            # If no customer ID, we can't open the portal
            # But maybe they are a legacy user, try to find by email
            try:
                customers = stripe.Customer.list(email=user.email, limit=1)
                if customers.data:
                    customer_id = customers.data[0].id
                    if not subscription:
                        subscription = Subscription(user_id=user.id, plan="trial", stripe_customer_id=customer_id)
                        db.add(subscription)
                    else:
                        subscription.stripe_customer_id = customer_id
                    db.commit()
                else:
                    raise HTTPException(status_code=400, detail="Você está em modo Trial (7 dias). O Portal de Assinaturas ficará disponível assim que você migrar para um plano pago.")
            except Exception:
                raise HTTPException(status_code=400, detail="Erro ao localizar sua conta no Stripe.")
        else:
            customer_id = subscription.stripe_customer_id

        try:
            session = stripe.billing_portal.Session.create(
                customer=customer_id,
                return_url=f"{os.getenv('FRONTEND_URL')}/configuracoes",
            )
            return {"url": session.url}
        except Exception as e:
            logger.error("Portal session error", error=str(e), user_id=user.id)
            raise HTTPException(status_code=500, detail=f"Erro ao abrir portal: {str(e)}")

    @staticmethod
    def cancel_subscription(user: User, db: Session) -> Dict[str, Any]:
        """Cancel user subscription"""
        subscription = db.query(Subscription).filter(
            Subscription.user_id == user.id
        ).first()
        
        if not subscription:
            raise HTTPException(status_code=404, detail="No active subscription")
        
        try:
            # Cancel on Stripe
            if subscription.stripe_subscription_id:
                stripe.Subscription.modify(
                    subscription.stripe_subscription_id,
                    cancel_at_period_end=True
                )
                subscription.cancel_at_period_end = True
            
            db.commit()
            
            logger.info("Subscription cancellation scheduled", user_id=user.id)
            
            return {
                "success": True,
                "message": "Subscription will be canceled at the end of billing period",
                "cancel_at": subscription.current_period_end.isoformat() if subscription.current_period_end else None
            }
            
        except Exception as e:
            logger.error("Cancellation failed", error=str(e), user_id=user.id)
            raise HTTPException(status_code=500, detail=f"Cancellation error: {str(e)}")
