from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt


class AuthService:
    def __init__(self, jwt_secret: str, jwt_algorithm: str, jwt_expiration_hours: int):
        self.jwt_secret = jwt_secret
        self.jwt_algorithm = jwt_algorithm
        self.jwt_expiration_hours = jwt_expiration_hours

    def hash_password(self, password: str) -> str:
        return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

    def create_access_token(self, user_id: str, email: str) -> str:
        expire = datetime.now(timezone.utc) + timedelta(hours=self.jwt_expiration_hours)
        payload = {"sub": user_id, "email": email, "exp": expire}
        return jwt.encode(payload, self.jwt_secret, algorithm=self.jwt_algorithm)

    def decode_access_token(self, token: str) -> dict | None:
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=[self.jwt_algorithm])
            return payload
        except JWTError:
            return None
