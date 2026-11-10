import re
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
)

from pydantic import (
    BaseModel,
    EmailStr,
    Field,
    field_validator,
)

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

import models

from database import get_db
from profile_media import decode_profile_image

from security import (
    create_token,
    decode_token,
    hash_password,
    verify_password,
)


router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)

bearer = HTTPBearer()


# =========================================
# MODELOS DE ENTRADA
# =========================================

class RegisterData(BaseModel):
    name: str = Field(
        min_length=2,
        max_length=120
    )

    username: str = Field(
        min_length=3,
        max_length=32
    )

    email: EmailStr

    password: str = Field(
        min_length=8,
        max_length=50
    )

    @field_validator("name", mode="before")
    @classmethod
    def validate_name(cls, value):
        if not isinstance(value, str):
            raise ValueError(
                "Informe um nome válido."
            )

        name = value.strip()

        if len(name) < 2:
            raise ValueError(
                "Informe seu nome com pelo menos 2 caracteres."
            )

        return name

    @field_validator("username", mode="before")
    @classmethod
    def validate_username(cls, value):
        if not isinstance(value, str):
            raise ValueError(
                "Informe um nome de usuário válido."
            )

        username = (
            value.strip()
            .lstrip("@")
            .lower()
        )

        if not re.fullmatch(
            r"[a-z0-9._]{3,32}",
            username
        ):
            raise ValueError(
                "Use de 3 a 32 caracteres: letras, números, ponto ou sublinhado."
            )

        return username


class LoginData(BaseModel):
    email: EmailStr

    password: str = Field(
        min_length=1,
        max_length=50
    )


# =========================================
# USUÁRIO ATUAL
# =========================================

def get_current_user(
    cred: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db)
):
    user_id = decode_token(
        cred.credentials
    )

    user = (
        db.get(
            models.User,
            user_id
        )
        if user_id
        else None
    )

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="Sessão inválida. Faça login novamente."
        )

    return user


# =========================================
# CADASTRO
# =========================================

@router.post(
    "/register",
    status_code=201
)
def register(
    data: RegisterData,
    db: Session = Depends(get_db)
):
    email = data.email.lower()

    existing_email = db.scalar(
        select(models.User).where(
            models.User.email == email
        )
    )

    if existing_email:
        raise HTTPException(
            status_code=409,
            detail="Este e-mail já está em uso."
        )

    existing_username = db.scalar(
        select(models.User).where(
            models.User.username == data.username
        )
    )

    if existing_username:
        raise HTTPException(
            status_code=409,
            detail="Este nome de usuário já está em uso."
        )

    novo = models.User(
        name=data.name,
        username=data.username,
        email=email,
        password_hash=hash_password(
            data.password
        )
    )

    db.add(novo)

    try:
        db.commit()
        db.refresh(novo)

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=409,
            detail="Este e-mail ou nome de usuário já está em uso."
        )

    return {
        "message": "Conta criada com sucesso!",
        "id": novo.id,
        "name": novo.name,
        "email": novo.email,
        "username": novo.username
    }


# =========================================
# LOGIN
# =========================================

@router.post("/login")
def login(
    data: LoginData,
    db: Session = Depends(get_db)
):
    user = db.scalar(
        select(models.User).where(
            models.User.email == data.email.lower()
        )
    )

    if (
        user is None
        or not verify_password(
            data.password,
            user.password_hash
        )
    ):
        raise HTTPException(
            status_code=401,
            detail="E-mail ou senha incorretos"
        )

    return {
        "access_token": create_token(user.id),
        "token_type": "bearer",
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "username": user.username
    }


# =========================================
# DADOS DO USUÁRIO LOGADO
# =========================================

@router.get("/me")
def me(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Expose only the public URL of the saved avatar, never the image bytes.
    # The version query parameter ensures pages pick up a newly uploaded photo.
    media = db.get(models.UserProfileMedia, user.id)
    media_version = (
        str(int(media.updated_at.timestamp() * 1000))
        if media and media.updated_at else "1"
    )
    avatar_url = (
        f"/profiles/id/{user.id}/media/avatar?v={media_version}"
        if media and media.avatar_data else None
    )

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "username": user.username,
        "avatar_url": avatar_url,
    }


# =========================================
# MODELO DE ATUALIZAÇÃO DO PERFIL
# =========================================

class ProfileUpdateData(BaseModel):
    name: str = Field(
        min_length=2,
        max_length=120
    )

    username: str = Field(
        min_length=3,
        max_length=32
    )

    course: str = Field(
        default="",
        max_length=120
    )

    semester: int = Field(
        default=1,
        ge=1,
        le=10
    )

    join_date: str | None = Field(
        default=None,
        pattern=r"^\d{4}-(0[1-9]|1[0-2])$"
    )

    status: Literal[
        "online",
        "away",
        "offline"
    ] = "online"

    bio: str = Field(
        default="",
        max_length=500
    )

    platforms: list[str] = Field(
        default_factory=list,
        max_length=10
    )

    genres: list[str] = Field(
        default_factory=list,
        max_length=15
    )

    current_game: str = Field(
        default="",
        max_length=100
    )

    current_game_status: Literal[
        "available",
        "busy",
        "away"
    ] = "available"

    @field_validator("name", mode="before")
    @classmethod
    def validate_profile_name(cls, value):
        if not isinstance(value, str):
            raise ValueError(
                "Informe um nome válido."
            )

        value = value.strip()

        if len(value) < 2:
            raise ValueError(
                "O nome deve ter pelo menos 2 caracteres."
            )

        return value

    @field_validator("username", mode="before")
    @classmethod
    def validate_profile_username(cls, value):
        if not isinstance(value, str):
            raise ValueError(
                "Informe um nome de usuário válido."
            )

        username = (
            value.strip()
            .lstrip("@")
            .lower()
        )

        if not re.fullmatch(
            r"[a-z0-9._]{3,32}",
            username
        ):
            raise ValueError(
                "Use de 3 a 32 caracteres: letras, números, ponto ou sublinhado."
            )

        return username

    @field_validator(
        "course",
        "bio",
        "current_game",
        mode="before"
    )
    @classmethod
    def trim_profile_text(cls, value):
        if isinstance(value, str):
            return value.strip()

        return value

    @field_validator("join_date", mode="before")
    @classmethod
    def normalize_join_date(cls, value):
        if value == "":
            return None

        return value


class ProfileMediaUpdate(BaseModel):
    avatar_data_url: str | None = Field(default=None, max_length=800_000)
    cover_data_url: str | None = Field(default=None, max_length=1_800_000)



# =========================================
# DADOS PADRÃO DO PERFIL
# =========================================

DEFAULT_PROFILE_DATA = {
    "course": "",
    "semester": 1,
    "join_date": None,
    "status": "offline",
    "bio": "",
    "platforms": [],
    "genres": [],
    "current_game": "",
    "current_game_status": "available"
}


def build_profile_response(user, db: Session):
    profile = {
        **DEFAULT_PROFILE_DATA,
        "platforms": DEFAULT_PROFILE_DATA["platforms"].copy(),
        "genres": DEFAULT_PROFILE_DATA["genres"].copy()
    }
    profile.update(user.profile_data or {})

    if not profile.get("join_date") and user.created_at:
        profile["join_date"] = user.created_at.strftime("%Y-%m")

    game_names = db.scalars(
        select(models.UserGame.name).where(models.UserGame.user_id == user.id)
    ).all()
    unique_game_names = {
        str(name).strip().casefold() for name in game_names if str(name).strip()
    }
    friends_count = int(
        db.scalar(
            select(func.count()).select_from(models.Friendship).where(
                or_(
                    models.Friendship.user_low_id == user.id,
                    models.Friendship.user_high_id == user.id,
                )
            )
        ) or 0
    )
    posts_count = int(
        db.scalar(
            select(func.count()).select_from(models.Post).where(
                models.Post.user_id == user.id
            )
        ) or 0
    )

    media = db.get(models.UserProfileMedia, user.id)
    media_version = (
        str(int(media.updated_at.timestamp() * 1000))
        if media and media.updated_at else "1"
    )

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "username": user.username,
        "games_count": len(unique_game_names),
        "friends_count": friends_count,
        "posts_count": posts_count,
        "avatar_url": (
            f"/profiles/id/{user.id}/media/avatar?v={media_version}"
            if media and media.avatar_data else None
        ),
        "cover_url": (
            f"/profiles/id/{user.id}/media/cover?v={media_version}"
            if media and media.cover_data else None
        ),
        **profile
    }


# =========================================
# BUSCAR PERFIL
# =========================================

@router.get("/profile")
def get_profile(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return build_profile_response(user, db)


@router.put("/profile/media")
def update_profile_media(
    data: ProfileMediaUpdate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if data.avatar_data_url is None and data.cover_data_url is None:
        raise HTTPException(
            status_code=422,
            detail="Selecione uma foto ou uma imagem de capa para salvar.",
        )

    media = db.get(models.UserProfileMedia, user.id)
    if media is None:
        media = models.UserProfileMedia(user_id=user.id)

    if data.avatar_data_url is not None:
        media.avatar_data, media.avatar_content_type = decode_profile_image(
            data.avatar_data_url,
            max_bytes=550 * 1024,
        )

    if data.cover_data_url is not None:
        media.cover_data, media.cover_content_type = decode_profile_image(
            data.cover_data_url,
            max_bytes=1_250 * 1024,
        )

    media.updated_at = datetime.now(timezone.utc)
    db.add(media)
    db.commit()
    db.refresh(media)

    version = str(int(media.updated_at.timestamp() * 1000))
    return {
        "avatar_url": (
            f"/profiles/id/{user.id}/media/avatar?v={version}"
            if media.avatar_data else None
        ),
        "cover_url": (
            f"/profiles/id/{user.id}/media/cover?v={version}"
            if media.cover_data else None
        ),
    }


# =========================================
# ATUALIZAR PERFIL
# =========================================

@router.put("/profile")
def update_profile(
    data: ProfileUpdateData,
    user: models.User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):
    existing_username = db.scalar(
        select(models.User.id).where(
            models.User.username == data.username,
            models.User.id != user.id
        )
    )

    if existing_username is not None:
        raise HTTPException(
            status_code=409,
            detail="Este nome de usuário já está em uso."
        )

    user.name = data.name
    user.username = data.username

    user.profile_data = {
        "course": data.course,
        "semester": data.semester,
        "join_date": data.join_date,
        "status": data.status,
        "bio": data.bio,
        "platforms": data.platforms,
        "genres": data.genres,
        "current_game": data.current_game,
        "current_game_status": data.current_game_status
    }

    try:
        db.commit()

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=409,
            detail="Este nome de usuário já está em uso."
        )

    db.refresh(user)

    return build_profile_response(user, db)