import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

load_dotenv()

url = os.getenv("DATABASE_URL")
if url is None:
    raise RuntimeError("DATABASE_URL não encontrada. Confira o arquivo .env")

# Força o driver psycopg2 (o mesmo ajuste que fizemos no teste)
if url.startswith("postgres://"):
    url = url.replace("postgres://", "postgresql+psycopg2://", 1)
elif url.startswith("postgresql://"):
    url = url.replace("postgresql://", "postgresql+psycopg2://", 1)

engine = create_engine(url, pool_pre_ping=True)
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