"""Helpers for one-time email verification codes and SMTP delivery."""

from __future__ import annotations

import hashlib
import hmac
import os
import secrets
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr


class EmailDeliveryError(RuntimeError):
    """Raised when SMTP is not configured or cannot deliver a message."""


def generate_verification_code() -> str:
    """Return a cryptographically secure six-digit code, including leading zeroes."""
    return f"{secrets.randbelow(1_000_000):06d}"


def hash_verification_code(email: str, code: str, secret_key: str) -> str:
    """HMAC the code so the plain value is never stored in the database."""
    normalized_email = email.strip().lower()
    payload = f"overclock-email-verification:{normalized_email}:{code}".encode("utf-8")
    return hmac.new(secret_key.encode("utf-8"), payload, hashlib.sha256).hexdigest()


def verification_code_matches(
    email: str,
    code: str,
    stored_hash: str,
    secret_key: str,
) -> bool:
    candidate = hash_verification_code(email, code, secret_key)
    return hmac.compare_digest(candidate, stored_hash)


def send_verification_email(to_email: str, code: str) -> None:
    """Send a verification code through a configured SMTP server."""
    host = os.getenv("SMTP_HOST", "").strip()
    username = os.getenv("SMTP_USERNAME", "").strip()
    password = os.getenv("SMTP_PASSWORD", "")
    from_email = os.getenv("SMTP_FROM_EMAIL", "").strip() or username
    from_name = os.getenv("SMTP_FROM_NAME", "Overclock Society").strip()

    if not host or not from_email:
        raise EmailDeliveryError(
            "O envio de e-mail não está configurado. Configure SMTP_HOST e SMTP_FROM_EMAIL."
        )

    if bool(username) != bool(password):
        raise EmailDeliveryError(
            "A configuração SMTP está incompleta. Informe usuário e senha juntos."
        )

    try:
        port = int(os.getenv("SMTP_PORT", "587"))
        timeout = float(os.getenv("SMTP_TIMEOUT_SECONDS", "20"))
    except ValueError as exc:
        raise EmailDeliveryError("A porta ou o timeout SMTP não são válidos.") from exc

    use_ssl_value = os.getenv("SMTP_USE_SSL")
    use_ssl = (port == 465) if use_ssl_value is None else use_ssl_value.strip().lower() in {
        "1", "true", "yes", "on"
    }

    message = EmailMessage()
    message["Subject"] = "Confirme seu e-mail — Overclock Society"
    message["From"] = formataddr((from_name, from_email))
    message["To"] = to_email
    message.set_content(
        "Olá!\n\n"
        f"Seu código de confirmação da Overclock Society é: {code}\n\n"
        "O código expira em 10 minutos e só pode ser utilizado uma vez.\n"
        "Se você não criou uma conta, ignore esta mensagem.\n\n"
        "Equipe Overclock Society"
    )
    message.add_alternative(
        """\
        <html>
          <body style="font-family:Arial,sans-serif;color:#202020;line-height:1.5">
            <h2>Confirme seu e-mail</h2>
            <p>Use o código abaixo para confirmar seu endereço na Overclock Society:</p>
            <p style="font-size:30px;font-weight:bold;letter-spacing:8px">{code}</p>
            <p>O código expira em <strong>10 minutos</strong> e só pode ser utilizado uma vez.</p>
            <p>Se você não criou uma conta, ignore esta mensagem.</p>
            <p>Equipe Overclock Society</p>
          </body>
        </html>
        """.format(code=code),
        subtype="html",
    )

    try:
        context = ssl.create_default_context()
        if use_ssl:
            with smtplib.SMTP_SSL(host, port, timeout=timeout, context=context) as server:
                if username:
                    server.login(username, password)
                server.send_message(message)
        else:
            with smtplib.SMTP(host, port, timeout=timeout) as server:
                server.ehlo()
                server.starttls(context=context)
                server.ehlo()
                if username:
                    server.login(username, password)
                server.send_message(message)
    except (OSError, smtplib.SMTPException) as exc:
        raise EmailDeliveryError("Não foi possível enviar o e-mail de confirmação.") from exc
