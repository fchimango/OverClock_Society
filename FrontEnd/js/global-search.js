/* =========================================
   OVERCLOCK SOCIETY — BUSCA GLOBAL
   Busca jogadores, jogos e publicações.
========================================= */

(() => {
    const input = document.getElementById("searchInput");
    const searchHost = input?.closest(".header-search");

    if (!input || !searchHost) return;

    const API_BASE_URL =
        window.OVERCLOCK_API_BASE_URL;

    const params = new URLSearchParams(window.location.search);
    const initialFeedSearch = params.get("search");

    // O Feed usa esse parâmetro para filtrar as publicações ao abrir um jogo
    // nos resultados. O valor é colocado aqui também para manter o cabeçalho
    // consistente com a lista filtrada.
    if (initialFeedSearch && /(?:^|\/)feed\.html$/i.test(window.location.pathname)) {
        input.value = initialFeedSearch;
    }

    const panel = document.createElement("div");
    panel.className = "global-search-panel";
    panel.id = "globalSearchPanel";
    panel.hidden = true;
    panel.setAttribute("role", "region");
    panel.setAttribute("aria-label", "Resultados da busca global");
    searchHost.appendChild(panel);

    input.setAttribute("autocomplete", "off");
    input.setAttribute("aria-controls", panel.id);
    input.setAttribute("aria-expanded", "false");

    let debounceTimer = null;
    let requestSequence = 0;
    let activeController = null;

    function openPanel() {
        panel.hidden = false;
        input.setAttribute("aria-expanded", "true");
    }

    function closePanel() {
        panel.hidden = true;
        input.setAttribute("aria-expanded", "false");
    }

    function setMessage(message, className = "global-search-message") {
        panel.replaceChildren();
        const messageElement = document.createElement("div");
        messageElement.className = className;
        messageElement.textContent = message;
        panel.appendChild(messageElement);
        openPanel();
    }

    function addSection(title, results, renderResult) {
        if (!results.length) return;

        const section = document.createElement("section");
        section.className = "global-search-section";

        const heading = document.createElement("h3");
        heading.className = "global-search-section-title";
        heading.textContent = title;
        section.appendChild(heading);

        const list = document.createElement("div");
        list.className = "global-search-section-list";
        results.forEach((item) => list.appendChild(renderResult(item)));
        section.appendChild(list);
        panel.appendChild(section);
    }

    function createResultLink({ href, icon, title, subtitle, type }) {
        const link = document.createElement("a");
        link.className = "global-search-result";
        link.href = href;
        link.dataset.resultType = type;

        const iconElement = document.createElement("span");
        iconElement.className = "global-search-result-icon";
        iconElement.textContent = icon;
        iconElement.setAttribute("aria-hidden", "true");

        const content = document.createElement("span");
        content.className = "global-search-result-content";

        const titleElement = document.createElement("strong");
        titleElement.className = "global-search-result-title";
        titleElement.textContent = title;
        content.appendChild(titleElement);

        if (subtitle) {
            const subtitleElement = document.createElement("span");
            subtitleElement.className = "global-search-result-subtitle";
            subtitleElement.textContent = subtitle;
            content.appendChild(subtitleElement);
        }

        const arrow = document.createElement("span");
        arrow.className = "global-search-result-arrow";
        arrow.textContent = "↗";
        arrow.setAttribute("aria-hidden", "true");

        link.append(iconElement, content, arrow);
        return link;
    }

    function renderUser(user) {
        const ownProfile =
            user.is_self || String(user.id) === String(localStorage.getItem("userId"));
        const href = ownProfile
            ? "perfil.html"
            : `perfil-usuario.html?userId=${encodeURIComponent(user.id)}`;
        const username = user.username
            ? `@${String(user.username).replace(/^@+/, "")}`
            : "Usuário";
        const subtitle = ownProfile
            ? `Seu perfil · ${user.course || "Curso não informado"}`
            : `${username} · ${user.course || "Curso não informado"}`;

        return createResultLink({
            href,
            icon: String(user.name || "?").trim().charAt(0).toLocaleUpperCase("pt-BR") || "?",
            title: user.name || "Jogador",
            subtitle,
            type: "user",
        });
    }

    function renderGame(game) {
        const subtitleParts = [];
        if (game.genre) subtitleParts.push(game.genre);
        if (Number(game.players_count) > 0) {
            subtitleParts.push(`${game.players_count} ${Number(game.players_count) === 1 ? "jogador" : "jogadores"} com este jogo`);
        }

        return createResultLink({
            href: `feed.html?search=${encodeURIComponent(game.name || "")}`,
            icon: "🎮",
            title: game.name || "Jogo",
            subtitle: subtitleParts.join(" · ") || "Buscar publicações relacionadas",
            type: "game",
        });
    }

    function renderPost(post) {
        const compactContent = String(post.content || "").replace(/\s+/g, " ").trim();
        const preview = compactContent.length > 105
            ? `${compactContent.slice(0, 102)}…`
            : compactContent;
        const author = post.author || "Usuário";
        const username = post.username ? ` ${post.username}` : "";

        return createResultLink({
            href: `feed.html?postId=${encodeURIComponent(post.id)}`,
            icon: "📰",
            title: preview || "Publicação",
            subtitle: `Por ${author}${username} · ${post.created_at || "Publicação do Feed"}`,
            type: "post",
        });
    }

    function renderResults(data, term) {
        panel.replaceChildren();

        addSection("Jogadores", Array.isArray(data.users) ? data.users : [], renderUser);
        addSection("Jogos", Array.isArray(data.games) ? data.games : [], renderGame);
        addSection("Publicações", Array.isArray(data.posts) ? data.posts : [], renderPost);

        if (!panel.children.length) {
            const emptyState = document.createElement("div");
            emptyState.className = "global-search-message";
            emptyState.textContent = `Nenhum jogador, jogo salvo ou publicação encontrado para “${term}”.`;
            panel.appendChild(emptyState);
        }

        const footer = document.createElement("div");
        footer.className = "global-search-footer";
        const helper = document.createElement("span");
        helper.textContent = "Não encontrou o jogo na comunidade? ";
        const catalogLink = document.createElement("a");
        catalogLink.href = `catalogo-jogos.html?q=${encodeURIComponent(term)}`;
        catalogLink.textContent = "Buscar no catálogo RAWG";
        footer.append(helper, catalogLink);
        panel.appendChild(footer);
        openPanel();
    }

    async function runSearch(term, sequence) {
        const token = localStorage.getItem("token");
        if (!token) {
            if (sequence === requestSequence) {
                setMessage("Sua sessão não foi encontrada. Entre novamente para pesquisar.", "global-search-message error");
            }
            return;
        }

        if (activeController) activeController.abort();
        activeController = new AbortController();

        try {
            const response = await fetch(
                `${API_BASE_URL}/search?q=${encodeURIComponent(term)}`,
                {
                    method: "GET",
                    headers: { Authorization: `Bearer ${token}` },
                    signal: activeController.signal,
                }
            );

            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                let message = `Não foi possível pesquisar (HTTP ${response.status}).`;
                if (typeof payload.detail === "string") message = payload.detail;
                else if (Array.isArray(payload.detail)) {
                    message = payload.detail.map((item) => item?.msg || String(item)).join(" ");
                }
                throw new Error(message);
            }

            if (sequence !== requestSequence) return;
            renderResults(payload, term);
        } catch (error) {
            if (error.name === "AbortError" || sequence !== requestSequence) return;
            console.error("Erro na busca global:", error);
            setMessage(error.message || "Não foi possível realizar a busca agora.", "global-search-message error");
        }
    }

    function queueSearch() {
        const term = input.value.trim();
        requestSequence += 1;
        const sequence = requestSequence;

        if (debounceTimer) window.clearTimeout(debounceTimer);
        if (activeController) activeController.abort();

        if (!term) {
            closePanel();
            panel.replaceChildren();
            return;
        }

        if (term.length < 2) {
            setMessage("Digite pelo menos 2 caracteres para pesquisar.");
            return;
        }

        setMessage("Pesquisando jogadores, jogos e publicações…", "global-search-message loading");
        debounceTimer = window.setTimeout(() => runSearch(term, sequence), 250);
    }

    input.addEventListener("input", queueSearch);
    input.addEventListener("focus", () => {
        if (input.value.trim().length >= 2) queueSearch();
    });

    input.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closePanel();
            input.blur();
            return;
        }

        if (event.key === "Enter" && !panel.hidden) {
            const firstResult = panel.querySelector("a.global-search-result");
            if (firstResult) {
                event.preventDefault();
                window.location.href = firstResult.href;
            }
        }
    });

    document.addEventListener("click", (event) => {
        if (!searchHost.contains(event.target)) closePanel();
    });

    // Se o usuário chegou ao Feed por um resultado de jogo, preserve o filtro
    // local, mas não abra automaticamente o dropdown de resultados.
    if (initialFeedSearch && input.value !== initialFeedSearch) {
        input.value = initialFeedSearch;
    }
})();
