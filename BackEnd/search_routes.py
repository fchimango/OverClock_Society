from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

import auth
import feed_routes
import models
from database import get_db


router = APIRouter(prefix="/search", tags=["search"])


@router.get("")
def global_search(
    q: str = Query(min_length=2, max_length=80),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Search users, games present in user libraries, and feed publications.

    Only public profile fields are returned. Email addresses and password data
    are never exposed by this endpoint.
    """
    term = q.strip()
    if len(term) < 2:
        raise HTTPException(
            status_code=422,
            detail="Digite pelo menos dois caracteres para pesquisar.",
        )

    pattern = f"%{term}%"
    username_term = term.lstrip("@").strip() or term
    username_pattern = f"%{username_term}%"

    # Jogadores: busca por nome ou username e devolve apenas dados públicos.
    user_rows = db.scalars(
        select(models.User)
        .where(
            or_(
                models.User.name.ilike(pattern),
                models.User.username.ilike(username_pattern),
            )
        )
        .order_by(models.User.name.asc(), models.User.id.asc())
        .limit(8)
    ).all()

    users: list[dict[str, Any]] = []
    for user in user_rows:
        profile = user.profile_data or {}
        users.append(
            {
                "id": user.id,
                "name": user.name,
                "username": user.username or "",
                "course": profile.get("course") or "Curso não informado",
                "is_self": user.id == current_user.id,
            }
        )

    # Jogos: não existe um catálogo global separado no modelo atual. Portanto,
    # os resultados são deduplicados a partir das coleções reais dos usuários.
    distinct_players = func.count(func.distinct(models.UserGame.user_id))
    game_name = func.min(models.UserGame.name)
    game_genre = func.min(models.UserGame.genre)

    game_rows = db.execute(
        select(
            game_name.label("name"),
            game_genre.label("genre"),
            distinct_players.label("players_count"),
        )
        .where(
            or_(
                models.UserGame.name.ilike(pattern),
                models.UserGame.genre.ilike(pattern),
            )
        )
        .group_by(func.lower(models.UserGame.name))
        .order_by(distinct_players.desc(), game_name.asc())
        .limit(8)
    ).all()

    games = [
        {
            "name": row.name,
            "genre": row.genre or "Gênero não informado",
            "players_count": int(row.players_count or 0),
        }
        for row in game_rows
    ]

    # Publicações: o Feed já é autenticado e as publicações nele são visíveis
    # aos usuários logados; retornamos somente os campos necessários à busca.
    post_rows = db.execute(
        select(models.Post, models.User)
        .join(models.User, models.User.id == models.Post.user_id)
        .where(models.Post.content.ilike(pattern))
        .order_by(models.Post.created_at.desc(), models.Post.id.desc())
        .limit(8)
    ).all()

    posts: list[dict[str, Any]] = []
    for post, author in post_rows:
        username = author.username or feed_routes.fallback_username(author.name)
        posts.append(
            {
                "id": post.id,
                "user_id": post.user_id,
                "content": post.content,
                "author": author.name,
                "username": f"@{username}",
                "avatar": feed_routes.get_avatar(author.name),
                "created_at": feed_routes.format_relative_time(post.created_at),
            }
        )

    return {
        "query": term,
        "users": users,
        "games": games,
        "posts": posts,
    }
