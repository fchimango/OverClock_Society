from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

import auth
import feed_routes
import models
from friends_routes import get_effective_user_status
from database import get_db


router = APIRouter(prefix="/profiles", tags=["profiles"])


def _public_user_payload(
    profile_user: models.User,
    current_user: models.User,
    db: Session,
) -> dict[str, Any]:
    """Build a public profile without exposing email, password hash or tokens."""
    profile = auth.build_profile_response(profile_user)

    game_rows = db.scalars(
        select(models.UserGame)
        .where(models.UserGame.user_id == profile_user.id)
        .order_by(models.UserGame.id.asc())
    ).all()

    games: dict[str, list[dict[str, Any]]] = {
        "favorites": [],
        "liked": [],
        "completed": [],
    }
    category_map = {
        "favorite": "favorites",
        "liked": "liked",
        "completed": "completed",
    }

    for row in game_rows:
        key = category_map.get(row.category)
        if not key:
            continue
        games[key].append(
            {
                "name": row.name,
                "genre": row.genre,
                "rating": float(row.rating),
                "position": row.favorite_position,
                "year": row.completed_year,
            }
        )

    games["favorites"].sort(key=lambda item: item["position"] or 99)
    unique_games = {
        item["name"].strip().casefold()
        for items in games.values()
        for item in items
        if item.get("name")
    }

    friendship_count = int(
        db.scalar(
            select(func.count())
            .select_from(models.Friendship)
            .where(
                or_(
                    models.Friendship.user_low_id == profile_user.id,
                    models.Friendship.user_high_id == profile_user.id,
                )
            )
        )
        or 0
    )

    if profile_user.id == current_user.id:
        relationship = "self"
        request_id = None
    else:
        low_id, high_id = sorted((profile_user.id, current_user.id))
        friendship = db.scalar(
            select(models.Friendship).where(
                models.Friendship.user_low_id == low_id,
                models.Friendship.user_high_id == high_id,
            )
        )

        if friendship is not None:
            relationship = "friend"
            request_id = None
        else:
            pending_request = db.scalar(
                select(models.FriendRequest)
                .where(
                    models.FriendRequest.status == "pending",
                    or_(
                        and_(
                            models.FriendRequest.sender_id == profile_user.id,
                            models.FriendRequest.receiver_id == current_user.id,
                        ),
                        and_(
                            models.FriendRequest.sender_id == current_user.id,
                            models.FriendRequest.receiver_id == profile_user.id,
                        ),
                    ),
                )
                .order_by(models.FriendRequest.created_at.desc())
            )

            if pending_request is None:
                relationship = "none"
                request_id = None
            elif pending_request.sender_id == profile_user.id:
                relationship = "incoming_request"
                request_id = pending_request.id
            else:
                relationship = "outgoing_request"
                request_id = pending_request.id

    status = get_effective_user_status(profile_user, db)

    platforms = profile.get("platforms") or []
    genres = profile.get("genres") or []
    if not isinstance(platforms, list):
        platforms = []
    if not isinstance(genres, list):
        genres = []

    # Deliberately return only fields intended for a public-facing profile.
    return {
        "id": profile_user.id,
        "name": profile_user.name,
        "username": profile_user.username or "",
        "course": profile.get("course") or "Curso não informado",
        "semester": profile.get("semester") or 1,
        "join_date": profile.get("join_date"),
        "status": status,
        "bio": profile.get("bio") or "",
        "platforms": platforms,
        "genres": genres,
        "friends_count": friendship_count,
        "games_count": len(unique_games),
        "games": games,
        "relationship": relationship,
        "request_id": request_id,
    }


def _get_user_by_id(user_id: int, db: Session) -> models.User:
    user = db.get(models.User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Jogador não encontrado.")
    return user


def _get_user_by_username(username: str, db: Session) -> models.User:
    normalized = username.strip().lstrip("@").lower()
    if not normalized:
        raise HTTPException(status_code=422, detail="Informe um nome de usuário válido.")

    user = db.scalar(
        select(models.User).where(func.lower(models.User.username) == normalized)
    )
    if user is None:
        raise HTTPException(status_code=404, detail="Jogador não encontrado.")
    return user


@router.get("/id/{user_id}")
def get_profile_by_id(
    user_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    profile_user = _get_user_by_id(user_id, db)
    return _public_user_payload(profile_user, current_user, db)


@router.get("/username/{username}")
def get_profile_by_username(
    username: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    profile_user = _get_user_by_username(username, db)
    return _public_user_payload(profile_user, current_user, db)


@router.get("/id/{user_id}/posts")
def list_user_posts(
    user_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    _get_user_by_id(user_id, db)
    posts = db.scalars(
        select(models.Post)
        .where(models.Post.user_id == user_id)
        .order_by(models.Post.created_at.desc(), models.Post.id.desc())
        .limit(100)
    ).all()

    return [feed_routes.serialize_post(post, db, current_user) for post in posts]



@router.get("/id/{user_id}/replies")
def list_user_replies(
    user_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """Return comments written by a user, with the original post for profile activity cards."""
    _get_user_by_id(user_id, db)
    rows = db.execute(
        select(models.Comment, models.User, models.Post)
        .join(models.User, models.User.id == models.Comment.user_id)
        .join(models.Post, models.Post.id == models.Comment.post_id)
        .where(models.Comment.user_id == user_id)
        .order_by(models.Comment.created_at.desc(), models.Comment.id.desc())
        .limit(100)
    ).all()

    replies: list[dict[str, Any]] = []
    for comment, author, post in rows:
        username = author.username or feed_routes.fallback_username(author.name)
        replies.append(
            {
                "id": comment.id,
                "postId": comment.post_id,
                "userId": comment.user_id,
                "author": author.name,
                "username": f"@{username}",
                "avatar": feed_routes.get_avatar(author.name),
                "text": comment.content,
                "createdAt": feed_routes.format_relative_time(comment.created_at),
                "post": feed_routes.serialize_post(post, db, current_user),
            }
        )

    return replies


@router.get("/id/{user_id}/reposts")
def list_user_reposts(
    user_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """Return posts explicitly reposted by a user, newest repost first."""
    _get_user_by_id(user_id, db)
    rows = db.execute(
        select(models.PostRepost, models.Post)
        .join(models.Post, models.Post.id == models.PostRepost.post_id)
        .where(models.PostRepost.user_id == user_id)
        .order_by(models.PostRepost.created_at.desc(), models.PostRepost.post_id.desc())
        .limit(100)
    ).all()

    return [
        {
            "repostedAt": feed_routes.format_relative_time(repost.created_at),
            "post": feed_routes.serialize_post(post, db, current_user),
        }
        for repost, post in rows
    ]
