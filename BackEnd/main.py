from contextlib import asynccontextmanager
import os

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from pydantic import BaseModel, EmailStr, Field, field_validator

from sqlalchemy import select, text
from sqlalchemy.orm import Session

import auth
import feed_routes
import friends_routes
import games_routes
import models

from database import Base, engine, get_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Cria tabelas que ainda não existem, incluindo
    # posts, comentários, curtidas, repostagens, jogos e amizades.
    Base.metadata.create_all(bind=engine)

    # Atualiza a tabela users existente.
    with engine.begin() as connection:
        connection.execute(
            text("""
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS username VARCHAR(32)
            """)
        )

        connection.execute(
            text("""
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS profile_data JSONB
                NOT NULL DEFAULT '{}'::jsonb
            """)
        )

        connection.execute(
            text("""
                CREATE UNIQUE INDEX IF NOT EXISTS
                ix_users_username
                ON users (username)
                WHERE username IS NOT NULL
            """)
        )

    yield


app = FastAPI(
    lifespan=lifespan
)


# =========================================
# CORS
# =========================================

origens = os.getenv(
    "CORS_ORIGINS",
    "http://127.0.0.1:5500,http://localhost:5500"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origem.strip()
        for origem in origens
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================
# ROTAS
# =========================================

app.include_router(auth.router)
app.include_router(feed_routes.router)
app.include_router(games_routes.router)
app.include_router(friends_routes.router)


# =========================================
# ERROS DE VALIDAÇÃO
# =========================================

@app.exception_handler(RequestValidationError)
async def erro_de_validacao(
    request: Request,
    exc: RequestValidationError
):
    mensagens = {
        "email": "Informe um e-mail válido.",
        "name": "Informe seu nome (mínimo de 2 caracteres).",
        "username": "Informe um nome de usuário válido.",
        "password": "A senha precisa ter no mínimo 8 caracteres.",
        "contact": "O contato deve ter no máximo 60 caracteres.",
        "content": (
            "O texto é obrigatório e deve respeitar "
            "o limite de caracteres."
        )
    }

    erros = []

    for erro in exc.errors():
        campo = str(erro["loc"][-1])

        erros.append(
            mensagens.get(
                campo,
                "Dados inválidos."
            )
        )

    return JSONResponse(
        status_code=422,
        content={
            "detail": erros
        }
    )


# =========================================
# MODELO DE LEAD
# =========================================

class LeadCreate(BaseModel):
    name: str = Field(
        min_length=2,
        max_length=120
    )

    email: EmailStr

    contact: str | None = Field(
        default=None,
        max_length=60
    )

    website: str | None = None

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

    @field_validator("contact")
    @classmethod
    def clean_contact(
        cls,
        value: str | None
    ):
        if value is None:
            return None

        contact = value.strip()

        return contact if contact else None


# =========================================
# HEALTH
# =========================================

@app.get("/health")
def health():
    return {
        "status": "ok"
    }


# =========================================
# LEADS
# =========================================

@app.post(
    "/leads",
    status_code=201
)
def create_lead(
    lead: LeadCreate,
    db: Session = Depends(get_db)
):
    email = lead.email.lower()

    # Honeypot: se estiver preenchido,
    # tratamos como automatização.
    if lead.website:
        return {
            "message": "Cadastro realizado!"
        }

    existente = db.scalar(
        select(models.Lead).where(
            models.Lead.email == email
        )
    )

    if existente:
        raise HTTPException(
            status_code=409,
            detail="Este e-mail já está em uso"
        )

    novo = models.Lead(
        name=lead.name,
        email=email,
        contact=lead.contact
    )

    db.add(novo)
    db.commit()

    return {
        "message": "Cadastro realizado!"
    }