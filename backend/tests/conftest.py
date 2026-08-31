import io
import pytest
from PIL import Image
from fastapi.testclient import TestClient

from app.main import app

@pytest.fixture(scope="session")
def test_client():
    """Session-scoped TestClient instance."""
    with TestClient(app) as client:
        yield client

@pytest.fixture
def sample_sonar_bytes():
    """Generates a standard 640x640 synthetic sonar image bytes for tests."""
    img = Image.new("RGB", (640, 640), color=(15, 30, 45))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf.getvalue()
