from datetime import datetime, timezone
import re
import unicodedata

from fastapi import APIRouter, Depends, HTTPException, Response
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


# =========================================
# LISTAR PUBLICAÇÕES
# =========================================

@router.get("/posts")
def list_posts(
    current_user: models.User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):
    posts = db.scalars(
        select(models.Post).order_by(
            models.Post.created_at.desc(),
            models.Post.id.desc()
        )
    ).all()

    return [
        serialize_post(
            post,
            db,
            current_user
        )
        for post in posts
    ]


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
    get_post_or_404(
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