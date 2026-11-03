"""Validação dos arquivos de avatar e capa do perfil."""

import base64
import pytest
from fastapi import HTTPException

from profile_media import decode_profile_image


def _data_url(content_type: str, payload: bytes) -> str:
    encoded = base64.b64encode(payload).decode("ascii")
    return f"data:{content_type};base64,{encoded}"


def test_decode_profile_image_accepts_jpeg() -> None:
    payload = b"\xff\xd8\xff\xe0fake-jpeg-data"

    image_bytes, content_type = decode_profile_image(
        _data_url("image/jpeg", payload),
        max_bytes=1024,
    )

    assert image_bytes == payload
    assert content_type == "image/jpeg"


def test_decode_profile_image_accepts_png() -> None:
    payload = b"\x89PNG\r\n\x1a\nrest-of-png-data"

    image_bytes, content_type = decode_profile_image(
        _data_url("image/png", payload),
        max_bytes=1024,
    )

    assert image_bytes == payload
    assert content_type == "image/png"


def test_decode_profile_image_rejects_svg_and_other_data_urls() -> None:
    with pytest.raises(HTTPException) as error:
        decode_profile_image(
            "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=",
            max_bytes=1024,
        )

    assert error.value.status_code == 422


def test_decode_profile_image_rejects_mime_signature_mismatch() -> None:
    with pytest.raises(HTTPException) as error:
        decode_profile_image(
            _data_url("image/png", b"not-a-png"),
            max_bytes=1024,
        )

    assert error.value.status_code == 422


def test_decode_profile_image_enforces_size_limit() -> None:
    payload = b"\xff\xd8\xff" + (b"x" * 100)

    with pytest.raises(HTTPException) as error:
        decode_profile_image(
            _data_url("image/jpeg", payload),
            max_bytes=32,
        )

    assert error.value.status_code == 413
