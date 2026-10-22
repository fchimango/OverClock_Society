from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

import auth
import models
from database import get_db


router = APIRouter(
    prefix="/friends",
    tags=["friends"],
)


VALID_STATUSES = {"online", "away", "offline"}


def serialize_public_user(user: models.User) -> dict[str, Any]:
    """Expose only the public information needed by the friends screen."""
    profile = user.profile_data or {}
    status = profile.get("status", "offline")
    if status not in VALID_STATUSES:
        status = "offline"

    return {
        "id": user.id,
        "name": user.name,
        "username": user.username or "",
        "course": profile.get("course") or "Curso não informado",
        "semester": profile.get("semester"),
        "status": status,
        "current_game": profile.get("current_game") or "",
        "current_game_status": profile.get("current_game_status") or "available",
    }




def resolve_request_notification(
    db: Session,
    recipient_id: int,
    request_id: int,
    status: str,
    other_name: str,
) -> None:
    """Keep the inbox notification aligned with the authoritative request."""
    rows = db.scalars(
        select(models.Notification).where(
            models.Notification.recipient_id == recipient_id,
            models.Notification.category == "friends",
            models.Notification.kind == "friend-request",
        )
    ).all()

    for item in rows:
        data = dict(item.data or {})
        if str(data.get("request_id", "")) != str(request_id):
            continue

        data["status"] = status
        data["friend_name"] = other_name
        item.data = data
        item.is_read = True
        item.title = "Solicitação aceita" if status == "accepted" else "Solicitação recusada"
        item.message = (
            f"{other_name} agora está na sua lista de amigos."
            if status == "accepted"
            else f"A solicitação de {other_name} foi recusada."
        )


def create_friend_response_notification(
    db: Session,
    recipient_id: int,
    actor_id: int,
    request_id: int,
    actor_name: str,
    status: str,
) -> None:
    """Notify the sender after their request is accepted or declined."""
    kind = "friend-request-accepted" if status == "accepted" else "friend-request-declined"
    existing_rows = db.scalars(
        select(models.Notification).where(
            models.Notification.recipient_id == recipient_id,
            models.Notification.category == "friends",
            models.Notification.kind == kind,
        )
    ).all()
    for row in existing_rows:
        if str((row.data or {}).get("request_id", "")) == str(request_id):
            return

    accepted = status == "accepted"
    db.add(
        models.Notification(
            recipient_id=recipient_id,
            actor_id=actor_id,
            category="friends",
            kind=kind,
            title="Solicitação aceita" if accepted else "Solicitação recusada",
            message=(
                f"{actor_name} aceitou sua solicitação de amizade."
                if accepted
                else f"{actor_name} recusou sua solicitação de amizade."
            ),
            data={
                "friend_name": actor_name,
                "friend_id": actor_id,
                "request_id": request_id,
                "status": status,
                "target": "amigos.html",
            },
            is_read=False,
            created_at=datetime.now(timezone.utc),
        )
    )


def friendship_pair(user_a: int, user_b: int) -> tuple[int, int]:
    """Return an order-independent, canonical pair for a friendship row."""
    return (user_a, user_b) if user_a < user_b else (user_b, user_a)


def find_friendship(
    db: Session,
    user_a: int,
    user_b: int,
) -> models.Friendship | None:
    low_id, high_id = friendship_pair(user_a, user_b)
    return db.scalar(
        select(models.Friendship).where(
            models.Friendship.user_low_id == low_id,
            models.Friendship.user_high_id == high_id,
        )
    )


def serialize_request(
    request: models.FriendRequest,
    other_user: models.User,
) -> dict[str, Any]:
    return {
        "id": request.id,
        "created_at": request.created_at.isoformat() if request.created_at else None,
        "user": serialize_public_user(other_user),
    }


@router.get("")
def list_friends(
    user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    friendships = db.scalars(
        select(models.Friendship).where(
            or_(
                models.Friendship.user_low_id == user.id,
                models.Friendship.user_high_id == user.id,
            )
        )
    ).all()

    friend_ids: set[int] = set()
    for item in friendships:
        other_id = (
            item.user_high_id
            if item.user_low_id == user.id
            else item.user_low_id
        )
        friend_ids.add(other_id)

    if not friend_ids:
        return {"friends": [], "count": 0}

    friends = db.scalars(
        select(models.User)
        .where(models.User.id.in_(friend_ids))
        .order_by(models.User.name.asc())
    ).all()

    serialized = [serialize_public_user(friend) for friend in friends]
    return {"friends": serialized, "count": len(serialized)}


@router.get("/requests")
def list_incoming_requests(
    user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    requests = db.scalars(
        select(models.FriendRequest)
        .where(
            models.FriendRequest.receiver_id == user.id,
            models.FriendRequest.status == "pending",
        )
        .order_by(models.FriendRequest.created_at.desc())
    ).all()

    serialized: list[dict[str, Any]] = []
    for request in requests:
        sender = db.get(models.User, request.sender_id)
        if sender is not None:
            serialized.append(serialize_request(request, sender))

    return {"requests": serialized, "count": len(serialized)}


@router.get("/search")
def search_players(
    q: str = Query(min_length=2, max_length=50),
    user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    term = q.strip().lstrip("@").strip()
    if len(term) < 2:
        raise HTTPException(
            status_code=422,
            detail="Digite pelo menos dois caracteres para pesquisar.",
        )

    pattern = f"%{term}%"
    users = db.scalars(
        select(models.User)
        .where(
            models.User.id != user.id,
            or_(
                models.User.name.ilike(pattern),
                models.User.username.ilike(pattern),
            ),
        )
        .order_by(models.User.name.asc())
        .limit(25)
    ).all()

    if not users:
        return {"users": [], "count": 0}

    user_ids = {item.id for item in users}
    friendship_rows = db.scalars(
        select(models.Friendship).where(
            or_(
                and_(
                    models.Friendship.user_low_id == user.id,
                    models.Friendship.user_high_id.in_(user_ids),
                ),
                and_(
                    models.Friendship.user_high_id == user.id,
                    models.Friendship.user_low_id.in_(user_ids),
                ),
            )
        )
    ).all()

    friend_ids: set[int] = set()
    for friendship in friendship_rows:
        friend_ids.add(
            friendship.user_high_id
            if friendship.user_low_id == user.id
            else friendship.user_low_id
        )

    pending_requests = db.scalars(
        select(models.FriendRequest).where(
            models.FriendRequest.status == "pending",
            or_(
                and_(
                    models.FriendRequest.sender_id == user.id,
                    models.FriendRequest.receiver_id.in_(user_ids),
                ),
                and_(
                    models.FriendRequest.receiver_id == user.id,
                    models.FriendRequest.sender_id.in_(user_ids),
                ),
            ),
        )
    ).all()

    relationships: dict[int, dict[str, Any]] = {}
    for request in pending_requests:
        if request.receiver_id == user.id:
            relationships[request.sender_id] = {
                "relationship": "incoming_request",
                "request_id": request.id,
            }
        else:
            relationships[request.receiver_id] = {
                "relationship": "outgoing_request",
                "request_id": request.id,
            }

    results: list[dict[str, Any]] = []
    for candidate in users:
        item = serialize_public_user(candidate)
        if candidate.id in friend_ids:
            item["relationship"] = "friend"
        else:
            item.update(
                relationships.get(
                    candidate.id,
                    {"relationship": "none", "request_id": None},
                )
            )
        results.append(item)

    return {"users": results, "count": len(results)}


@router.post("/requests/{recipient_id}", status_code=201)
def send_friend_request(
    recipient_id: int,
    user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    if recipient_id == user.id:
        raise HTTPException(
            status_code=400,
            detail="Você não pode enviar uma solicitação para si mesmo.",
        )

    recipient = db.get(models.User, recipient_id)
    if recipient is None:
        raise HTTPException(status_code=404, detail="Jogador não encontrado.")

    if find_friendship(db, user.id, recipient_id):
        raise HTTPException(status_code=409, detail="Vocês já são amigos.")

    pending = db.scalar(
        select(models.FriendRequest).where(
            models.FriendRequest.status == "pending",
            or_(
                and_(
                    models.FriendRequest.sender_id == user.id,
                    models.FriendRequest.receiver_id == recipient_id,
                ),
                and_(
                    models.FriendRequest.sender_id == recipient_id,
                    models.FriendRequest.receiver_id == user.id,
                ),
            ),
        )
    )

    if pending is not None:
        if pending.sender_id == recipient_id:
            raise HTTPException(
                status_code=409,
                detail="Este jogador já enviou uma solicitação para você. Confira suas solicitações recebidas.",
            )
        raise HTTPException(
            status_code=409,
            detail="Você já enviou uma solicitação para este jogador.",
        )

    request = models.FriendRequest(
        sender_id=user.id,
        receiver_id=recipient_id,
        status="pending",
    )
    db.add(request)
    try:
        # Generate the request ID before creating its persistent notification.
        db.flush()
        db.add(
            models.Notification(
                recipient_id=recipient.id,
                actor_id=user.id,
                category="friends",
                kind="friend-request",
                title="Nova solicitação",
                message=f"{user.name} enviou uma solicitação de amizade.",
                data={
                    "request_id": request.id,
                    "friend_name": user.name,
                    "friend_id": user.id,
                    "status": "pending",
                    "target": "amigos.html",
                },
                is_read=False,
                created_at=datetime.now(timezone.utc),
            )
        )
        db.commit()
        db.refresh(request)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Já existe uma solicitação pendente entre essas contas.",
        )

    return {
        "message": "Solicitação de amizade enviada.",
        "request": serialize_request(request, recipient),
    }


@router.post("/requests/{request_id}/accept")
def accept_friend_request(
    request_id: int,
    user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    request = db.scalar(
        select(models.FriendRequest)
        .where(
            models.FriendRequest.id == request_id,
            models.FriendRequest.receiver_id == user.id,
        )
        .with_for_update()
    )

    if request is None:
        raise HTTPException(status_code=404, detail="Solicitação não encontrada.")
    if request.status != "pending":
        raise HTTPException(status_code=409, detail="Esta solicitação já foi resolvida.")

    sender_id = request.sender_id
    low_id, high_id = friendship_pair(sender_id, request.receiver_id)
    friendship = db.scalar(
        select(models.Friendship).where(
            models.Friendship.user_low_id == low_id,
            models.Friendship.user_high_id == high_id,
        )
    )

    now = datetime.now(timezone.utc)
    if friendship is None:
        db.add(
            models.Friendship(
                user_low_id=low_id,
                user_high_id=high_id,
            )
        )

    request.status = "accepted"
    request.responded_at = now

    # Se ambos enviaram uma solicitação quase ao mesmo tempo, resolver uma
    # aceita também encerra a solicitação inversa, evitando duplicidade visual.
    reverse_requests = db.scalars(
        select(models.FriendRequest).where(
            models.FriendRequest.sender_id == user.id,
            models.FriendRequest.receiver_id == sender_id,
            models.FriendRequest.status == "pending",
        )
    ).all()
    for reverse in reverse_requests:
        reverse.status = "accepted"
        reverse.responded_at = now
        # Keep the other account's notification for the reverse request from
        # remaining actionable after the friendship has already been accepted.
        resolve_request_notification(
            db, reverse.receiver_id, reverse.id, "accepted", user.name
        )

    sender = db.get(models.User, sender_id)
    sender_name = sender.name if sender is not None else "O jogador"
    resolve_request_notification(
        db, user.id, request.id, "accepted", sender_name
    )
    create_friend_response_notification(
        db, sender_id, user.id, request.id, user.name, "accepted"
    )

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        # Another request may have created the friendship concurrently. If the
        # canonical friendship exists, still persist the request's accepted state.
        if find_friendship(db, user.id, sender_id) is None:
            raise HTTPException(
                status_code=409,
                detail="Não foi possível aceitar a solicitação agora. Atualize a página e tente novamente.",
            )

        refreshed_request = db.get(models.FriendRequest, request_id)
        if refreshed_request is not None and refreshed_request.status == "pending":
            refreshed_request.status = "accepted"
            refreshed_request.responded_at = datetime.now(timezone.utc)
            sender = db.get(models.User, refreshed_request.sender_id)
            sender_name = sender.name if sender is not None else "O jogador"
            resolve_request_notification(
                db, user.id, refreshed_request.id, "accepted", sender_name
            )
            create_friend_response_notification(
                db, refreshed_request.sender_id, user.id, refreshed_request.id, user.name, "accepted"
            )
            db.commit()

    return {"message": "Solicitação aceita. Vocês agora são amigos."}


@router.post("/requests/{request_id}/decline")
def decline_friend_request(
    request_id: int,
    user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    request = db.scalar(
        select(models.FriendRequest).where(
            models.FriendRequest.id == request_id,
            models.FriendRequest.receiver_id == user.id,
        )
    )

    if request is None:
        raise HTTPException(status_code=404, detail="Solicitação não encontrada.")
    if request.status != "pending":
        raise HTTPException(status_code=409, detail="Esta solicitação já foi resolvida.")

    request.status = "declined"
    request.responded_at = datetime.now(timezone.utc)
    sender = db.get(models.User, request.sender_id)
    sender_name = sender.name if sender is not None else "O jogador"
    resolve_request_notification(
        db, user.id, request.id, "declined", sender_name
    )
    create_friend_response_notification(
        db, request.sender_id, user.id, request.id, user.name, "declined"
    )
    db.commit()

    return {"message": "Solicitação recusada."}


@router.delete("/{friend_id}")
def remove_friend(
    friend_id: int,
    user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    if friend_id == user.id:
        raise HTTPException(status_code=400, detail="Identificador de amigo inválido.")

    friendship = find_friendship(db, user.id, friend_id)
    if friendship is None:
        raise HTTPException(status_code=404, detail="Amizade não encontrada.")

    db.delete(friendship)
    db.commit()
    return {"message": "Amizade removida."}
