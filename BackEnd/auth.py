import os
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
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
from email_service import (
    EmailDeliveryError,
    generate_verification_code,
    hash_verification_code,
    send_verification_email,
    verification_code_matches,
)
from profile_media import decode_profile_image

from security import (
    SECRET_KEY,
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
# UNICIDADE DE NOME E NOME DE USUÁRIO
# =========================================

def clean_display_name(name: str) -> str:
    """Tira espaços nas pontas e junta espaços repetidos."""
    return " ".join(name.split())


def display_name_taken(
    db: Session,
    name: str,
    exclude_id: int | None = None
) -> bool:
    """Vale como igual se mudar só maiúsculas/minúsculas ou espaços."""
    stmt = select(models.User.id).where(
        func.lower(func.trim(models.User.name))
        == clean_display_name(name).lower()
    )

    if exclude_id is not None:
        stmt = stmt.where(models.User.id != exclude_id)

    return db.scalar(stmt.limit(1)) is not None


def username_taken(
    db: Session,
    username: str,
    exclude_id: int | None = None
) -> bool:
    stmt = select(models.User.id).where(
        func.lower(models.User.username) == username.lower()
    )

    if exclude_id is not None:
        stmt = stmt.where(models.User.id != exclude_id)

    return db.scalar(stmt.limit(1)) is not None


def email_verification_required() -> bool:
    """Confirmação de e-mail por código. Desligada por padrão.

    Para ligar, defina EMAIL_VERIFICATION_REQUIRED=true e configure o SMTP.
    Os serviços gratuitos do Render bloqueiam as portas de SMTP, então
    em produção o cadastro funciona sem esse passo.
    """
    return os.getenv(
        "EMAIL_VERIFICATION_REQUIRED", "false"
    ).strip().lower() in {"1", "true", "yes", "on"}


NAME_TAKEN_MESSAGE = (
    "Já existe uma conta com esse nome. "
    "Use outro nome ou acrescente um sobrenome."
)


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

        name = clean_display_name(value)

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


class PasswordChangeData(BaseModel):
    current_password: str = Field(
        min_length=1,
        max_length=50
    )

    new_password: str = Field(
        min_length=8,
        max_length=50
    )


class EmailVerificationData(BaseModel):
    email: EmailStr
    code: str = Field(pattern=r"^\d{6}$")


class ResendVerificationData(BaseModel):
    email: EmailStr


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

    if email_verification_required() and not user.email_verified:
        raise HTTPException(
            status_code=403,
            detail="Confirme seu e-mail antes de utilizar sua conta."
        )

    return user


VERIFICATION_CODE_TTL_MINUTES = 10
VERIFICATION_RESEND_COOLDOWN_SECONDS = 60
VERIFICATION_MAX_ATTEMPTS = 5


def _utc_datetime(value: datetime) -> datetime:
    """Normalize database datetimes to UTC-aware values."""
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _prepare_verification(user: models.User, db: Session) -> str:
    """Persist a new one-time code before attempting SMTP delivery."""
    now = datetime.now(timezone.utc)
    code = generate_verification_code()
    user.email_verified = False
    user.email_verification_code_hash = hash_verification_code(
        user.email,
        code,
        SECRET_KEY,
    )
    user.email_verification_expires_at = now + timedelta(
        minutes=VERIFICATION_CODE_TTL_MINUTES
    )
    user.email_verification_sent_at = now
    user.email_verification_attempts = 0
    db.commit()
    db.refresh(user)
    return code


def _deliver_verification(user: models.User, db: Session, code: str) -> None:
    try:
        send_verification_email(user.email, code)
    except EmailDeliveryError:
        # Permite solicitar novo envio imediatamente quando o SMTP falhar.
        user.email_verification_sent_at = None
        db.commit()
        raise


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
    email = str(data.email).strip().lower()

    existing_email = db.scalar(
        select(models.User).where(
            models.User.email == email
        )
    )

    if existing_email:
        if not existing_email.email_verified:
            raise HTTPException(
                status_code=409,
                detail={
                    "message": (
                        "Este e-mail já possui um cadastro pendente. "
                        "Confirme o código anterior ou solicite outro."
                    ),
                    "email_verification_required": True,
                },
            )
        raise HTTPException(
            status_code=409,
            detail="Este e-mail já está em uso."
        )

    if username_taken(db, data.username):
        raise HTTPException(
            status_code=409,
            detail="Este nome de usuário já está em uso."
        )

    if display_name_taken(db, data.name):
        raise HTTPException(
            status_code=409,
            detail=NAME_TAKEN_MESSAGE
        )

    novo = models.User(
        name=data.name,
        username=data.username,
        email=email,
        password_hash=hash_password(data.password),
        email_verified=not email_verification_required(),
        # Cor própria de avatar e capa, sorteada no cadastro.
        profile_data={"theme_hue": secrets.randbelow(360)}
    )
    db.add(novo)

    if not email_verification_required():
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
            "verification_required": False,
            "access_token": create_token(novo.id),
            "token_type": "bearer",
            "id": novo.id,
            "name": novo.name,
            "email": novo.email,
            "username": novo.username,
        }

    try:
        code = _prepare_verification(novo, db)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Este e-mail ou nome de usuário já está em uso."
        )

    try:
        _deliver_verification(novo, db, code)
    except EmailDeliveryError:
        return JSONResponse(
            status_code=503,
            content={
                "detail": (
                    "Sua conta foi criada, mas não foi possível enviar o código. "
                    "Configure o serviço de e-mail e use a opção de reenviar."
                ),
                "email_verification_required": True,
            },
        )

    return {
        "message": "Conta criada! Enviamos um código de confirmação para seu e-mail.",
        "email": novo.email,
        "verification_required": True,
    }


@router.post("/verify-email")
def verify_email(
    data: EmailVerificationData,
    db: Session = Depends(get_db),
):
    email = str(data.email).strip().lower()
    user = db.scalar(
        select(models.User).where(models.User.email == email)
    )

    if user is None or user.email_verified or not user.email_verification_code_hash:
        raise HTTPException(
            status_code=400,
            detail="Código inválido ou expirado. Solicite um novo código."
        )

    if user.email_verification_attempts >= VERIFICATION_MAX_ATTEMPTS:
        raise HTTPException(
            status_code=429,
            detail="Limite de tentativas atingido. Solicite um novo código."
        )

    expires_at = user.email_verification_expires_at
    if (
        expires_at is None
        or _utc_datetime(expires_at) < datetime.now(timezone.utc)
    ):
        raise HTTPException(
            status_code=400,
            detail="Código expirado. Solicite um novo código."
        )

    if not verification_code_matches(
        email,
        data.code,
        user.email_verification_code_hash,
        SECRET_KEY,
    ):
        user.email_verification_attempts += 1
        db.commit()
        remaining = max(
            0,
            VERIFICATION_MAX_ATTEMPTS - user.email_verification_attempts,
        )
        if remaining == 0:
            raise HTTPException(
                status_code=429,
                detail="Limite de tentativas atingido. Solicite um novo código."
            )
        raise HTTPException(
            status_code=400,
            detail=f"Código incorreto. Você ainda tem {remaining} tentativa(s)."
        )

    user.email_verified = True
    user.email_verification_code_hash = None
    user.email_verification_expires_at = None
    user.email_verification_sent_at = None
    user.email_verification_attempts = 0
    db.commit()

    return {
        "message": "E-mail confirmado com sucesso! Sua sessão foi iniciada.",
        "access_token": create_token(user.id),
        "token_type": "bearer",
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "username": user.username,
    }


@router.post("/resend-verification")
def resend_verification(
    data: ResendVerificationData,
    db: Session = Depends(get_db),
):
    """Resend without revealing whether the email belongs to an account."""
    email = str(data.email).strip().lower()
    user = db.scalar(
        select(models.User).where(models.User.email == email)
    )

    generic_response = {
        "message": (
            "Se houver uma conta pendente para este e-mail, "
            "enviaremos um novo código. Verifique também a caixa de spam."
        )
    }

    if user is None or user.email_verified:
        return generic_response

    now = datetime.now(timezone.utc)
    sent_at = user.email_verification_sent_at
    if sent_at is not None:
        elapsed = (now - _utc_datetime(sent_at)).total_seconds()
        if elapsed < VERIFICATION_RESEND_COOLDOWN_SECONDS:
            # Resposta genérica para não permitir enumeração de contas por tempo.
            return generic_response

    code = _prepare_verification(user, db)
    try:
        _deliver_verification(user, db, code)
    except EmailDeliveryError:
        raise HTTPException(
            status_code=503,
            detail="Não foi possível enviar o e-mail agora. Tente novamente mais tarde."
        )

    return generic_response


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
            models.User.email == str(data.email).strip().lower()
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

    if email_verification_required() and not user.email_verified:
        raise HTTPException(
            status_code=403,
            detail={
                "message": "Confirme seu e-mail antes de entrar. Você pode solicitar um novo código abaixo.",
                "email_verification_required": True,
            },
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
        "theme_hue": (user.profile_data or {}).get("theme_hue"),
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

        value = clean_display_name(value)

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
# ALTERAR SENHA
# =========================================

@router.put("/password")
def change_password(
    data: PasswordChangeData,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not verify_password(
        data.current_password,
        user.password_hash
    ):
        raise HTTPException(
            status_code=400,
            detail="A senha atual está incorreta."
        )

    if data.current_password == data.new_password:
        raise HTTPException(
            status_code=400,
            detail="A nova senha deve ser diferente da senha atual."
        )

    user.password_hash = hash_password(data.new_password)
    db.add(user)
    db.commit()

    return {"message": "Senha atualizada com sucesso."}


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
    if username_taken(db, data.username, exclude_id=user.id):
        raise HTTPException(
            status_code=409,
            detail="Este nome de usuário já está em uso."
        )

    # Só confere o nome quando ele muda, para não travar quem já tem um
    # nome igual ao de outra conta criada antes desta regra.
    current_name = clean_display_name(user.name or "").lower()

    if (
        data.name.lower() != current_name
        and display_name_taken(db, data.name, exclude_id=user.id)
    ):
        raise HTTPException(
            status_code=409,
            detail=NAME_TAKEN_MESSAGE
        )

    user.name = data.name
    user.username = data.username

    theme_hue = (user.profile_data or {}).get("theme_hue")

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
    if theme_hue is not None:
        user.profile_data["theme_hue"] = theme_hue

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