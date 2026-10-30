/* =========================================
   CATÁLOGO GLOBAL — RAWG API
   A chave nunca é enviada ao navegador.
========================================= */
(() => {
    const API_BASE_URL = window.OVERCLOCK_API_BASE_URL;
    const PAGE_SIZE = 24;

    const searchForm = document.getElementById("catalogSearchForm");
    const searchInput = document.getElementById("catalogSearchInput");
    const genreSelect = document.getElementById("catalogGenreSelect");
    const platformSelect = document.getElementById("catalogPlatformSelect");
    const orderingSelect = document.getElementById("catalogOrderingSelect");
    const grid = document.getElementById("catalogGrid");
    const status = document.getElementById("catalogStatus");
    const countLabel = document.getElementById("catalogResultCount");
    const pagination = document.getElementById("catalogPagination");
    const previousButton = document.getElementById("catalogPreviousPage");
    const nextButton = document.getElementById("catalogNextPage");
    const pageLabel = document.getElementById("catalogPageLabel");
    const dialog = document.getElementById("catalogGameDialog");
    const dialogContent = document.getElementById("catalogGameDetails");
    const dialogClose = document.getElementById("catalogDialogClose");
    const profileButton = document.getElementById("profileButton");
    profileButton?.addEventListener("click", () => {
        window.location.href = "perfil.html";
    });

    let currentPage = 1;
    let currentCount = 0;
    let hasNextPage = false;
    let hasPreviousPage = false;
    let searchTimer = null;
    let searchSequence = 0;
    let activeController = null;
    const detailCache = new Map();

    function setStatus(message, kind = "") {
        status.textContent = message || "";
        status.classList.toggle("error", kind === "error");
    }

    function appendText(parent, tagName, className, text) {
        const element = document.createElement(tagName);
        if (className) element.className = className;
        element.textContent = text || "";
        parent.appendChild(element);
        return element;
    }

    function safeImageUrl(value) {
        try {
            const url = new URL(value);
            return url.protocol === "https:" ? url.href : "";
        } catch {
            return "";
        }
    }

    function formatDate(value) {
        if (!value) return "Data de lançamento não informada";
        const parts = String(value).split("-");
        if (parts.length !== 3 || parts.some((part) => !/^\d+$/.test(part))) {
            return String(value);
        }
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    function formatCount(value) {
        return Number(value || 0).toLocaleString("pt-BR");
    }

    function gameGenres(game) {
        return Array.isArray(game.genres)
            ? game.genres.map((genre) => genre?.name).filter(Boolean)
            : [];
    }

    function gamePlatforms(game) {
        return Array.isArray(game.platforms)
            ? game.platforms.map((platform) => platform?.name).filter(Boolean)
            : [];
    }

    function buildMetric(text, modifier = "") {
        const metric = document.createElement("span");
        metric.className = `catalog-metric${modifier ? ` ${modifier}` : ""}`;
        metric.textContent = text;
        return metric;
    }

    function createGameCard(game) {
        const card = document.createElement("article");
        card.className = "catalog-game-card";

        const cover = document.createElement("div");
        cover.className = "catalog-game-cover";
        const imageUrl = safeImageUrl(game.background_image);
        if (imageUrl) {
            const image = document.createElement("img");
            image.src = imageUrl;
            image.alt = `Capa de ${game.name || "jogo"}`;
            image.loading = "lazy";
            image.decoding = "async";
            image.referrerPolicy = "no-referrer";
            image.addEventListener("error", () => {
                image.remove();
                appendText(cover, "span", "catalog-cover-fallback", "🎮");
            }, { once: true });
            cover.appendChild(image);
        } else {
            appendText(cover, "span", "catalog-cover-fallback", "🎮");
        }

        const body = document.createElement("div");
        body.className = "catalog-game-body";
        appendText(body, "h3", "catalog-game-title", game.name || "Jogo sem nome");
        appendText(body, "p", "catalog-release", formatDate(game.released));
        appendText(body, "p", "catalog-game-genres", gameGenres(game).join(" • ") || "Gênero não informado");

        const metrics = document.createElement("div");
        metrics.className = "catalog-game-metrics";
        if (Number.isFinite(Number(game.rating)) && game.rating !== null) {
            metrics.appendChild(buildMetric(`⭐ ${Number(game.rating).toFixed(1)} / 5`));
        }
        if (Number.isFinite(Number(game.metacritic)) && game.metacritic !== null) {
            metrics.appendChild(buildMetric(`Metacritic ${game.metacritic}`, "metacritic"));
        }
        if (!metrics.children.length) metrics.appendChild(buildMetric("Sem nota publicada"));
        body.appendChild(metrics);

        const platforms = gamePlatforms(game);
        appendText(
            body,
            "p",
            "catalog-platforms",
            platforms.length > 4
                ? `${platforms.slice(0, 4).join(" · ")} +${platforms.length - 4}`
                : (platforms.join(" · ") || "Plataformas não informadas")
        );

        const actions = document.createElement("div");
        actions.className = "catalog-card-actions";
        const detailsButton = document.createElement("button");
        detailsButton.type = "button";
        detailsButton.textContent = "Detalhes";
        detailsButton.addEventListener("click", () => openGameDetails(game));
        const addButton = document.createElement("button");
        addButton.type = "button";
        addButton.className = "catalog-add-button";
        addButton.textContent = "Adicionar à coleção";
        addButton.addEventListener("click", () => addToCollection(game));
        actions.append(detailsButton, addButton);
        body.appendChild(actions);

        card.append(cover, body);
        return card;
    }

    async function apiGet(path, signal) {
        const response = await fetch(`${API_BASE_URL}${path}`, {
            method: "GET",
            headers: { Accept: "application/json" },
            ...(signal ? { signal } : {}),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
            const error = new Error(
                typeof body.detail === "string"
                    ? body.detail
                    : `Não foi possível consultar o catálogo (HTTP ${response.status}).`
            );
            error.status = response.status;
            throw error;
        }
        return body;
    }

    async function loadGames({ resetPage = false } = {}) {
        if (resetPage) currentPage = 1;
        const sequence = ++searchSequence;
        if (activeController) activeController.abort();
        activeController = new AbortController();
        grid.replaceChildren();
        pagination.hidden = true;
        countLabel.textContent = "";
        setStatus("Buscando jogos na RAWG...");

        const params = new URLSearchParams({
            page: String(currentPage),
            page_size: String(PAGE_SIZE),
            ordering: orderingSelect.value || "-added",
        });
        const term = searchInput.value.trim();
        if (term.length >= 2) params.set("q", term);
        if (genreSelect.value) params.set("genre", genreSelect.value);
        if (platformSelect.value) params.set("platforms", platformSelect.value);

        try {
            const data = await apiGet(`/catalog/games?${params.toString()}`, activeController.signal);
            if (sequence !== searchSequence) return;
            const results = Array.isArray(data.results) ? data.results : [];
            currentCount = Number(data.count || 0);
            hasNextPage = Boolean(data.has_next);
            hasPreviousPage = Boolean(data.has_previous);
            results.forEach((game) => grid.appendChild(createGameCard(game)));
            countLabel.textContent = currentCount
                ? `${formatCount(currentCount)} jogos encontrados`
                : "Nenhum resultado";
            if (results.length === 0) {
                setStatus(term.length >= 2
                    ? `Nenhum jogo encontrado para “${term}”. Tente outro nome ou remova algum filtro.`
                    : "Não encontramos jogos com os filtros selecionados.");
            } else {
                setStatus("");
            }
            const totalPages = Math.max(1, Math.ceil(currentCount / PAGE_SIZE));
            pageLabel.textContent = `Página ${currentPage}${currentCount ? ` de ${totalPages}` : ""}`;
            previousButton.disabled = !hasPreviousPage || currentPage <= 1;
            nextButton.disabled = !hasNextPage;
            pagination.hidden = results.length === 0 && currentPage <= 1;
        } catch (error) {
            if (error.name === "AbortError" || sequence !== searchSequence) return;
            console.error("Erro ao carregar o catálogo RAWG:", error);
            setStatus(
                `${error.message} Confira se RAWG_API_KEY está configurada no backend e se o servidor FastAPI está em execução.`,
                "error"
            );
        }
    }

    async function loadSelectOptions(path, select, defaultLabel) {
        try {
            const data = await apiGet(path);
            const results = Array.isArray(data.results) ? data.results : [];
            results
                .filter((item) => item && item.id != null && item.name)
                .sort((a, b) => String(a.name).localeCompare(String(b.name), "pt-BR"))
                .forEach((item) => {
                    const option = document.createElement("option");
                    option.value = path.endsWith("/platforms") ? String(item.id) : String(item.slug || "");
                    option.textContent = item.name;
                    select.appendChild(option);
                });
        } catch (error) {
            // O catálogo continua funcional se as opções de filtro não carregarem.
            console.warn(`Não foi possível carregar ${defaultLabel}:`, error.message);
        }
    }

    function addToCollection(game) {
        const token = localStorage.getItem("token");
        const params = new URLSearchParams({
            addGame: String(game.name || "").slice(0, 160),
            addGenre: gameGenres(game).join(" • ").slice(0, 120) || "Gênero não informado",
        });
        const imageUrl = safeImageUrl(game.background_image);
        if (imageUrl) params.set("addImage", imageUrl);
        if (game.id != null) params.set("rawgId", String(game.id));
        const next = `meus-jogos.html?${params.toString()}`;
        if (!token) {
            window.location.href = `login.html?next=${encodeURIComponent(next)}`;
            return;
        }
        window.location.href = next;
    }

    function detailFact(label, value, modifier = "") {
        return buildMetric(`${label}: ${value}`, modifier);
    }

    async function openGameDetails(game) {
        dialogContent.replaceChildren();
        appendText(dialogContent, "p", "catalog-status", "Carregando detalhes do jogo...");
        if (!dialog.open) dialog.showModal();

        try {
            let detail = detailCache.get(String(game.id));
            if (!detail) {
                detail = await apiGet(`/catalog/games/${encodeURIComponent(game.id)}`);
                detailCache.set(String(game.id), detail);
            }
            dialogContent.replaceChildren();

            const imageUrl = safeImageUrl(detail.background_image || game.background_image);
            if (imageUrl) {
                const image = document.createElement("img");
                image.className = "catalog-detail-image";
                image.src = imageUrl;
                image.alt = `Capa de ${detail.name || game.name}`;
                image.referrerPolicy = "no-referrer";
                dialogContent.appendChild(image);
            }

            appendText(dialogContent, "span", "catalog-eyebrow", "DETALHES DO JOGO");
            appendText(dialogContent, "h2", "", detail.name || game.name || "Jogo");
            const facts = document.createElement("div");
            facts.className = "catalog-detail-facts";
            facts.appendChild(detailFact("Lançamento", formatDate(detail.released)));
            if (detail.rating != null) facts.appendChild(detailFact("RAWG", `${Number(detail.rating).toFixed(1)} / 5`));
            if (detail.metacritic != null) facts.appendChild(detailFact("Metacritic", String(detail.metacritic), "metacritic"));
            dialogContent.appendChild(facts);
            appendText(dialogContent, "p", "", `Gêneros: ${gameGenres(detail).join(" · ") || "Não informados"}`);
            appendText(dialogContent, "p", "", `Plataformas: ${gamePlatforms(detail).join(" · ") || "Não informadas"}`);
            if (detail.developers?.length) appendText(dialogContent, "p", "", `Desenvolvedores: ${detail.developers.map((item) => item.name).join(", ")}`);
            if (detail.publishers?.length) appendText(dialogContent, "p", "", `Publicadoras: ${detail.publishers.map((item) => item.name).join(", ")}`);
            appendText(dialogContent, "p", "", detail.description || "A RAWG não disponibilizou uma descrição para este jogo.");
            if (detail.website) {
                const link = document.createElement("a");
                link.href = safeImageUrl(detail.website) ? detail.website : "";
                if (link.href) {
                    link.target = "_blank";
                    link.rel = "noopener noreferrer";
                    link.textContent = "Site oficial do jogo";
                    dialogContent.appendChild(link);
                }
            }
            const actions = document.createElement("div");
            actions.className = "catalog-card-actions";
            actions.style.marginTop = "20px";
            const addButton = document.createElement("button");
            addButton.type = "button";
            addButton.className = "catalog-add-button";
            addButton.textContent = "Adicionar à minha coleção";
            addButton.addEventListener("click", () => addToCollection(detail));
            const rawgLink = document.createElement("a");
            rawgLink.href = detail.rawg_url || game.rawg_url || "https://rawg.io/";
            rawgLink.target = "_blank";
            rawgLink.rel = "noopener noreferrer";
            rawgLink.textContent = "Ver na RAWG";
            actions.append(addButton, rawgLink);
            dialogContent.appendChild(actions);
        } catch (error) {
            console.error("Erro ao carregar detalhes RAWG:", error);
            dialogContent.replaceChildren();
            appendText(dialogContent, "p", "catalog-status error", error.message || "Não foi possível carregar os detalhes.");
        }
    }

    function queueSearch() {
        if (searchTimer) window.clearTimeout(searchTimer);
        searchTimer = window.setTimeout(() => loadGames({ resetPage: true }), 350);
    }

    searchForm.addEventListener("submit", (event) => {
        event.preventDefault();
        if (searchTimer) window.clearTimeout(searchTimer);
        void loadGames({ resetPage: true });
    });
    searchInput.addEventListener("input", queueSearch);
    genreSelect.addEventListener("change", () => void loadGames({ resetPage: true }));
    platformSelect.addEventListener("change", () => void loadGames({ resetPage: true }));
    orderingSelect.addEventListener("change", () => void loadGames({ resetPage: true }));
    previousButton.addEventListener("click", () => {
        if (hasPreviousPage && currentPage > 1) {
            currentPage -= 1;
            void loadGames();
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    });
    nextButton.addEventListener("click", () => {
        if (hasNextPage) {
            currentPage += 1;
            void loadGames();
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    });
    dialogClose.addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
        if (event.target === dialog) dialog.close();
    });

    const initialParams = new URLSearchParams(window.location.search);
    const initialQuery = initialParams.get("q") || initialParams.get("search") || "";
    if (initialQuery) searchInput.value = initialQuery.slice(0, 80);

    void Promise.all([
        loadSelectOptions("/catalog/genres", genreSelect, "os gêneros"),
        loadSelectOptions("/catalog/platforms", platformSelect, "as plataformas"),
    ]).finally(() => void loadGames());
})();
