import os
from fastapi.testclient import TestClient
from backend.app.main import app


def test_agent_plan_success_with_mock(monkeypatch):
    # Ensure API key is present to pass validation
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test-12345678901234567890")
    # Point to a dummy base URL to avoid real network; we'll mock the client call
    monkeypatch.setenv("OPENAI_BASE_URL", "http://127.0.0.1:4000")

    class FakeChoices:
        def __init__(self, content: str):
            self.message = type("M", (), {"content": content})

    class FakeCompletion:
        def __init__(self, content: str):
            self.choices = [FakeChoices(content)]

    class FakeCompletions:
        def create(self, **kwargs):
            return FakeCompletion('{"architecture": [], "steps": [], "tests": [], "risks": [], "deliverables": []}')

    class FakeChat:
        def __init__(self):
            self.completions = FakeCompletions()

    class FakeClient:
        def __init__(self, *args, **kwargs):
            self.chat = FakeChat()

    # Patch OpenAI client used by the module
    import backend.app.agents as agents
    monkeypatch.setattr(agents, "OpenAI", FakeClient)

    client = TestClient(app)
    resp = client.post("/agents/plan", json={"goal": "Demo"})
    assert resp.status_code == 200
    data = resp.json()
    assert set(data.keys()) == {"architecture", "steps", "tests", "risks", "deliverables"}
