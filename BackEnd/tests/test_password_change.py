"""Testes unitários da alteração de senha da conta."""

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

import auth
from security import hash_password, verify_password


class FakeUser:
    def __init__(self, password: str) -> None:
        self.password_hash = hash_password(password)


class FakeDatabase:
    def __init__(self) -> None:
        self.added = []
        self.commits = 0

    def add(self, item) -> None:
        self.added.append(item)

    def commit(self) -> None:
        self.commits += 1


def test_change_password_saves_new_password() -> None:
    user = FakeUser("SenhaAntiga123")
    db = FakeDatabase()
    data = auth.PasswordChangeData(
        current_password="SenhaAntiga123",
        new_password="SenhaNova456",
    )

    result = auth.change_password(data, user=user, db=db)

    assert result["message"] == "Senha atualizada com sucesso."
    assert verify_password("SenhaNova456", user.password_hash)
    assert not verify_password("SenhaAntiga123", user.password_hash)
    assert db.commits == 1
    assert db.added == [user]


def test_change_password_rejects_wrong_current_password() -> None:
    user = FakeUser("SenhaAntiga123")
    db = FakeDatabase()
    data = auth.PasswordChangeData(
        current_password="SenhaErrada123",
        new_password="SenhaNova456",
    )

    with pytest.raises(HTTPException) as error:
        auth.change_password(data, user=user, db=db)

    assert error.value.status_code == 400
    assert error.value.detail == "A senha atual está incorreta."
    assert db.commits == 0


def test_change_password_rejects_reusing_current_password() -> None:
    user = FakeUser("SenhaAntiga123")
    db = FakeDatabase()
    data = auth.PasswordChangeData(
        current_password="SenhaAntiga123",
        new_password="SenhaAntiga123",
    )

    with pytest.raises(HTTPException) as error:
        auth.change_password(data, user=user, db=db)

    assert error.value.status_code == 400
    assert error.value.detail == "A nova senha deve ser diferente da senha atual."
    assert db.commits == 0


def test_change_password_requires_at_least_eight_characters() -> None:
    with pytest.raises(ValidationError):
        auth.PasswordChangeData(
            current_password="SenhaAntiga123",
            new_password="curta",
        )
