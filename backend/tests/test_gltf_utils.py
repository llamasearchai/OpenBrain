from pathlib import Path
from backend.app.gltf_utils import inspect_gltf_metadata


def test_inspect_gltf_missing(tmp_path: Path):
    p = tmp_path / "missing.gltf"
    meta = inspect_gltf_metadata(p)
    assert meta["exists"] is False
    assert "error" in meta


def test_inspect_gltf_public_path_exists_or_reports():
    # This test asserts function returns a dict; the path may or may not exist in repo
    # Use configured public path for stability
    from backend.app.config import settings
    meta = inspect_gltf_metadata(settings.public_brain_gltf())
    assert isinstance(meta, dict)
    assert "exists" in meta
