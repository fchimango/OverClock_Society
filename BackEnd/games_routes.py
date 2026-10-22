from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

import auth
import models
from database import get_db


router = APIRouter(
    prefix="/games",
    tags=["games"],
)


class GameEntry(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    genre: str = Field(default="Gênero não informado", min_length=1, max_length=120)
    rating: float = Field(default=5.0, ge=0, le=10, allow_inf_nan=False)
    position: int | None = Field(default=None, ge=1, le=3)
    year: int | None = Field(default=None, ge=1970, le=2100)

    @field_validator("name", "genre")
    @classmethod
    def clean_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("O nome do jogo e o gênero não podem ficar vazios.")
        return cleaned


class GameLibraryUpdate(BaseModel):
    # Exigimos as três listas para evitar que uma requisição parcial apague
    # acidentalmente categorias que não foram enviadas pelo cliente.
    favorites: list[GameEntry]
    liked: list[GameEntry]
    completed: list[GameEntry]


def normalize_name(value: str) -> str:
    return value.strip().casefold()


def serialize_entry(item: models.UserGame) -> dict[str, Any]:
    return {
        "category": item.category,
        "name": item.name,
        "genre": item.genre,
        "rating": float(item.rating),
        "position": item.favorite_position,
        "year": item.completed_year,
    }


def validate_category_names(category: str, entries: list[GameEntry]) -> None:
    seen: set[str] = set()

    for entry in entries:
        normalized = normalize_name(entry.name)
        if normalized in seen:
            raise HTTPException(
                status_code=409,
                detail=f'"{entry.name}" aparece mais de uma vez na categoria selecionada.',
            )
        seen.add(normalized)


def validate_library(data: GameLibraryUpdate) -> list[models.UserGame]:
    if len(data.favorites) > 3:
        raise HTTPException(
            status_code=400,
            detail="Você pode ter no máximo 3 jogos favoritos.",
        )

    validate_category_names("favorite", data.favorites)
    validate_category_names("liked", data.liked)
    validate_category_names("completed", data.completed)

    used_positions: set[int] = set()
    for entry in data.favorites:
        if entry.position is None:
            raise HTTPException(
                status_code=422,
                detail="Cada jogo favorito precisa ter uma posição no pódio.",
            )

        if entry.position in used_positions:
            raise HTTPException(
                status_code=409,
                detail="Cada jogo favorito precisa ocupar uma posição diferente no pódio.",
            )

        used_positions.add(entry.position)

    # A interface também mantém cada favorito em "Jogos Que Gosto".
    liked_names = {normalize_name(entry.name) for entry in data.liked}
    missing_favorites = [
        entry.name
        for entry in data.favorites
        if normalize_name(entry.name) not in liked_names
    ]

    if missing_favorites:
        raise HTTPException(
            status_code=400,
            detail=(
                "Todo jogo favorito também precisa aparecer em Jogos Que Gosto. "
                "Atualize a coleção e tente novamente."
            ),
        )

    rows: list[models.UserGame] = []

    for entry in data.favorites:
        rows.append(
            models.UserGame(
                name=entry.name,
                genre=entry.genre,
                category="favorite",
                rating=entry.rating,
                favorite_position=entry.position,
                completed_year=None,
            )
        )

    for entry in data.liked:
        rows.append(
            models.UserGame(
                name=entry.name,
                genre=entry.genre,
                category="liked",
                rating=entry.rating,
                favorite_position=None,
                completed_year=None,
            )
        )

    current_year = datetime.now().year
    for entry in data.completed:
        rows.append(
            models.UserGame(
                name=entry.name,
                genre=entry.genre,
                category="completed",
                rating=entry.rating,
                favorite_position=None,
                completed_year=entry.year or current_year,
            )
        )

    return rows


@router.get("")
def get_games_library(
    user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    items = db.scalars(
        select(models.UserGame)
        .where(models.UserGame.user_id == user.id)
        .order_by(models.UserGame.id)
    ).all()

    result: dict[str, list[dict[str, Any]]] = {
        "favorites": [],
        "liked": [],
        "completed": [],
    }

    category_to_key = {
        "favorite": "favorites",
        "liked": "liked",
        "completed": "completed",
    }

    for item in items:
        target_key = category_to_key.get(item.category)
        if target_key:
            result[target_key].append(serialize_entry(item))

    # O pódio deve carregar suas posições na ordem esperada pela interface.
    result["favorites"].sort(key=lambda game: game["position"] or 99)
    return result


@router.put("")
def replace_games_library(
    data: GameLibraryUpdate,
    user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    new_rows = validate_library(data)

    try:
        db.execute(
            delete(models.UserGame).where(
                models.UserGame.user_id == user.id
            )
        )

        for row in new_rows:
            row.user_id = user.id

        db.add_all(new_rows)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Não foi possível salvar sua coleção de jogos. Tente novamente.",
        )

    return {
        "message": "Coleção de jogos salva com sucesso.",
        "count": len(new_rows),
    }
