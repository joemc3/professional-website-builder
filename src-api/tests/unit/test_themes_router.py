import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c


class TestListThemes:
    @pytest.mark.asyncio
    async def test_returns_all_themes(self, client):
        resp = await client.get("/api/themes")
        assert resp.status_code == 200
        themes = resp.json()
        assert len(themes) == 5
        slugs = [t["slug"] for t in themes]
        assert set(slugs) == {"onyx", "coral", "serene", "jade", "quartz"}

    @pytest.mark.asyncio
    async def test_theme_has_required_fields(self, client):
        resp = await client.get("/api/themes")
        theme = resp.json()[0]
        assert "slug" in theme
        assert "name" in theme
        assert "description" in theme
        assert "audience" in theme
        assert "fonts" in theme
        assert "heading" in theme["fonts"]
        assert "body" in theme["fonts"]
        assert "colors" in theme
        assert "primary" in theme["colors"]
        assert "accent" in theme["colors"]
        assert "background" in theme["colors"]

    @pytest.mark.asyncio
    async def test_onyx_theme_data(self, client):
        resp = await client.get("/api/themes")
        themes = resp.json()
        onyx = next(t for t in themes if t["slug"] == "onyx")
        assert onyx["name"] == "Onyx"
        assert onyx["description"] == "Dark, technical, sharp edges"
        assert onyx["audience"] == "Developers, engineers"
        assert onyx["fonts"]["heading"] == "JetBrains Mono"
        assert onyx["colors"]["primary"] == "#0a0a0a"
