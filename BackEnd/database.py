
import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import DeclarativeBase, sessionmaker

load_dotenv()

database_url = os.getenv("DATABASE_URL")

if not database_url:
    raise RuntimeError(
        "DATABASE_URL não encontrada. Confira o arquivo .env"
    )

url = make_url(database_url)
connect_args = {}

# Configuração para PostgreSQL utilizando pg8000
if url.drivername in {
    "postgres",
    "postgresql",
    "postgresql+psycopg2",
}:
    query = dict(url.query)

    # Parâmetros específicos do driver anterior
    sslmode = query.pop("sslmode", None)
    query.pop("channel_binding", None)

    url = url.set(
        drivername="postgresql+pg8000",
        query=query,
    )

    # Mantém o SSL obrigatório quando configurado na URL original
    if sslmode == "require":
        connect_args["ssl_context"] = True
    elif sslmode not in (None, "disable"):
        raise RuntimeError(
            f"Modo SSL '{sslmode}' precisa de configuração específica "
            "para o pg8000."
        )

    elif sslmode == "disable":
        connect_args["ssl_context"] = False

engine = create_engine(
    url,
    pool_pre_ping=True,
    connect_args=connect_args,
)

SessionLocal = sessionmaker(bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """Abre uma sessão com o banco e fecha quando o pedido termina."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
