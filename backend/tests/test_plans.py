import pytest

def test_get_current_plan(client, test_user):
    """Test getting current plan"""
    token = test_user["access_token"]
    response = client.get("/api/plans/current", headers={
        "Authorization": f"Bearer {token}"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["current_plan"] == "free"
    assert "limits" in data

def test_get_available_plans(client):
    """Test getting available plans"""
    response = client.get("/api/plans/available")
    assert response.status_code == 200
    data = response.json()
    assert "plans" in data
    assert len(data["plans"]) == 3
    
    plan_ids = [p["id"] for p in data["plans"]]
    assert "free" in plan_ids
    assert "pro" in plan_ids
    assert "premium" in plan_ids

def test_upgrade_plan(client, test_user):
    """Test upgrading plan"""
    token = test_user["access_token"]
    response = client.post("/api/plans/upgrade", 
        headers={"Authorization": f"Bearer {token}"},
        json={"plan": "pro"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] == True
    assert data["new_plan"] == "pro"

def test_get_usage_stats(client, test_user):
    """Test getting usage statistics"""
    token = test_user["access_token"]
    response = client.get("/api/plans/usage", headers={
        "Authorization": f"Bearer {token}"
    })
    assert response.status_code == 200
    data = response.json()
    assert "usage" in data
    assert "transactions" in data["usage"]
    assert "goals" in data["usage"]
    assert "investments" in data["usage"]
