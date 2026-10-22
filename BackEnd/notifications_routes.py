from datetime import datetime, timezone
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

import auth
import models
from database import get_db


router = APIRouter(prefix="/notifications", tags=["notifications"])


class FeedActionPayload(BaseModel):
    action: Literal["like", "comment", "repost"]
    post_id: int = Field(gt=0)
    comment_text: str | None = Field(default=None, max_length=180)


def relative_time(value: datetime | None) -> str:
    if value is None:
        return "Agora"

    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)

    seconds = max(0, int((datetime.now(timezone.utc) - value).total_seconds()))
    if seconds < 60:
        return "Agora"
    if seconds < 3600:
        minutes = seconds // 60
        return f"Há {minutes} min"
    if seconds < 86400:
        hours = seconds // 3600
        return f"Há {hours} h"
    if seconds < 7 * 86400:
        days = seconds // 86400
        return f"Há {days} dia" if days == 1 else f"Há {days} dias"
    return value.astimezone(timezone.utc).strftime("%d/%m/%Y")


def actor_initial(name: str) -> str:
    name = (name or "?").strip()
    return name[0].upper() if name else "?"


def serialize_notification(item: models.Notification) -> dict[str, Any]:
    data = dict(item.data or {})
    result: dict[str, Any] = {
        "id": item.id,
        "category": item.category,
        "kind": item.kind,
        "title": item.title,
        "message": item.message,
        "createdAt": relative_time(item.created_at),
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "read": bool(item.is_read),
        "prototype": False,
        "target": data.get("target"),
    }

    # Flatten the metadata expected by notifications.js while retaining the
    # database model as the source of truth.
    field_map = {
        "request_id": "requestId",
        "friend_name": "friendName",
        "friend_id": "friendId",
        "post_id": "postId",
        "actor_name": "actorName",
        "actor_avatar": "actorAvatar",
        "last_comment_text": "lastCommentText",
    }
    for source, target in field_map.items():
        if source in data:
            result[target] = data[source]

    if "status" in data:
        result["status"] = data["status"]
    if isinstance(data.get("actors"), list):
        result["actors"] = data["actors"]

    return result


def feed_title(action: str) -> str:
    return {
        "like": "Nova curtida",
        "comment": "Novo comentário",
        "repost": "Novo repost",
    }[action]


def feed_message(action: str, actors: list[dict[str, str]]) -> str:
    names = [str(actor.get("name") or "Alguém") for actor in actors]
    verb = {
        "like": ("curtiu sua publicação", "curtiram sua publicação"),
        "comment": ("comentou em sua publicação", "comentaram em sua publicação"),
        "repost": ("repostou sua publicação", "repostaram sua publicação"),
    }[action]

    if len(names) == 1:
        return f"{names[0]} {verb[0]}."
    if len(names) == 2:
        return f"{names[0]} e {names[1]} {verb[1]}."
    return f"{names[0]}, {names[1]} e mais {len(names) - 2} {verb[1]}."


@router.get("")
def list_notifications(
    user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    rows = db.scalars(
        select(models.Notification)
        .where(models.Notification.recipient_id == user.id)
        .order_by(models.Notification.created_at.desc(), models.Notification.id.desc())
        .limit(100)
    ).all()

    serialized = [serialize_notification(row) for row in rows]
    unread_count = sum(1 for row in rows if not row.is_read)
    return {
        "notifications": serialized,
        "count": len(serialized),
        "unread_count": unread_count,
    }


@router.patch("/read-all")
def mark_all_notifications_read(
    user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    rows = db.scalars(
        select(models.Notification).where(
            models.Notification.recipient_id == user.id,
            models.Notification.is_read.is_(False),
        )
    ).all()
    for row in rows:
        row.is_read = True
    db.commit()
    return {"message": "Notificações marcadas como lidas.", "updated": len(rows)}


@router.patch("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    item = db.scalar(
        select(models.Notification).where(
            models.Notification.id == notification_id,
            models.Notification.recipient_id == user.id,
        )
    )
    if item is None:
        raise HTTPException(status_code=404, detail="Notificação não encontrada.")

    item.is_read = True
    db.commit()
    return {"message": "Notificação marcada como lida."}


@router.post("/feed-action")
def create_feed_action_notification(
    payload: FeedActionPayload,
    user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """Create a feed notification for the owner of the affected post.

    The recipient is always derived from the post in the database; the client
    cannot choose another account to receive a notification.
    """
    post = db.get(models.Post, payload.post_id)
    if post is None:
        raise HTTPException(status_code=404, detail="Publicação não encontrada.")

    if post.user_id == user.id:
        return {"notification": None, "message": "Não é necessário notificar o autor sobre a própria ação."}

    recipient_id = post.user_id
    now = datetime.now(timezone.utc)

    candidates = db.scalars(
        select(models.Notification)
        .where(
            models.Notification.recipient_id == recipient_id,
            models.Notification.category == "feed",
            models.Notification.kind == payload.action,
        )
        .order_by(models.Notification.created_at.desc())
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

    current_actor = {"name": user.name, "avatar": actor_initial(user.name)}
    if item is not None:
        data = dict(item.data or {})
        actor_ids = [int(value) for value in data.get("actor_ids", []) if str(value).isdigit()]
        actors = list(data.get("actors", []))
        if user.id in actor_ids:
            return {"notification": serialize_notification(item), "message": "Ação já registrada."}

        actor_ids.append(user.id)
        actors.append(current_actor)
        data["actor_ids"] = actor_ids
        data["actors"] = actors
        if payload.action == "comment" and payload.comment_text:
            data["last_comment_text"] = payload.comment_text.strip()
        item.data = data
        item.message = feed_message(payload.action, actors)
        item.is_read = False
        item.created_at = now
    else:
        data: dict[str, Any] = {
            "post_id": post.id,
            "actor_ids": [user.id],
            "actors": [current_actor],
            "target": "perfil.html?tab=posts",
        }
        if payload.action == "comment" and payload.comment_text:
            data["last_comment_text"] = payload.comment_text.strip()

        item = models.Notification(
            recipient_id=recipient_id,
            actor_id=user.id,
            category="feed",
            kind=payload.action,
            title=feed_title(payload.action),
            message=feed_message(payload.action, [current_actor]),
            data=data,
            is_read=False,
            created_at=now,
        )
        db.add(item)

    db.commit()
    db.refresh(item)
    return {"notification": serialize_notification(item), "message": "Notificação registrada."}
