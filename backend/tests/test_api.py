from fastapi.testclient import TestClient
from backend.app.main import app


client = TestClient(app)


def test_healthz():
    res = client.get("/healthz")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_assets_list():
    res = client.get("/assets/brain")
    assert res.status_code == 200
    data = res.json()
    assert "assets" in data


def test_metadata():
    res = client.get("/assets/brain/metadata")
    assert res.status_code == 200
    # file may or may not exist in public yet; just require JSON structure
    assert isinstance(res.json(), dict)


