import json
from fastapi.testclient import TestClient
from backend.app.main import app


def test_ws_stream_connect_and_receive():
    client = TestClient(app)
    with client.websocket_connect("/ws/brain") as ws:
        data = ws.receive_text()
        payload = json.loads(data)
        assert "metrics" in payload
        assert "activation_mean" in payload["metrics"]


