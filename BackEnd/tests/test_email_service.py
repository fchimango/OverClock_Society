from email_service import (
    generate_verification_code,
    hash_verification_code,
    verification_code_matches,
)


def test_generated_verification_code_has_six_digits():
    code = generate_verification_code()
    assert len(code) == 6
    assert code.isdigit()


def test_verification_code_is_stored_as_a_hash():
    secret = "test-only-secret"
    code = "004281"
    digest = hash_verification_code("Player@Example.com", code, secret)

    assert digest != code
    assert len(digest) == 64
    assert verification_code_matches("player@example.com", code, digest, secret)


def test_verification_code_is_bound_to_email_and_secret():
    secret = "test-only-secret"
    code = "004281"
    digest = hash_verification_code("player@example.com", code, secret)

    assert not verification_code_matches("another@example.com", code, digest, secret)
    assert not verification_code_matches("player@example.com", code, digest, "different-secret")
    assert not verification_code_matches("player@example.com", "004282", digest, secret)


def test_smtp_delivery_uses_starttls_and_sends_the_code(monkeypatch):
    import email_service

    sent_messages = []
    smtp_events = []

    class FakeSMTP:
        def __init__(self, host, port, timeout):
            smtp_events.append(("connect", host, port, timeout))

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, traceback):
            smtp_events.append(("close",))

        def ehlo(self):
            smtp_events.append(("ehlo",))

        def starttls(self, context=None):
            smtp_events.append(("starttls",))

        def login(self, username, password):
            smtp_events.append(("login", username))

        def send_message(self, message):
            sent_messages.append(message)

    monkeypatch.setenv("SMTP_HOST", "smtp.example.test")
    monkeypatch.setenv("SMTP_PORT", "587")
    monkeypatch.setenv("SMTP_USERNAME", "sender@example.test")
    monkeypatch.setenv("SMTP_PASSWORD", "test-password")
    monkeypatch.setenv("SMTP_FROM_EMAIL", "sender@example.test")
    monkeypatch.setenv("SMTP_FROM_NAME", "Overclock Society")
    monkeypatch.setenv("SMTP_USE_SSL", "false")
    monkeypatch.setattr(email_service.smtplib, "SMTP", FakeSMTP)

    email_service.send_verification_email("player@example.test", "012345")

    assert ("starttls",) in smtp_events
    assert ("login", "sender@example.test") in smtp_events
    assert len(sent_messages) == 1
    assert sent_messages[0]["To"] == "player@example.test"
    assert "012345" in sent_messages[0].get_body(preferencelist=("plain",)).get_content()


def test_smtp_missing_configuration_fails_without_attempting_delivery(monkeypatch):
    import pytest
    from email_service import EmailDeliveryError, send_verification_email

    for key in (
        "SMTP_HOST",
        "SMTP_USERNAME",
        "SMTP_PASSWORD",
        "SMTP_FROM_EMAIL",
    ):
        monkeypatch.delenv(key, raising=False)

    with pytest.raises(EmailDeliveryError, match="não está configurado"):
        send_verification_email("player@example.test", "123456")
