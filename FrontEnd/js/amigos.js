/* =========================================
   OVERCLOCK SOCIETY — AMIGOS
   Persistência via API + PostgreSQL
========================================= */

const FRIENDS_API_BASE_URL =
    ["127.0.0.1", "localhost"].includes(window.location.hostname)
        ? "http://127.0.0.1:8000"
        : "https://overclock-api.onrender.com";

const findFriendsButton = document.getElementById("findFriendsButton");
const profileButton = document.getElementById("profileButton");
const searchInput = document.getElementById("searchInput");
const requestsList = document.getElementById("requestsList");
const allFriendsList = document.getElementById("allFriendsList");
const friendsGrid = document.querySelector(".friends-grid");
const seeOnlineButton = document.getElementById("seeOnlineButton");
const modalOverlay = document.getElementById("friendsModalOverlay");
const modalClose = document.getElementById("modalClose");
const modalButton = document.getElementById("modalButton");
const playerSearchInput = document.getElementById("playerSearchInput");
const playerSearchResults = document.getElementById("playerSearchResults");
const friendsSummaryNumbers = document.querySelectorAll(".friend-summary-card strong");
const requestCounter = document.querySelector(".request-counter");

const AVATAR_COLORS = ["purple", "blue", "pink", "green", "orange"];

let currentFriends = [];
let currentRequests = [];
let activeFriendFilter = "all";
let currentSearchTerm = "";
let playerSearchTimer = null;
let playerSearchSequence = 0;
let pageMessageTimer = null;


/* =========================================
   API
========================================= */

async function friendsApiRequest(path, options = {}) {
    const token = localStorage.getItem("token");

    if (!token) {
        throw new Error("Sua sessão não foi encontrada. Entre novamente na sua conta.");
    }

    const headers = {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {})
    };

    const response = await fetch(`${FRIENDS_API_BASE_URL}${path}`, {
        method: options.method || "GET",
        headers,
        ...(options.body ? { body: JSON.stringify(options.body) } : {})
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
        let message = `O servidor respondeu com o status ${response.status}.`;

        if (Array.isArray(payload?.detail) && payload.detail.length) {
            message = payload.detail
                .map((item) => item.msg || String(item))
                .join(" ");
        } else if (typeof payload?.detail === "string") {
            message = payload.detail;
        } else if (typeof payload?.message === "string") {
            message = payload.message;
        }

        const error = new Error(message);
        error.status = response.status;
        throw error;
    }

    return payload || {};
}


/* =========================================
   UTILIDADES VISUAIS
========================================= */

function getInitial(name) {
    const value = String(name || "").trim();
    return value ? value.charAt(0).toLocaleUpperCase("pt-BR") : "?";
}

function getAvatarClass(user) {
    const source = Number(user?.id);
    const index = Number.isFinite(source)
        ? Math.abs(source) % AVATAR_COLORS.length
        : getInitial(user?.name).charCodeAt(0) % AVATAR_COLORS.length;

    return AVATAR_COLORS[index];
}

function statusLabel(status) {
    if (status === "online") return "Online";
    if (status === "away") return "Ausente";
    return "Offline";
}

function statusIcon(status) {
    if (status === "online") return "🟢";
    if (status === "away") return "🌙";
    return "⚪";
}

function setPageMessage(message, type = "info") {
    let element = document.getElementById("friendsApiMessage");

    if (!element) {
        element = document.createElement("div");
        element.id = "friendsApiMessage";
        element.className = "friends-api-message";
        element.setAttribute("role", "status");

        const header = document.querySelector(".friends-header");
        if (header) {
            header.appendChild(element);
        } else {
            document.querySelector(".friends-page")?.prepend(element);
        }
    }

    if (pageMessageTimer) {
        clearTimeout(pageMessageTimer);
        pageMessageTimer = null;
    }

    if (!message) {
        element.textContent = "";
        element.classList.remove("visible", "error", "success");
        return;
    }

    element.textContent = message;
    element.classList.add("visible");
    element.classList.toggle("error", type === "error");
    element.classList.toggle("success", type === "success");

    if (type !== "error") {
        pageMessageTimer = setTimeout(() => {
            element.classList.remove("visible");
        }, 5000);
    }
}

function showEmptyState(container, message) {
    const element = document.createElement("div");
    element.className = "friends-empty-state";
    element.textContent = message;
    container.appendChild(element);
}

function createAvatar(user, className = "friend-avatar") {
    const avatar = document.createElement("div");
    avatar.className = `${className} ${getAvatarClass(user)}`;
    avatar.textContent = getInitial(user?.name);
    avatar.setAttribute("aria-hidden", "true");
    return avatar;
}

function normalizeSearch(value) {
    return String(value || "")
        .trim()
        .toLocaleLowerCase("pt-BR");
}


function getFriendProfileUrl(user) {
    const userId = user?.id ?? user?.userId ?? null;
    const currentUserId = localStorage.getItem("userId");

    if (userId !== null && /^\d+$/.test(String(userId))) {
        if (currentUserId && String(currentUserId) === String(userId)) {
            return "perfil.html";
        }
        return `perfil-usuario.html?userId=${encodeURIComponent(String(userId))}`;
    }

    const username = String(user?.username || "").trim().replace(/^@+/, "");
    if (username) {
        return `perfil-usuario.html?username=${encodeURIComponent(username)}`;
    }

    return null;
}

function makeFriendProfileLink(element, user) {
    if (!element) return;
    const url = getFriendProfileUrl(user);
    if (!url) return;

    const displayName = String(user?.name || "Jogador").trim();
    element.classList.add("user-profile-link");
    element.tabIndex = 0;
    element.removeAttribute("aria-hidden");
    element.setAttribute("role", "link");
    element.setAttribute("aria-label", `Abrir perfil de ${displayName}`);
    element.style.cursor = "pointer";

    const navigate = (event) => {
        event?.stopPropagation?.();
        window.location.href = url;
    };

    element.addEventListener("click", navigate);
    element.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            navigate(event);
        }
    });
}


/* =========================================
   RESUMO DA PÁGINA
========================================= */

function updateFriendsSummary() {
    const onlineCount = currentFriends.filter(
        (friend) => friend.status === "online"
    ).length;

    if (friendsSummaryNumbers[0]) {
        friendsSummaryNumbers[0].textContent = String(onlineCount);
    }

    if (friendsSummaryNumbers[1]) {
        friendsSummaryNumbers[1].textContent = String(currentFriends.length);
    }

    if (friendsSummaryNumbers[2]) {
        friendsSummaryNumbers[2].textContent = String(currentRequests.length);
    }

    if (requestCounter) {
        const count = currentRequests.length;
        requestCounter.textContent = `${count} ${count === 1 ? "pendente" : "pendentes"}`;
    }
}


/* =========================================
   RENDERIZAÇÃO DE SOLICITAÇÕES
========================================= */

function renderFriendRequest(request) {
    const user = request.user || {};
    const card = document.createElement("article");
    card.className = "request-card";
    card.dataset.requestId = String(request.id);
    card.dataset.userId = String(user.id || "");
    card.dataset.user = user.name || "Jogador";

    const avatar = createAvatar(user);
    makeFriendProfileLink(avatar, user);
    card.appendChild(avatar);

    const info = document.createElement("div");
    info.className = "request-info";

    const name = document.createElement("strong");
    name.textContent = user.name || "Jogador";
    makeFriendProfileLink(name, user);
    info.appendChild(name);

    const course = document.createElement("span");
    course.textContent = user.course || "Curso não informado";
    info.appendChild(course);


    card.appendChild(info);

    const actions = document.createElement("div");
    actions.className = "request-actions";

    const acceptButton = document.createElement("button");
    acceptButton.type = "button";
    acceptButton.className = "request-btn accept";
    acceptButton.dataset.requestAction = "accept";
    acceptButton.textContent = "✓ Aceitar";

    const declineButton = document.createElement("button");
    declineButton.type = "button";
    declineButton.className = "request-btn decline";
    declineButton.dataset.requestAction = "decline";
    declineButton.textContent = "✕ Recusar";

    actions.append(acceptButton, declineButton);
    card.appendChild(actions);
    return card;
}

function renderRequests() {
    requestsList.innerHTML = "";

    if (!currentRequests.length) {
        showEmptyState(requestsList, "Você não tem solicitações de amizade pendentes.");
    } else {
        currentRequests.forEach((request) => {
            requestsList.appendChild(renderFriendRequest(request));
        });
    }

    updateFriendsSummary();
}


/* =========================================
   RENDERIZAÇÃO DE AMIGOS
========================================= */

function createAllFriendCard(friend) {
    const card = document.createElement("article");
    card.className = "all-friend-card";
    card.dataset.friendId = String(friend.id);
    card.dataset.name = friend.name || "";
    card.dataset.status = friend.status === "online" ? "online" : "offline";

    const avatar = createAvatar(friend);
    makeFriendProfileLink(avatar, friend);
    card.appendChild(avatar);

    const info = document.createElement("div");
    info.className = "all-friend-info";

    const name = document.createElement("strong");
    name.textContent = friend.name || "Jogador";
    makeFriendProfileLink(name, friend);
    info.appendChild(name);

    const detail = document.createElement("span");
    detail.textContent = `${statusIcon(friend.status)} ${statusLabel(friend.status)}`;
    info.appendChild(detail);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "friend-more";
    removeButton.textContent = "⋮";
    removeButton.title = `Remover ${friend.name} dos amigos`;
    removeButton.setAttribute("aria-label", `Remover ${friend.name} dos amigos`);

    card.append(info, removeButton);
    return card;
}

function createOnlineFriendCard(friend) {
    const card = document.createElement("article");
    card.className = "friend-card";
    card.dataset.friendId = String(friend.id);
    card.dataset.name = friend.name || "";
    card.dataset.status = friend.status === "online" ? "online" : "offline";

    const top = document.createElement("div");
    top.className = "friend-card-top";
    const avatar = createAvatar(friend);
    makeFriendProfileLink(avatar, friend);
    top.appendChild(avatar);

    if (friend.status === "online") {
        const dot = document.createElement("span");
        dot.className = "online-dot";
        dot.setAttribute("aria-label", "Online");
        top.appendChild(dot);
    }

    const info = document.createElement("div");
    info.className = "friend-card-info";

    const name = document.createElement("h3");
    name.textContent = friend.name || "Jogador";
    makeFriendProfileLink(name, friend);
    info.appendChild(name);

    const course = document.createElement("span");
    course.textContent = friend.course || "Curso não informado";
    info.appendChild(course);

    const presence = document.createElement("small");
    presence.textContent = `${statusIcon(friend.status)} ${statusLabel(friend.status)}`;
    info.appendChild(presence);

    card.append(top, info);
    return card;
}

function applyFriendFilters() {
    const normalizedSearch = normalizeSearch(currentSearchTerm);

    allFriendsList.querySelectorAll(".all-friend-card").forEach((card) => {
        const name = normalizeSearch(card.dataset.name);
        const status = card.dataset.status;
        const matchesStatus =
            activeFriendFilter === "all" ||
            (activeFriendFilter === "online" && status === "online") ||
            (activeFriendFilter === "offline" && status !== "online");
        const matchesSearch = !normalizedSearch || name.includes(normalizedSearch);
        card.style.display = matchesStatus && matchesSearch ? "flex" : "none";
    });

    friendsGrid.querySelectorAll(".friend-card").forEach((card) => {
        const name = normalizeSearch(card.dataset.name);
        card.style.display = !normalizedSearch || name.includes(normalizedSearch)
            ? "flex"
            : "none";
    });
}

function renderFriends() {
    allFriendsList.innerHTML = "";
    friendsGrid.innerHTML = "";

    const sortedFriends = [...currentFriends].sort((a, b) => {
        const onlineDifference = Number(b.status === "online") - Number(a.status === "online");
        return onlineDifference || String(a.name || "").localeCompare(String(b.name || ""), "pt-BR");
    });

    sortedFriends.forEach((friend) => {
        allFriendsList.appendChild(createAllFriendCard(friend));
    });

    const onlineFriends = sortedFriends.filter((friend) => friend.status === "online");
    onlineFriends.forEach((friend) => {
        friendsGrid.appendChild(createOnlineFriendCard(friend));
    });

    if (!sortedFriends.length) {
        showEmptyState(allFriendsList, "Sua lista de amigos está vazia. Use ‘Encontrar jogadores’ para procurar pessoas da comunidade.");
    }

    if (!onlineFriends.length) {
        showEmptyState(friendsGrid, "Nenhum amigo está marcado como online no momento.");
    }

    updateFriendsSummary();
    applyFriendFilters();
}


/* =========================================
   CARREGAR DADOS DA API
========================================= */

async function refreshFriendsData({ showError = true } = {}) {
    try {
        const [friendsResponse, requestsResponse] = await Promise.all([
            friendsApiRequest("/friends"),
            friendsApiRequest("/friends/requests")
        ]);

        currentFriends = Array.isArray(friendsResponse.friends)
            ? friendsResponse.friends
            : [];
        currentRequests = Array.isArray(requestsResponse.requests)
            ? requestsResponse.requests
            : [];

        renderFriends();
        renderRequests();
        setPageMessage("");
        return true;
    } catch (error) {
        console.error("Não foi possível carregar Amigos pela API.", error);
        currentFriends = [];
        currentRequests = [];
        renderFriends();
        renderRequests();

        if (showError) {
            setPageMessage(
                `Não foi possível carregar a lista de amigos do banco de dados. ${error.message}`,
                "error"
            );
        }
        return false;
    }
}


/* =========================================
   ACEITAR / RECUSAR SOLICITAÇÕES
========================================= */

function syncFriendRequestNotification(friendName, status) {
    if (
        friendName &&
        window.OverclockNotifications &&
        typeof window.OverclockNotifications.resolveFriendRequest === "function"
    ) {
        window.OverclockNotifications.resolveFriendRequest(friendName, status);
    }
}

async function resolveFriendRequest(requestId, action, button) {
    if (!requestId) return;

    const requestBeforeUpdate = currentRequests.find(
        (request) => String(request.id) === String(requestId)
    );
    const friendName = requestBeforeUpdate?.user?.name || "";
    const originalText = button?.textContent || "";
    if (button) {
        button.disabled = true;
        button.textContent = action === "accept" ? "Aceitando..." : "Recusando...";
    }

    try {
        await friendsApiRequest(
            `/friends/requests/${encodeURIComponent(requestId)}/${action}`,
            { method: "POST" }
        );

        await refreshFriendsData({ showError: false });
        // Atualiza também a central de notificações existente, sem usá-la
        // como fonte de verdade para as amizades do banco.
        syncFriendRequestNotification(
            friendName,
            action === "accept" ? "accepted" : "declined"
        );
        setPageMessage(
            action === "accept"
                ? "Solicitação aceita. Vocês agora são amigos."
                : "Solicitação recusada.",
            "success"
        );
    } catch (error) {
        console.error("Não foi possível resolver a solicitação.", error);
        setPageMessage(error.message, "error");
        if (button) {
            button.disabled = false;
            button.textContent = originalText;
        }
    }
}

window.addEventListener("overclock:friend-request-resolved", async (event) => {
    const friendName = normalizeSearch(event.detail?.friendName);
    const status = event.detail?.status;

    if (!friendName || !["accepted", "declined"].includes(status)) return;

    const request = currentRequests.find(
        (item) => normalizeSearch(item.user?.name) === friendName
    );

    if (!request) {
        // A central de notificações ainda pode conter cartões de demonstração;
        // eles não devem criar amizades inexistentes no banco de dados.
        return;
    }

    await resolveFriendRequest(
        request.id,
        status === "accepted" ? "accept" : "decline",
        null
    );
});

requestsList.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-request-action]");
    if (!button) return;

    const card = button.closest(".request-card");
    if (!card) return;

    const action = button.dataset.requestAction;
    if (action !== "accept" && action !== "decline") return;

    await resolveFriendRequest(card.dataset.requestId, action, button);
});


/* =========================================
   REMOVER AMIZADE
========================================= */

allFriendsList.addEventListener("click", async (event) => {
    const button = event.target.closest(".friend-more");
    if (!button) return;

    const card = button.closest(".all-friend-card");
    if (!card) return;

    const friend = currentFriends.find(
        (item) => String(item.id) === String(card.dataset.friendId)
    );
    if (!friend) return;

    const confirmed = window.confirm(
        `Deseja remover ${friend.name} da sua lista de amigos?`
    );
    if (!confirmed) return;

    button.disabled = true;

    try {
        await friendsApiRequest(`/friends/${encodeURIComponent(friend.id)}`, {
            method: "DELETE"
        });

        await refreshFriendsData({ showError: false });
        setPageMessage(`${friend.name} foi removido da sua lista de amigos.`, "success");
    } catch (error) {
        button.disabled = false;
        setPageMessage(error.message, "error");
    }
});


/* =========================================
   FILTROS E PESQUISA DA LISTA DE AMIGOS
========================================= */

const filterButtons = document.querySelectorAll(".filter-btn");
filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
        filterButtons.forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        activeFriendFilter = button.dataset.filter || "all";
        applyFriendFilters();
    });
});

if (searchInput) {
    searchInput.addEventListener("input", (event) => {
        currentSearchTerm = event.target.value || "";
        applyFriendFilters();
    });
}

if (seeOnlineButton) {
    seeOnlineButton.addEventListener("click", () => {
        const onlineButton = document.querySelector('[data-filter="online"]');
        if (onlineButton) onlineButton.click();
        allFriendsList.scrollIntoView({ behavior: "smooth", block: "start" });
    });
}

if (profileButton) {
    profileButton.addEventListener("click", () => {
        window.location.href = "perfil.html";
    });
}


/* =========================================
   MODAL: ENCONTRAR JOGADORES
========================================= */

function openFriendsModal() {
    modalOverlay.classList.add("active");
    document.body.style.overflow = "hidden";
    playerSearchInput.value = "";
    showPlayerSearchState("Digite pelo menos 2 caracteres para pesquisar jogadores.");
    setTimeout(() => playerSearchInput.focus(), 50);
}

function closeFriendsModal() {
    modalOverlay.classList.remove("active");
    document.body.style.overflow = "";
}

function showPlayerSearchState(message, type = "info") {
    playerSearchResults.innerHTML = "";
    const state = document.createElement("div");
    state.className = `player-search-state ${type}`;
    state.textContent = message;
    playerSearchResults.appendChild(state);
}

function createPlayerSearchResult(user) {
    const result = document.createElement("article");
    result.className = "player-search-result";

    const avatar = createAvatar(user, "player-search-avatar");
    makeFriendProfileLink(avatar, user);
    result.appendChild(avatar);

    const info = document.createElement("div");
    info.className = "player-search-info";

    const name = document.createElement("strong");
    name.textContent = user.name || "Jogador";
    makeFriendProfileLink(name, user);
    info.appendChild(name);

    const username = document.createElement("span");
    username.textContent = user.username ? `@${String(user.username).replace(/^@+/, "")}` : (user.course || "Curso não informado");
    makeFriendProfileLink(username, user);
    info.appendChild(username);


    const action = document.createElement("button");
    action.type = "button";
    action.className = "player-search-action";
    action.dataset.playerAction = user.relationship || "none";
    action.dataset.userId = String(user.id);
    action.dataset.requestId = user.request_id ? String(user.request_id) : "";
    action.textContent = "Adicionar";

    if (user.relationship === "friend") {
        action.textContent = "Já são amigos";
        action.disabled = true;
    } else if (user.relationship === "outgoing_request") {
        action.textContent = "Solicitação enviada";
        action.disabled = true;
    } else if (user.relationship === "incoming_request") {
        action.textContent = "Aceitar solicitação";
        action.dataset.playerAction = "accept";
    } else {
        action.dataset.playerAction = "add";
    }

    result.append(info, action);
    return result;
}

async function performPlayerSearch() {
    const query = playerSearchInput.value.trim();
    const sequence = ++playerSearchSequence;

    if (query.length < 2) {
        showPlayerSearchState("Digite pelo menos 2 caracteres para pesquisar jogadores.");
        return;
    }

    showPlayerSearchState("Procurando jogadores...");

    try {
        const response = await friendsApiRequest(
            `/friends/search?q=${encodeURIComponent(query)}`
        );

        // Ignora respostas de buscas antigas que terminaram depois da mais nova.
        if (sequence !== playerSearchSequence) return;

        const users = Array.isArray(response.users) ? response.users : [];
        playerSearchResults.innerHTML = "";

        if (!users.length) {
            showPlayerSearchState("Nenhum jogador encontrado com esse nome ou usuário.");
            return;
        }

        users.forEach((user) => {
            playerSearchResults.appendChild(createPlayerSearchResult(user));
        });
    } catch (error) {
        if (sequence !== playerSearchSequence) return;
        console.error("Falha ao pesquisar jogadores.", error);
        showPlayerSearchState(error.message, "error");
    }
}

if (findFriendsButton) {
    findFriendsButton.addEventListener("click", openFriendsModal);
}

if (modalClose) {
    modalClose.addEventListener("click", closeFriendsModal);
}

if (modalButton) {
    modalButton.addEventListener("click", closeFriendsModal);
}

if (modalOverlay) {
    modalOverlay.addEventListener("click", (event) => {
        if (event.target === modalOverlay) closeFriendsModal();
    });
}

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modalOverlay.classList.contains("active")) {
        closeFriendsModal();
    }
});

if (playerSearchInput) {
    playerSearchInput.addEventListener("input", () => {
        if (playerSearchTimer) clearTimeout(playerSearchTimer);
        playerSearchTimer = setTimeout(performPlayerSearch, 300);
    });

    playerSearchInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            if (playerSearchTimer) clearTimeout(playerSearchTimer);
            performPlayerSearch();
        }
    });
}

playerSearchResults.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-player-action]");
    if (!button || button.disabled) return;

    const action = button.dataset.playerAction;
    const userId = button.dataset.userId;
    const requestId = button.dataset.requestId;

    if (action === "accept" && requestId) {
        button.disabled = true;
        button.textContent = "Aceitando...";

        try {
            await friendsApiRequest(`/friends/requests/${encodeURIComponent(requestId)}/accept`, {
                method: "POST"
            });
            await refreshFriendsData({ showError: false });
            await performPlayerSearch();
            setPageMessage("Solicitação aceita. Vocês agora são amigos.", "success");
        } catch (error) {
            button.disabled = false;
            button.textContent = "Aceitar solicitação";
            setPageMessage(error.message, "error");
        }
        return;
    }

    if (action !== "add" || !userId) return;

    button.disabled = true;
    button.textContent = "Enviando...";

    try {
        await friendsApiRequest(`/friends/requests/${encodeURIComponent(userId)}`, {
            method: "POST"
        });

        button.dataset.playerAction = "outgoing_request";
        button.textContent = "Solicitação enviada";
        setPageMessage("Solicitação de amizade enviada.", "success");
    } catch (error) {
        button.disabled = false;
        button.textContent = "Adicionar";
        setPageMessage(error.message, "error");
        // Atualiza o estado da relação se já houver uma solicitação no sentido inverso.
        await performPlayerSearch();
    }
});


/* =========================================
   INICIALIZAÇÃO
========================================= */

async function initializeFriendsPage() {
    // Remove os dados fixos do HTML: a lista oficial vem do banco de dados.
    requestsList.innerHTML = "";
    allFriendsList.innerHTML = "";
    friendsGrid.innerHTML = "";

    showEmptyState(requestsList, "Carregando solicitações...");
    showEmptyState(allFriendsList, "Carregando sua lista de amigos...");
    showEmptyState(friendsGrid, "Carregando amigos online...");
    updateFriendsSummary();

    await refreshFriendsData();

    console.log("👥 Página Amigos conectada à API.");
}

initializeFriendsPage();
