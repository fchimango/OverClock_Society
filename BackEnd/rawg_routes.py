"""Endpoints de catálogo RAWG com chave mantida no backend.

A chave deve ser configurada pela variável de ambiente RAWG_API_KEY.
Os resultados são armazenados em cache por alguns minutos para reduzir chamadas.
"""

from __future__ import annotations

import json
from html.parser import HTMLParser
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from threading import Lock
from typing import Any

from fastapi import APIRouter, HTTPException, Path, Query

router = APIRouter(prefix="/catalog", tags=["catalog"])

RAWG_BASE_URL = "https://api.rawg.io/api"
CACHE_TTL_SECONDS = 300
CACHE_MAX_ITEMS = 256
_CACHE: dict[str, tuple[float, Any]] = {}
_CACHE_LOCK = Lock()


def _get_api_key() -> str:
    key = os.getenv("RAWG_API_KEY", "").strip()
    if not key:
        raise HTTPException(
            status_code=503,
            detail=(
                "O catálogo de jogos ainda não foi configurado. "
                "Defina a variável RAWG_API_KEY no ambiente do backend."
            ),
        )
    return key


def _request_rawg(endpoint: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    """Consulta a RAWG com timeout, tratamento de erro e cache simples."""
    api_key = _get_api_key()
    query_params = {
        key: value
        for key, value in (params or {}).items()
        if value is not None and value != ""
    }

    # A chave não faz parte do identificador do cache e nunca é retornada ao cliente.
    cache_key = f"{endpoint}?{urllib.parse.urlencode(sorted(query_params.items()))}"
    now = time.monotonic()
    with _CACHE_LOCK:
        cached = _CACHE.get(cache_key)
        if cached and now - cached[0] < CACHE_TTL_SECONDS:
            return cached[1]
        if cached:
            _CACHE.pop(cache_key, None)

    query_params["key"] = api_key
    url = f"{RAWG_BASE_URL}/{endpoint.lstrip('/')}?{urllib.parse.urlencode(query_params)}"
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "OverclockSociety/1.0 (+https://rawg.io/apidocs)",
        },
        method="GET",
    )

    try:
        with urllib.request.urlopen(request, timeout=8) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        if exc.code in {401, 403}:
            raise HTTPException(
                status_code=503,
                detail="A chave da RAWG é inválida ou foi recusada. Confira RAWG_API_KEY no backend.",
            ) from None
        if exc.code == 404:
            raise HTTPException(status_code=404, detail="O jogo solicitado não foi encontrado na RAWG.") from None
        if exc.code == 429:
            raise HTTPException(
                status_code=503,
                detail="O limite de requisições da RAWG foi atingido. Aguarde um pouco e tente novamente.",
            ) from None
        if exc.code == 400:
            raise HTTPException(
                status_code=422,
                detail="Os filtros enviados ao catálogo são inválidos.",
            ) from None
        raise HTTPException(
            status_code=502,
            detail=f"A RAWG respondeu com HTTP {exc.code}. Tente novamente mais tarde.",
        ) from None
    except (urllib.error.URLError, TimeoutError, OSError, json.JSONDecodeError):
        raise HTTPException(
            status_code=502,
            detail="Não foi possível conectar ao catálogo RAWG agora.",
        ) from None

    if not isinstance(payload, dict):
        raise HTTPException(status_code=502, detail="A RAWG retornou uma resposta inesperada.")

    with _CACHE_LOCK:
        if len(_CACHE) >= CACHE_MAX_ITEMS:
            oldest_key = min(_CACHE, key=lambda item: _CACHE[item][0])
            _CACHE.pop(oldest_key, None)
        _CACHE[cache_key] = (now, payload)

    return payload


def _map_platforms(game: dict[str, Any]) -> list[dict[str, Any]]:
    platforms: list[dict[str, Any]] = []
    for item in game.get("platforms") or []:
        if not isinstance(item, dict):
            continue
        platform = item.get("platform") or {}
        if not isinstance(platform, dict):
            continue
        platforms.append(
            {
                "id": platform.get("id"),
                "name": platform.get("name") or "Plataforma desconhecida",
                "slug": platform.get("slug") or "",
            }
        )
    return platforms


def _map_named_items(items: Any) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    for item in items or []:
        if not isinstance(item, dict):
            continue
        results.append(
            {
                "id": item.get("id"),
                "name": item.get("name") or "Não informado",
                "slug": item.get("slug") or "",
            }
        )
    return results




class _DescriptionTextParser(HTMLParser):
    """Converte a descrição HTML opcional da RAWG em texto simples."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []

    def handle_data(self, data: str) -> None:
        cleaned = data.strip()
        if cleaned:
            self.parts.append(cleaned)


def _description_text(game: dict[str, Any]) -> str:
    raw = game.get("description_raw")
    if isinstance(raw, str) and raw.strip():
        return raw.strip()

    html_description = game.get("description")
    if not isinstance(html_description, str) or not html_description.strip():
        return ""

    parser = _DescriptionTextParser()
    try:
        parser.feed(html_description)
        parser.close()
    except Exception:
        # Fallback defensivo para respostas HTML malformadas da API.
        return re.sub(r"<[^>]*>", " ", html_description).strip()
    return " ".join(parser.parts)


def _map_game(game: dict[str, Any], *, detail: bool = False) -> dict[str, Any]:
    slug = str(game.get("slug") or "").strip()
    result: dict[str, Any] = {
        "id": game.get("id"),
        "slug": slug,
        "name": game.get("name") or "Jogo sem nome",
        "released": game.get("released"),
        "background_image": game.get("background_image"),
        "rating": game.get("rating"),
        "rating_top": game.get("rating_top"),
        "ratings_count": game.get("ratings_count"),
        "metacritic": game.get("metacritic"),
        "genres": _map_named_items(game.get("genres")),
        "platforms": _map_platforms(game),
        "rawg_url": f"https://rawg.io/games/{urllib.parse.quote(slug)}" if slug else "https://rawg.io/",
    }
    if detail:
        result["description"] = _description_text(game)
        result["website"] = game.get("website") or ""
        result["developers"] = _map_named_items(game.get("developers"))
        result["publishers"] = _map_named_items(game.get("publishers"))
        result["stores"] = _map_named_items(
            [entry.get("store") for entry in (game.get("stores") or []) if isinstance(entry, dict)]
        )
    return result


@router.get("/games")
def list_catalog_games(
    q: str | None = Query(default=None, max_length=80),
    genre: str | None = Query(default=None, max_length=80),
    platforms: str | None = Query(default=None, max_length=80),
    ordering: str = Query(default="-added", pattern=r"^(|-added|-rating|-metacritic|name|released)$"),
    page: int = Query(default=1, ge=1, le=1000),
    page_size: int = Query(default=24, ge=1, le=40),
) -> dict[str, Any]:
    term = (q or "").strip()
    if term and len(term) < 2:
        raise HTTPException(status_code=422, detail="Digite pelo menos dois caracteres para pesquisar jogos.")

    genre_slug = (genre or "").strip()
    if genre_slug and not re.fullmatch(r"[a-zA-Z0-9_-]{1,80}", genre_slug):
        raise HTTPException(status_code=422, detail="O gênero selecionado é inválido.")

    platform_ids = (platforms or "").strip()
    if platform_ids:
        if not re.fullmatch(r"\d+(,\d+){0,9}", platform_ids):
            raise HTTPException(status_code=422, detail="A plataforma selecionada é inválida.")

    rawg_params: dict[str, Any] = {
        "page": page,
        "page_size": page_size,
        "ordering": ordering or "-added",
    }
    if term:
        rawg_params["search"] = term
    if genre_slug:
        rawg_params["genres"] = genre_slug
    if platform_ids:
        rawg_params["platforms"] = platform_ids

    payload = _request_rawg("games", rawg_params)
    games = [
        _map_game(item)
        for item in (payload.get("results") or [])
        if isinstance(item, dict)
    ]
    return {
        "count": int(payload.get("count") or 0),
        "page": page,
        "page_size": page_size,
        "has_next": bool(payload.get("next")),
        "has_previous": bool(payload.get("previous")),
        "results": games,
        "source": "RAWG",
    }


@router.get("/genres")
def list_catalog_genres() -> dict[str, Any]:
    payload = _request_rawg("genres", {"page_size": 40, "ordering": "name"})
    return {
        "results": _map_named_items(payload.get("results")),
        "source": "RAWG",
    }


@router.get("/platforms")
def list_catalog_platforms() -> dict[str, Any]:
    payload = _request_rawg("platforms", {"page_size": 40, "ordering": "name"})
    return {
        "results": _map_named_items(payload.get("results")),
        "source": "RAWG",
    }


@router.get("/games/{game_id}")
def get_catalog_game(
    game_id: int = Path(ge=1),
) -> dict[str, Any]:
    payload = _request_rawg(f"games/{game_id}")
    return _map_game(payload, detail=True)
