import pytest
from unittest.mock import patch, MagicMock

def test_get_subscription_no_subscription(client, test_user):
    """Test getting subscription when user has none"""
    token = test_user["access_token"]
    response = client.get("/api/payment/subscription", headers={
        "Authorization": f"Bearer {token}"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["plan"] == "free"
    assert data["has_subscription"] == False

@patch('services.payment_service.stripe.checkout.Session.create')
@patch('services.payment_service.stripe.Customer.create')
def test_create_stripe_checkout(mock_customer, mock_session, client, test_user):
    """Test creating Stripe checkout session"""
    mock_customer.return_value = MagicMock(id="cus_test123")
    mock_session.return_value = MagicMock(
        id="cs_test123",
        url="https://checkout.stripe.com/test"
    )
    
    token = test_user["access_token"]
    response = client.post("/api/payment/checkout", 
        headers={"Authorization": f"Bearer {token}"},
        json={
            "plan": "pro",
            "payment_method": "stripe"
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] == True
    assert data["payment_method"] == "stripe"
    assert "checkout_url" in data

def test_checkout_invalid_plan(client, test_user):
    """Test checkout with invalid plan"""
    token = test_user["access_token"]
    response = client.post("/api/payment/checkout",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "plan": "invalid",
            "payment_method": "stripe"
        }
    )
    assert response.status_code == 400

def test_checkout_unauthorized(client):
    """Test checkout without authentication"""
    response = client.post("/api/payment/checkout", json={
        "plan": "pro",
        "payment_method": "stripe"
    })
    assert response.status_code == 401

def test_get_payment_history_empty(client, test_user):
    """Test getting payment history when empty"""
    token = test_user["access_token"]
    response = client.get("/api/payment/payments/history", headers={
        "Authorization": f"Bearer {token}"
    })
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 0
