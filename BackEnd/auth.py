import re
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

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

import models

from database import get_db

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
    user: models.User = Depends(
        get_current_user
    )
):
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "username": user.username
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


# =========================================
# DADOS PADRÃO DO PERFIL
# =========================================

DEFAULT_PROFILE_DATA = {
    "course": "Engenharia de Software",
    "semester": 6,
    "join_date": None,
    "status": "online",
    "bio": (
        "Apaixonado por RPGs, jogos de aventura "
        "e experiências single player. Sempre "
        "procurando conhecer novos jogos e "
        "novos jogadores da faculdade."
    ),
    "platforms": [
        "PC",
        "PlayStation 5"
    ],
    "genres": [
        "RPG",
        "Ação",
        "Aventura",
        "Soulslike",
        "Sandbox"
    ],
    "current_game": "Elden Ring",
    "current_game_status": "available"
}


def build_profile_response(user):
    profile = {
        **DEFAULT_PROFILE_DATA,
        "platforms": DEFAULT_PROFILE_DATA["platforms"].copy(),
        "genres": DEFAULT_PROFILE_DATA["genres"].copy()
    }

    profile.update(
        user.profile_data or {}
    )

    if (
        not profile.get("join_date")
        and user.created_at
    ):
        profile["join_date"] = (
            user.created_at.strftime("%Y-%m")
        )

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "username": user.username,
        **profile
    }


# =========================================
# BUSCAR PERFIL
# =========================================

@router.get("/profile")
def get_profile(
    user: models.User = Depends(
        get_current_user
    )
):
    return build_profile_response(user)


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

    return build_profile_response(user)