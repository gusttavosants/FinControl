import pytest

def test_register_user(client):
    """Test user registration"""
    response = client.post("/api/auth/register", json={
        "nome": "John Doe",
        "email": "john@example.com",
        "senha": "password123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "john@example.com"
    assert data["user"]["plan"] == "free"

def test_register_duplicate_email(client, test_user):
    """Test registration with duplicate email"""
    response = client.post("/api/auth/register", json={
        "nome": "Another User",
        "email": "test@example.com",
        "senha": "password123"
    })
    assert response.status_code == 400
    assert "já cadastrado" in response.json()["detail"]

def test_login_success(client, test_user):
    """Test successful login"""
    response = client.post("/api/auth/login", json={
        "email": "test@example.com",
        "senha": "password123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "test@example.com"

def test_login_wrong_password(client, test_user):
    """Test login with wrong password"""
    response = client.post("/api/auth/login", json={
        "email": "test@example.com",
        "senha": "wrongpassword"
    })
    assert response.status_code == 401

def test_get_current_user(client, test_user):
    """Test getting current user info"""
    token = test_user["access_token"]
    response = client.get("/api/auth/me", headers={
        "Authorization": f"Bearer {token}"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["plan"] == "free"

def test_unauthorized_access(client):
    """Test accessing protected endpoint without token"""
    response = client.get("/api/auth/me")
    assert response.status_code == 401
