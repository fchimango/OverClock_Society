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


        refreshGameOptions(
            editingCard
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

            rating: 5
        };
    }


    return null;
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


    /*
     * Categoria não pode ser trocada
     * durante a edição.
     *
     * Para classificar em outra categoria,
     * usamos "Adicionar jogo".
     */

    gameCategory.value =
        data.category;


    gameCategory.disabled =
        true;


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
    genre
) {

    const year =
        new Date().getFullYear();


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
                position
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
    position
) {

    const category =
        editingOriginalCategory;


    const oldData =
        getCardData(
            editingCard
        );


    if (!oldData) {

        return;
    }


    /*
     * Não repetir dentro da categoria.
     */

    if (
        isGameInCategory(
            name,
            category,
            editingCard
        )
    ) {

        alert(
            "Este jogo já existe nesta categoria."
        );


        return;
    }


    /*
     * =========================================
     * EDITANDO "JOGOS QUE GOSTO"
     *
     * Não pode trocar o jogo se o antigo
     * ainda for Favorito ou Zerado.
     * =========================================
     */

    if (
        category === "liked" &&

        normalizeGameName(name) !==
        normalizeGameName(
            oldData.name
        )
    ) {

        const oldIsFavorite =
            isGameInCategory(
                oldData.name,
                "favorite"
            );


        const oldIsCompleted =
            isGameInCategory(
                oldData.name,
                "completed"
            );


        if (
            oldIsFavorite &&
            oldIsCompleted
        ) {

            alert(
                `"${oldData.name}" ainda está como Favorito e Zerado.\n\nRemova essas classificações antes de trocar o jogo em Jogos Que Gosto.`
            );


            return;
        }


        if (oldIsFavorite) {

            alert(
                `"${oldData.name}" ainda está nos Favoritos.\n\nRemova-o do pódio antes de trocar este jogo.`
            );


            return;
        }


        if (oldIsCompleted) {

            alert(
                `"${oldData.name}" ainda está em Jogos Zerados.\n\nRemova-o de Jogos Zerados antes de trocar este jogo.`
            );


            return;
        }
    }


    /*
     * =========================================
     * EDITANDO ZERADO
     * =========================================
     */

    if (
        category === "completed" &&

        !isGameInCategory(
            name,
            "liked"
        )
    ) {

        alert(
            'Um jogo só pode estar em "Jogos Zerados" se também estiver em "Jogos Que Gosto".'
        );


        return;
    }


    /*
     * ==================================
     * FAVORITO
     * ==================================
     */

    if (
        category === "favorite"
    ) {

        const oldPosition =
            Number(
                editingCard.dataset
                    .position
            );


        const otherCard =
            getFavoriteCardByPosition(
                position,
                editingCard
            );


        /*
         * Se trocar de posição com
         * outro favorito.
         */

        if (otherCard) {

            applyFavoritePosition(
                otherCard,
                oldPosition
            );
        }


        /*
         * Se o novo jogo escolhido ainda
         * não estiver na coleção-base,
         * adiciona automaticamente.
         */

        ensureGameIsLiked(
            name,
            genre,
            rating
        );


        applyFavoritePosition(
            editingCard,
            position
        );


        updateFavoriteCard(
            editingCard,
            name,
            genre,
            rating
        );


        normalizePodium();
    }


    /*
     * ==================================
     * GOSTO
     * ==================================
     */

    else if (
        category === "liked"
    ) {

        updateLikedCard(
            editingCard,
            name,
            genre,
            rating
        );
    }


    /*
     * ==================================
     * ZERADO
     * ==================================
     */

    else {

        updateCompletedCard(
            editingCard,
            name,
            genre
        );
    }


    updateSummary();

    updateFavoritePositionOptions();

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
   INICIALIZAÇÃO
========================================= */

buildGameOptions();

initializeGameActions();

normalizePodium();


/*
 * IMPORTANTE:
 *
 * Garante que os favoritos que já existem
 * no HTML também estejam em Jogos Que Gosto.
 */

syncFavoriteGamesWithLiked();


updateSummary();

updateFavoritePositionOptions();


console.log(
    "🎮 Meus Jogos carregado com sucesso."
);