from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

import auth
import models
from database import get_db


router = APIRouter(prefix="/notifications", tags=["notifications"])


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
