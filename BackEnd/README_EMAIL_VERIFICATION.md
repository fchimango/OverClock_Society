# Confirmação de e-mail — Overclock Society

## Como funciona

1. O cadastro cria a conta com `email_verified = false`.
2. O backend gera um código aleatório de 6 dígitos e envia por SMTP.
3. O código expira em 10 minutos, aceita até cinco tentativas e só pode ser utilizado uma vez.
4. O usuário informa o código na tela de cadastro para confirmar o endereço.
5. O login só é liberado depois da confirmação.
6. É possível pedir outro código com intervalo mínimo de 60 segundos.

O banco armazena somente o HMAC do código, nunca o código em texto puro.

## Configuração local

Configure as variáveis abaixo em `BackEnd/.env` (não compartilhe esse arquivo e não o envie ao Git):

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=SEU_EMAIL
SMTP_PASSWORD=SUA_SENHA_DE_APLICATIVO
SMTP_FROM_EMAIL=SEU_EMAIL
SMTP_FROM_NAME=Overclock Society
SMTP_USE_SSL=false
SMTP_TIMEOUT_SECONDS=20
```

- Para SMTP na porta `587`, use `SMTP_USE_SSL=false` (STARTTLS).
- Para SMTP na porta `465`, use `SMTP_USE_SSL=true`.
- O provedor deve autorizar o envio autenticado pela conta configurada.
- Em provedores que exigem senha de aplicativo, não use a senha normal da conta de e-mail.

O arquivo `.env.example` contém somente nomes e exemplos de variáveis; preencha o `.env` local com seus próprios dados.

## Render / produção

Cadastre as mesmas variáveis SMTP na seção Environment do serviço backend do Render. Não coloque credenciais SMTP no frontend, no GitHub ou no Netlify.

## Banco de dados e contas existentes

Na inicialização, `main.py` adiciona as colunas necessárias com `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`. Contas que já existiam recebem `email_verified = TRUE` para continuarem funcionando. Novos cadastros definem explicitamente `FALSE` até a confirmação.

## Endpoints

- `POST /auth/register`: cria conta pendente e envia o código.
- `POST /auth/verify-email`: valida o código e confirma o endereço.
- `POST /auth/resend-verification`: solicita outro código.
- `POST /auth/login`: bloqueia login enquanto o endereço não estiver confirmado.

## Testes

Na pasta `BackEnd`:

```powershell
py -m pytest tests/test_email_service.py -q
```

Antes de testar um cadastro real, configure o SMTP no `.env`. Se o serviço SMTP falhar, o cadastro pendente permanece salvo e a tela permite solicitar o reenvio depois da correção.
