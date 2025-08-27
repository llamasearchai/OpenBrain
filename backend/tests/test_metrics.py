from fastapi.testclient import TestClient
from backend.app.main import app


client = TestClient(app)


def test_metrics_endpoint_text_exposition():
    # Hit a couple endpoints to generate some metrics first
    client.get("/healthz")
    res = client.get("/metrics")
    assert res.status_code == 200
    # Prometheus exposition format is text/plain
    assert res.headers["content-type"].startswith("text/plain")
    body = res.text
    assert "openbrain_requests_total" in body
