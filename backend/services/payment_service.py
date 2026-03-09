import os
import stripe
import mercadopago
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
MERCADOPAGO_ACCESS_TOKEN = os.getenv("MERCADOPAGO_ACCESS_TOKEN")

class PaymentService:
    """Service for handling payments and subscriptions"""
    
    # Plan pricing (in cents for Stripe, in BRL for MercadoPago)
    PLAN_PRICES = {
        "pro": {
            "amount": 1990,  # R$ 19.90
            "stripe_price_id": os.getenv("STRIPE_PRO_PRICE_ID"),
            "mercadopago_plan_id": os.getenv("MERCADOPAGO_PRO_PLAN_ID"),
        },
        "premium": {
            "amount": 3990,  # R$ 39.90
            "stripe_price_id": os.getenv("STRIPE_PREMIUM_PRICE_ID"),
            "mercadopago_plan_id": os.getenv("MERCADOPAGO_PREMIUM_PLAN_ID"),
        }
    }
    
    @staticmethod
    def create_stripe_checkout_session(
        user: User,
        plan: str,
        db: Session
    ) -> Dict[str, Any]:
        """Create Stripe checkout session for subscription"""
        if plan not in ["pro", "premium"]:
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
    def create_mercadopago_preference(
        user: User,
        plan: str,
        db: Session
    ) -> Dict[str, Any]:
        """Create MercadoPago payment preference"""
        if plan not in ["pro", "premium"]:
            raise HTTPException(status_code=400, detail="Invalid plan")
        
        try:
            sdk = mercadopago.SDK(MERCADOPAGO_ACCESS_TOKEN)
            
            plan_data = PaymentService.PLAN_PRICES[plan]
            
            preference_data = {
                "items": [{
                    "title": f"FinControl - Plano {plan.capitalize()}",
                    "quantity": 1,
                    "unit_price": plan_data["amount"] / 100,  # Convert cents to BRL
                    "currency_id": "BRL",
                }],
                "payer": {
                    "name": user.nome,
                    "email": user.email,
                },
                "back_urls": {
                    "success": f"{os.getenv('FRONTEND_URL')}/checkout/success",
                    "failure": f"{os.getenv('FRONTEND_URL')}/checkout/failure",
                    "pending": f"{os.getenv('FRONTEND_URL')}/checkout/pending",
                },
                "auto_return": "approved",
                "metadata": {
                    "user_id": user.id,
                    "plan": plan,
                },
                "notification_url": f"{os.getenv('BACKEND_URL')}/api/webhooks/mercadopago",
            }
            
            preference_response = sdk.preference().create(preference_data)
            preference = preference_response["response"]
            
            logger.info("MercadoPago preference created",
                       user_id=user.id, plan=plan, preference_id=preference["id"])
            
            return {
                "init_point": preference["init_point"],
                "preference_id": preference["id"],
            }
            
        except Exception as e:
            logger.error("MercadoPago error", error=str(e), user_id=user.id)
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
            
            # Cancel on MercadoPago
            if subscription.mercadopago_subscription_id:
                sdk = mercadopago.SDK(MERCADOPAGO_ACCESS_TOKEN)
                sdk.subscription().update(subscription.mercadopago_subscription_id, {
                    "status": "cancelled"
                })
            
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
