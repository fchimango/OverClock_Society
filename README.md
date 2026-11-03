# OverClock Society 🎮⚡

> **Comunidade gamer e hub de networking para estudantes de Engenharia de Software.**

## Sobre o projeto

A **OverClock Society** aproxima estudantes por meio de jogos digitais, perfis gamers, coleções pessoais, amizades e publicações da comunidade.

## Funcionalidades implementadas

- **Catálogo global de jogos via RAWG API:** pesquisa por nome, filtros por gênero e plataforma, ordenação, capas, data de lançamento, avaliação RAWG, Metacritic e detalhes do jogo.
- **Coleção pessoal:** jogos favoritos (pódio de até três), jogos que a pessoa gosta e jogos zerados, persistidos no PostgreSQL.
- **Perfis públicos:** exibição da coleção e das publicações de outros membros.
- **Feed social:** publicações, comentários, curtidas, repostagens e notificações persistidas.
- **Amizades e presença:** pesquisa de jogadores, solicitações de amizade e status de presença.
- **Busca global:** jogadores, jogos que aparecem nas coleções da comunidade e publicações, com acesso ao catálogo RAWG.

Matchmaking de squads, integração com Steam/Discord e salas temáticas/conquistas permanecem como possíveis extensões futuras; não são prometidas como integrações ativas neste README.

## Tecnologias

- Frontend: HTML, CSS e JavaScript.
- Backend: Python e FastAPI.
- Banco de dados: PostgreSQL / SQLAlchemy.
- Catálogo de jogos: [RAWG Video Games Database API](https://rawg.io/apidocs).

## Executar localmente

### 1. Configurar o backend

No diretório `BackEnd`, crie um ambiente virtual e instale as dependências:

```powershell
cd BackEnd
py -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Copie `BackEnd/.env.example` para `BackEnd/.env` e preencha `DATABASE_URL`, `SECRET_KEY`, `RAWG_API_KEY` e `CORS_ORIGINS`. É necessário um PostgreSQL compatível com o projeto. A chave RAWG fica somente no backend e não deve ser incluída no JavaScript do frontend.

Inicie o FastAPI, a partir da pasta `BackEnd`:

```powershell
python -m uvicorn main:app --reload
```

A API local ficará disponível em `http://127.0.0.1:8000`. O endpoint `/health` serve para verificar se o processo está ativo.

### 2. Executar o frontend

Em outro terminal, na pasta `FrontEnd`, execute:

```powershell
py -m http.server 5500
```

Abra `http://127.0.0.1:5500/html/index.html`. O catálogo público fica em `http://127.0.0.1:5500/html/catalogo-jogos.html`. Evite abrir os HTMLs diretamente por `file://`.

### 3. Endpoints do catálogo

- `GET /catalog/games?q=elden&page=1&page_size=24`
- `GET /catalog/genres`
- `GET /catalog/platforms`
- `GET /catalog/games/{id}`
- `GET /feed/posts?page=1&page_size=20` (Feed paginado, com opção de carregar mais)

O catálogo é público. Os endpoints encaminham as consultas ao RAWG pelo backend; a chave não é enviada ao navegador. Respostas são mantidas em cache em memória por cinco minutos.

### 4. RAWG API e atribuição

Obtenha sua chave em [rawg.io/apidocs](https://rawg.io/apidocs) e configure-a em `RAWG_API_KEY`. A página do catálogo e o modal de adição de jogos mantêm atribuição com link para a RAWG, conforme os requisitos apresentados pela API. Respeite a quota e os termos do plano escolhido.

## Configuração de frontend e CORS para hospedagem

`FrontEnd/js/api-config.js` concentra a URL usada pelos arquivos JavaScript. Como o backend da OverClock Society ainda não foi configurado no Render, `PRODUCTION_API_BASE_URL` está vazio intencionalmente. Depois de criar o serviço **deste projeto**, preencha essa constante com a URL real do backend. Não reutilize a URL de outro projeto.

No backend hospedado, configure as variáveis de ambiente no painel do serviço:

- `DATABASE_URL`: URL do PostgreSQL da OverClock Society.
- `SECRET_KEY`: segredo aleatório e exclusivo.
- `RAWG_API_KEY`: chave RAWG.
- `CORS_ORIGINS`: origens exatas do frontend, separadas por vírgula, por exemplo `https://SEU-FRONTEND.onrender.com` (inclua também localhost apenas quando necessário).

O frontend precisa ser publicado em uma origem que corresponda a `CORS_ORIGINS`. Não inclua credenciais reais no README, nos exemplos, nos arquivos JavaScript ou no Git.

## Testes manuais sugeridos

1. Abrir o catálogo, pesquisar pelo nome de um jogo e aplicar filtros por gênero/plataforma.
2. Abrir os detalhes e conferir capa, lançamento, gêneros, plataformas e Metacritic quando disponível.
3. Fazer login, adicionar um jogo à coleção e confirmar a persistência após atualizar `meus-jogos.html`.
4. Curtir, comentar e repostar uma publicação com duas contas para conferir as notificações.
5. Testar a busca global do cabeçalho e os campos locais de filtro de amigos/coleções separadamente.


## Testes automatizados

Para executar os testes unitários do catálogo sem usar sua chave RAWG nem fazer chamadas externas:

```powershell
cd BackEnd
py -m pip install -r requirements-dev.txt
py -m pytest tests
```
