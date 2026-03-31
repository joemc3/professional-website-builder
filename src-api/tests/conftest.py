import pytest


@pytest.fixture
def sample_user_data():
    return {"email": "test@example.com", "password": "SecurePass123!"}
