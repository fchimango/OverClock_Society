"""Testes unitários do catálogo RAWG sem realizar chamadas externas."""

from fastapi import FastAPI
from fastapi.testclient import TestClient
import pytest

import rawg_routes


@pytest.fixture()
def client() -> TestClient:
    app = FastAPI()
    app.include_router(rawg_routes.router)
    return TestClient(app)


def test_map_game_includes_metadata_and_does_not_expose_api_key() -> None:
    mapped = rawg_routes._map_game(
        {
            "id": 123,
            "slug": "sample-game",
            "name": "Sample Game",
            "released": "2025-05-01",
            "background_image": "https://media.example/game.jpg",
            "rating": 4.1,
            "metacritic": 87,
            "genres": [{"id": 4, "name": "Action", "slug": "action"}],
            "platforms": [{"platform": {"id": 1, "name": "PC", "slug": "pc"}}],
            "description_raw": "Description of the game",
            "website": "https://example.com",
            "developers": [{"id": 1, "name": "Studio", "slug": "studio"}],
            "publishers": [{"id": 2, "name": "Publisher", "slug": "publisher"}],
            "stores": [{"store": {"id": 3, "name": "Store", "slug": "store"}}],
        },
        detail=True,
    )

    assert mapped["id"] == 123
    assert mapped["name"] == "Sample Game"
    assert mapped["genres"][0]["name"] == "Action"
    assert mapped["platforms"][0]["name"] == "PC"
    assert mapped["metacritic"] == 87
    assert mapped["description"] == "Description of the game"
    assert mapped["rawg_url"] == "https://rawg.io/games/sample-game"
    assert "key" not in mapped
    assert "api_key" not in mapped


def test_map_game_extracts_plain_text_from_rawg_html_description() -> None:
    mapped = rawg_routes._map_game(
        {"id": 123, "slug": "sample-game", "name": "Sample Game", "description": "<p>Adventure <strong>starts</strong> here.</p>"},
        detail=True,
    )

    assert mapped["description"] == "Adventure starts here."


def test_games_endpoint_maps_rawg_results(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_request(endpoint: str, params=None):
        assert endpoint == "games"
        assert params["search"] == "Elden Ring"
        return {
            "count": 1,
            "next": None,
            "previous": None,
            "results": [{
                "id": 1,
                "slug": "elden-ring",
                "name": "Elden Ring",
                "genres": [],
                "platforms": [],
            }],
        }

    monkeypatch.setattr(rawg_routes, "_request_rawg", fake_request)
    response = client.get("/catalog/games?q=Elden%20Ring&page=1&page_size=24")

    assert response.status_code == 200
    data = response.json()
    assert data["source"] == "RAWG"
    assert data["count"] == 1
    assert data["results"][0]["name"] == "Elden Ring"
    assert data["has_next"] is False


def test_games_endpoint_rejects_one_character_search(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        rawg_routes,
        "_request_rawg",
        lambda *args, **kwargs: pytest.fail("RAWG não deveria ser chamada para uma busca inválida"),
    )
    response = client.get("/catalog/games?q=x")

    assert response.status_code == 422
    assert "dois caracteres" in response.json()["detail"]


def test_missing_rawg_key_returns_clear_configuration_error(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("RAWG_API_KEY", raising=False)
    response = client.get("/catalog/genres")

    assert response.status_code == 503
    assert "RAWG_API_KEY" in response.json()["detail"]
