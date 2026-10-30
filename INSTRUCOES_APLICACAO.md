# Aplicar a atualização da Overclock Society

## Antes de começar

1. Faça uma cópia da pasta atual ou confirme que o estado local está salvo no Git.
2. Extraia este ZIP diretamente sobre a raiz do projeto `OverClock_Society`, mantendo as pastas `BackEnd` e `FrontEnd`.
3. Quando o Windows perguntar se deseja substituir arquivos, aceite a substituição dos arquivos do projeto.
4. O ZIP **não contém `BackEnd/.env`**. O arquivo `.env` local que você já tem deve permanecer no lugar; não o apague nem o substitua pelo `.env.example`.

## Configurar a RAWG

1. Obtenha uma chave de API em https://rawg.io/apidocs.
2. Abra `BackEnd/.env` localmente e adicione ou atualize a linha:

   ```dotenv
   RAWG_API_KEY=sua_chave_aqui
   ```

3. Não coloque a chave em nenhum arquivo JavaScript e não a envie ao GitHub.
4. A RAWG exige atribuição com link ativo em cada página que usa seus dados/imagens. A página do catálogo e a área de coleção mantêm esses links. Confira os termos e o plano aplicável antes de monetizar o projeto.

## Instalar e executar

No terminal do VS Code, rode o backend em um terminal:

```powershell
cd "D:\ProjetoProgramação\Projeto_Web\OverClock_Society\BackEnd"
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload
```

Em outro terminal, rode o frontend:

```powershell
cd "D:\ProjetoProgramação\Projeto_Web\OverClock_Society\FrontEnd"
py -m http.server 5500
```

Abra `http://127.0.0.1:5500/html/catalogo-jogos.html`.

## Testes rápidos

- `http://127.0.0.1:8000/health` deve retornar `{"status":"ok"}`.
- Abra o catálogo, pesquise um jogo, use filtros de gênero/plataforma e abra os detalhes.
- Entre na conta, adicione um jogo à coleção e confirme que o modal pede sua própria nota de 0 a 10.
- No Feed, teste carregar mais publicações e abrir uma publicação por notificação ou perfil.
- Em Amigos e em perfis públicos, confirme que os filtros locais não interferem com a busca global do cabeçalho.

Testes automatizados locais:

```powershell
cd "D:\ProjetoProgramação\Projeto_Web\OverClock_Society\BackEnd"
python -m pip install -r requirements-dev.txt
python -m pytest tests
```

## Antes de hospedar

`FrontEnd/js/api-config.js` mantém a URL de produção vazia de propósito até ser criado o backend próprio da Overclock Society. Não use a URL de Render de outro projeto. Ao publicar este projeto, configure a URL real do backend nessa constante e configure no serviço `DATABASE_URL`, `SECRET_KEY`, `RAWG_API_KEY` e `CORS_ORIGINS`.
