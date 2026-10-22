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

const favoritePosition =
    document.getElementById("favoritePosition");

const favoritePositionGroup =
    document.getElementById("favoritePositionGroup");

const gameRating =
    document.getElementById("gameRating");

const favoriteLimitMessage =
    document.getElementById("favoriteLimitMessage");


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
    ["127.0.0.1", "localhost"].includes(window.location.hostname)
        ? "http://127.0.0.1:8000"
        : "https://overclock-api.onrender.com";

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

    const game =
        getGameFromCatalog(name);


    if (game) {

        return game.genre;
    }


    /*
     * Se for um jogo antigo que não
     * existe no catálogo temporário,
     * mantém o gênero que já estava
     * no card.
     */

    if (card) {

        const data =
            getCardData(card);


        if (data) {

            return data.genre;
        }
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

    gameName.innerHTML = "";


    const placeholder =
        document.createElement(
            "option"
        );


    placeholder.value = "";

    placeholder.textContent =
        "Selecione um jogo...";

    placeholder.disabled =
        true;

    placeholder.selected =
        true;


    gameName.appendChild(
        placeholder
    );


    gameCatalog.forEach(
        (game) => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                game.name;

            option.textContent =
                game.name;


            gameName.appendChild(
                option
            );

        }
    );
}


/* =========================================
   ATUALIZAR JOGOS DISPONÍVEIS

   REGRAS:

   1 - Não repetir dentro da mesma
       categoria.

   2 - Zerado só pode ser escolhido
       se já existir em Jogos Que Gosto.

   3 - Favorito pode ser escolhido mesmo
       sem estar em Jogos Que Gosto,
       pois será adicionado automaticamente.
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

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                selectedName;

            option.textContent =
                selectedName;

            option.dataset.temporary =
                "true";


            gameName.appendChild(
                option
            );
        }
    }


    const gamesInCategory =
        getGamesInCategory(
            category,
            excludeCard
        );


    const likedGames =
        getGamesInCategory(
            "liked"
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

                    const isLiked =
                        likedGames.has(
                            normalized
                        );


                    const alreadyCompleted =
                        gamesInCategory.has(
                            normalized
                        );


                    option.disabled =
                        !isLiked ||
                        alreadyCompleted;


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


    gameCategory.disabled =
        false;


    gameCategory.value =
        "liked";


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

        if (
            event.key === "Escape"
        ) {

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


    // A categoria pode ser alterada durante a edição.
    gameCategory.disabled = false;
    gameCategory.value = data.category;


    buildGameOptions();


    refreshGameOptions(
        card,
        data.name
    );


    gameName.value =
        data.name;


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

function removeGame(card) {

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


    const confirmed =
        confirm(
            `Deseja remover "${data.name}" desta categoria?`
        );


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
         * Precisa existir em Jogos Que Gosto.
         * ==================================
         */

        if (
            category ===
                "completed" &&

            !isGameInCategory(
                name,
                "liked"
            )
        ) {

            alert(
                'Para adicionar um jogo em "Jogos Zerados", primeiro adicione-o em "Jogos Que Gosto".'
            );


            return;
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

    // Quando a categoria não muda, não permite duplicar outro jogo nela.
    if (
        !changingCategory &&
        isGameInCategory(name, targetCategory, editingCard)
    ) {
        alert('Este jogo já existe nesta categoria.');
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
            // Este caso é tratado no bloco de mesma categoria acima; fica aqui
            // como proteção caso novas categorias sejam adicionadas no futuro.
            ensureGameIsLiked(name, genre, rating);
            updateFavoriteCard(editingCard, name, genre, rating);
        } else {
            ensureGameIsLiked(name, genre, rating);
            editingCard.remove();

            if (targetCategory === 'completed') {
                const existingCompleted = findGameCardInCategory(name, 'completed');

                if (existingCompleted) {
                    updateCompletedCard(existingCompleted, name, genre);
                } else {
                    createCompletedCard(name, genre);
                }
            }
            // Para targetCategory === 'liked', a entrada-base já existe ou
            // foi criada por ensureGameIsLiked; removemos apenas o pódio.
        }
    } else if (sourceCategory === 'completed') {
        if (targetCategory === 'completed') {
            updateCompletedCard(editingCard, name, genre);
        } else {
            ensureGameIsLiked(name, genre, rating);
            editingCard.remove();

            if (
                targetCategory === 'favorite' &&
                !findGameCardInCategory(name, 'favorite')
            ) {
                createFavoriteCard(name, genre, rating, position);
            }
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
   PESQUISA
========================================= */

const searchInput =
    document.getElementById(
        "searchInput"
    );


if (searchInput) {

    searchInput.addEventListener(
        "input",
        (event) => {

            console.log(
                "Pesquisa:",
                event.target.value
            );

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

    console.log("🎮 Meus Jogos carregado com sucesso.");
}

initializeGamesPage();