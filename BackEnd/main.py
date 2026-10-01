from pydantic import validate_call_decorator
from contextlib import asynccontextmanager
import os
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Depends, FastAPI, HTTPException
from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

import models
from database import Base, engine, get_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ao ligar o servidor, cria as tabelas que ainda não existem
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(lifespan=lifespan)

origens = os.getenv(
    "CORS_ORIGINS", "http://127.0.0.1:5500,http://localhost:5500"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origens],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(RequestValidationError)
async def erro_de_validacao(request: Request, exc: RequestValidationError):
    mensagens = {
        "email": "Informe um e-mail válido.",
        "name": "Informe seu nome (mínimo de 2 letras).",
    }
    erros = []
    for erro in exc.errors():
        campo = str(erro["loc"][-1])
        erros.append(mensagens.get(campo, "Dados inválidos."))
    return JSONResponse(status_code=422, content={"detail": erros})

class LeadCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    contact: str | None = None
    website: str | None = None
    


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/leads", status_code=201)
def create_lead(lead: LeadCreate, db: Session = Depends(get_db)):
    email = lead.email.lower()

       # Campo escondido preenchido = robô. Finge sucesso e não salva.
    if lead.website:
       return {"message": "Cadastro realizado!"}

    # Procura no banco se o e-mail já existe
    existente = db.scalar(select(models.Lead).where(models.Lead.email == email))
    if existente:
        raise HTTPException(status_code=409, detail="Este e-mail já está em uso")

    novo = models.Lead(name=lead.name, email=email, contact=lead.contact)
    db.add(novo)
    db.commit()
    return {"message": "Cadastro realizado!"}
