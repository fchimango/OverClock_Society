# OverClock Society 🎮⚡

> **Comunidade gamer e hub de networking para estudantes de Engenharia de Software.**

- **Site:** https://overclock-society.netlify.app
- **API:** https://overclock-api.onrender.com (`/health` verifica se está no ar)

## Sobre o projeto

A **OverClock Society** aproxima estudantes por meio de jogos digitais, perfis gamers, coleções pessoais, amizades e publicações da comunidade. O objetivo é facilitar a descoberta de parceiros para jogar: cada pessoa monta sua coleção, publica no feed, adiciona amigos e encontra a próxima party.

## Integrantes

- Felipe Yuki
- Ricardo de Paula
- João Lucas Barbosa
- Felipy Chimango

## Funcionalidades

- **Cadastro direto:** a pessoa cria a conta e já entra no sistema. Nome e nome de usuário (nick) não podem repetir entre contas. A confirmação de e-mail por código também está implementada, mas fica desligada por padrão (veja `EMAIL_VERIFICATION_REQUIRED` abaixo).
- **Perfis personalizados:** cada conta recebe cores próprias de avatar e capa, com editor de recorte para foto e banner. Perfis públicos exibem a coleção e as publicações.
- **Dashboard:** resumo da conta, conversas recentes da comunidade, amigos online e atalhos para a coleção.
- **Catálogo global de jogos via RAWG API:** pesquisa por nome, filtros por gênero e plataforma, ordenação, capas, data de lançamento, avaliação e detalhes do jogo.
- **Coleção pessoal:** jogos favoritos (pódio de até três), jogos de que a pessoa gosta e jogos zerados, salvos no PostgreSQL. Toda conta nova começa com a coleção vazia.
- **Feed social:** publicações, comentários, curtidas, repostagens e notificações. Hashtags em qualquer parte do texto entram nos "Jogos em destaque".
- **Amizades e presença:** pesquisa de jogadores, solicitações de amizade e status online.
- **Busca global:** jogadores, jogos que aparecem nas coleções da comunidade e publicações.
- **Configurações:** alteração de senha da conta.
- **Acessibilidade:** botão de **modo daltônico** que troca a paleta de cores do sistema inteiro por uma versão segura para daltonismo (a escolha fica salva no navegador).

Matchmaking de squads, integração com Steam/Discord e salas temáticas/conquistas são possíveis extensões futuras e não fazem parte desta versão.

## Tecnologias

- **Frontend:** Vue 3 e Vite, com páginas em HTML, CSS e JavaScript.
- **Backend:** Python, FastAPI e SQLAlchemy.
- **Banco de dados:** PostgreSQL (Neon).
- **Catálogo de jogos:** [RAWG Video Games Database API](https://rawg.io/apidocs).
- **Hospedagem:** Netlify (frontend), Render (API) e Neon (banco).
- **Versionamento:** Git e GitHub.

## Executar localmente

### Pré-requisitos

- Node.js 22.12 ou superior
- Python 3
- Um banco PostgreSQL (pode ser um projeto gratuito no [Neon](https://neon.tech))
- Uma chave da RAWG API, gratuita em [rawg.io/apidocs](https://rawg.io/apidocs)

### 1. Backend

No diretório `BackEnd`, crie um ambiente virtual e instale as dependências:

```powershell
cd BackEnd
py -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Copie `BackEnd/.env.example` para `BackEnd/.env` e preencha as variáveis:

| Variável | Para que serve |
| --- | --- |
| `DATABASE_URL` | Conexão com o PostgreSQL |
| `SECRET_KEY` | Segredo aleatório usado nos tokens de login |
| `RAWG_API_KEY` | Chave da RAWG (fica só no backend, nunca no navegador) |
| `CORS_ORIGINS` | Origens do frontend autorizadas, separadas por vírgula (ex.: `http://127.0.0.1:5500`) |
| `EMAIL_VERIFICATION_REQUIRED` | Opcional. `true` liga a confirmação de e-mail por código no cadastro. Padrão: `false` |
| `SMTP_*` | Servidor de e-mail do código de confirmação. Só é usado se `EMAIL_VERIFICATION_REQUIRED=true` |

As tabelas são criadas automaticamente na primeira execução. Inicie a API a partir da pasta `BackEnd`:

```powershell
python -m uvicorn main:app --reload
```

A API fica em `http://127.0.0.1:8000`. Abra `http://127.0.0.1:8000/health` para conferir.

### 2. Frontend

Em outro terminal, na pasta `FrontEnd`:

```powershell
cd FrontEnd
npm install
npm run dev
```

Abra `http://127.0.0.1:5500/html/index.html`. Em `localhost` ou `127.0.0.1` o frontend usa automaticamente a API local (`http://127.0.0.1:8000`); em qualquer outro endereço usa a API publicada. Evite abrir os HTMLs diretamente por `file://`.

Para gerar o build de produção:

```powershell
npm run build
```

O resultado fica em `FrontEnd/dist`.

## Publicação

- **Frontend (Netlify):** o arquivo `netlify.toml` já define a pasta base (`FrontEnd`), o comando (`npm run build`) e a pasta publicada (`dist`).
- **Backend (Render):** serviço web Python com raiz em `BackEnd/`, build `pip install -r requirements.txt` e início `uvicorn main:app --host 0.0.0.0 --port $PORT`. Configure no painel as mesmas variáveis do `.env`, com `CORS_ORIGINS` apontando para o endereço do site no Netlify.
- Cada commit na `main` publica automaticamente os dois serviços.
- A confirmação de e-mail fica desligada em produção: os serviços gratuitos do Render bloqueiam as portas de SMTP. Para ligá-la, use um plano pago ou um provedor de e-mail com SMTP em porta liberada (como a 2525) e defina `EMAIL_VERIFICATION_REQUIRED=true`.

`FrontEnd/js/api-config.js` concentra a URL da API usada pelo frontend. Nunca coloque credenciais reais no README, nos arquivos JavaScript ou no Git.

## Principais endpoints

- `POST /auth/register`, `POST /auth/verify-email`, `POST /auth/login`, `GET /auth/me`
- `PUT /auth/profile`, `PUT /auth/password`
- `GET /catalog/games?q=elden&page=1&page_size=24`, `GET /catalog/genres`, `GET /catalog/platforms`, `GET /catalog/games/{id}`
- `GET /feed/posts?page=1&page_size=20`
- `GET /health`

A documentação interativa completa fica em `/docs` na própria API. As consultas ao catálogo passam pelo backend, que as mantém em cache em memória por cinco minutos.

## RAWG API e atribuição

A página do catálogo e o modal de adição de jogos mantêm atribuição com link para a RAWG, conforme os requisitos da API. Respeite a quota e os termos do plano escolhido.

## Testes manuais sugeridos

1. Criar uma conta e conferir que o sistema já abre o dashboard logado.
2. Tentar criar outra conta com o mesmo nome ou nome de usuário e conferir a mensagem de recusa.
3. Abrir o catálogo, pesquisar um jogo, aplicar filtros e abrir os detalhes.
4. Adicionar um jogo à coleção e confirmar que ele continua lá depois de atualizar a página.
5. Publicar no feed com uma hashtag no meio do texto e conferir os "Jogos em destaque".
6. Curtir, comentar e repostar com duas contas para conferir as notificações.
7. Em Configurações, alterar a senha e entrar novamente com a nova.
8. Ativar o modo daltônico na página inicial e navegar pelo sistema.

## Testes automatizados

Os testes do backend não usam a chave RAWG nem fazem chamadas externas:

```powershell
cd BackEnd
py -m pip install -r requirements-dev.txt
py -m pytest tests
```
