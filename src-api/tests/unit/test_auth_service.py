import pytest

from app.services.auth_service import AuthService


@pytest.fixture
def auth_service():
    return AuthService(jwt_secret="test-secret", jwt_algorithm="HS256", jwt_expiration_hours=24)


class TestPasswordHashing:
    def test_hash_password_returns_hash(self, auth_service):
        hashed = auth_service.hash_password("mypassword")
        assert hashed != "mypassword"
        assert hashed.startswith("$2b$")

    def test_verify_password_correct(self, auth_service):
        hashed = auth_service.hash_password("mypassword")
        assert auth_service.verify_password("mypassword", hashed) is True

    def test_verify_password_incorrect(self, auth_service):
        hashed = auth_service.hash_password("mypassword")
        assert auth_service.verify_password("wrongpassword", hashed) is False


class TestJWTTokens:
    def test_create_token_returns_string(self, auth_service):
        token = auth_service.create_access_token(user_id="abc-123", email="test@example.com")
        assert isinstance(token, str)
        assert len(token) > 0

    def test_decode_token_returns_payload(self, auth_service):
        token = auth_service.create_access_token(user_id="abc-123", email="test@example.com")
        payload = auth_service.decode_access_token(token)
        assert payload["sub"] == "abc-123"
        assert payload["email"] == "test@example.com"

    def test_decode_invalid_token_returns_none(self, auth_service):
        payload = auth_service.decode_access_token("invalid.token.here")
        assert payload is None

    def test_decode_expired_token_returns_none(self, auth_service):
        svc = AuthService(jwt_secret="test-secret", jwt_algorithm="HS256", jwt_expiration_hours=-1)
        token = svc.create_access_token(user_id="abc-123", email="test@example.com")
        payload = svc.decode_access_token(token)
        assert payload is None
