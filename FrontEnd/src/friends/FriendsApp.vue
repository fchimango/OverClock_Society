<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import FriendRequestCard from "./components/FriendRequestCard.vue";
import FriendCard from "./components/FriendCard.vue";
import AllFriendCard from "./components/AllFriendCard.vue";
import PlayerSearchResult from "./components/PlayerSearchResult.vue";
import { normalizeSearch } from "./utils.js";

const apiBaseUrl = String(window.OVERCLOCK_API_BASE_URL || "").replace(/\/$/, "");

const friends = ref([]);
const requests = ref([]);
const isLoading = ref(true);
const activeFilter = ref("all");
const friendSearch = ref("");
const pageMessage = ref("");
const messageType = ref("info");
const isModalOpen = ref(false);
const playerSearchInput = ref(null);
const playerSearchQuery = ref("");
const searchResults = ref([]);
const searchStatus = ref("prompt");
const searchError = ref("");
const processingRequests = reactive({});
const processingFriends = reactive({});
const processingPlayers = reactive({});

let messageTimer = null;
let searchTimer = null;
let searchSequence = 0;
let previousFocus = null;
let previousBodyOverflow = "";
const profileButton = document.getElementById("profileButton");

const sortedFriends = computed(() => [...friends.value].sort((a, b) => {
    const onlineDifference = Number(b.status === "online") - Number(a.status === "online");
    return onlineDifference || String(a.name || "").localeCompare(String(b.name || ""), "pt-BR");
}));

const onlineFriends = computed(() => sortedFriends.value.filter((friend) => friend.status === "online"));
const onlineCount = computed(() => onlineFriends.value.length);
const requestCountLabel = computed(() => `${requests.value.length} ${requests.value.length === 1 ? "pendente" : "pendentes"}`);
const normalizedFriendSearch = computed(() => normalizeSearch(friendSearch.value));

const filteredOnlineFriends = computed(() => {
    if (!normalizedFriendSearch.value) return onlineFriends.value;
    return onlineFriends.value.filter((friend) => normalizeSearch(friend.name).includes(normalizedFriendSearch.value));
});

const filteredFriends = computed(() => sortedFriends.value.filter((friend) => {
    const statusMatches = activeFilter.value === "all"
        || (activeFilter.value === "online" && friend.status === "online")
        || (activeFilter.value === "offline" && friend.status !== "online");
    const nameMatches = !normalizedFriendSearch.value
        || normalizeSearch(friend.name).includes(normalizedFriendSearch.value);
    return statusMatches && nameMatches;
}));

function showPageMessage(message, type = "info") {
    if (messageTimer) {
        clearTimeout(messageTimer);
        messageTimer = null;
    }
    pageMessage.value = message || "";
    messageType.value = type;

    if (message && type !== "error") {
        messageTimer = setTimeout(() => {
            pageMessage.value = "";
        }, 5000);
    }
}

async function friendsApiRequest(path, options = {}) {
    const token = localStorage.getItem("token");
    if (!token) {
        throw new Error("Sua sessão não foi encontrada. Entre novamente na sua conta.");
    }
    if (!apiBaseUrl) {
        throw new Error("O endereço da API não foi configurado.");
    }

    const headers = {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {})
    };

    const response = await fetch(`${apiBaseUrl}${path}`, {
        method: options.method || "GET",
        headers,
        ...(options.body ? { body: JSON.stringify(options.body) } : {})
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
        let message = `O servidor respondeu com o status ${response.status}.`;
        if (Array.isArray(payload?.detail) && payload.detail.length) {
            message = payload.detail.map((item) => item.msg || String(item)).join(" ");
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

async function refreshFriendsData({ showError = true } = {}) {
    isLoading.value = true;
    try {
        const [friendsResponse, requestsResponse] = await Promise.all([
            friendsApiRequest("/friends"),
            friendsApiRequest("/friends/requests")
        ]);
        friends.value = Array.isArray(friendsResponse.friends) ? friendsResponse.friends : [];
        requests.value = Array.isArray(requestsResponse.requests) ? requestsResponse.requests : [];
        if (showError) showPageMessage("");
        return true;
    } catch (error) {
        console.error("Não foi possível carregar Amigos pela API.", error);
        friends.value = [];
        requests.value = [];
        if (showError) {
            showPageMessage(
                `Não foi possível carregar a lista de amigos do banco de dados. ${error.message}`,
                "error"
            );
        }
        return false;
    } finally {
        isLoading.value = false;
    }
}

function syncFriendRequestNotification(friendName, status) {
    const notifications = window.OverclockNotifications;
    if (friendName && typeof notifications?.syncFriendRequestStatus === "function") {
        notifications.syncFriendRequestStatus(friendName, status);
    }
}

async function resolveFriendRequest(request, action) {
    const requestId = request?.id;
    if (!requestId || processingRequests[requestId]) return;

    const friendName = request.user?.name || "";
    processingRequests[requestId] = action;
    try {
        await friendsApiRequest(`/friends/requests/${encodeURIComponent(requestId)}/${action}`, {
            method: "POST"
        });
        await refreshFriendsData({ showError: false });
        syncFriendRequestNotification(friendName, action === "accept" ? "accepted" : "declined");
        showPageMessage(
            action === "accept"
                ? "Solicitação aceita. Vocês agora são amigos."
                : "Solicitação recusada.",
            "success"
        );
    } catch (error) {
        console.error("Não foi possível resolver a solicitação.", error);
        showPageMessage(error.message, "error");
    } finally {
        delete processingRequests[requestId];
    }
}

async function removeFriend(friend) {
    if (!friend?.id || processingFriends[friend.id]) return;

    const confirmOptions = {
        title: "Remover amizade",
        confirmLabel: "Remover",
        danger: true
    };
    const prompt = `Deseja remover ${friend.name || "este jogador"} da sua lista de amigos?`;
    const confirmed = typeof window.OverclockUI?.confirm === "function"
        ? await window.OverclockUI.confirm(prompt, confirmOptions)
        : window.confirm(prompt);
    if (!confirmed) return;

    processingFriends[friend.id] = true;
    try {
        await friendsApiRequest(`/friends/${encodeURIComponent(friend.id)}`, { method: "DELETE" });
        await refreshFriendsData({ showError: false });
        showPageMessage(`${friend.name || "O jogador"} foi removido da sua lista de amigos.`, "success");
    } catch (error) {
        showPageMessage(error.message, "error");
    } finally {
        delete processingFriends[friend.id];
    }
}

function setFriendFilter(filter) {
    activeFilter.value = filter;
}

function goToOnlineFriends() {
    setFriendFilter("online");
    document.getElementById("allFriendsList")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function openPlayerSearch() {
    isModalOpen.value = true;
}

function closePlayerSearch() {
    isModalOpen.value = false;
}

async function performPlayerSearch() {
    const query = playerSearchQuery.value.trim();
    const sequence = ++searchSequence;

    if (query.length < 2) {
        searchResults.value = [];
        searchError.value = "";
        searchStatus.value = "prompt";
        return;
    }

    searchStatus.value = "loading";
    searchError.value = "";
    try {
        const response = await friendsApiRequest(`/friends/search?q=${encodeURIComponent(query)}`);
        if (sequence !== searchSequence) return;
        searchResults.value = Array.isArray(response.users) ? response.users : [];
        searchStatus.value = searchResults.value.length ? "results" : "empty";
    } catch (error) {
        if (sequence !== searchSequence) return;
        console.error("Falha ao pesquisar jogadores.", error);
        searchResults.value = [];
        searchError.value = error.message;
        searchStatus.value = "error";
    }
}

watch(playerSearchQuery, (value) => {
    if (searchTimer) clearTimeout(searchTimer);
    const query = String(value || "").trim();
    if (query.length < 2) {
        searchSequence += 1;
        searchResults.value = [];
        searchError.value = "";
        searchStatus.value = "prompt";
        return;
    }
    searchStatus.value = "waiting";
    searchTimer = setTimeout(performPlayerSearch, 300);
});

watch(isModalOpen, async (open) => {
    if (open) {
        previousFocus = document.activeElement;
        previousBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        playerSearchQuery.value = "";
        await nextTick();
        playerSearchInput.value?.focus();
    } else {
        document.body.style.overflow = previousBodyOverflow;
        if (previousFocus && typeof previousFocus.focus === "function") previousFocus.focus();
    }
});

async function handlePlayerSearchAction(user) {
    if (!user?.id || processingPlayers[user.id]) return;
    const relationship = user.relationship || "none";
    const isIncoming = relationship === "incoming_request" && user.request_id;
    if (relationship !== "none" && !isIncoming) return;

    processingPlayers[user.id] = true;
    try {
        if (isIncoming) {
            await friendsApiRequest(`/friends/requests/${encodeURIComponent(user.request_id)}/accept`, {
                method: "POST"
            });
            await refreshFriendsData({ showError: false });
            syncFriendRequestNotification(user.name || "", "accepted");
            showPageMessage("Solicitação aceita. Vocês agora são amigos.", "success");
        } else {
            await friendsApiRequest(`/friends/requests/${encodeURIComponent(user.id)}`, {
                method: "POST"
            });
            searchResults.value = searchResults.value.map((item) => (
                String(item.id) === String(user.id)
                    ? { ...item, relationship: "outgoing_request" }
                    : item
            ));
            showPageMessage("Solicitação de amizade enviada.", "success");
        }
        await performPlayerSearch();
    } catch (error) {
        showPageMessage(error.message, "error");
        await performPlayerSearch();
    } finally {
        delete processingPlayers[user.id];
    }
}

function handleGlobalKeydown(event) {
    if (event.key === "Escape" && isModalOpen.value) {
        closePlayerSearch();
    }
}

function handleProfileButton() {
    window.location.href = "perfil.html";
}

onMounted(async () => {
    document.addEventListener("keydown", handleGlobalKeydown);
    profileButton?.addEventListener("click", handleProfileButton);
    await refreshFriendsData();
    if (window.location.hash === "#solicitacoes") {
        await nextTick();
        document.getElementById("solicitacoes")?.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
    console.log("👥 Página Amigos conectada à API via Vue.");
});

onBeforeUnmount(() => {
    document.removeEventListener("keydown", handleGlobalKeydown);
    profileButton?.removeEventListener("click", handleProfileButton);
    if (searchTimer) clearTimeout(searchTimer);
    if (messageTimer) clearTimeout(messageTimer);
    document.body.style.overflow = previousBodyOverflow;
});
</script>

<template>
    <section class="friends-header">
        <div>
            <span class="welcome-label">COMUNIDADE</span>
            <h1>Meus amigos 👥</h1>
            <p>Encontre seus amigos e descubra novos jogadores da faculdade.</p>
        </div>
        <button type="button" class="btn btn-primary" @click="openPlayerSearch">
            <span>+</span>
            Encontrar jogadores
        </button>
    </section>

    <div
        v-if="pageMessage"
        id="friendsApiMessage"
        class="friends-api-message visible"
        :class="messageType"
        :role="messageType === 'error' ? 'alert' : 'status'"
        aria-live="polite"
    >
        {{ pageMessage }}
    </div>

    <div class="page-local-filter friends-local-filter">
        <label for="friendListSearchInput">Filtrar sua lista de amigos</label>
        <input
            id="friendListSearchInput"
            v-model="friendSearch"
            type="search"
            placeholder="Digite o nome de um amigo..."
            autocomplete="off"
        >
    </div>

    <section class="friends-summary" aria-label="Resumo das amizades">
        <div class="friend-summary-card">
            <div class="friend-summary-icon online">🟢</div>
            <div>
                <strong>{{ onlineCount }}</strong>
                <span>online agora</span>
            </div>
        </div>
        <div class="friend-summary-card">
            <div class="friend-summary-icon">👥</div>
            <div>
                <strong>{{ friends.length }}</strong>
                <span>amigos</span>
            </div>
        </div>
        <div class="friend-summary-card">
            <div class="friend-summary-icon">📩</div>
            <div>
                <strong>{{ requests.length }}</strong>
                <span>solicitações</span>
            </div>
        </div>
    </section>

    <section class="friends-section" id="solicitacoes">
        <div class="friends-section-header">
            <div>
                <span class="section-label">NOVAS CONEXÕES</span>
                <h2>Solicitações de amizade</h2>
            </div>
            <span class="request-counter">{{ requestCountLabel }}</span>
        </div>

        <div class="requests-list" id="requestsList" aria-live="polite">
            <div v-if="isLoading" class="friends-empty-state">Carregando solicitações...</div>
            <div v-else-if="!requests.length" class="friends-empty-state">
                Você não tem solicitações de amizade pendentes.
            </div>
            <FriendRequestCard
                v-for="request in requests"
                :key="request.id"
                :request="request"
                :busy-action="processingRequests[request.id] || ''"
                @resolve="resolveFriendRequest(request, $event)"
            />
        </div>
    </section>

    <section class="friends-section">
        <div class="friends-section-header">
            <div>
                <span class="section-label">ONLINE AGORA</span>
                <h2>Amigos online</h2>
            </div>
            <button type="button" class="text-button" @click="goToOnlineFriends">Ver todos →</button>
        </div>

        <div class="friends-grid" aria-live="polite">
            <div v-if="isLoading" class="friends-empty-state">Carregando amigos online...</div>
            <div v-else-if="!onlineFriends.length" class="friends-empty-state">
                Nenhum amigo está marcado como online no momento.
            </div>
            <div v-else-if="!filteredOnlineFriends.length" class="friends-empty-state">
                Nenhum amigo online corresponde à sua pesquisa.
            </div>
            <FriendCard
                v-for="friend in filteredOnlineFriends"
                :key="friend.id"
                :friend="friend"
            />
        </div>
    </section>

    <section class="friends-section">
        <div class="friends-section-header">
            <div>
                <span class="section-label">MINHA REDE</span>
                <h2>Todos os amigos</h2>
            </div>
            <div class="friend-filters" role="group" aria-label="Filtrar amigos por presença">
                <button
                    v-for="filter in [{ id: 'all', label: 'Todos' }, { id: 'online', label: 'Online' }, { id: 'offline', label: 'Offline' }]"
                    :key="filter.id"
                    type="button"
                    class="filter-btn"
                    :class="{ active: activeFilter === filter.id }"
                    :aria-pressed="activeFilter === filter.id"
                    @click="setFriendFilter(filter.id)"
                >
                    {{ filter.label }}
                </button>
            </div>
        </div>

        <div class="all-friends-list" id="allFriendsList" aria-live="polite">
            <div v-if="isLoading" class="friends-empty-state">Carregando sua lista de amigos...</div>
            <div v-else-if="!friends.length" class="friends-empty-state">
                Sua lista de amigos está vazia. Use ‘Encontrar jogadores’ para procurar pessoas da comunidade.
            </div>
            <div v-else-if="!filteredFriends.length" class="friends-empty-state">
                Nenhum amigo corresponde aos filtros selecionados.
            </div>
            <AllFriendCard
                v-for="friend in filteredFriends"
                :key="friend.id"
                :friend="friend"
                :busy="Boolean(processingFriends[friend.id])"
                @remove="removeFriend(friend)"
            />
        </div>
    </section>

    <div
        class="friends-modal-overlay"
        :class="{ active: isModalOpen }"
        :aria-hidden="!isModalOpen"
        @click.self="closePlayerSearch"
    >
        <div
            class="friends-modal friends-modal-wide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="friendsModalTitle"
            aria-describedby="friendsModalDescription"
        >
            <button
                type="button"
                class="modal-close"
                aria-label="Fechar janela"
                @click="closePlayerSearch"
            >×</button>

            <div class="modal-icon">👥</div>
            <h2 id="friendsModalTitle">Encontrar jogadores</h2>
            <p id="friendsModalDescription">
                Pesquise por nome ou nome de usuário para encontrar outras pessoas da comunidade.
            </p>

            <label for="playerSearchInput" class="visually-hidden">Pesquisar jogadores</label>
            <input
                id="playerSearchInput"
                ref="playerSearchInput"
                v-model="playerSearchQuery"
                class="player-search-input"
                type="search"
                placeholder="Digite um nome ou @usuário..."
                autocomplete="off"
                maxlength="50"
            >

            <div
                class="player-search-results"
                aria-live="polite"
                aria-label="Resultados da pesquisa"
            >
                <div v-if="searchStatus === 'prompt'" class="player-search-state">
                    Digite pelo menos 2 caracteres para pesquisar jogadores.
                </div>
                <div v-else-if="searchStatus === 'waiting' || searchStatus === 'loading'" class="player-search-state">
                    Procurando jogadores...
                </div>
                <div v-else-if="searchStatus === 'empty'" class="player-search-state">
                    Nenhum jogador encontrado com esse nome ou usuário.
                </div>
                <div v-else-if="searchStatus === 'error'" class="player-search-state error">
                    {{ searchError }}
                </div>
                <PlayerSearchResult
                    v-for="user in searchResults"
                    :key="user.id"
                    :user="user"
                    :busy="Boolean(processingPlayers[user.id])"
                    @request="handlePlayerSearchAction(user)"
                />
            </div>

            <div style="text-align: center;">
                <button type="button" class="btn btn-primary" @click="closePlayerSearch">Fechar</button>
            </div>
        </div>
    </div>
</template>
