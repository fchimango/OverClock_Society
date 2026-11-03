from datetime import datetime, timezone
import re
import unicodedata

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

import models
from auth import get_current_user
from database import get_db


router = APIRouter(
    prefix="/feed",
    tags=["feed"]
)


# =========================================
# MODELOS DE ENTRADA
# =========================================

class PostCreate(BaseModel):
    content: str = Field(
        min_length=1,
        max_length=280
    )

    @field_validator("content", mode="before")
    @classmethod
    def trim_content(cls, value):
        if isinstance(value, str):
            return value.strip()
        return value


class CommentCreate(BaseModel):
    content: str = Field(
        min_length=1,
        max_length=180
    )

    @field_validator("content", mode="before")
    @classmethod
    def trim_content(cls, value):
        if isinstance(value, str):
            return value.strip()
        return value


# =========================================
# FUNÇÕES AUXILIARES
# =========================================

def get_post_or_404(post_id: int, db: Session):
    post = db.get(models.Post, post_id)

    if post is None:
        raise HTTPException(
            status_code=404,
            detail="Publicação não encontrada."
        )

    return post


def get_avatar(name: str | None) -> str:
    if not name or not name.strip():
        return "?"

    return name.strip()[0].upper()


def fallback_username(name: str | None) -> str:
    raw = unicodedata.normalize(
        "NFD",
        name or "usuario"
    )

    raw = "".join(
        char for char in raw
        if unicodedata.category(char) != "Mn"
    )

    value = re.sub(
        r"[^a-zA-Z0-9._]",
        "",
        raw
    ).lower()

    return value or "usuario"



def record_feed_action_notification(
    db: Session,
    post: models.Post,
    actor: models.User,
    action: str,
    comment_text: str | None = None,
) -> None:
    """Persist a grouped Feed notification for the post owner.

    The recipient is derived from the post in the database. This runs in the
    same transaction as the like/comment/repost, so direct API clients cannot
    perform a Feed interaction without creating its corresponding notification.
    """
    if action not in {"like", "comment", "repost"}:
        return

    # Do not notify someone about their own interaction.
    if post.user_id == actor.id:
        return

    now = datetime.now(timezone.utc)
    recipient_id = post.user_id
    candidates = db.scalars(
        select(models.Notification)
        .where(
            models.Notification.recipient_id == recipient_id,
            models.Notification.category == "feed",
            models.Notification.kind == action,
        )
        .order_by(
            models.Notification.created_at.desc(),
            models.Notification.id.desc(),
        )
        .limit(50)
    ).all()

    item = next(
        (
            candidate
            for candidate in candidates
            if str((candidate.data or {}).get("post_id", "")) == str(post.id)
        ),
        None,
    )

    actor_data = {
        "name": actor.name,
        "avatar": get_avatar(actor.name),
    }

    if item is None:
        actors = [actor_data]
        data = {
            "post_id": post.id,
            "actor_ids": [actor.id],
            "actors": actors,
            "target": "perfil.html?tab=posts",
        }
        if action == "comment" and comment_text:
            data["last_comment_text"] = comment_text.strip()[:180]

        title = {
            "like": "Nova curtida",
            "comment": "Novo comentário",
            "repost": "Novo repost",
        }[action]
        verb = {
            "like": "curtiu sua publicação",
            "comment": "comentou em sua publicação",
            "repost": "repostou sua publicação",
        }[action]

        item = models.Notification(
            recipient_id=recipient_id,
            actor_id=actor.id,
            category="feed",
            kind=action,
            title=title,
            message=f"{actor.name} {verb}.",
            data=data,
            is_read=False,
            created_at=now,
        )
        db.add(item)
        return

    data = dict(item.data or {})
    actor_ids: list[int] = []
    for value in data.get("actor_ids", []) or []:
        try:
            actor_ids.append(int(value))
        except (TypeError, ValueError):
            continue

    actors = list(data.get("actors", []) or [])
    if actor.id not in actor_ids:
        actor_ids.append(actor.id)
        actors.append(actor_data)
    elif not any(
        isinstance(entry, dict)
        and str(entry.get("name", "")).strip().casefold() == actor.name.strip().casefold()
        for entry in actors
    ):
        actors.append(actor_data)

    data["post_id"] = post.id
    data["actor_ids"] = actor_ids
    data["actors"] = actors
    data["target"] = "perfil.html?tab=posts"
    if action == "comment" and comment_text:
        data["last_comment_text"] = comment_text.strip()[:180]

    names = [str(entry.get("name") or "Alguém") for entry in actors if isinstance(entry, dict)]
    if not names:
        names = [actor.name]

    if len(names) == 1:
        action_text = {
            "like": "curtiu sua publicação",
            "comment": "comentou em sua publicação",
            "repost": "repostou sua publicação",
        }[action]
        message = f"{names[0]} {action_text}."
    else:
        action_text = {
            "like": "curtiram sua publicação",
            "comment": "comentaram em sua publicação",
            "repost": "repostaram sua publicação",
        }[action]
        if len(names) == 2:
            joined_names = f"{names[0]} e {names[1]}"
        else:
            joined_names = f"{names[0]}, {names[1]} e mais {len(names) - 2}"
        message = f"{joined_names} {action_text}."

    item.data = data
    item.actor_id = actor.id
    item.title = {
        "like": "Nova curtida",
        "comment": "Novo comentário",
        "repost": "Novo repost",
    }[action]
    item.message = message
    item.is_read = False
    item.created_at = now


def format_relative_time(value: datetime | None) -> str:
    if value is None:
        return "agora"

    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)

    seconds = max(
        0,
        int(
            (
                datetime.now(timezone.utc) - value
            ).total_seconds()
        )
    )

    if seconds < 60:
        return "agora"

    if seconds < 3600:
        return f"há {seconds // 60} min"

    if seconds < 86400:
        return f"há {seconds // 3600} h"

    if seconds < 2592000:
        return f"há {seconds // 86400} d"

    return value.astimezone(
        timezone.utc
    ).strftime("%d/%m/%Y")


def serialize_comment(
    comment: models.Comment,
    author: models.User
) -> dict:
    return {
        "id": comment.id,
        "postId": comment.post_id,
        "userId": comment.user_id,
        "author": author.name,
        "avatar": get_avatar(author.name),
        "text": comment.content,
        "createdAt": format_relative_time(
            comment.created_at
        )
    }


def count_for_post(
    db: Session,
    model,
    post_id: int
) -> int:
    count = db.scalar(
        select(func.count())
        .select_from(model)
        .where(model.post_id == post_id)
    )

    return int(count or 0)


def serialize_post(
    post: models.Post,
    db: Session,
    current_user: models.User
) -> dict:
    author = db.get(
        models.User,
        post.user_id
    )

    if author is None:
        raise HTTPException(
            status_code=500,
            detail=(
                "Não foi possível localizar "
                "o autor da publicação."
            )
        )

    comment_rows = db.execute(
        select(
            models.Comment,
            models.User
        )
        .join(
            models.User,
            models.Comment.user_id == models.User.id
        )
        .where(
            models.Comment.post_id == post.id
        )
        .order_by(
            models.Comment.created_at.asc(),
            models.Comment.id.asc()
        )
    ).all()

    comments = [
        serialize_comment(
            comment,
            comment_author
        )
        for comment, comment_author in comment_rows
    ]

    liked = db.get(
        models.PostLike,
        (
            current_user.id,
            post.id
        )
    ) is not None

    reposted = db.get(
        models.PostRepost,
        (
            current_user.id,
            post.id
        )
    ) is not None

    return {
        "id": post.id,
        "userId": post.user_id,
        "author": author.name,
        "username": (
            f"@{author.username or fallback_username(author.name)}"
        ),
        "avatar": get_avatar(author.name),
        "content": post.content,
        "createdAt": format_relative_time(
            post.created_at
        ),
        "createdAtISO": (
            post.created_at.isoformat()
            if post.created_at
            else None
        ),
        "likes": count_for_post(
            db,
            models.PostLike,
            post.id
        ),
        "reposts": count_for_post(
            db,
            models.PostRepost,
            post.id
        ),
        "liked": liked,
        "reposted": reposted,
        "comments": comments
    }


def serialize_posts_batch(
    posts: list[models.Post],
    db: Session,
    current_user: models.User,
) -> list[dict]:
    """Serialize a page of posts using a bounded number of database queries.

    The older single-post serializer performs several lookups per post. For
    the feed list, load authors, comments, counts and current-user reactions in
    batches so the query count does not grow linearly with the page size.
    """
    if not posts:
        return []

    post_ids = [post.id for post in posts]
    user_ids = {post.user_id for post in posts}

    authors = {
        user.id: user
        for user in db.scalars(
            select(models.User).where(models.User.id.in_(user_ids))
        ).all()
    }

    comments_by_post: dict[int, list[dict]] = {post_id: [] for post_id in post_ids}
    comment_rows = db.execute(
        select(models.Comment, models.User)
        .join(models.User, models.Comment.user_id == models.User.id)
        .where(models.Comment.post_id.in_(post_ids))
        .order_by(models.Comment.created_at.asc(), models.Comment.id.asc())
    ).all()
    for comment, author in comment_rows:
        comments_by_post.setdefault(comment.post_id, []).append(
            serialize_comment(comment, author)
        )

    likes_by_post = {
        post_id: int(count)
        for post_id, count in db.execute(
            select(models.PostLike.post_id, func.count())
            .where(models.PostLike.post_id.in_(post_ids))
            .group_by(models.PostLike.post_id)
        ).all()
    }
    reposts_by_post = {
        post_id: int(count)
        for post_id, count in db.execute(
            select(models.PostRepost.post_id, func.count())
            .where(models.PostRepost.post_id.in_(post_ids))
            .group_by(models.PostRepost.post_id)
        ).all()
    }
    liked_post_ids = set(
        db.scalars(
            select(models.PostLike.post_id).where(
                models.PostLike.user_id == current_user.id,
                models.PostLike.post_id.in_(post_ids),
            )
        ).all()
    )
    reposted_post_ids = set(
        db.scalars(
            select(models.PostRepost.post_id).where(
                models.PostRepost.user_id == current_user.id,
                models.PostRepost.post_id.in_(post_ids),
            )
        ).all()
    )

    result: list[dict] = []
    for post in posts:
        author = authors.get(post.user_id)
        if author is None:
            raise HTTPException(
                status_code=500,
                detail="Não foi possível localizar o autor da publicação.",
            )

        result.append({
            "id": post.id,
            "userId": post.user_id,
            "author": author.name,
            "username": f"@{author.username or fallback_username(author.name)}",
            "avatar": get_avatar(author.name),
            "content": post.content,
            "createdAt": format_relative_time(post.created_at),
            "createdAtISO": post.created_at.isoformat() if post.created_at else None,
            "likes": likes_by_post.get(post.id, 0),
            "reposts": reposts_by_post.get(post.id, 0),
            "liked": post.id in liked_post_ids,
            "reposted": post.id in reposted_post_ids,
            "comments": comments_by_post.get(post.id, []),
        })

    return result


# =========================================
# LISTAR PUBLICAÇÕES COM PAGINAÇÃO
# =========================================

@router.get("/posts")
def list_posts(
    page: int = Query(default=1, ge=1, le=100000),
    page_size: int = Query(default=20, ge=1, le=50),
    post_id: int | None = Query(default=None, ge=1),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    offset = (page - 1) * page_size

    # Busca um item extra para saber se existe próxima página sem executar
    # um COUNT(*) completo da tabela em cada atualização do Feed.
    fetched_posts = db.scalars(
        select(models.Post)
        .order_by(models.Post.created_at.desc(), models.Post.id.desc())
        .offset(offset)
        .limit(page_size + 1)
    ).all()
    has_more = len(fetched_posts) > page_size
    page_posts = list(fetched_posts[:page_size])
    posts_to_serialize = list(page_posts)

    # Links diretos de notificações/perfis devem continuar funcionando mesmo
    # quando a publicação está fora da primeira página do Feed.
    if post_id is not None and all(post.id != post_id for post in posts_to_serialize):
        target_post = db.get(models.Post, post_id)
        if target_post is not None:
            posts_to_serialize.append(target_post)

    return {
        "posts": serialize_posts_batch(posts_to_serialize, db, current_user),
        "page": page,
        "page_size": page_size,
        "has_more": has_more,
    }


# =========================================
# CRIAR PUBLICAÇÃO
# =========================================

@router.post(
    "/posts",
    status_code=201
)
def create_post(
    data: PostCreate,
    current_user: models.User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):
    content = data.content.strip()

    if not content:
        raise HTTPException(
            status_code=422,
            detail="A publicação não pode ficar vazia."
        )

    post = models.Post(
        user_id=current_user.id,
        content=content
    )

    db.add(post)
    db.commit()
    db.refresh(post)

    return serialize_post(
        post,
        db,
        current_user
    )


# =========================================
# EXCLUIR PUBLICAÇÃO
# =========================================

@router.delete(
    "/posts/{post_id}",
    status_code=204
)
def delete_post(
    post_id: int,
    current_user: models.User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):
    post = get_post_or_404(
        post_id,
        db
    )

    if post.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail=(
                "Você só pode excluir "
                "suas próprias publicações."
            )
        )

    db.delete(post)
    db.commit()

    return Response(status_code=204)


# =========================================
# CRIAR COMENTÁRIO
# =========================================

@router.post(
    "/posts/{post_id}/comments",
    status_code=201
)
def create_comment(
    post_id: int,
    data: CommentCreate,
    current_user: models.User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):
    post = get_post_or_404(
        post_id,
        db
    )

    content = data.content.strip()

    if not content:
        raise HTTPException(
            status_code=422,
            detail="O comentário não pode ficar vazio."
        )

    comment = models.Comment(
        post_id=post_id,
        user_id=current_user.id,
        content=content
    )

    db.add(comment)
    record_feed_action_notification(
        db,
        post,
        current_user,
        "comment",
        content,
    )
    db.commit()
    db.refresh(comment)

    return serialize_comment(
        comment,
        current_user
    )


# =========================================
# EXCLUIR COMENTÁRIO
# =========================================

@router.delete(
    "/posts/{post_id}/comments/{comment_id}",
    status_code=204
)
def delete_comment(
    post_id: int,
    comment_id: int,
    current_user: models.User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):
    comment = db.get(
        models.Comment,
        comment_id
    )

    if (
        comment is None
        or comment.post_id != post_id
    ):
        raise HTTPException(
            status_code=404,
            detail="Comentário não encontrado."
        )

    if comment.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail=(
                "Você só pode excluir "
                "seus próprios comentários."
            )
        )

    db.delete(comment)
    db.commit()

    return Response(status_code=204)


# =========================================
# CURTIR / REMOVER CURTIDA
# =========================================

@router.post("/posts/{post_id}/like")
def toggle_like(
    post_id: int,
    current_user: models.User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):
    post = get_post_or_404(
        post_id,
        db
    )

    like = db.get(
        models.PostLike,
        (
            current_user.id,
            post.id
        )
    )

    if like is not None:
        db.delete(like)
        liked = False

    else:
        db.add(
            models.PostLike(
                user_id=current_user.id,
                post_id=post.id
            )
        )
        liked = True

    try:
        if liked:
            record_feed_action_notification(
                db,
                post,
                current_user,
                "like",
            )
        db.commit()

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=409,
            detail=(
                "Não foi possível atualizar "
                "a curtida. Tente novamente."
            )
        )

    return {
        "postId": post.id,
        "liked": liked,
        "likes": count_for_post(
            db,
            models.PostLike,
            post.id
        )
    }


# =========================================
# REPOSTAR / REMOVER REPOSTAGEM
# =========================================

@router.post("/posts/{post_id}/repost")
def toggle_repost(
    post_id: int,
    current_user: models.User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):
    post = get_post_or_404(
        post_id,
        db
    )

    repost = db.get(
        models.PostRepost,
        (
            current_user.id,
            post.id
        )
    )

    if repost is not None:
        db.delete(repost)
        reposted = False

    else:
        db.add(
            models.PostRepost(
                user_id=current_user.id,
                post_id=post.id
            )
        )
        reposted = True

    try:
        if reposted:
            record_feed_action_notification(
                db,
                post,
                current_user,
                "repost",
            )
        db.commit()

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=409,
            detail=(
                "Não foi possível atualizar "
                "a repostagem. Tente novamente."
            )
        )

    return {
        "postId": post.id,
        "reposted": reposted,
        "reposts": count_for_post(
            db,
            models.PostRepost,
            post.id
        )
    }