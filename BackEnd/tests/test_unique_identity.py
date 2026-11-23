"""Nome e nome de usuário não podem repetir entre contas."""

import os

os.environ.setdefault("DATABASE_URL", "sqlite://")

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import auth
import models


@compiles(JSONB, "sqlite")
def _jsonb_as_json(_type, _compiler, **_kwargs):
    return "JSON"


@pytest.fixture(autouse=True)
def _no_email(monkeypatch):
    # O cadastro envia um código por e-mail; nos testes isso não deve sair.
    monkeypatch.setattr(auth, "_deliver_verification", lambda *a, **k: None)


@pytest.fixture()
def db():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    models.Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


def _register(db, name, username, email):
    return auth.register(
        auth.RegisterData(
            name=name,
            username=username,
            email=email,
            password="senha-segura-1",
        ),
        db,
    )


def test_register_rejects_same_name_ignoring_case_and_spaces(db):
    _register(db, "Maria Souza", "maria.s", "maria@exemplo.com")

    for repeated in ("maria souza", "  MARIA   SOUZA ", "Maria Souza"):
        with pytest.raises(HTTPException) as error:
            _register(db, repeated, "outro.nick", "outro@exemplo.com")

        assert error.value.status_code == 409
        assert "nome" in error.value.detail.lower()


def test_register_rejects_same_username_ignoring_case(db):
    _register(db, "Maria Souza", "maria.s", "maria@exemplo.com")

    with pytest.raises(HTTPException) as error:
        _register(db, "Joana Lima", "@MARIA.S", "joana@exemplo.com")

    assert error.value.status_code == 409
    assert "usuário" in error.value.detail


def test_register_accepts_different_name_and_username(db):
    _register(db, "Maria Souza", "maria.s", "maria@exemplo.com")
    created = _register(db, "Maria Souza Lima", "maria.l", "lima@exemplo.com")

    assert created["email"] == "lima@exemplo.com"
    assert _user(db, "lima@exemplo.com").name == "Maria Souza Lima"


def _profile(name, username):
    return auth.ProfileUpdateData(name=name, username=username)


def _user(db, email):
    return db.query(models.User).filter_by(email=email).one()


def test_update_profile_rejects_name_of_another_account(db):
    _register(db, "Maria Souza", "maria.s", "maria@exemplo.com")
    _register(db, "Joana Lima", "joana.l", "joana@exemplo.com")

    with pytest.raises(HTTPException) as error:
        auth.update_profile(
            _profile("maria souza", "joana.l"),
            _user(db, "joana@exemplo.com"),
            db,
        )

    assert error.value.status_code == 409


def test_update_profile_keeps_working_with_pre_existing_duplicate(db):
    # Duas contas antigas com o mesmo nome, criadas antes da regra.
    for number in (1, 2):
        db.add(
            models.User(
                name="João Lucas",
                username=f"joao.{number}",
                email=f"joao{number}@exemplo.com",
                password_hash="x",
            )
        )
    db.commit()

    # Salvar o perfil sem trocar o nome não pode ser bloqueado.
    auth.update_profile(
        _profile("João Lucas", "joao.1"),
        _user(db, "joao1@exemplo.com"),
        db,
    )

    # Trocar o nome para o de outra pessoa continua bloqueado.
    _register(db, "Maria Souza", "maria.s", "maria@exemplo.com")

    with pytest.raises(HTTPException):
        auth.update_profile(
            _profile("Maria Souza", "joao.1"),
            _user(db, "joao1@exemplo.com"),
            db,
        )
