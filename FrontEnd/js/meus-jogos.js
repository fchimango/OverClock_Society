/* =========================================
   ELEMENTOS PRINCIPAIS
========================================= */

const addGameButton =
    document.getElementById("addGameButton");

const gameModalOverlay =
    document.getElementById("gameModalOverlay");

const gameModalClose =
    document.getElementById("gameModalClose");

const gameModalCancel =
    document.getElementById("gameModalCancel");

const gameConfirmOverlay =
    document.getElementById("gameConfirmOverlay");
const gameConfirmTitle =
    document.getElementById("gameConfirmTitle");
const gameConfirmMessage =
    document.getElementById("gameConfirmMessage");
const gameConfirmClose =
    document.getElementById("gameConfirmClose");
const gameConfirmCancel =
    document.getElementById("gameConfirmCancel");
const gameConfirmAccept =
    document.getElementById("gameConfirmAccept");

let gameConfirmResolver = null;
let gameConfirmReturnFocus = null;

const addGameForm =
    document.getElementById("addGameForm");

const gameModalTitle =
    document.getElementById("gameModalTitle");

const addGameSubmitButton =
    document.getElementById("addGameSubmitButton");


/* =========================================
   CAMPOS
========================================= */

const gameName =
    document.getElementById("gameName");

const gameCategory =
    document.getElementById("gameCategory");
const gameCategoryHint =
    document.getElementById("gameCategoryHint");

const favoritePosition =
    document.getElementById("favoritePosition");

const favoritePositionGroup =
    document.getElementById("favoritePositionGroup");

const gameRating =
    document.getElementById("gameRating");

const favoriteLimitMessage =
    document.getElementById("favoriteLimitMessage");

const gameSearchInput =
    document.getElementById("gameSearchInput");

const gameSearchResults =
    document.getElementById("gameSearchResults");

const selectedGamePreview =
    document.getElementById("selectedGamePreview");

const selectedGameImage =
    document.getElementById("selectedGameImage");

const selectedGameName =
    document.getElementById("selectedGameName");

const clearSelectedGameButton =
    document.getElementById("clearSelectedGame");


/* =========================================
   SEÇÕES
========================================= */

const collectionGrid =
    document.querySelector(".collection-grid");

const completedList =
    document.querySelector(".completed-list");

const podium =
    document.querySelector(".podium");

const summaryItems =
    document.querySelectorAll(
        ".summary-item strong"
    );


/* =========================================
   CONFIGURAÇÃO DA API E MIGRAÇÃO
========================================= */

const GAMES_API_BASE_URL =
    window.OVERCLOCK_API_BASE_URL;

function getGamesStorageKeys() {
    const userId = localStorage.getItem("userId");

    return {
        legacy: userId ? `overclockSocietyGames_${userId}` : null,
        marker: userId ? `overclockSocietyGamesMigrated_${userId}` : null
    };
}

let gamesApiReady = false;
let gamesApiWarningShown = false;
let gamesSaveQueue = Promise.resolve();

function showGamesApiWarning(message) {
    if (gamesApiWarningShown) {
        return;
    }

    gamesApiWarningShown = true;
    window.alert(message);
}


/* =========================================
   CONFIRMAÇÃO ESTILIZADA NO SITE
========================================= */

function closeGameConfirm(result = false) {
    if (!gameConfirmOverlay || !gameConfirmOverlay.classList.contains("active")) {
        return;
    }

    gameConfirmOverlay.classList.remove("active");
    gameConfirmOverlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = gameModalOverlay?.classList.contains("active") ? "hidden" : "";

    const resolve = gameConfirmResolver;
    gameConfirmResolver = null;
    const returnFocus = gameConfirmReturnFocus;
    gameConfirmReturnFocus = null;

    if (typeof resolve === "function") {
        resolve(Boolean(result));
    }

    if (returnFocus?.isConnected && typeof returnFocus.focus === "function") {
        window.setTimeout(() => returnFocus.focus(), 0);
    }
}

function showGameConfirm({
    title = "Remover jogo?",
    message = "Deseja remover este jogo desta categoria?",
    confirmLabel = "Remover jogo"
} = {}) {
    return new Promise((resolve) => {
        if (!gameConfirmOverlay) {
            // Nunca recorremos ao confirm() nativo do navegador.
            resolve(false);
            return;
        }

        if (gameConfirmResolver) {
            closeGameConfirm(false);
        }

        gameConfirmReturnFocus = document.activeElement;
        gameConfirmTitle.textContent = title;
        gameConfirmMessage.textContent = message;
        gameConfirmAccept.textContent = confirmLabel;
        gameConfirmResolver = resolve;
        gameConfirmOverlay.classList.add("active");
        gameConfirmOverlay.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";

        window.requestAnimationFrame(() => gameConfirmCancel?.focus());
    });
}

if (gameConfirmCancel) {
    gameConfirmCancel.addEventListener("click", () => closeGameConfirm(false));
}
if (gameConfirmClose) {
    gameConfirmClose.addEventListener("click", () => closeGameConfirm(false));
}
if (gameConfirmAccept) {
    gameConfirmAccept.addEventListener("click", () => closeGameConfirm(true));
}
if (gameConfirmOverlay) {
    gameConfirmOverlay.addEventListener("click", (event) => {
        if (event.target === gameConfirmOverlay) closeGameConfirm(false);
    });
}

async function getGamesApiError(response) {
    try {
        const body = await response.json();

        if (Array.isArray(body.detail) && body.detail.length) {
            return body.detail
                .map((item) => item.msg || item)
                .join(" ");
        }

        if (typeof body.detail === "string") {
            return body.detail;
        }
    } catch (error) {
        // Algumas respostas de erro podem não ter JSON.
    }

    return `A API respondeu com o status ${response.status}.`;
}


/* =========================================
   CATÁLOGO TEMPORÁRIO

   Futuramente será substituído
   pela API de jogos.
========================================= */

const gameCatalog = [

    {
        name: "Elden Ring",
        genre: "RPG • Ação"
    },

    {
        name: "Hollow Knight",
        genre: "Metroidvania • Aventura"
    },

    {
        name: "Minecraft",
        genre: "Sandbox • Aventura"
    },

    {
        name: "Valorant",
        genre: "FPS • Competitivo"
    },

    {
        name: "Terraria",
        genre: "Sandbox • Aventura"
    },

    {
        name: "Zelda",
        genre: "Aventura • RPG"
    },

    {
        name: "God of War",
        genre: "Ação • Aventura"
    },

    {
        name: "Stardew Valley",
        genre: "Simulação • RPG"
    },

    {
        name: "Resident Evil 4",
        genre: "Terror • Ação"
    },

    {
        name: "God of War Ragnarök",
        genre: "Ação • Aventura"
    },

    {
        name: "Celeste",
        genre: "Plataforma • Indie"
    },

    {
        name: "Spider-Man",
        genre: "Ação • Aventura"
    },

    {
        name: "Hades",
        genre: "Roguelike • Ação"
    },

    {
        name: "Sekiro: Shadows Die Twice",
        genre: "Ação • Soulslike"
    },

    {
        name: "Cyberpunk 2077",
        genre: "RPG • Ação"
    }

];


/* =========================================
   EDIÇÃO
========================================= */

let editingCard = null;

let editingOriginalCategory = null;


/* =========================================
   UTILIDADES
========================================= */

function normalizeGameName(name) {

    return String(name)
        .trim()
        .toLocaleLowerCase("pt-BR");
}


function escapeHtml(value) {

    const div =
        document.createElement("div");

    div.textContent =
        value;

    return div.innerHTML;
}


/* =========================================
   IMAGENS E PESQUISA DE JOGOS NA RAWG
========================================= */

const RAWG_COVER_CACHE_PREFIX = "overclockSocietyRawgCovers_";
let rawgSearchTimer = null;
let rawgSearchSequence = 0;
let rawgSearchController = null;

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

function getCoverCacheStorageKey() {
    const userId = localStorage.getItem("userId") || "current";
    return `${RAWG_COVER_CACHE_PREFIX}${userId}`;
}

function readCoverCache() {
    try {
        const value = JSON.parse(localStorage.getItem(getCoverCacheStorageKey()) || "{}");
        return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    } catch {
        return {};
    }
}

function getCachedGameCover(name) {
    const key = normalizeCoverKey(name);
    if (!key) return "";
    return safeRawgImageUrl(readCoverCache()[key]);
}

function saveGameCover(name, imageUrl) {
    const key = normalizeCoverKey(name);
    const safeUrl = safeRawgImageUrl(imageUrl);
    if (!key || !safeUrl) return;

    try {
        const cache = readCoverCache();
        cache[key] = safeUrl;
        const entries = Object.entries(cache);
        const limitedCache = Object.fromEntries(entries.slice(-500));
        localStorage.setItem(getCoverCacheStorageKey(), JSON.stringify(limitedCache));
    } catch (error) {
        console.debug("Não foi possível salvar o cache local das capas.");
    }

    applyCoverToMatchingCards(name, safeUrl);
}

function applyGameCover(imageContainer, name, imageUrl = "") {
    if (!imageContainer) return;
    const safeUrl = safeRawgImageUrl(imageUrl) || getCachedGameCover(name);
    if (!safeUrl) return;

    const existingImage = imageContainer.querySelector("img.game-cover-image");
    if (existingImage && existingImage.src === safeUrl) return;

    const image = document.createElement("img");
    image.className = "game-cover-image";
    image.src = safeUrl;
    image.alt = `Capa de ${name || "jogo"}`;
    image.loading = "lazy";
    image.decoding = "async";
    image.referrerPolicy = "no-referrer";
    image.addEventListener("error", () => {
        image.remove();
        imageContainer.classList.remove("has-game-cover");
    }, { once: true });

    imageContainer.replaceChildren(image);
    imageContainer.classList.add("has-game-cover");
}

function getCoverFromCard(card) {
    const image = card?.querySelector("img.game-cover-image");
    return safeRawgImageUrl(image?.currentSrc || image?.src || "");
}

function applyCoverToCard(card, name, imageUrl = "") {
    if (!card) return;
    const imageContainer = card.querySelector(
        ".podium-game-image, .collection-image, .completed-image"
    );
    applyGameCover(imageContainer, name, imageUrl);
}

function applyCoverToMatchingCards(name, imageUrl) {
    const desiredKey = normalizeCoverKey(name);
    if (!desiredKey) return;

    document.querySelectorAll(".podium-card, .collection-card, .completed-game").forEach((card) => {
        const cardName = card.querySelector("h3")?.textContent.trim() || "";
        if (normalizeCoverKey(cardName) === desiredKey) {
            applyCoverToCard(card, cardName, imageUrl);
        }
    });
}

function ensureGameOption(name, genre = "Gênero não informado", imageUrl = "", rawgId = "") {
    const cleanedName = String(name || "").trim().slice(0, 160);
    if (!cleanedName) return null;

    let option = Array.from(gameName.options).find(
        (candidate) => normalizeGameName(candidate.value) === normalizeGameName(cleanedName)
    );

    if (!option) {
        option = document.createElement("option");
        option.value = cleanedName;
        option.textContent = cleanedName;
        gameName.appendChild(option);
    }

    option.dataset.genre = String(genre || "Gênero não informado").slice(0, 120);
    const safeUrl = safeRawgImageUrl(imageUrl);
    if (safeUrl) {
        option.dataset.imageUrl = safeUrl;
        option.dataset.rawgId = String(rawgId || "");
        saveGameCover(cleanedName, safeUrl);
    }

    return option;
}

function getSelectedGameImage(name = gameName.value) {
    const selectedOption = Array.from(gameName.options).find(
        (option) => normalizeGameName(option.value) === normalizeGameName(name)
    );
    const fromOption = safeRawgImageUrl(selectedOption?.dataset.imageUrl || "");
    if (fromOption) return fromOption;

    const cached = getCachedGameCover(name);
    if (cached) return cached;

    if (editingCard && normalizeGameName(name) === normalizeGameName(
        editingCard.querySelector("h3")?.textContent.trim() || ""
    )) {
        return getCoverFromCard(editingCard);
    }

    return "";
}

function showSelectedGame(name, imageUrl = "") {
    if (!selectedGamePreview || !selectedGameName) return;
    const safeUrl = safeRawgImageUrl(imageUrl) || getCachedGameCover(name);
    selectedGameName.textContent = name || "";

    if (selectedGameImage) {
        selectedGameImage.hidden = !safeUrl;
        if (safeUrl) {
            selectedGameImage.src = safeUrl;
            selectedGameImage.alt = `Capa de ${name}`;
        } else {
            selectedGameImage.removeAttribute("src");
            selectedGameImage.alt = "";
        }
    }

    selectedGamePreview.hidden = !name;
    selectedGamePreview.classList.toggle("has-image", Boolean(safeUrl));
}

function clearGameSearchResults() {
    if (!gameSearchResults) return;
    gameSearchResults.replaceChildren();
    gameSearchResults.hidden = true;
    gameSearchResults.removeAttribute("aria-busy");
}

function showGameSearchMessage(message, kind = "") {
    if (!gameSearchResults) return;
    gameSearchResults.replaceChildren();
    const item = document.createElement("div");
    item.className = `game-search-message${kind ? ` ${kind}` : ""}`;
    item.textContent = message;
    gameSearchResults.appendChild(item);
    gameSearchResults.hidden = false;
    gameSearchResults.removeAttribute("aria-busy");
}

async function searchRawgGames(term) {
    const query = String(term || "").trim();
    const sequence = ++rawgSearchSequence;
    if (rawgSearchController) rawgSearchController.abort();

    if (query.length < 2) {
        clearGameSearchResults();
        return;
    }

    if (!GAMES_API_BASE_URL) {
        showGameSearchMessage("A API da Overclock Society ainda não está configurada.", "error");
        return;
    }

    rawgSearchController = new AbortController();
    gameSearchResults.hidden = false;
    gameSearchResults.replaceChildren();
    gameSearchResults.setAttribute("aria-busy", "true");
    showGameSearchMessage("Buscando jogos na RAWG...");
    gameSearchResults.setAttribute("aria-busy", "true");

    try {
        const params = new URLSearchParams({
            q: query,
            page: "1",
            page_size: "8",
            ordering: "-rating"
        });
        const response = await fetch(
            `${GAMES_API_BASE_URL}/catalog/games?${params.toString()}`,
            { headers: { Accept: "application/json" }, signal: rawgSearchController.signal }
        );
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(typeof body.detail === "string" ? body.detail : "Não foi possível consultar a RAWG.");
        }
        if (sequence !== rawgSearchSequence) return;

        const results = Array.isArray(body.results) ? body.results : [];
        if (!results.length) {
            showGameSearchMessage(`Nenhum jogo encontrado para “${query}”.`);
            return;
        }

        gameSearchResults.replaceChildren();
        results.forEach((game) => {
            if (!game?.name) return;
            const button = document.createElement("button");
            button.type = "button";
            button.className = "game-search-result";
            button.setAttribute("role", "option");
            button.setAttribute("aria-selected", "false");

            const imageUrl = safeRawgImageUrl(game.background_image);
            if (imageUrl) {
                const image = document.createElement("img");
                image.className = "game-search-result-cover";
                image.src = imageUrl;
                image.alt = "";
                image.loading = "lazy";
                image.referrerPolicy = "no-referrer";
                button.appendChild(image);
            } else {
                const fallback = document.createElement("span");
                fallback.className = "game-search-result-cover game-search-result-fallback";
                fallback.textContent = "🎮";
                button.appendChild(fallback);
            }

            const text = document.createElement("span");
            text.className = "game-search-result-copy";
            const title = document.createElement("strong");
            title.textContent = game.name;
            const genre = document.createElement("small");
            genre.textContent = Array.isArray(game.genres)
                ? game.genres.map((item) => item?.name).filter(Boolean).join(" · ") || "Gênero não informado"
                : "Gênero não informado";
            text.append(title, genre);
            button.appendChild(text);

            button.addEventListener("click", () => {
                const genreText = Array.isArray(game.genres)
                    ? game.genres.map((item) => item?.name).filter(Boolean).join(" • ") || "Gênero não informado"
                    : "Gênero não informado";
                const option = ensureGameOption(game.name, genreText, imageUrl, game.id);
                if (!option) return;
                gameName.value = option.value;
                gameSearchInput.value = game.name;
                showSelectedGame(game.name, imageUrl);
                clearGameSearchResults();
                refreshGameOptions(editingCard, game.name);
            });

            gameSearchResults.appendChild(button);
        });
        gameSearchResults.hidden = gameSearchResults.children.length === 0;
        gameSearchResults.removeAttribute("aria-busy");
    } catch (error) {
        if (error.name === "AbortError" || sequence !== rawgSearchSequence) return;
        console.warn("Falha na pesquisa de jogos RAWG:", error);
        showGameSearchMessage(`${error.message || "Não foi possível pesquisar jogos."} Confira se o backend está ligado e RAWG_API_KEY configurada.`, "error");
    }
}

function initializeRawgGameSearch() {
    if (!gameSearchInput) return;

    gameSearchInput.addEventListener("input", () => {
        const typed = gameSearchInput.value.trim();
        const selectedName = gameName.value;
        if (selectedName && normalizeGameName(typed) !== normalizeGameName(selectedName)) {
            gameName.value = "";
            showSelectedGame("", "");
        }

        if (rawgSearchTimer) window.clearTimeout(rawgSearchTimer);
        if (typed.length < 2) {
            clearGameSearchResults();
            return;
        }
        rawgSearchTimer = window.setTimeout(() => void searchRawgGames(typed), 300);
    });

    gameSearchInput.addEventListener("keydown", (event) => {
        if (event.key === "Escape") clearGameSearchResults();
    });

    clearSelectedGameButton?.addEventListener("click", () => {
        gameName.value = "";
        gameSearchInput.value = "";
        showSelectedGame("", "");
        clearGameSearchResults();
        gameSearchInput.focus();
    });

    document.addEventListener("click", (event) => {
        if (!event.target.closest(".game-search-wrap")) clearGameSearchResults();
    });
}

async function hydrateGameCovers() {
    const cards = Array.from(document.querySelectorAll(".podium-card, .collection-card, .completed-game"));
    const missingByKey = new Map();

    cards.forEach((card) => {
        const name = card.querySelector("h3")?.textContent.trim() || "";
        if (!name) return;
        const cached = getCachedGameCover(name) || getCoverFromCard(card);
        if (cached) {
            saveGameCover(name, cached);
            applyCoverToCard(card, name, cached);
        } else {
            const key = normalizeCoverKey(name);
            if (key && !missingByKey.has(key)) missingByKey.set(key, name);
        }
    });

    if (!GAMES_API_BASE_URL || missingByKey.size === 0) return;
    const entries = Array.from(missingByKey.entries());
    let nextIndex = 0;
    const worker = async () => {
        while (nextIndex < entries.length) {
            const index = nextIndex++;
            const [key, name] = entries[index];
            try {
                const params = new URLSearchParams({ q: name, page: "1", page_size: "8", ordering: "-rating" });
                const response = await fetch(`${GAMES_API_BASE_URL}/catalog/games?${params.toString()}`, {
                    headers: { Accept: "application/json" }
                });
                if (!response.ok) continue;
                const payload = await response.json();
                const results = Array.isArray(payload.results) ? payload.results : [];
                const exact = results.find((game) => normalizeCoverKey(game?.name) === key);
                const chosen = exact || results[0];
                const imageUrl = safeRawgImageUrl(chosen?.background_image);
                if (imageUrl) saveGameCover(name, imageUrl);
            } catch (error) {
                // As capas são opcionais; falha no catálogo não deve bloquear a coleção.
                console.debug(`Capa ainda indisponível para ${name}.`);
            }
        }
    };

    await Promise.all(Array.from({ length: Math.min(3, entries.length) }, () => worker()));
}


/* =========================================
   CATÁLOGO
========================================= */

function getGameFromCatalog(name) {

    return gameCatalog.find(
        (game) =>

            normalizeGameName(game.name) ===
            normalizeGameName(name)
    );
}


function getGameGenre(
    name,
    card = null
) {
    const selectedOption = Array.from(gameName.options).find(
        (option) => normalizeGameName(option.value) === normalizeGameName(name)
    );
    const selectedGenre = selectedOption?.dataset.genre;
    if (selectedGenre && selectedGenre !== "Gênero não informado") {
        return selectedGenre;
    }

    const game = getGameFromCatalog(name);
    if (game) return game.genre;

    if (card) {
        const data = getCardData(card);
        if (data?.genre) return data.genre;
    }

    return "Gênero não informado";
}

/* =========================================
   NOTA
========================================= */

function parseRating(value) {

    const text =
        String(value)
            .trim()
            .replace(",", ".");


    /*
     * Aceita:
     *
     * 0
     * 5
     * 7,8
     * 9.5
     * 10
     * 10,0
     *
     * Máximo de uma casa decimal.
     */

    const validFormat =
        /^(?:10(?:\.0)?|[0-9](?:\.[0-9])?)$/;


    if (
        !validFormat.test(text)
    ) {

        return null;
    }


    const number =
        Number(text);


    if (
        number < 0 ||
        number > 10
    ) {

        return null;
    }


    return number;
}


function formatRating(value) {

    return Number(value)
        .toFixed(1)
        .replace(".", ",");
}


function extractRating(text) {

    const match =
        String(text).match(
            /(\d+(?:[.,]\d+)?)/
        );


    if (!match) {

        return 5;
    }


    return Number(
        match[1]
            .replace(",", ".")
    );
}


/* =========================================
   CATEGORIA DO CARD
========================================= */

function getCategoryFromCard(card) {

    if (
        card.classList.contains(
            "podium-card"
        )
    ) {

        return "favorite";
    }


    if (
        card.classList.contains(
            "collection-card"
        )
    ) {

        return "liked";
    }


    if (
        card.classList.contains(
            "completed-game"
        )
    ) {

        return "completed";
    }


    return null;
}


/* =========================================
   JOGOS DE UMA CATEGORIA
========================================= */

function getGamesInCategory(
    category,
    excludeCard = null
) {

    let selector;


    if (
        category === "favorite"
    ) {

        selector =
            ".podium-card";
    }

    else if (
        category === "liked"
    ) {

        selector =
            ".collection-card";
    }

    else {

        selector =
            ".completed-game";
    }


    const cards =
        document.querySelectorAll(
            selector
        );


    const games =
        new Set();


    cards.forEach(
        (card) => {

            if (
                card === excludeCard
            ) {

                return;
            }


            const title =
                card.querySelector("h3");


            if (!title) {

                return;
            }


            games.add(
                normalizeGameName(
                    title.textContent
                )
            );

        }
    );


    return games;
}


function isGameInCategory(
    name,
    category,
    excludeCard = null
) {

    return getGamesInCategory(
        category,
        excludeCard
    ).has(
        normalizeGameName(name)
    );
}


/* =========================================
   LOCALIZAR CARD POR CATEGORIA E NOME
========================================= */

function findGameCardInCategory(
    name,
    category,
    excludeCard = null
) {
    const selector =
        category === "favorite"
            ? ".podium-card"
            : category === "liked"
                ? ".collection-card"
                : ".completed-game";

    const normalizedName = normalizeGameName(name);

    return Array.from(
        document.querySelectorAll(selector)
    ).find((card) => {
        if (card === excludeCard) {
            return false;
        }

        const cardName = card.querySelector("h3")?.textContent.trim() || "";
        return normalizeGameName(cardName) === normalizedName;
    }) || null;
}


/* =========================================
   GARANTIR "JOGOS QUE GOSTO"

   Todo favorito também precisa
   estar nessa categoria.
========================================= */

function ensureGameIsLiked(
    name,
    genre,
    rating = 5
) {

    if (
        isGameInCategory(
            name,
            "liked"
        )
    ) {

        return;
    }


    createLikedCard(
        name,
        genre,
        rating
    );
}


/* =========================================
   OPÇÕES DO SELECT
========================================= */

function buildGameOptions() {
    gameName.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Selecione um jogo pesquisado na RAWG...";
    placeholder.disabled = true;
    placeholder.selected = true;
    gameName.appendChild(placeholder);
}

initializeRawgGameSearch();

/* =========================================
   ATUALIZAR JOGOS DISPONÍVEIS

   REGRAS:

   1 - Não repetir dentro da mesma
       categoria.

   2 - A categoria Zerados pode ser adicionada
       sem remover outras classificações; a entrada
       em Jogos Que Gosto é criada quando necessária.

   3 - Favorito também garante a entrada-base em
       Jogos Que Gosto automaticamente.
========================================= */

function refreshGameOptions(
    excludeCard = null,
    selectedName = ""
) {

    const category =
        gameCategory.value;


    /*
     * Permite editar jogos que não
     * estejam no catálogo temporário.
     */

    if (selectedName) {

        const exists =
            Array.from(
                gameName.options
            ).some(
                (option) =>

                    normalizeGameName(
                        option.value
                    ) ===

                    normalizeGameName(
                        selectedName
                    )
            );


        if (!exists) {
            ensureGameOption(
                selectedName,
                getGameGenre(selectedName, excludeCard),
                getCachedGameCover(selectedName),
                ""
            );
        }
    }


    const gamesInCategory =
        getGamesInCategory(
            category,
            excludeCard
        );


    Array
        .from(gameName.options)
        .forEach(
            (option) => {

                if (!option.value) {

                    return;
                }


                const normalized =
                    normalizeGameName(
                        option.value
                    );

                // Durante a edição, mantenha o jogo atual selecionável ao
                // trocar a categoria. A função de salvamento valida conflitos.
                if (
                    editingCard &&
                    selectedName &&
                    normalized === normalizeGameName(selectedName)
                ) {
                    option.disabled = false;
                    return;
                }

                /*
                 * JOGOS ZERADOS
                 */

                if (
                    category ===
                    "completed"
                ) {
                    const alreadyCompleted =
                        gamesInCategory.has(normalized);

                    option.disabled = alreadyCompleted;
                    return;
                }


                /*
                 * FAVORITOS E GOSTO
                 */

                option.disabled =
                    gamesInCategory.has(
                        normalized
                    );

            }
        );


    if (selectedName) {

        gameName.value =
            selectedName;

        return;
    }


    /*
     * Se mudou a categoria e o jogo
     * atual ficou indisponível,
     * limpa a seleção.
     */

    const selectedOption =
        gameName.options[
            gameName.selectedIndex
        ];


    if (
        selectedOption &&
        selectedOption.disabled
    ) {

        gameName.value = "";
    }
}


/* =========================================
   ABRIR MODAL
========================================= */

function openGameModal() {

    editingCard =
        null;

    editingOriginalCategory =
        null;


    addGameForm.reset();
    gameSearchInput.value = "";
    clearGameSearchResults();
    showSelectedGame("", "");


    gameCategory.disabled =
        false;


    gameCategory.value =
        "liked";

    if (gameCategoryHint) gameCategoryHint.hidden = true;

    gameModalTitle.textContent =
        "Adicionar jogo";


    addGameSubmitButton.textContent =
        "Adicionar jogo";


    favoritePositionGroup.style.display =
        "none";


    favoriteLimitMessage.style.display =
        "none";


    buildGameOptions();

    refreshGameOptions();

    updateFavoritePositionOptions();


    gameModalOverlay.classList.add(
        "active"
    );


    document.body.style.overflow =
        "hidden";
}


/* =========================================
   FECHAR MODAL
========================================= */

function closeGameModal() {

    gameModalOverlay.classList.remove(
        "active"
    );


    document.body.style.overflow =
        "";


    gameCategory.disabled =
        false;


    editingCard =
        null;

    editingOriginalCategory =
        null;
}


/* =========================================
   EVENTOS DO MODAL
========================================= */

addGameButton.addEventListener(
    "click",
    openGameModal
);


gameModalClose.addEventListener(
    "click",
    closeGameModal
);


gameModalCancel.addEventListener(
    "click",
    closeGameModal
);


gameModalOverlay.addEventListener(
    "click",
    (event) => {

        if (
            event.target ===
            gameModalOverlay
        ) {

            closeGameModal();
        }

    }
);


document.addEventListener(
    "keydown",
    (event) => {
        if (event.key !== "Escape") return;

        if (gameConfirmOverlay?.classList.contains("active")) {
            closeGameConfirm(false);
            return;
        }

        if (gameModalOverlay?.classList.contains("active")) {
            closeGameModal();
        }
    }
);


/* =========================================
   TROCAR CATEGORIA
========================================= */

gameCategory.addEventListener(
    "change",
    () => {

        if (
            gameCategory.value ===
            "favorite"
        ) {

            favoritePositionGroup.style.display =
                "flex";


            updateFavoritePositionOptions();

        } else {

            favoritePositionGroup.style.display =
                "none";


            favoriteLimitMessage.style.display =
                "none";
        }


        // Ao editar, preserva o jogo atualmente selecionado mesmo que ele
        // já esteja em outra categoria (por exemplo, Favoritos também existe
        // em Jogos Que Gosto).
        refreshGameOptions(
            editingCard,
            editingCard ? gameName.value : ""
        );

    }
);


/* =========================================
   FAVORITOS
========================================= */

function getFavoriteCards() {

    return Array.from(
        podium.querySelectorAll(
            ".podium-card"
        )
    );
}


function getFavoriteCount() {

    return getFavoriteCards()
        .length;
}


function getFavoriteCardByPosition(
    position,
    excludeCard = null
) {

    return getFavoriteCards()
        .find(
            (card) =>

                card !== excludeCard &&

                Number(
                    card.dataset.position
                ) ===

                Number(position)
        ) || null;
}


/* =========================================
   POSIÇÕES DO PÓDIO
========================================= */

function updateFavoritePositionOptions() {

    const options =
        Array.from(
            favoritePosition.options
        );


    const editingFavorite =
        editingCard &&
        editingOriginalCategory ===
            "favorite";


    options.forEach(
        (option) => {

            if (editingFavorite) {

                option.disabled =
                    false;

                return;
            }


            option.disabled =
                Boolean(
                    getFavoriteCardByPosition(
                        option.value
                    )
                );

        }
    );


    if (!editingFavorite) {

        const available =
            options.find(
                (option) =>
                    !option.disabled
            );


        if (available) {

            favoritePosition.value =
                available.value;
        }
    }


    if (
        getFavoriteCount() >= 3 &&
        !editingFavorite
    ) {

        favoriteLimitMessage.style.display =
            "block";


        favoriteLimitMessage.textContent =
            "Você já possui 3 jogos favoritos. Remova um para adicionar outro.";

    } else {

        favoriteLimitMessage.style.display =
            "none";
    }
}


/* =========================================
   VISUAL DO PÓDIO
========================================= */

function applyFavoritePosition(
    card,
    position
) {

    position =
        Number(position);


    card.dataset.position =
        String(position);


    card.classList.remove(
        "first-place",
        "second-place",
        "third-place"
    );


    const positionElement =
        card.querySelector(
            ".podium-position"
        );

    const medalElement =
        card.querySelector(
            ".podium-medal"
        );

    const placeElement =
        card.querySelector(
            ".podium-place"
        );


    if (
        !positionElement ||
        !medalElement ||
        !placeElement
    ) {

        return;
    }


    positionElement.classList.remove(
        "gold",
        "silver",
        "bronze"
    );


    if (position === 1) {

        card.classList.add(
            "first-place"
        );

        positionElement.classList.add(
            "gold"
        );

        positionElement.textContent =
            "1º";

        medalElement.textContent =
            "🥇";

        placeElement.textContent =
            "PRIMEIRO LUGAR";
    }


    else if (position === 2) {

        card.classList.add(
            "second-place"
        );

        positionElement.classList.add(
            "silver"
        );

        positionElement.textContent =
            "2º";

        medalElement.textContent =
            "🥈";

        placeElement.textContent =
            "SEGUNDO LUGAR";
    }


    else {

        card.classList.add(
            "third-place"
        );

        positionElement.classList.add(
            "bronze"
        );

        positionElement.textContent =
            "3º";

        medalElement.textContent =
            "🥉";

        placeElement.textContent =
            "TERCEIRO LUGAR";
    }
}


/* =========================================
   ORDENAR PÓDIO

   Visual:
   2º | 1º | 3º
========================================= */

function normalizePodium() {

    const cards =
        getFavoriteCards();


    const order = [
        2,
        1,
        3
    ];


    order.forEach(
        (position) => {

            const card =
                cards.find(
                    (item) =>

                        Number(
                            item.dataset.position
                        ) ===
                        position
                );


            if (card) {

                podium.appendChild(
                    card
                );
            }

        }
    );


    getFavoriteCards()
        .forEach(
            (card) => {

                applyFavoritePosition(
                    card,
                    card.dataset.position
                );

            }
        );
}


/* =========================================
   LER CARD
========================================= */

function getCardData(card) {

    const category =
        getCategoryFromCard(
            card
        );


    if (
        category === "favorite"
    ) {

        return {

            category,

            name:
                card.querySelector(
                    "h3"
                )?.textContent.trim()
                || "",

            genre:
                card.querySelector(
                    ".podium-info p"
                )?.textContent.trim()
                || "",

            rating:
                extractRating(
                    card.querySelector(
                        ".podium-rating"
                    )?.textContent || ""
                ),

            position:
                Number(
                    card.dataset.position
                )
        };
    }


    if (
        category === "liked"
    ) {

        return {

            category,

            name:
                card.querySelector(
                    "h3"
                )?.textContent.trim()
                || "",

            genre:
                card.querySelector(
                    ".collection-info span"
                )?.textContent.trim()
                || "",

            rating:
                extractRating(
                    card.querySelector(
                        ".collection-info strong"
                    )?.textContent || ""
                )
        };
    }


    if (
        category === "completed"
    ) {

        return {

            category,

            name:
                card.querySelector(
                    "h3"
                )?.textContent.trim()
                || "",

            genre:
                card.querySelector(
                    ".completed-info span"
                )?.textContent.trim()
                || "",

            rating: 5,

            year:
                Number(
                    card.querySelector(
                        ".completed-date strong"
                    )?.textContent
                ) ||
                new Date().getFullYear()
        };
    }


    return null;
}


/* =========================================
   PERSISTÊNCIA NO POSTGRESQL
========================================= */

function getCurrentGamesState() {
    const favorites = Array.from(
        podium.querySelectorAll(".podium-card")
    )
        .map(getCardData)
        .filter(Boolean);

    const liked = Array.from(
        collectionGrid.querySelectorAll(".collection-card")
    )
        .map(getCardData)
        .filter(Boolean);

    const completed = Array.from(
        completedList.querySelectorAll(".completed-game")
    )
        .map(getCardData)
        .filter(Boolean);

    return { favorites, liked, completed };
}

function buildGamesApiPayload() {
    const state = getCurrentGamesState();

    return {
        favorites: state.favorites.map((game) => ({
            name: game.name,
            genre: game.genre,
            rating: Number(game.rating ?? 5),
            position: Number(game.position)
        })),
        liked: state.liked.map((game) => ({
            name: game.name,
            genre: game.genre,
            rating: Number(game.rating ?? 5)
        })),
        completed: state.completed.map((game) => ({
            name: game.name,
            genre: game.genre,
            rating: Number(game.rating ?? 5),
            year: Number(game.year) || new Date().getFullYear()
        }))
    };
}

function isValidGamesState(data) {
    return Boolean(
        data &&
        Array.isArray(data.favorites) &&
        Array.isArray(data.liked) &&
        Array.isArray(data.completed)
    );
}

function clearGameSections() {
    podium.innerHTML = "";
    collectionGrid.innerHTML = "";
    completedList.innerHTML = "";
}

function renderGamesState(data) {
    if (!isValidGamesState(data)) {
        throw new Error("A coleção recebida pela API está em formato inválido.");
    }

    clearGameSections();

    data.liked.forEach((game) => {
        if (!game?.name || !game?.genre) {
            return;
        }

        createLikedCard(
            game.name,
            game.genre,
            Number(game.rating ?? 5)
        );
    });

    data.favorites.forEach((game) => {
        const position = Number(game?.position);

        if (!game?.name || !game?.genre || ![1, 2, 3].includes(position)) {
            return;
        }

        createFavoriteCard(
            game.name,
            game.genre,
            Number(game.rating ?? 5),
            position
        );
    });

    data.completed.forEach((game) => {
        if (!game?.name || !game?.genre) {
            return;
        }

        createCompletedCard(
            game.name,
            game.genre,
            Number(game.year) || new Date().getFullYear()
        );
    });
}

function getLegacyGamesState() {
    const keys = getGamesStorageKeys();

    if (!keys.legacy) {
        return null;
    }

    try {
        const stored = localStorage.getItem(keys.legacy);

        if (!stored) {
            return null;
        }

        const data = JSON.parse(stored);
        return isValidGamesState(data) ? data : null;
    } catch (error) {
        console.warn("Não foi possível ler a coleção antiga do navegador.", error);
        return null;
    }
}

async function loadGamesFromAPI() {
    const token = localStorage.getItem("token");

    if (!token) {
        console.warn("Não foi possível carregar os jogos: token de sessão ausente.");
        return { source: "unavailable", shouldSave: false };
    }

    try {
        const response = await fetch(`${GAMES_API_BASE_URL}/games`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(await getGamesApiError(response));
        }

        const data = await response.json();

        if (!isValidGamesState(data)) {
            throw new Error("A API de jogos devolveu uma resposta inesperada.");
        }

        gamesApiReady = true;

        const keys = getGamesStorageKeys();
        const hasMigrationMarker = Boolean(
            keys.marker && localStorage.getItem(keys.marker) === "true"
        );
        const totalInDatabase =
            data.favorites.length + data.liked.length + data.completed.length;

        if (totalInDatabase > 0 || hasMigrationMarker) {
            renderGamesState(data);

            if (keys.marker && totalInDatabase > 0) {
                localStorage.setItem(keys.marker, "true");
            }

            return { source: "database", shouldSave: false };
        }

        // Migra os dados antigos do localStorage apenas uma vez por usuário.
        const legacyState = getLegacyGamesState();

        if (legacyState) {
            renderGamesState(legacyState);
            return { source: "legacy", shouldSave: true };
        }

        // Primeira visita: preserva os cards de demonstração do HTML.
        return { source: "demo", shouldSave: true };
    } catch (error) {
        gamesApiReady = false;
        console.error("Não foi possível carregar a coleção pela API.", error);
        showGamesApiWarning(
            "Não foi possível conectar ao serviço de jogos. A página manterá os cards atuais, mas as alterações não serão salvas no banco enquanto a API estiver indisponível. Verifique se o FastAPI está funcionando e recarregue a página."
        );
        return { source: "unavailable", shouldSave: false };
    }
}

function saveGamesToStorage() {
    if (!gamesApiReady) {
        console.warn("A coleção não foi enviada porque a API de jogos não está disponível.");
        return Promise.resolve(false);
    }

    const token = localStorage.getItem("token");

    if (!token) {
        console.warn("A coleção não foi enviada: token de sessão ausente.");
        return Promise.resolve(false);
    }

    // Captura um retrato desta alteração e serializa os envios para evitar
    // que requisições simultâneas gravem estados fora de ordem.
    const payload = buildGamesApiPayload();

    gamesSaveQueue = gamesSaveQueue
        .catch(() => false)
        .then(async () => {
            const response = await fetch(`${GAMES_API_BASE_URL}/games`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(await getGamesApiError(response));
            }

            const keys = getGamesStorageKeys();
            if (keys.marker) {
                localStorage.setItem(keys.marker, "true");
            }

            return true;
        })
        .catch((error) => {
            console.error("Não foi possível salvar a coleção no PostgreSQL.", error);
            showGamesApiWarning(
                `Não foi possível salvar sua coleção no banco de dados. ${error.message || "Confira a conexão com a API e tente novamente."}`
            );
            return false;
        });

    return gamesSaveQueue;
}


/* =========================================
   EDITAR
========================================= */

function openEditGameModal(card) {

    const data =
        getCardData(card);


    if (!data) {

        return;
    }


    editingCard =
        card;


    editingOriginalCategory =
        data.category;


    gameModalTitle.textContent =
        "Editar jogo";


    addGameSubmitButton.textContent =
        "Salvar alterações";


    // Ao editar, selecionar Favoritos ou Zerados pode adicionar uma
    // classificação adicional, sem apagar a classificação existente.
    gameCategory.disabled = false;
    gameCategory.value = data.category;
    if (gameCategoryHint) {
        gameCategoryHint.hidden = !["favorite", "completed"].includes(data.category);
    }


    buildGameOptions();

    const existingCover = getCoverFromCard(card) || getCachedGameCover(data.name);
    ensureGameOption(data.name, data.genre, existingCover, "");
    refreshGameOptions(
        card,
        data.name
    );

    gameName.value = data.name;
    gameSearchInput.value = data.name;
    showSelectedGame(data.name, existingCover);
    clearGameSearchResults();


    gameRating.value =
        String(
            data.rating
        ).replace(
            ".",
            ","
        );


    if (
        data.category ===
        "favorite"
    ) {

        favoritePositionGroup.style.display =
            "flex";


        favoritePosition.value =
            String(
                data.position
            );


        updateFavoritePositionOptions();

    } else {

        favoritePositionGroup.style.display =
            "none";
    }


    gameModalOverlay.classList.add(
        "active"
    );


    document.body.style.overflow =
        "hidden";
}


/* =========================================
   ATUALIZAR "GOSTO"
========================================= */

function updateLikedCard(
    card,
    name,
    genre,
    rating
) {

    card.querySelector(
        "h3"
    ).textContent =
        name;


    card.querySelector(
        ".collection-info span"
    ).textContent =
        genre;


    card.querySelector(
        ".collection-info strong"
    ).textContent =
        `⭐ ${formatRating(rating)}`;

    applyCoverToCard(card, name, getCachedGameCover(name));
}


/* =========================================
   ATUALIZAR ZERADO
========================================= */

function updateCompletedCard(
    card,
    name,
    genre
) {

    card.querySelector(
        "h3"
    ).textContent =
        name;


    card.querySelector(
        ".completed-info span"
    ).textContent =
        genre;

    applyCoverToCard(card, name, getCachedGameCover(name));
}


/* =========================================
   ATUALIZAR FAVORITO
========================================= */

function updateFavoriteCard(
    card,
    name,
    genre,
    rating
) {

    card.querySelector(
        "h3"
    ).textContent =
        name;


    card.querySelector(
        ".podium-info p"
    ).textContent =
        genre;


    card.querySelector(
        ".podium-rating"
    ).textContent =
        `⭐ ${formatRating(rating)}`;

    applyCoverToCard(card, name, getCachedGameCover(name));
}


/* =========================================
   CRIAR "JOGOS QUE GOSTO"
========================================= */

function createLikedCard(
    name,
    genre,
    rating
) {

    const card =
        document.createElement(
            "article"
        );


    card.className =
        "collection-card";


    card.innerHTML = `

        <div
            class="collection-image new-game-image"
        >
            🎮
        </div>

        <div class="collection-info">

            <div>

                <h3>
                    ${escapeHtml(name)}
                </h3>

                <span>
                    ${escapeHtml(genre)}
                </span>

            </div>

            <strong>
                ⭐ ${formatRating(rating)}
            </strong>

        </div>
    `;


    applyCoverToCard(card, name, getCachedGameCover(name));
    addGameActions(card);


    collectionGrid.appendChild(
        card
    );


    return card;
}


/* =========================================
   CRIAR ZERADO
========================================= */

function createCompletedCard(
    name,
    genre,
    year = new Date().getFullYear()
) {


    const card =
        document.createElement(
            "article"
        );


    card.className =
        "completed-game";


    card.innerHTML = `

        <div
            class="completed-image new-game-image"
        >
            🎮
        </div>

        <div class="completed-info">

            <h3>
                ${escapeHtml(name)}
            </h3>

            <span>
                ${escapeHtml(genre)}
            </span>

        </div>

        <div class="completed-date">

            <span>
                Zerado em
            </span>

            <strong>
                ${year}
            </strong>

        </div>

        <span class="completed-status">
            ✓ Zerado
        </span>
    `;


    applyCoverToCard(card, name, getCachedGameCover(name));
    addGameActions(card);


    completedList.appendChild(
        card
    );


    return card;
}


/* =========================================
   CRIAR FAVORITO
========================================= */

function createFavoriteCard(
    name,
    genre,
    rating,
    position
) {

    const card =
        document.createElement(
            "article"
        );


    card.className =
        "podium-card";


    card.dataset.position =
        String(position);


    card.innerHTML = `

        <div
            class="podium-position"
        ></div>

        <div
            class="podium-medal"
        ></div>

        <div
            class="podium-game-image new-game-image"
        >
            🎮
        </div>

        <div class="podium-info">

            <span
                class="podium-place"
            ></span>

            <h3>
                ${escapeHtml(name)}
            </h3>

            <p>
                ${escapeHtml(genre)}
            </p>

            <div class="podium-rating">
                ⭐ ${formatRating(rating)}
            </div>

        </div>
    `;


    applyCoverToCard(card, name, getCachedGameCover(name));
    addGameActions(card);


    podium.appendChild(
        card
    );


    applyFavoritePosition(
        card,
        position
    );


    normalizePodium();


    return card;
}


/* =========================================
   MENU
========================================= */

function addGameActions(card) {

    if (
        card.querySelector(
            ".game-actions"
        )
    ) {

        return;
    }


    const actions =
        document.createElement(
            "div"
        );


    actions.className =
        "game-actions";


    actions.innerHTML = `

        <button
            type="button"
            class="game-options-button"
            aria-label="Opções do jogo"
        >
            ⋮
        </button>

        <div
            class="game-action-menu"
        >

            <button
                type="button"
                data-game-action="edit"
            >
                ✏️ Editar
            </button>

            <button
                type="button"
                class="danger"
                data-game-action="remove"
            >
                🗑️ Remover
            </button>

        </div>
    `;


    card.appendChild(
        actions
    );
}


/* =========================================
   CARDS EXISTENTES
========================================= */

function initializeGameActions() {

    document
        .querySelectorAll(
            ".podium-card, .collection-card, .completed-game"
        )
        .forEach(
            (card) => {

                addGameActions(
                    card
                );

            }
        );
}


/* =========================================
   REMOVER
========================================= */

async function removeGame(card) {

    const data =
        getCardData(card);


    if (!data) {

        return;
    }


    const category =
        data.category;


    /*
     * =========================================
     * PROTEGER JOGOS QUE GOSTO
     *
     * Um jogo não pode sair da coleção-base
     * enquanto for Favorito ou Zerado.
     * =========================================
     */

    if (
        category === "liked"
    ) {

        const isFavorite =
            isGameInCategory(
                data.name,
                "favorite"
            );


        const isCompleted =
            isGameInCategory(
                data.name,
                "completed"
            );


        if (
            isFavorite &&
            isCompleted
        ) {

            alert(
                `"${data.name}" está classificado como Favorito e também como Zerado.\n\nRemova essas classificações antes de removê-lo de Jogos Que Gosto.`
            );

            return;
        }


        if (isFavorite) {

            alert(
                `"${data.name}" está nos Jogos Favoritos.\n\nRemova-o do pódio antes de removê-lo de Jogos Que Gosto.`
            );

            return;
        }


        if (isCompleted) {

            alert(
                `"${data.name}" está em Jogos Zerados.\n\nRemova-o de Jogos Zerados antes de removê-lo de Jogos Que Gosto.`
            );

            return;
        }
    }


    const confirmed = await showGameConfirm({
        title: "Remover jogo?",
        message: `Deseja remover "${data.name}" desta categoria?`,
        confirmLabel: "Remover jogo"
    });


    if (!confirmed) {

        return;
    }


    /*
     * Se remover de Favoritos,
     * apenas o card do pódio é removido.
     *
     * O jogo continua normalmente
     * em Jogos Que Gosto.
     */

    card.remove();


    normalizePodium();

    updateSummary();

    updateFavoritePositionOptions();

    refreshGameOptions();

    saveGamesToStorage();
}


/* =========================================
   EVENTOS DOS MENUS
========================================= */

document.addEventListener(
    "click",
    (event) => {

        const optionsButton =
            event.target.closest(
                ".game-options-button"
            );


        if (optionsButton) {

            event.stopPropagation();


            const currentMenu =
                optionsButton
                    .nextElementSibling;


            document
                .querySelectorAll(
                    ".game-action-menu.active"
                )
                .forEach(
                    (menu) => {

                        if (
                            menu !==
                            currentMenu
                        ) {

                            menu.classList.remove(
                                "active"
                            );
                        }

                    }
                );


            currentMenu.classList.toggle(
                "active"
            );


            return;
        }


        const actionButton =
            event.target.closest(
                "[data-game-action]"
            );


        if (actionButton) {

            event.stopPropagation();


            const card =
                actionButton.closest(
                    ".podium-card, .collection-card, .completed-game"
                );


            const action =
                actionButton.dataset
                    .gameAction;


            document
                .querySelectorAll(
                    ".game-action-menu.active"
                )
                .forEach(
                    (menu) => {

                        menu.classList.remove(
                            "active"
                        );

                    }
                );


            if (
                action === "edit"
            ) {

                openEditGameModal(
                    card
                );
            }


            if (
                action === "remove"
            ) {

                removeGame(
                    card
                );
            }


            return;
        }


        document
            .querySelectorAll(
                ".game-action-menu.active"
            )
            .forEach(
                (menu) => {

                    menu.classList.remove(
                        "active"
                    );

                }
            );

    }
);


/* =========================================
   ADICIONAR / SALVAR
========================================= */

addGameForm.addEventListener(
    "submit",
    (event) => {

        event.preventDefault();


        const name =
            gameName.value.trim();


        const category =
            gameCategory.value;


        const rating =
            parseRating(
                gameRating.value
            );


        const position =
            Number(
                favoritePosition.value
            );


        if (!name) {

            alert(
                "Selecione um jogo."
            );

            return;
        }


        if (
            rating === null
        ) {

            alert(
                "Digite uma nota entre 0 e 10, usando no máximo uma casa decimal. Exemplo: 7,8"
            );


            gameRating.focus();


            return;
        }


        const selectedImageUrl = getSelectedGameImage(name);
        if (selectedImageUrl) saveGameCover(name, selectedImageUrl);

        const genre =
            getGameGenre(
                name,
                editingCard
            );


        /*
         * ==================================
         * EDIÇÃO
         * ==================================
         */

        if (editingCard) {

            saveEditedGame(
                name,
                genre,
                rating,
                position,
                category
            );


            return;
        }


        /*
         * ==================================
         * NÃO REPETIR NA MESMA CATEGORIA
         * ==================================
         */

        if (
            isGameInCategory(
                name,
                category
            )
        ) {

            alert(
                "Este jogo já foi adicionado nesta categoria."
            );


            return;
        }


        /*
         * ==================================
         * JOGOS ZERADOS
         *
         * É uma marcação independente. Caso o jogo ainda
         * não esteja em "Jogos Que Gosto", criamos essa
         * entrada-base sem remover outras categorias.
         * ==================================
         */

        if (
            category === "completed" &&
            !isGameInCategory(name, "liked")
        ) {
            ensureGameIsLiked(name, genre, rating);
        }


        /*
         * ==================================
         * FAVORITOS
         *
         * Caso não esteja em Jogos Que Gosto,
         * será adicionado automaticamente.
         * ==================================
         */

        if (
            category ===
            "favorite"
        ) {

            if (
                getFavoriteCount() >= 3
            ) {

                alert(
                    "Você já possui 3 jogos favoritos. Remova um antes de adicionar outro."
                );


                return;
            }


            if (
                getFavoriteCardByPosition(
                    position
                )
            ) {

                alert(
                    "Essa posição do pódio já está ocupada."
                );


                return;
            }


            /*
             * NOVA REGRA DE NEGÓCIO
             */

            ensureGameIsLiked(
                name,
                genre,
                rating
            );


            createFavoriteCard(
                name,
                genre,
                rating,
                position
            );
        }


        /*
         * ==================================
         * JOGOS QUE GOSTO
         * ==================================
         */

        else if (
            category ===
            "liked"
        ) {

            createLikedCard(
                name,
                genre,
                rating
            );
        }


        /*
         * ==================================
         * JOGOS ZERADOS
         * ==================================
         */

        else {

            createCompletedCard(
                name,
                genre
            );
        }


        updateSummary();

        updateFavoritePositionOptions();

        saveGamesToStorage();

        closeGameModal();

    }
);


/* =========================================
   SALVAR EDIÇÃO
========================================= */

function saveEditedGame(
    name,
    genre,
    rating,
    position,
    targetCategory = gameCategory.value
) {
    const sourceCategory = editingOriginalCategory;
    const oldData = getCardData(editingCard);

    if (!oldData) {
        return;
    }

    const sameName =
        normalizeGameName(name) === normalizeGameName(oldData.name);

    const changingCategory = targetCategory !== sourceCategory;

    if (!['favorite', 'liked', 'completed'].includes(targetCategory)) {
        alert('Selecione uma categoria válida.');
        return;
    }

    // Não repete o mesmo título dentro da categoria selecionada.
    if (
        !changingCategory &&
        isGameInCategory(name, targetCategory, editingCard)
    ) {
        alert('Este jogo já existe nesta categoria.');
        return;
    }

    // Ao alternar entre Favoritos e Zerados, o card original será mantido.
    // Se o usuário também renomear o jogo, evitamos duplicar na categoria de origem.
    if (
        changingCategory &&
        (sourceCategory === 'favorite' || sourceCategory === 'completed') &&
        isGameInCategory(name, sourceCategory, editingCard)
    ) {
        alert('Já existe um jogo com esse nome na categoria original.');
        return;
    }

    // A coleção "Jogos Que Gosto" é a base. Não renomeamos um jogo-base
    // enquanto ele estiver referenciado como favorito ou zerado.
    if (sourceCategory === 'liked' && !sameName) {
        const oldIsFavorite = isGameInCategory(oldData.name, 'favorite');
        const oldIsCompleted = isGameInCategory(oldData.name, 'completed');

        if (oldIsFavorite || oldIsCompleted) {
            alert(
                `"${oldData.name}" também está classificado em outra seção.\n\n` +
                'Remova essa classificação primeiro para poder trocar o nome do jogo.'
            );
            return;
        }

        // Impede que renomear a entrada-base crie um duplicado na coleção.
        if (isGameInCategory(name, 'liked', editingCard)) {
            alert('Este jogo já existe em "Jogos Que Gosto".');
            return;
        }
    }

    // Um jogo zerado precisa ter uma entrada-base em "Jogos Que Gosto".
    // Se ele vem de Favoritos, garantimos essa entrada automaticamente.
    if (
        targetCategory === 'completed' &&
        !findGameCardInCategory(name, 'liked') &&
        sourceCategory !== 'liked' &&
        sourceCategory !== 'favorite'
    ) {
        alert(
            'Um jogo só pode estar em "Jogos Zerados" se também estiver em "Jogos Que Gosto".'
        );
        return;
    }

    // Ao promover para favorito a partir de outra categoria, valida o limite
    // e a posição apenas se ainda não existe um favorito com esse nome.
    const existingFavorite = findGameCardInCategory(
        name,
        'favorite',
        sourceCategory === 'favorite' ? editingCard : null
    );

    const needsNewFavorite =
        targetCategory === 'favorite' &&
        sourceCategory !== 'favorite' &&
        !existingFavorite;

    if (needsNewFavorite && getFavoriteCount() >= 3) {
        alert('Você já possui 3 jogos favoritos. Remova um antes de adicionar outro.');
        return;
    }

    if (
        needsNewFavorite &&
        getFavoriteCardByPosition(position)
    ) {
        alert('Essa posição do pódio já está ocupada. Escolha outra posição.');
        return;
    }

    // EDIÇÃO DENTRO DA MESMA CATEGORIA.
    if (!changingCategory) {
        if (targetCategory === 'favorite') {
            const oldPosition = Number(editingCard.dataset.position);
            const otherCard = getFavoriteCardByPosition(position, editingCard);

            // Mantém o comportamento existente de trocar a posição com outro favorito.
            if (otherCard) {
                applyFavoritePosition(otherCard, oldPosition);
            }

            ensureGameIsLiked(name, genre, rating);
            applyFavoritePosition(editingCard, position);
            updateFavoriteCard(editingCard, name, genre, rating);
            normalizePodium();
        } else if (targetCategory === 'liked') {
            updateLikedCard(editingCard, name, genre, rating);
        } else {
            updateCompletedCard(editingCard, name, genre);
        }
    } else if (sourceCategory === 'liked') {
        // Favoritos e Zerados são marcações adicionais: a entrada-base em
        // "Jogos Que Gosto" permanece, pois o backend exige essa relação.
        updateLikedCard(editingCard, name, genre, rating);
        ensureGameIsLiked(name, genre, rating);

        if (targetCategory === 'favorite') {
            if (!findGameCardInCategory(name, 'favorite')) {
                createFavoriteCard(name, genre, rating, position);
            }
        } else if (targetCategory === 'completed') {
            const existingCompleted = findGameCardInCategory(name, 'completed');

            if (existingCompleted) {
                updateCompletedCard(existingCompleted, name, genre);
            } else {
                createCompletedCard(name, genre);
            }
        }
    } else if (sourceCategory === 'favorite') {
        if (targetCategory === 'favorite') {
            ensureGameIsLiked(name, genre, rating);
            updateFavoriteCard(editingCard, name, genre, rating);
        } else if (targetCategory === 'completed') {
            // Favorito e zerado são classificações independentes:
            // mantém o card no pódio e adiciona/atualiza o card de zerado.
            ensureGameIsLiked(name, genre, rating);
            updateFavoriteCard(editingCard, name, genre, rating);

            const existingCompleted = findGameCardInCategory(name, 'completed');
            if (existingCompleted) {
                updateCompletedCard(existingCompleted, name, genre);
            } else {
                createCompletedCard(name, genre);
            }
        } else {
            // Selecionar apenas "Jogos Que Gosto" continua sendo uma
            // transferência do pódio para a coleção-base.
            ensureGameIsLiked(name, genre, rating);
            editingCard.remove();
        }
    } else if (sourceCategory === 'completed') {
        if (targetCategory === 'completed') {
            updateCompletedCard(editingCard, name, genre);
        } else if (targetCategory === 'favorite') {
            // Marcar como favorito não apaga o status de jogo zerado.
            ensureGameIsLiked(name, genre, rating);
            updateCompletedCard(editingCard, name, genre);

            if (!findGameCardInCategory(name, 'favorite')) {
                createFavoriteCard(name, genre, rating, position);
            }
        } else {
            // Transferência explícita de zerado para a coleção-base.
            ensureGameIsLiked(name, genre, rating);
            editingCard.remove();
        }
    }

    normalizePodium();
    updateSummary();
    updateFavoritePositionOptions();
    saveGamesToStorage();
    closeGameModal();
}


/* =========================================
   CONTADORES
========================================= */

function updateSummary() {

    summaryItems[0].textContent =
        document.querySelectorAll(
            ".podium-card"
        ).length;


    summaryItems[1].textContent =
        document.querySelectorAll(
            ".collection-card"
        ).length;


    summaryItems[2].textContent =
        document.querySelectorAll(
            ".completed-game"
        ).length;
}


/* =========================================
   SINCRONIZAR FAVORITOS INICIAIS

   Isso corrige também os jogos
   que já vêm escritos no HTML.
========================================= */

function syncFavoriteGamesWithLiked() {

    const favorites =
        getFavoriteCards();


    favorites.forEach(
        (card) => {

            const data =
                getCardData(card);


            if (!data) {

                return;
            }


            ensureGameIsLiked(
                data.name,
                data.genre,
                data.rating
            );

        }
    );
}


/* =========================================
   BOTÃO PERFIL
========================================= */

const profileButton =
    document.getElementById(
        "profileButton"
    );


if (profileButton) {

    profileButton.addEventListener(
        "click",
        () => {

            window.location.href =
                "perfil.html";
        }
    );
}


/* =========================================
   VER TODOS - GOSTO
========================================= */

const seeLikedGamesButton =
    document.getElementById(
        "seeLikedGamesButton"
    );


if (seeLikedGamesButton) {

    seeLikedGamesButton.addEventListener(
        "click",
        () => {

            collectionGrid.scrollIntoView({
                behavior: "smooth"
            });

        }
    );
}


/* =========================================
   VER TODOS - ZERADOS
========================================= */

const seeCompletedGamesButton =
    document.getElementById(
        "seeCompletedGamesButton"
    );


if (seeCompletedGamesButton) {

    seeCompletedGamesButton.addEventListener(
        "click",
        () => {

            completedList.scrollIntoView({
                behavior: "smooth"
            });

        }
    );
}


/* =========================================
   IMPORTAR JOGO A PARTIR DO CATÁLOGO RAWG
========================================= */

function openCatalogGameFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const name = String(params.get("addGame") || "").trim().slice(0, 160);
    if (!name) return;

    const genre = String(params.get("addGenre") || "Gênero não informado")
        .trim()
        .slice(0, 120) || "Gênero não informado";
    const imageUrl = safeRawgImageUrl(params.get("addImage") || "");
    const rawgId = String(params.get("rawgId") || "").slice(0, 24);

    if (!getGameFromCatalog(name)) {
        gameCatalog.push({ name, genre });
    } else {
        const knownGame = getGameFromCatalog(name);
        if (knownGame && genre !== "Gênero não informado") knownGame.genre = genre;
    }

    // Remove parâmetros de importação para que atualizar a página não reabra o modal.
    params.delete("addGame");
    params.delete("addGenre");
    params.delete("addImage");
    params.delete("addYear");
    params.delete("rawgId");
    const remaining = params.toString();
    window.history.replaceState(
        {},
        "",
        `${window.location.pathname}${remaining ? `?${remaining}` : ""}${window.location.hash}`
    );

    const alreadyLiked = isGameInCategory(name, "liked");
    const alreadyFavorite = isGameInCategory(name, "favorite");
    const alreadyCompleted = isGameInCategory(name, "completed");

    let targetCategory = "liked";
    if (alreadyLiked) {
        if (!alreadyFavorite && getFavoriteCount() < 3) {
            targetCategory = "favorite";
        } else if (!alreadyCompleted) {
            targetCategory = "completed";
        } else {
            window.alert("Este jogo já está nas três categorias da sua coleção.");
            return;
        }
    }

    openGameModal();
    gameCategory.value = targetCategory;
    gameCategory.dispatchEvent(new Event("change", { bubbles: true }));
    ensureGameOption(name, genre, imageUrl, rawgId);
    gameName.value = name;
    gameSearchInput.value = name;
    showSelectedGame(name, imageUrl);
    if (imageUrl) saveGameCover(name, imageUrl);
    gameRating.value = "";

    if (targetCategory === "favorite") {
        const freePosition = Array.from(favoritePosition.options).find((option) => !option.disabled);
        if (freePosition) favoritePosition.value = freePosition.value;
    }

    gameSearchInput.focus();
}


/* =========================================
   INICIALIZAÇÃO DA PÁGINA
========================================= */

async function initializeGamesPage() {
    buildGameOptions();
    initializeGameActions();
    normalizePodium();
    updateSummary();
    updateFavoritePositionOptions();

    const loadResult = await loadGamesFromAPI();

    // Corrige coleções antigas para garantir que todo favorito também
    // exista na categoria "Jogos Que Gosto", como a interface já exige.
    const beforeSync = JSON.stringify(getCurrentGamesState());
    syncFavoriteGamesWithLiked();
    normalizePodium();
    updateSummary();
    updateFavoritePositionOptions();
    const afterSync = JSON.stringify(getCurrentGamesState());

    const stateWasAdjusted = beforeSync !== afterSync;

    if (
        gamesApiReady &&
        (loadResult.shouldSave || stateWasAdjusted)
    ) {
        await saveGamesToStorage();
    }

    await hydrateGameCovers();
    openCatalogGameFromQuery();
    console.log("🎮 Meus Jogos carregado com sucesso.");
}

initializeGamesPage();