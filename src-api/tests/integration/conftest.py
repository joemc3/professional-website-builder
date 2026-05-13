from unittest.mock import patch

import pytest


@pytest.fixture(autouse=True)
def enable_registration():
    """Integration tests register users via /api/auth/register — flag must be on."""
    with patch("app.routers.auth.settings.registration_enabled", True):
        yield
