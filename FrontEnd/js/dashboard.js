(() => {
    "use strict";

    const API_BASE_URL = String(window.OVERCLOCK_API_BASE_URL || "").replace(/\/$/, "");
    const token = () => localStorage.getItem("token") || "";

    const elements = {
        greeting: document.getElementById("dashboardGreeting"),
        subtitle: document.getElementById("dashboardSubtitle"),
        gamesStat: document.getElementById("statGames"),
        friendsStat: document.getElementById("statFriends"),
        completedStat: document.getElementById("statCompleted"),
        notificationsStat: document.getElementById("statNotifications"),
        games: document.getElementById("dashboardGames"),
        friends: document.getElementById("dashboardPlayersList"),
        feed: document.getElementById("dashboardFeedList"),
        profileButton: document.getElementById("profileButton"),
    };

    function firstName() {
        const name = localStorage.getItem("userName") || "jogador";
        return name.trim().split(/\s+/)[0] || "jogador";
    }

    function greetingText() {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return "Bom dia";
        if (hour >= 12 && hour < 18) return "Boa tarde";
        return "Boa noite";
    }

    function updateGreeting() {
        if (elements.greeting) elements.greeting.textContent = `${greetingText()}, ${firstName()}! 👋`;
    }

    function makeElement(tag, className, content) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (content !== undefined && content !== null) node.textContent = String(content);
        return node;
    }

    function resolveAvatarUrl(path) {
        const source = String(path || "").trim();
        if (!source) return "";

        try {
            return new URL(source, API_BASE_URL || window.location.origin).toString();
        } catch {
            return "";
        }
    }

    function createAvatarElement(name, avatarPath, className) {
        const displayName = String(name || "Jogador").trim();
        const initial = displayName.charAt(0).toUpperCase() || "?";
        const avatar = makeElement("span", className, initial);
        avatar.setAttribute("aria-hidden", "true");

        const imageUrl = resolveAvatarUrl(avatarPath);
        if (!imageUrl) return avatar;

        const image = document.createElement("img");
        image.className = "dashboard-avatar-image";
        image.alt = "";
        image.loading = "lazy";
        image.decoding = "async";
        image.addEventListener("error", () => image.remove(), { once: true });
        image.src = imageUrl;
        avatar.appendChild(image);

        return avatar;
    }

    function showMessage(container, message, actionLabel, actionHref) {
        if (!container) return;
        container.replaceChildren();
        const wrapper = makeElement("div", "dashboard-empty-state");
        wrapper.appendChild(makeElement("p", "dashboard-state-message", message));
        if (actionLabel && actionHref) {
            const link = makeElement("a", "dashboard-empty-link", actionLabel);
            link.href = actionHref;
            wrapper.appendChild(link);
        }
        container.appendChild(wrapper);
    }

    async function apiGet(path) {
        if (!API_BASE_URL) throw new Error("A URL da API não está configurada.");
        const response = await fetch(`${API_BASE_URL}${path}`, {
            method: "GET",
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${token()}`,
            },
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
            const error = new Error(typeof body.detail === "string" ? body.detail : `Falha ao consultar dados (HTTP ${response.status}).`);
            error.status = response.status;
            throw error;
        }
        return body;
    }

    function normalizedName(value) {
        return String(value || "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    }

    function collectUniqueGames(library) {
        const ordered = [
            ...(Array.isArray(library.favorites) ? library.favorites : []),
            ...(Array.isArray(library.liked) ? library.liked : []),
            ...(Array.isArray(library.completed) ? library.completed : []),
        ];
        const seen = new Set();
        return ordered.filter((game) => {
            const key = normalizedName(game?.name);
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    function abbreviation(name) {
        const words = String(name || "Jogo").trim().split(/\s+/).filter(Boolean);
        if (words.length > 1) return `${words[0][0]}${words[1][0]}`.toUpperCase();
        return (words[0] || "J").slice(0, 2).toUpperCase();
    }

    function gameCategoryLabel(game, library) {
        const name = normalizedName(game.name);
        const favorite = (library.favorites || []).some((item) => normalizedName(item.name) === name);
        const completed = (library.completed || []).some((item) => normalizedName(item.name) === name);
        if (favorite) return "★ Favorito";
        if (completed) return "✓ Zerado";
        return "Na coleção";
    }

    // Reutiliza o mesmo cache de capas criado pela página Meus Jogos.
    const RAWG_COVER_CACHE_PREFIX = "overclockSocietyRawgCovers_";

    function normalizeCoverKey(name) {
        return String(name || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
            .slice(0, 160);
    }

    function safeRawgImageUrl(value) {
        try {
            const url = new URL(String(value || ""));
            return url.protocol === "https:" ? url.href : "";
        } catch {
            return "";
        }
    }

    function getCachedGameCover(name) {
        const key = normalizeCoverKey(name);
        if (!key) return "";

        try {
            const userId = localStorage.getItem("userId") || "current";
            const cache = JSON.parse(localStorage.getItem(`${RAWG_COVER_CACHE_PREFIX}${userId}`) || "{}");
            return safeRawgImageUrl(cache?.[key]);
        } catch {
            return "";
        }
    }

    function saveCachedGameCover(name, imageUrl) {
        const key = normalizeCoverKey(name);
        const safeUrl = safeRawgImageUrl(imageUrl);
        if (!key || !safeUrl) return;

        try {
            const userId = localStorage.getItem("userId") || "current";
            const storageKey = `${RAWG_COVER_CACHE_PREFIX}${userId}`;
            const cache = JSON.parse(localStorage.getItem(storageKey) || "{}");
            cache[key] = safeUrl;
            const limitedCache = Object.fromEntries(Object.entries(cache).slice(-500));
            localStorage.setItem(storageKey, JSON.stringify(limitedCache));
        } catch {
            // O cache é opcional: a capa continua aparecendo nesta sessão.
        }
    }

    function applyGameCover(art, name, imageUrl) {
        const safeUrl = safeRawgImageUrl(imageUrl);
        if (!art || !safeUrl || art.querySelector("img.dashboard-game-cover")) return;

        const image = makeElement("img", "dashboard-game-cover");
        image.alt = `Capa de ${name || "jogo"}`;
        image.loading = "lazy";
        image.decoding = "async";
        image.referrerPolicy = "no-referrer";
        image.addEventListener("load", () => art.classList.add("has-game-cover"), { once: true });
        image.addEventListener("error", () => {
            image.remove();
            art.classList.remove("has-game-cover");
        }, { once: true });
        image.src = safeUrl;
        art.appendChild(image);
    }

    async function loadDashboardGameCover(art, game) {
        const cached = getCachedGameCover(game.name);
        if (cached) {
            applyGameCover(art, game.name, cached);
            return;
        }

        if (!API_BASE_URL || !game.name) return;

        try {
            const query = new URLSearchParams({
                q: String(game.name).slice(0, 80),
                page: "1",
                page_size: "10",
                ordering: "relevance",
            });
            const payload = await apiGet(`/catalog/games?${query.toString()}`);
            const results = Array.isArray(payload.results) ? payload.results : [];
            const targetName = normalizedName(game.name);
            const match = results.find((item) => normalizedName(item?.name) === targetName);
            const imageUrl = safeRawgImageUrl(match?.background_image);
            if (!imageUrl) return;

            saveCachedGameCover(game.name, imageUrl);
            applyGameCover(art, game.name, imageUrl);
        } catch (error) {
            // Falha no catálogo não deve impedir o Dashboard de carregar.
            console.debug(`Dashboard: capa indisponível para "${game.name}".`, error);
        }
    }

    function renderGames(library) {
        const games = collectUniqueGames(library);
        const completed = Array.isArray(library.completed) ? library.completed.length : 0;
        if (elements.gamesStat) elements.gamesStat.textContent = games.length.toLocaleString("pt-BR");
        if (elements.completedStat) elements.completedStat.textContent = completed.toLocaleString("pt-BR");

        if (!games.length) {
            showMessage(elements.games, "Sua coleção ainda está vazia. Explore o catálogo e salve os jogos que você curte.", "Explorar catálogo", "catalogo-jogos.html");
            return;
        }

        elements.games.replaceChildren();
        games.slice(0, 4).forEach((game, index) => {
            const card = makeElement("article", `dashboard-game-card dashboard-game-tone-${(index % 4) + 1}`);
            const art = makeElement("div", "dashboard-game-art");
            art.setAttribute("aria-hidden", "true");
            art.appendChild(makeElement("span", "dashboard-game-art-fallback", abbreviation(game.name)));
            const details = makeElement("div", "dashboard-game-details");
            details.appendChild(makeElement("span", "dashboard-game-category", gameCategoryLabel(game, library)));
            details.appendChild(makeElement("h3", "", game.name || "Jogo sem nome"));
            details.appendChild(makeElement("p", "", game.genre || "Gênero não informado"));
            card.append(art, details);
            elements.games.appendChild(card);
            void loadDashboardGameCover(art, game);
        });
    }

    function renderFriends(payload) {
        const friends = Array.isArray(payload.friends) ? payload.friends : [];
        if (elements.friendsStat) elements.friendsStat.textContent = Number(payload.count ?? friends.length).toLocaleString("pt-BR");
        const online = friends.filter((friend) => friend?.status === "online").slice(0, 5);
        if (!online.length) {
            showMessage(elements.friends, friends.length
                ? "Nenhum amigo está online agora. Que tal conferir sua lista ou encontrar outros jogadores?"
                : "Sua lista de amigos ainda está vazia. Encontre jogadores com gostos parecidos com os seus.",
            "Encontrar jogadores", "amigos.html");
            return;
        }

        elements.friends.replaceChildren();
        online.forEach((friend) => {
            const row = makeElement("article", "dashboard-online-friend");
            const avatar = createAvatarElement(friend.name, friend.avatar_url, "dashboard-friend-avatar");
            window.OverclockTheme?.applyAvatarHue(avatar, friend.theme_hue);
            const info = makeElement("div", "dashboard-friend-info");
            info.appendChild(makeElement("strong", "", friend.name || "Jogador"));
            info.appendChild(makeElement("span", "", friend.username ? `@${String(friend.username).replace(/^@/, "")}` : "Membro da comunidade"));
            const status = makeElement("span", "dashboard-online-indicator", "Online");
            row.append(avatar, info, status);
            elements.friends.appendChild(row);
        });
    }

    function renderFeed(payload) {
        const posts = Array.isArray(payload.posts) ? payload.posts.slice(0, 3) : [];
        if (!posts.length) {
            showMessage(elements.feed, "Ainda não há publicações recentes. Compartilhe o que você está jogando!", "Abrir feed", "feed.html");
            return;
        }
        elements.feed.replaceChildren();
        posts.forEach((post) => {
            const card = makeElement("article", "dashboard-feed-item");
            const top = makeElement("div", "dashboard-feed-author-row");
            const avatar = createAvatarElement(post.author, post.avatar_url, "dashboard-feed-avatar");
            window.OverclockTheme?.applyAvatarHue(avatar, post.theme_hue);
            const meta = makeElement("div", "dashboard-feed-author");
            meta.appendChild(makeElement("strong", "", post.author || "Jogador"));
            meta.appendChild(makeElement("span", "", `${post.username || "@membro"} · ${post.createdAt || "Agora"}`));
            top.append(avatar, meta);
            card.appendChild(top);
            const content = String(post.content || "").trim();
            card.appendChild(makeElement("p", "dashboard-feed-content", content.length > 220 ? `${content.slice(0, 217)}…` : content));
            card.appendChild(makeElement("div", "dashboard-feed-meta", `♥ ${Number(post.likes || 0)} curtidas  ·  ↻ ${Number(post.reposts || 0)} compartilhamentos`));
            elements.feed.appendChild(card);
        });
    }

    async function loadDashboard() {
        if (!token()) {
            showMessage(elements.games, "Entre na sua conta para visualizar sua coleção.", "Fazer login", "login.html");
            showMessage(elements.friends, "Entre na sua conta para visualizar seus amigos.", "Fazer login", "login.html");
            showMessage(elements.feed, "Entre na sua conta para acompanhar a comunidade.", "Fazer login", "login.html");
            return;
        }

        const requests = await Promise.allSettled([
            apiGet("/games"),
            apiGet("/friends"),
            apiGet("/notifications"),
            apiGet("/feed/posts?page=1&page_size=3"),
        ]);

        const [gamesResult, friendsResult, notificationsResult, feedResult] = requests;
        if (gamesResult.status === "fulfilled") {
            renderGames(gamesResult.value);
        } else {
            showMessage(elements.games, "Não foi possível carregar sua coleção agora.", "Abrir meus jogos", "meus-jogos.html");
            console.warn("Dashboard: falha ao carregar coleção", gamesResult.reason);
        }

        if (friendsResult.status === "fulfilled") {
            renderFriends(friendsResult.value);
        } else {
            showMessage(elements.friends, "Não foi possível carregar sua lista de amigos agora.", "Abrir amigos", "amigos.html");
            console.warn("Dashboard: falha ao carregar amigos", friendsResult.reason);
        }

        if (notificationsResult.status === "fulfilled") {
            if (elements.notificationsStat) elements.notificationsStat.textContent = Number(notificationsResult.value.unread_count || 0).toLocaleString("pt-BR");
        } else {
            if (elements.notificationsStat) elements.notificationsStat.textContent = "—";
            console.warn("Dashboard: falha ao carregar notificações", notificationsResult.reason);
        }

        if (feedResult.status === "fulfilled") {
            renderFeed(feedResult.value);
        } else {
            showMessage(elements.feed, "Não foi possível carregar as publicações agora.", "Abrir feed", "feed.html");
            console.warn("Dashboard: falha ao carregar feed", feedResult.reason);
        }
    }

    elements.profileButton?.addEventListener("click", () => {
        window.location.href = "perfil.html";
    });

    updateGreeting();
    window.addEventListener("overclock:session-ready", (event) => {
        const name = event.detail?.name;
        if (name) localStorage.setItem("userName", name);
        updateGreeting();
    });

    void loadDashboard();
})();
