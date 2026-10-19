from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from pydantic import BaseModel, EmailStr, Field, field_validator

from sqlalchemy import select
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

    email: EmailStr

    password: str = Field(
        min_length=8,
        max_length=50
    )

    @field_validator("name")
    @classmethod
    def validate_name(
        cls,
        value: str
    ):
        name = value.strip()

        if len(name) < 2:
            raise ValueError(
                "Informe seu nome com pelo menos 2 caracteres."
            )

        return name


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

    existente = db.scalar(
        select(models.User).where(
            models.User.email == email
        )
    )

    if existente:
        raise HTTPException(
            status_code=409,
            detail="Este e-mail já está em uso"
        )

    novo = models.User(
        name=data.name,
        email=email,
        password_hash=hash_password(
            data.password
        )
    )

    db.add(novo)
    db.commit()

    return {
        "message": "Conta criada com sucesso!"
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
            models.User.email
            == data.email.lower()
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
    "access_token": create_token(
        user.id
    ),
    "token_type": "bearer",
    "id": user.id,
    "name": user.name,
    "email": user.email
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
    "access_token": create_token(
        user.id
    ),
    "token_type": "bearer",
    "id": user.id,
    "name": user.name,
    "email": user.email
}