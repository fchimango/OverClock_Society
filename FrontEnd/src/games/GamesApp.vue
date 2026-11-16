<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import GameSummaryItem from "./components/GameSummaryItem.vue";
import FavoriteGameCard from "./components/FavoriteGameCard.vue";
import CollectionGameCard from "./components/CollectionGameCard.vue";
import CompletedGameCard from "./components/CompletedGameCard.vue";
import GameEditorModal from "./components/GameEditorModal.vue";
import GameConfirmModal from "./components/GameConfirmModal.vue";

const apiBaseUrl = String(window.OVERCLOCK_API_BASE_URL || "").replace(/\/$/, "");
const currentYear = new Date().getFullYear();
const coverCachePrefix = "overclockSocietyRawgCovers_";

const seedFavorites = [
    { name: "Hollow Knight", genre: "Metroidvania • Aventura", rating: 4.9, position: 2, fallbackClass: "hollow-knight", initials: "HK" },
    { name: "Elden Ring", genre: "RPG • Ação", rating: 5.0, position: 1, fallbackClass: "elden-ring-large", initials: "ER" },
    { name: "Minecraft", genre: "Sandbox • Aventura", rating: 4.8, position: 3, fallbackClass: "minecraft-large", initials: "MC" }
];

const seedLiked = [
    { name: "Valorant", genre: "FPS • Competitivo", rating: 4.5, fallbackClass: "valorant-game", initials: "V" },
    { name: "Terraria", genre: "Sandbox • Aventura", rating: 4.7, fallbackClass: "terraria-game", initials: "T" },
    { name: "Zelda", genre: "Aventura • RPG", rating: 4.8, fallbackClass: "zelda-game", initials: "Z" },
    { name: "God of War", genre: "Ação • Aventura", rating: 4.7, fallbackClass: "god-war-game", initials: "GW" },
    { name: "Stardew Valley", genre: "Simulação • RPG", rating: 4.6, fallbackClass: "stardew-game", initials: "SV" },
    { name: "Resident Evil 4", genre: "Terror • Ação", rating: 4.8, fallbackClass: "resident-game", initials: "RE" }
];

const seedCompleted = [
    { name: "God of War Ragnarök", genre: "Ação • Aventura", rating: 5, year: 2026, fallbackClass: "god-war-game", initials: "GW" },
    { name: "Resident Evil 4", genre: "Terror • Ação", rating: 5, year: 2025, fallbackClass: "resident-game", initials: "RE" },
    { name: "Celeste", genre: "Plataforma • Indie", rating: 5, year: 2025, fallbackClass: "celeste-game", initials: "C" },
    { name: "Spider-Man", genre: "Ação • Aventura", rating: 5, year: 2024, fallbackClass: "spider-game", initials: "SM" }
];

const favorites = ref([]);
const liked = ref([]);
const completed = ref([]);
const isLoading = ref(true);
const isSaving = ref(false);
const apiReady = ref(false);
const pageMessage = ref("");
const messageType = ref("info");
const isEditorOpen = ref(false);
const isConfirmOpen = ref(false);
const confirmTarget = ref(null);
const confirmMessage = ref("");
const confirmReturnFocus = ref(null);
const editorReturnFocus = ref(null);
const editing = ref(null);
const searchQuery = ref("");
const searchResults = ref([]);
const searchStatus = ref("prompt");
const searchError = ref("");
const selectedGame = ref(null);
const form = reactive({
    name: "",
    genre: "",
    category: "liked",
    position: 1,
    rating: "5,0",
    year: currentYear,
    releaseYear: null,
    releaseYearLoading: false,
    releaseYearError: "",
    imageUrl: ""
});

let searchTimer = null;
let searchSequence = 0;
let searchController = null;
let releaseYearSequence = 0;
let releaseYearController = null;
let messageTimer = null;
let saveQueue = Promise.resolve();
let previousBodyOverflow = "";

const totalFavorites = computed(() => favorites.value.length);
const totalLiked = computed(() => liked.value.length);
const totalCompleted = computed(() => completed.value.length);
const podiumGames = computed(() => [2, 1, 3]
    .map((position) => favorites.value.find((game) => Number(game.position) === position))
    .filter(Boolean));
const favoriteLimitReached = computed(() => favorites.value.length >= 3 && editing.value?.category !== "favorite");
const isEditing = computed(() => Boolean(editing.value));
const completedYearOptions = computed(() => {
    const releaseYear = Number(form.releaseYear);
    if (!Number.isInteger(releaseYear) || releaseYear < 1900 || releaseYear > currentYear) return [];
    return Array.from({ length: currentYear - releaseYear + 1 }, (_, index) => currentYear - index);
});

const fallbackByName = {
    "hollow knight": ["hollow-knight", "HK"],
    "elden ring": ["elden-ring-large", "ER"],
    "minecraft": ["minecraft-large", "MC"],
    "valorant": ["valorant-game", "V"],
    "terraria": ["terraria-game", "T"],
    "zelda": ["zelda-game", "Z"],
    "god of war": ["god-war-game", "GW"],
    "god of war ragnarok": ["god-war-game", "GW"],
    "stardew valley": ["stardew-game", "SV"],
    "resident evil 4": ["resident-game", "RE"],
    "celeste": ["celeste-game", "C"],
    "spider man": ["spider-game", "SM"],
    "spider-man": ["spider-game", "SM"]
};

const summaryItems = computed(() => [
    { icon: "🏆", count: totalFavorites.value, label: "favoritos" },
    { icon: "❤️", count: totalLiked.value, label: "jogos que gosto" },
    { icon: "✅", count: totalCompleted.value, label: "jogos zerados" }
]);

const favoritePositions = computed(() => {
    if (editing.value?.category === "favorite") return [1, 2, 3];
    const available = [1, 2, 3].filter((position) => !favorites.value.some((game) => Number(game.position) === position));
    return available.length ? available : [1, 2, 3];
});

function normalizeName(value) {
    return String(value || "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

function normalizeGameTitle(value) {
    return normalizeName(value).replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function normalizeCoverKey(value) {
    return normalizeName(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 160);
}

function safeImageUrl(value) {
    try {
        const url = new URL(String(value || ""));
        return url.protocol === "https:" ? url.href : "";
    } catch {
        return "";
    }
}

function parseReleaseYear(released) {
    const match = String(released || "").match(/^(\d{4})/);
    const year = Number(match?.[1]);
    return Number.isInteger(year) && year >= 1900 && year <= currentYear ? year : null;
}

function clampCompletedYear(value, releaseYear) {
    const numericYear = Number(value);
    const selectedYear = Number.isInteger(numericYear) ? numericYear : currentYear;
    return Math.min(currentYear, Math.max(Number(releaseYear), selectedYear));
}

function getCoverCacheKey() {
    return `${coverCachePrefix}${localStorage.getItem("userId") || "current"}`;
}

function readCoverCache() {
    try {
        const value = JSON.parse(localStorage.getItem(getCoverCacheKey()) || "{}");
        return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    } catch {
        return {};
    }
}

function getCachedCover(name) {
    const key = normalizeCoverKey(name);
    return key ? safeImageUrl(readCoverCache()[key]) : "";
}

function saveCover(name, imageUrl) {
    const key = normalizeCoverKey(name);
    const safeUrl = safeImageUrl(imageUrl);
    if (!key || !safeUrl) return;
    try {
        const cache = readCoverCache();
        cache[key] = safeUrl;
        localStorage.setItem(getCoverCacheKey(), JSON.stringify(Object.fromEntries(Object.entries(cache).slice(-500))));
    } catch (error) {
        console.debug("Não foi possível atualizar o cache local de capas.");
    }
    applyCoverToState(name, safeUrl);
}

function applyCoverToState(name, imageUrl) {
    const key = normalizeName(name);
    [favorites, liked, completed].forEach((collection) => {
        collection.value.forEach((game) => {
            if (normalizeName(game.name) === key) game.imageUrl = imageUrl;
        });
    });
}

function enrichGame(game, category) {
    const [fallbackClass, initials] = fallbackByName[normalizeName(game.name)] || ["new-game-image", String(game.name || "🎮").slice(0, 2).toUpperCase()];
    return {
        name: String(game.name || "").trim(),
        genre: String(game.genre || "Gênero não informado").trim(),
        rating: Number(game.rating ?? 5),
        position: category === "favorite" ? Number(game.position) : undefined,
        year: category === "completed" ? (Number(game.year) || currentYear) : undefined,
        imageUrl: safeImageUrl(game.imageUrl) || getCachedCover(game.name),
        fallbackClass: game.fallbackClass || fallbackClass,
        initials: game.initials || initials
    };
}

function cloneState(data) {
    favorites.value = (data.favorites || []).map((game) => enrichGame(game, "favorite"));
    liked.value = (data.liked || []).map((game) => enrichGame(game, "liked"));
    completed.value = (data.completed || []).map((game) => enrichGame(game, "completed"));
    favorites.value.sort((a, b) => Number(a.position) - Number(b.position));
}

function seedState() {
    const likedNames = new Set(seedLiked.map((game) => normalizeName(game.name)));
    const completeLiked = [...seedLiked];
    seedFavorites.forEach((game) => {
        if (!likedNames.has(normalizeName(game.name))) {
            completeLiked.push({ name: game.name, genre: game.genre, rating: game.rating, fallbackClass: game.fallbackClass, initials: game.initials });
        }
    });
    cloneState({ favorites: seedFavorites, liked: completeLiked, completed: seedCompleted });
}

function hasCategory(name, category, excludeName = "") {
    const collection = category === "favorite" ? favorites.value : category === "completed" ? completed.value : liked.value;
    const normalized = normalizeName(name);
    const excluded = normalizeName(excludeName);
    return collection.some((game) => normalizeName(game.name) === normalized && (!excluded || normalized !== excluded));
}

function findGame(name, category) {
    const collection = category === "favorite" ? favorites.value : category === "completed" ? completed.value : liked.value;
    return collection.find((game) => normalizeName(game.name) === normalizeName(name)) || null;
}

function addLikedIfMissing(name, genre, rating, imageUrl = "") {
    if (findGame(name, "liked")) return;
    liked.value.push(enrichGame({ name, genre, rating, imageUrl }, "liked"));
}

function getLegacyState() {
    const userId = localStorage.getItem("userId");
    if (!userId) return null;
    try {
        const stored = localStorage.getItem(`overclockSocietyGames_${userId}`);
        if (!stored) return null;
        const data = JSON.parse(stored);
        if (data && Array.isArray(data.favorites) && Array.isArray(data.liked) && Array.isArray(data.completed)) return data;
    } catch (error) {
        console.warn("Não foi possível ler a coleção antiga do navegador.", error);
    }
    return null;
}

async function apiRequest(path, options = {}) {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("Sua sessão não foi encontrada. Entre novamente na sua conta.");
    if (!apiBaseUrl) throw new Error("O endereço da API não foi configurado.");

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
        if (Array.isArray(payload?.detail) && payload.detail.length) message = payload.detail.map((item) => item.msg || String(item)).join(" ");
        else if (typeof payload?.detail === "string") message = payload.detail;
        else if (typeof payload?.message === "string") message = payload.message;
        const error = new Error(message);
        error.status = response.status;
        throw error;
    }
    return payload || {};
}

function notify(message, type = "info", persistent = false) {
    if (messageTimer) clearTimeout(messageTimer);
    pageMessage.value = message;
    messageType.value = type;
    if (message && !persistent && type !== "error") {
        messageTimer = window.setTimeout(() => { pageMessage.value = ""; }, 5000);
    }
}

function currentPayload() {
    return {
        favorites: favorites.value.map((game) => ({ name: game.name, genre: game.genre, rating: Number(game.rating ?? 5), position: Number(game.position) })),
        liked: liked.value.map((game) => ({ name: game.name, genre: game.genre, rating: Number(game.rating ?? 5) })),
        completed: completed.value.map((game) => ({ name: game.name, genre: game.genre, rating: Number(game.rating ?? 5), year: Number(game.year) || currentYear }))
    };
}

async function persistGames() {
    if (!apiReady.value) {
        notify("A coleção foi atualizada nesta tela, mas a API não está disponível para salvar as alterações. Verifique o backend e tente novamente.", "error", true);
        return false;
    }
    isSaving.value = true;
    const payload = JSON.parse(JSON.stringify(currentPayload()));
    saveQueue = saveQueue.catch(() => false).then(async () => {
        await apiRequest("/games", { method: "PUT", body: payload });
        const userId = localStorage.getItem("userId");
        if (userId) localStorage.setItem(`overclockSocietyGamesMigrated_${userId}`, "true");
        return true;
    }).catch((error) => {
        console.error("Não foi possível salvar a coleção no PostgreSQL.", error);
        notify(`Não foi possível salvar sua coleção no banco de dados. ${error.message}`, "error", true);
        return false;
    }).finally(() => {
        isSaving.value = false;
    });
    return saveQueue;
}

function syncFavoritesWithLiked() {
    let changed = false;
    favorites.value.forEach((game) => {
        if (!findGame(game.name, "liked")) {
            addLikedIfMissing(game.name, game.genre, game.rating, game.imageUrl);
            changed = true;
        }
    });
    return changed;
}

async function loadGames() {
    isLoading.value = true;
    seedState();
    try {
        const data = await apiRequest("/games");
        if (!Array.isArray(data.favorites) || !Array.isArray(data.liked) || !Array.isArray(data.completed)) {
            throw new Error("A API de jogos devolveu uma resposta inesperada.");
        }
        apiReady.value = true;
        const userId = localStorage.getItem("userId");
        const marker = userId && localStorage.getItem(`overclockSocietyGamesMigrated_${userId}`) === "true";
        const total = data.favorites.length + data.liked.length + data.completed.length;
        let shouldSave = false;

        if (total > 0 || marker) {
            cloneState(data);
            if (userId && total > 0) localStorage.setItem(`overclockSocietyGamesMigrated_${userId}`, "true");
        } else {
            const legacyState = getLegacyState();
            if (legacyState) cloneState(legacyState);
            else seedState();
            shouldSave = true;
        }

        if (syncFavoritesWithLiked()) shouldSave = true;
        if (shouldSave) await persistGames();
        await hydrateGameCovers();
    } catch (error) {
        apiReady.value = false;
        console.error("Não foi possível carregar a coleção pela API.", error);
        notify(`Não foi possível conectar ao serviço de jogos. ${error.message} As alterações desta sessão não serão salvas enquanto a API estiver indisponível.`, "error", true);
    } finally {
        isLoading.value = false;
    }
}

async function searchCatalog(query, signal) {
    if (!apiBaseUrl) throw new Error("A API da Overclock Society ainda não está configurada.");
    const params = new URLSearchParams({ q: query, page: "1", page_size: "8", ordering: "-rating" });
    const response = await fetch(`${apiBaseUrl}/catalog/games?${params.toString()}`, {
        headers: { Accept: "application/json" },
        signal
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(typeof body.detail === "string" ? body.detail : "Não foi possível consultar a RAWG.");
    return Array.isArray(body.results) ? body.results : [];
}

async function resolveReleaseYear(gameName) {
    const name = String(gameName || "").trim();
    const normalizedName = normalizeName(name);
    if (!normalizedName) return false;

    releaseYearController?.abort();
    const controller = new AbortController();
    releaseYearController = controller;
    const sequence = ++releaseYearSequence;
    form.releaseYearLoading = true;
    form.releaseYearError = "";

    try {
        const results = await searchCatalog(name, controller.signal);
        if (sequence !== releaseYearSequence || normalizeName(form.name) !== normalizedName) return false;

        const exactMatch = results.find((item) => normalizeGameTitle(item?.name) === normalizeGameTitle(name));
        const releaseYear = parseReleaseYear(exactMatch?.released);
        if (!releaseYear) {
            throw new Error("Não foi possível identificar o ano de lançamento deste jogo na RAWG.");
        }

        form.releaseYear = releaseYear;
        form.year = clampCompletedYear(form.year, releaseYear);
        if (selectedGame.value && normalizeName(selectedGame.value.name) === normalizedName) {
            selectedGame.value = { ...selectedGame.value, releaseYear };
        }
        return true;
    } catch (error) {
        if (error.name === "AbortError" || sequence !== releaseYearSequence) return false;
        form.releaseYear = null;
        form.releaseYearError = error.message || "Não foi possível consultar o ano de lançamento. Tente novamente.";
        return false;
    } finally {
        if (sequence === releaseYearSequence) form.releaseYearLoading = false;
        if (releaseYearController === controller) releaseYearController = null;
    }
}

function retryReleaseYear() {
    const name = selectedGame.value?.name || form.name;
    if (name) void resolveReleaseYear(name);
}

async function hydrateGameCovers() {
    const cache = readCoverCache();
    const targets = new Map();
    [favorites, liked, completed].forEach((collection) => {
        collection.value.forEach((game) => {
            const key = normalizeCoverKey(game.name);
            if (!key) return;
            if (safeImageUrl(cache[key])) game.imageUrl = safeImageUrl(cache[key]);
            else if (!game.imageUrl && !targets.has(key)) targets.set(key, game.name);
        });
    });
    if (!apiBaseUrl || !targets.size) return;

    const entries = Array.from(targets.entries());
    let nextIndex = 0;
    const worker = async () => {
        while (nextIndex < entries.length) {
            const [key, name] = entries[nextIndex++];
            try {
                const results = await searchCatalog(name);
                const exact = results.find((game) => normalizeCoverKey(game?.name) === key);
                const chosen = exact || results[0];
                const imageUrl = safeImageUrl(chosen?.background_image);
                if (imageUrl) saveCover(name, imageUrl);
            } catch (error) {
                console.debug(`Capa ainda indisponível para ${name}.`);
            }
        }
    };
    await Promise.all(Array.from({ length: Math.min(3, entries.length) }, () => worker()));
}

watch(searchQuery, (value) => {
    if (searchTimer) clearTimeout(searchTimer);
    const query = String(value || "").trim();
    if (selectedGame.value && normalizeName(query) === normalizeName(selectedGame.value.name)) {
        searchStatus.value = "prompt";
        searchResults.value = [];
        return;
    }
    selectedGame.value = null;
    releaseYearController?.abort();
    releaseYearSequence += 1;
    form.releaseYear = null;
    form.releaseYearLoading = false;
    form.releaseYearError = "";
    form.name = "";
    form.genre = "";
    form.imageUrl = "";
    if (query.length < 2) {
        searchSequence += 1;
        searchController?.abort();
        searchResults.value = [];
        searchError.value = "";
        searchStatus.value = "prompt";
        return;
    }
    searchStatus.value = "waiting";
    searchTimer = window.setTimeout(() => void performSearch(query), 300);
});

async function performSearch(query) {
    const sequence = ++searchSequence;
    searchController?.abort();
    searchController = new AbortController();
    searchStatus.value = "loading";
    searchError.value = "";
    searchResults.value = [];
    try {
        const results = await searchCatalog(query, searchController.signal);
        if (sequence !== searchSequence) return;
        searchResults.value = results.filter((game) => game?.name).map((game) => ({
            id: game.id,
            name: String(game.name),
            genre: Array.isArray(game.genres) ? game.genres.map((item) => item?.name).filter(Boolean).join(" • ") || "Gênero não informado" : "Gênero não informado",
            imageUrl: safeImageUrl(game.background_image),
            releaseYear: parseReleaseYear(game.released)
        }));
        searchStatus.value = searchResults.value.length ? "results" : "empty";
    } catch (error) {
        if (error.name === "AbortError" || sequence !== searchSequence) return;
        searchResults.value = [];
        searchError.value = `${error.message || "Não foi possível pesquisar jogos."} Confira se o backend está ligado e RAWG_API_KEY configurada.`;
        searchStatus.value = "error";
    }
}

function chooseGame(game) {
    selectedGame.value = { ...game };
    form.name = game.name;
    form.genre = game.genre || "Gênero não informado";
    form.imageUrl = safeImageUrl(game.imageUrl);
    form.releaseYear = parseReleaseYear(game.released) || Number(game.releaseYear) || null;
    form.releaseYearLoading = false;
    form.releaseYearError = "";
    if (form.releaseYear) form.year = clampCompletedYear(form.year, form.releaseYear);
    searchQuery.value = game.name;
    searchResults.value = [];
    searchStatus.value = "prompt";
    if (form.imageUrl) saveCover(game.name, form.imageUrl);
    if (form.category === "completed" && !form.releaseYear) void resolveReleaseYear(game.name);
}

function clearSelectedGame() {
    selectedGame.value = null;
    releaseYearController?.abort();
    releaseYearSequence += 1;
    form.releaseYear = null;
    form.releaseYearLoading = false;
    form.releaseYearError = "";
    form.year = currentYear;
    form.name = "";
    form.genre = "";
    form.imageUrl = "";
    searchQuery.value = "";
    searchResults.value = [];
    searchStatus.value = "prompt";
    nextTick(() => document.getElementById("gameSearchInput")?.focus());
}

function setFormField({ field, value }) {
    if (Object.hasOwn(form, field)) form[field] = value;
}

function openAddModal() {
    editing.value = null;
    selectedGame.value = null;
    searchQuery.value = "";
    searchResults.value = [];
    searchStatus.value = "prompt";
    searchError.value = "";
    releaseYearController?.abort();
    releaseYearSequence += 1;
    Object.assign(form, { name: "", genre: "", category: "liked", position: favoritePositions.value[0] || 1, rating: "", year: currentYear, releaseYear: null, releaseYearLoading: false, releaseYearError: "", imageUrl: "" });
    editorReturnFocus.value = document.activeElement;
    isEditorOpen.value = true;
}

function openEditModal(game, category) {
    releaseYearController?.abort();
    releaseYearSequence += 1;
    editing.value = { category, originalName: game.name, game };
    selectedGame.value = { id: null, name: game.name, genre: game.genre, imageUrl: game.imageUrl || getCachedCover(game.name), releaseYear: null };
    searchQuery.value = game.name;
    searchResults.value = [];
    searchStatus.value = "prompt";
    searchError.value = "";
    Object.assign(form, {
        name: game.name,
        genre: game.genre,
        category,
        position: Number(game.position) || favoritePositions.value[0] || 1,
        rating: String(game.rating ?? 5).replace(".", ","),
        year: Number(game.year) || currentYear,
        releaseYear: null,
        releaseYearLoading: false,
        releaseYearError: "",
        imageUrl: game.imageUrl || getCachedCover(game.name)
    });
    editorReturnFocus.value = document.activeElement;
    isEditorOpen.value = true;
    if (category === "completed") void resolveReleaseYear(game.name);
}

function closeEditor() {
    isEditorOpen.value = false;
}

function parseRating(value) {
    const normalized = String(value || "").trim().replace(",", ".");
    if (!/^(?:\d|[1-9]\d|10)(?:\.\d)?$/.test(normalized)) return null;
    const number = Number(normalized);
    return Number.isFinite(number) && number >= 0 && number <= 10 ? number : null;
}

function ratingError() {
    window.alert("Digite uma nota entre 0 e 10, usando no máximo uma casa decimal. Exemplo: 7,8");
}

function addFavoriteRecord(name, genre, rating, position, imageUrl = "") {
    favorites.value.push(enrichGame({ name, genre, rating, position, imageUrl }, "favorite"));
    favorites.value.sort((a, b) => Number(a.position) - Number(b.position));
}

function upsertCompleted(name, genre, year = currentYear, imageUrl = "") {
    const existing = findGame(name, "completed");
    if (existing) {
        existing.genre = genre;
        existing.year = Number(year) || Number(existing.year) || currentYear;
        if (imageUrl) existing.imageUrl = imageUrl;
    } else {
        completed.value.push(enrichGame({ name, genre, rating: 5, year, imageUrl }, "completed"));
    }
}

function getTargetGame() {
    return selectedGame.value || (editing.value ? { name: form.name, genre: form.genre, imageUrl: form.imageUrl } : null);
}

async function submitGame() {
    const selected = getTargetGame();
    const name = String(selected?.name || form.name || "").trim();
    const genre = String(selected?.genre || form.genre || "Gênero não informado").trim();
    const category = form.category;
    const rating = parseRating(form.rating);
    const position = Number(form.position);
    const completedYear = Number(form.year);
    const imageUrl = safeImageUrl(selected?.imageUrl || form.imageUrl) || getCachedCover(name);

    if (!name) {
        window.alert("Selecione um jogo na busca da RAWG.");
        return;
    }
    if (rating === null) {
        ratingError();
        nextTick(() => document.getElementById("gameRating")?.focus());
        return;
    }
    if (!["favorite", "liked", "completed"].includes(category)) {
        window.alert("Selecione uma categoria válida.");
        return;
    }
    if (category === "completed") {
        const minimumYear = form.releaseYear;
        if (!Number.isInteger(minimumYear)) {
            notify("Não foi possível confirmar o ano de lançamento deste jogo. Tente novamente antes de salvá-lo como zerado.", "error", true);
            return;
        }
        if (!Number.isInteger(completedYear) || completedYear < minimumYear || completedYear > currentYear) {
            notify(`O ano em que você zerou deve estar entre ${minimumYear} e ${currentYear}.`, "error", true);
            return;
        }
    }
    if (imageUrl) saveCover(name, imageUrl);

    if (editing.value) {
        await saveEditedGame({ name, genre, rating, position, category, imageUrl, year: completedYear });
        return;
    }

    if (hasCategory(name, category)) {
        window.alert("Este jogo já foi adicionado nesta categoria.");
        return;
    }
    if (category === "favorite") {
        if (favoriteLimitReached.value) {
            window.alert("Você já possui 3 jogos favoritos. Remova um antes de adicionar outro.");
            return;
        }
        if (favorites.value.some((game) => Number(game.position) === position)) {
            window.alert("Essa posição do pódio já está ocupada.");
            return;
        }
        addLikedIfMissing(name, genre, rating, imageUrl);
        addFavoriteRecord(name, genre, rating, position, imageUrl);
    } else if (category === "liked") {
        liked.value.push(enrichGame({ name, genre, rating, imageUrl }, "liked"));
    } else {
        addLikedIfMissing(name, genre, rating, imageUrl);
        upsertCompleted(name, genre, completedYear, imageUrl);
    }

    closeEditor();
    await persistGames();
}

async function saveEditedGame({ name, genre, rating, position, category, imageUrl, year }) {
    const sourceCategory = editing.value.category;
    const originalName = editing.value.originalName;
    const sourceGame = findGame(originalName, sourceCategory);
    if (!sourceGame) return;

    const sameName = normalizeName(name) === normalizeName(originalName);
    const changingCategory = category !== sourceCategory;

    if (!changingCategory && hasCategory(name, category, originalName)) {
        window.alert("Este jogo já existe nesta categoria.");
        return;
    }

    if (changingCategory && ["favorite", "completed"].includes(sourceCategory) && hasCategory(name, sourceCategory, originalName)) {
        window.alert("Já existe um jogo com esse nome na categoria original.");
        return;
    }

    if (sourceCategory === "liked" && !sameName) {
        if (findGame(originalName, "favorite") || findGame(originalName, "completed")) {
            window.alert(`"${originalName}" também está classificado em outra seção.\n\nRemova essa classificação primeiro para poder trocar o nome do jogo.`);
            return;
        }
        if (hasCategory(name, "liked", originalName)) {
            window.alert('Este jogo já existe em "Jogos Que Gosto".');
            return;
        }
    }

    const existingFavorite = findGame(name, "favorite");
    const needsNewFavorite = category === "favorite" && sourceCategory !== "favorite" && !existingFavorite;
    if (needsNewFavorite && favorites.value.length >= 3) {
        window.alert("Você já possui 3 jogos favoritos. Remova um antes de adicionar outro.");
        return;
    }
    if (needsNewFavorite && favorites.value.some((game) => Number(game.position) === position)) {
        window.alert("Essa posição do pódio já está ocupada. Escolha outra posição.");
        return;
    }

    const updatedSource = {
        ...sourceGame,
        name,
        genre,
        rating: sourceCategory === "completed" ? Number(sourceGame.rating ?? 5) : rating,
        imageUrl: imageUrl || sourceGame.imageUrl
    };
    const originalPosition = Number(sourceGame.position);

    if (!changingCategory) {
        if (category === "favorite") {
            const other = favorites.value.find((game) => game !== sourceGame && Number(game.position) === position);
            if (other) other.position = originalPosition;
            Object.assign(sourceGame, updatedSource, { position });
            addLikedIfMissing(name, genre, rating, imageUrl);
        } else if (category === "liked") {
            Object.assign(sourceGame, updatedSource);
        } else {
            Object.assign(sourceGame, updatedSource, { year });
        }
    } else if (sourceCategory === "liked") {
        Object.assign(sourceGame, updatedSource);
        addLikedIfMissing(name, genre, rating, imageUrl);
        if (category === "favorite") {
            if (!existingFavorite) addFavoriteRecord(name, genre, rating, position, imageUrl);
        } else if (category === "completed") {
            upsertCompleted(name, genre, year, imageUrl);
        }
    } else if (sourceCategory === "favorite") {
        if (category === "favorite") {
            Object.assign(sourceGame, updatedSource);
            addLikedIfMissing(name, genre, rating, imageUrl);
        } else if (category === "completed") {
            Object.assign(sourceGame, updatedSource);
            addLikedIfMissing(name, genre, rating, imageUrl);
            upsertCompleted(name, genre, year, imageUrl);
        } else {
            addLikedIfMissing(name, genre, rating, imageUrl);
            favorites.value = favorites.value.filter((game) => game !== sourceGame);
        }
    } else if (sourceCategory === "completed") {
        if (category === "completed") {
            Object.assign(sourceGame, updatedSource, { year });
        } else if (category === "favorite") {
            Object.assign(sourceGame, updatedSource);
            addLikedIfMissing(name, genre, rating, imageUrl);
            if (!existingFavorite) addFavoriteRecord(name, genre, rating, position, imageUrl);
        } else {
            addLikedIfMissing(name, genre, rating, imageUrl);
            completed.value = completed.value.filter((game) => game !== sourceGame);
        }
    }

    favorites.value.sort((a, b) => Number(a.position) - Number(b.position));
    closeEditor();
    await persistGames();
}

function requestRemove(game, category) {
    if (category === "liked") {
        const isFavorite = Boolean(findGame(game.name, "favorite"));
        const isCompletedGame = Boolean(findGame(game.name, "completed"));
        if (isFavorite && isCompletedGame) {
            window.alert(`"${game.name}" está classificado como Favorito e também como Zerado.\n\nRemova essas classificações antes de removê-lo de Jogos Que Gosto.`);
            return;
        }
        if (isFavorite) {
            window.alert(`"${game.name}" está nos Jogos Favoritos.\n\nRemova-o do pódio antes de removê-lo de Jogos Que Gosto.`);
            return;
        }
        if (isCompletedGame) {
            window.alert(`"${game.name}" está em Jogos Zerados.\n\nRemova-o de Jogos Zerados antes de removê-lo de Jogos Que Gosto.`);
            return;
        }
    }
    confirmTarget.value = { game, category };
    confirmMessage.value = `Deseja remover "${game.name}" desta categoria?`;
    confirmReturnFocus.value = document.activeElement;
    isConfirmOpen.value = true;
}

async function confirmRemove() {
    const target = confirmTarget.value;
    if (!target) return;
    if (target.category === "favorite") favorites.value = favorites.value.filter((game) => game !== target.game);
    else if (target.category === "liked") liked.value = liked.value.filter((game) => game !== target.game);
    else completed.value = completed.value.filter((game) => game !== target.game);
    isConfirmOpen.value = false;
    confirmTarget.value = null;
    await persistGames();
    nextTick(() => {
        if (confirmReturnFocus.value?.isConnected) confirmReturnFocus.value.focus();
    });
}

function cancelConfirm() {
    isConfirmOpen.value = false;
    confirmTarget.value = null;
    nextTick(() => {
        if (confirmReturnFocus.value?.isConnected) confirmReturnFocus.value.focus();
    });
}

function updateConfirmVisibility(open) {
    if (open) isConfirmOpen.value = true;
    else cancelConfirm();
}

function scrollToSection(selector) {
    document.querySelector(selector)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function importGameFromCatalogQuery() {
    const params = new URLSearchParams(window.location.search);
    const name = String(params.get("addGame") || "").trim().slice(0, 160);
    if (!name) return;
    const genre = String(params.get("addGenre") || "Gênero não informado").trim().slice(0, 120) || "Gênero não informado";
    const imageUrl = safeImageUrl(params.get("addImage") || "");
    params.delete("addGame");
    params.delete("addGenre");
    params.delete("addImage");
    params.delete("addYear");
    params.delete("rawgId");
    const remaining = params.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${remaining ? `?${remaining}` : ""}${window.location.hash}`);

    let category = "liked";
    if (findGame(name, "liked")) {
        if (!findGame(name, "favorite") && favorites.value.length < 3) category = "favorite";
        else if (!findGame(name, "completed")) category = "completed";
        else {
            window.alert("Este jogo já está nas três categorias da sua coleção.");
            return;
        }
    }
    openAddModal();
    form.category = category;
    chooseGame({ id: null, name, genre, imageUrl });
    form.rating = "";
}

function handleEscape(event) {
    if (event.key !== "Escape") return;
    if (isConfirmOpen.value) cancelConfirm();
    else if (isEditorOpen.value) closeEditor();
}

watch(() => form.category, (category) => {
    if (category !== "completed") return;
    const gameName = selectedGame.value?.name || form.name;
    if (gameName && !Number.isInteger(form.releaseYear) && !form.releaseYearLoading) {
        void resolveReleaseYear(gameName);
    }
});

watch(isEditorOpen, async (open) => {
    if (open) {
        previousBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        await nextTick();
        document.getElementById("gameSearchInput")?.focus();
    } else {
        document.body.style.overflow = previousBodyOverflow;
        searchController?.abort();
        releaseYearController?.abort();
        releaseYearSequence += 1;
        form.releaseYearLoading = false;
        searchResults.value = [];
        searchStatus.value = "prompt";
        editing.value = null;
        nextTick(() => {
            if (editorReturnFocus.value?.isConnected) editorReturnFocus.value.focus();
        });
    }
});

watch(isConfirmOpen, (open) => {
    if (open) {
        previousBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
    } else if (!isEditorOpen.value) {
        document.body.style.overflow = previousBodyOverflow;
    }
});

onMounted(async () => {
    document.addEventListener("keydown", handleEscape);
    await loadGames();
    importGameFromCatalogQuery();
});

onBeforeUnmount(() => {
    document.removeEventListener("keydown", handleEscape);
    if (searchTimer) clearTimeout(searchTimer);
    if (messageTimer) clearTimeout(messageTimer);
    searchController?.abort();
    releaseYearController?.abort();
    document.body.style.overflow = previousBodyOverflow;
});
</script>

<template>
    <section class="games-header">
        <div>
            <span class="welcome-label">MINHA COLEÇÃO</span>
            <h1>Meus jogos 🎮</h1>
        </div>
        <button type="button" class="btn btn-primary" @click="openAddModal">+ Adicionar jogo</button>
    </section>

    <div v-if="pageMessage" class="games-feedback" :class="`is-${messageType}`" role="status" aria-live="polite">
        {{ pageMessage }}
        <button type="button" aria-label="Fechar aviso" @click="pageMessage = ''">×</button>
    </div>

    <section class="games-summary" aria-label="Resumo da coleção">
        <GameSummaryItem v-for="item in summaryItems" :key="item.label" :icon="item.icon" :count="item.count" :label="item.label" />
    </section>

    <section class="games-section favorites-section">
        <div class="games-section-header">
            <div>
                <span class="section-label">TOP 3</span>
                <h2>Jogos Favoritos</h2>
                <p>Os três jogos que mais me representam como jogador.</p>
            </div>
        </div>
        <div class="podium">
            <FavoriteGameCard
                v-for="game in podiumGames"
                :key="`favorite-${normalizeName(game.name)}`"
                :game="game"
                @edit="openEditModal($event, 'favorite')"
                @remove="requestRemove($event, 'favorite')"
            />
        </div>
        <p v-if="!podiumGames.length" class="games-empty-state">Você ainda não escolheu seus jogos favoritos.</p>
    </section>

    <section class="games-section">
        <div class="games-section-header">
            <div>
                <span class="section-label">COLEÇÃO</span>
                <h2>Jogos Que Gosto</h2>
                <p>Jogos que fazem parte da sua coleção.</p>
            </div>
            <button class="text-button" type="button" @click="scrollToSection('.collection-grid')">Ver todos →</button>
        </div>
        <div class="collection-grid">
            <CollectionGameCard
                v-for="game in liked"
                :key="`liked-${normalizeName(game.name)}`"
                :game="game"
                @edit="openEditModal($event, 'liked')"
                @remove="requestRemove($event, 'liked')"
            />
        </div>
        <p v-if="!liked.length && !isLoading" class="games-empty-state">Sua coleção ainda não tem jogos. Adicione seu primeiro título!</p>
    </section>

    <section class="games-section">
        <div class="games-section-header">
            <div>
                <span class="section-label">HISTÓRIA</span>
                <h2>Jogos Zerados</h2>
                <p>Sua jornada através dos jogos que você terminou.</p>
            </div>
            <button class="text-button" type="button" @click="scrollToSection('.completed-list')">Ver todos →</button>
        </div>
        <div class="completed-list">
            <CompletedGameCard
                v-for="game in completed"
                :key="`completed-${normalizeName(game.name)}`"
                :game="game"
                @edit="openEditModal($event, 'completed')"
                @remove="requestRemove($event, 'completed')"
            />
        </div>
        <p v-if="!completed.length && !isLoading" class="games-empty-state">Nenhum jogo zerado por enquanto.</p>
    </section>

    <GameEditorModal
        v-model="isEditorOpen"
        :form="form"
        v-model:search-query="searchQuery"
        :search-results="searchResults"
        :search-status="searchStatus"
        :search-error="searchError"
        :selected-game="selectedGame"
        :favorite-positions="favoritePositions"
        :favorite-limit-reached="favoriteLimitReached"
        :completed-year-options="completedYearOptions"
        :release-year-loading="form.releaseYearLoading"
        :release-year-error="form.releaseYearError"
        :current-year="currentYear"
        :is-editing="isEditing"
        :is-saving="isSaving"
        @field-change="setFormField"
        @retry-release-year="retryReleaseYear"
        @select-game="chooseGame"
        @clear-selection="clearSelectedGame"
        @submit="submitGame"
    />

    <GameConfirmModal
        :model-value="isConfirmOpen"
        :message="confirmMessage"
        @update:model-value="updateConfirmVisibility"
        @confirm="confirmRemove"
    />
</template>
