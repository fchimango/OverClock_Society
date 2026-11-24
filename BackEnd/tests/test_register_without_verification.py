"""Cadastro direto (padrão) e confirmação de e-mail opcional."""

import os

os.environ.setdefault("DATABASE_URL", "sqlite://")

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import auth
import models
from security import hash_password


@compiles(JSONB, "sqlite")
def _jsonb_as_json(_type, _compiler, **_kwargs):
    return "JSON"


@pytest.fixture(autouse=True)
def _no_email(monkeypatch):
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


def _register(db):
    return auth.register(
        auth.RegisterData(
            name="Maria Souza",
            username="maria.s",
            email="maria@exemplo.com",
            password="senha-segura-1",
        ),
        db,
    )


def _add_unverified_user(db):
    user = models.User(
        name="Conta Antiga",
        username="conta.antiga",
        email="antiga@exemplo.com",
        password_hash=hash_password("senha-segura-1"),
        email_verified=False,
    )
    db.add(user)
    db.commit()
    return user


def test_register_by_default_creates_verified_account_and_session(
    db, monkeypatch
):
    monkeypatch.delenv("EMAIL_VERIFICATION_REQUIRED", raising=False)

    result = _register(db)

    assert result["verification_required"] is False
    assert result["access_token"]
    user = db.query(models.User).filter_by(email="maria@exemplo.com").one()
    assert user.email_verified is True


def test_login_and_session_work_for_unverified_account_by_default(
    db, monkeypatch
):
    monkeypatch.delenv("EMAIL_VERIFICATION_REQUIRED", raising=False)
    _add_unverified_user(db)

    login = auth.login(
        auth.LoginData(email="antiga@exemplo.com", password="senha-segura-1"),
        db,
    )
    assert login["access_token"]

    current = auth.get_current_user(
        HTTPAuthorizationCredentials(
            scheme="Bearer", credentials=login["access_token"]
        ),
        db,
    )
    assert current.email == "antiga@exemplo.com"


def test_verification_can_be_turned_back_on(db, monkeypatch):
    monkeypatch.setenv("EMAIL_VERIFICATION_REQUIRED", "true")

    result = _register(db)

    assert result["verification_required"] is True
    assert "access_token" not in result
    user = db.query(models.User).filter_by(email="maria@exemplo.com").one()
    assert user.email_verified is False

    with pytest.raises(HTTPException) as error:
        auth.login(
            auth.LoginData(email="maria@exemplo.com", password="senha-segura-1"),
            db,
        )

    assert error.value.status_code == 403
