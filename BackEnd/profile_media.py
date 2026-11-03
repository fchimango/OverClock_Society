"""Validação de imagens de perfil antes de gravá-las no PostgreSQL."""

import base64
import binascii
import re

from fastapi import HTTPException


def decode_profile_image(data_url: str, *, max_bytes: int) -> tuple[bytes, str]:
    """Valida e decodifica uma imagem JPEG, PNG ou WebP enviada pelo navegador."""
    match = re.fullmatch(
        r"data:image/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})",
        data_url,
        flags=re.IGNORECASE,
    )
    if not match:
        raise HTTPException(
            status_code=422,
            detail="Use uma imagem JPEG, PNG ou WebP válida.",
        )

    content_type = f"image/{match.group(1).lower()}"
    try:
        image_bytes = base64.b64decode(match.group(2), validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(
            status_code=422,
            detail="Não foi possível ler a imagem enviada.",
        ) from None

    if not image_bytes or len(image_bytes) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"A imagem ultrapassa o limite de {max_bytes // 1024} KB.",
        )

    signatures = {
        "image/jpeg": image_bytes.startswith(b"\xff\xd8\xff"),
        "image/png": image_bytes.startswith(b"\x89PNG\r\n\x1a\n"),
        "image/webp": (
            len(image_bytes) >= 12
            and image_bytes.startswith(b"RIFF")
            and image_bytes[8:12] == b"WEBP"
        ),
    }
    if not signatures.get(content_type, False):
        raise HTTPException(
            status_code=422,
            detail="O conteúdo do arquivo não corresponde ao formato da imagem.",
        )

    return image_bytes, content_type
