from contextlib import asynccontextmanager
import os

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from pydantic import BaseModel, EmailStr, Field, field_validator

from sqlalchemy import select
from sqlalchemy.orm import Session

import auth
import models

from database import Base, engine, get_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Cria tabelas que ainda não existem ao iniciar.
    Base.metadata.create_all(bind=engine)

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
# ROTAS DE AUTENTICAÇÃO
# =========================================

app.include_router(auth.router)


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
        "password": "A senha precisa ter no mínimo 8 caracteres.",
        "contact": "O contato deve ter no máximo 60 caracteres.",
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

    # Honeypot:
    # se estiver preenchido, tratamos
    # como tentativa automatizada.
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