import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
if SECRET_KEY is None:
    raise RuntimeError("SECRET_KEY não encontrada. Confira o arquivo .env")

ALGORITHM = "HS256"
TOKEN_MINUTES = 60 * 8  # o "crachá" vale 8 horas


def _bytes(password: str) -> bytes:
    # O bcrypt só lê os primeiros 72 bytes da senha
    return password.encode()[:72]


def hash_password(password: str) -> str:
    """Transforma a senha numa mistura irreversível para guardar no banco."""
    return bcrypt.hashpw(_bytes(password), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    """Confere se a senha digitada bate com a mistura guardada."""
    return bcrypt.checkpw(_bytes(password), password_hash.encode())


def create_token(user_id: int) -> str:
    """Cria o crachá (JWT) do usuário, com data de validade."""
    payload = {
        "sub": str(user_id),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=TOKEN_MINUTES),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> int | None:
    """Lê o crachá. Devolve o id do usuário, ou None se for inválido/vencido."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        return None