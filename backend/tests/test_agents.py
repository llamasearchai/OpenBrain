import os
from fastapi.testclient import TestClient
from backend.app.main import app


def test_plan_requires_api_key(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    # Ensure base URL doesn't matter since we return 400 prior to client construction
    monkeypatch.setenv("OPENAI_BASE_URL", "http://127.0.0.1:4000")
    client = TestClient(app)

    resp = client.post("/agents/plan", json={"goal": "Build a plan"})
    assert resp.status_code == 400
    data = resp.json()
    assert data["detail"].startswith("OPENAI_API_KEY")


