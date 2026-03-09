from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class Subscription(Base):
    """User subscription model"""
    __tablename__ = "subscriptions"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    plan = Column(String(20), nullable=False)  # free, pro, premium
    status = Column(String(20), nullable=False, default="active")  # active, canceled, past_due, trialing
    
    # Payment gateway info
    stripe_customer_id = Column(String(255), nullable=True)
    stripe_subscription_id = Column(String(255), nullable=True)
    mercadopago_customer_id = Column(String(255), nullable=True)
    mercadopago_subscription_id = Column(String(255), nullable=True)
    
    # Billing
    current_period_start = Column(DateTime, nullable=True)
    current_period_end = Column(DateTime, nullable=True)
    cancel_at_period_end = Column(Boolean, default=False)
    
    # Metadata
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    user = relationship("User", backref="subscription")


class Payment(Base):
    """Payment transaction history"""
    __tablename__ = "payments"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=True)
    
    # Payment details
    amount = Column(Float, nullable=False)
    currency = Column(String(3), nullable=False, default="BRL")
    status = Column(String(20), nullable=False)  # pending, succeeded, failed, refunded
    payment_method = Column(String(20), nullable=False)  # stripe, mercadopago
    
    # Gateway IDs
    stripe_payment_intent_id = Column(String(255), nullable=True)
    mercadopago_payment_id = Column(String(255), nullable=True)
    
    # Metadata
    description = Column(Text, nullable=True)
    metadata = Column(Text, nullable=True)  # JSON string
    error_message = Column(Text, nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    user = relationship("User", backref="payments")
    subscription = relationship("Subscription", backref="payments")
