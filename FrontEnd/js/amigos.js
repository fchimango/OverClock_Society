/* =========================================
   ELEMENTOS PRINCIPAIS
========================================= */

const findFriendsButton =
    document.getElementById(
        "findFriendsButton"
    );

const profileButton =
    document.getElementById(
        "profileButton"
    );

const searchInput =
    document.getElementById(
        "searchInput"
    );

const requestsList =
    document.getElementById(
        "requestsList"
    );

const allFriendsList =
    document.getElementById(
        "allFriendsList"
    );

const seeOnlineButton =
    document.getElementById(
        "seeOnlineButton"
    );

const modalOverlay =
    document.getElementById(
        "friendsModalOverlay"
    );

const modalClose =
    document.getElementById(
        "modalClose"
    );

const modalButton =
    document.getElementById(
        "modalButton"
    );


/* =========================================
   PERSISTÊNCIA POR USUÁRIO
========================================= */

const FRIENDS_CURRENT_USER_ID =
    localStorage.getItem(
        "userId"
    );

const FRIENDS_STORAGE_KEY =
    FRIENDS_CURRENT_USER_ID
        ? `overclockSocietyFriends_${FRIENDS_CURRENT_USER_ID}`
        : null;


/*
 * Status locais das solicitações.
 *
 * As notificações continuam sendo
 * sincronizadas normalmente, mas mantemos
 * também este estado dentro de Amigos.
 */

let localRequestStatuses =
    {};


/*
 * O HTML começa mostrando 24 amigos.
 *
 * Vamos manter esse total demonstrativo
 * e incrementá-lo sempre que uma nova
 * solicitação for aceita.
 */

const friendsSummaryNumbers =
    document.querySelectorAll(
        ".friend-summary-card strong"
    );

let totalFriendsCount =
    Number(
        friendsSummaryNumbers[1]
            ?.textContent
    ) || 0;


/* =========================================
   UTILIDADES
========================================= */

function normalizeFriendName(value) {

    return String(
        value || ""
    )
        .trim()
        .toLocaleLowerCase(
            "pt-BR"
        );
}


function getAvatarClass(
    avatarElement
) {

    if (!avatarElement) {

        return "blue";
    }


    return Array
        .from(
            avatarElement.classList
        )
        .find(
            (className) =>
                className !==
                "friend-avatar"
        ) || "blue";
}


/* =========================================
   RESUMO
========================================= */

function updateFriendsSummary() {

    if (
        friendsSummaryNumbers[1]
    ) {

        friendsSummaryNumbers[1]
            .textContent =
            String(
                totalFriendsCount
            );
    }
}


/* =========================================
   DADOS DE UM AMIGO
========================================= */

function getFriendDataFromCard(
    card
) {

    if (!card) {

        return null;
    }


    const name =
        card.dataset.name ||
        card.querySelector(
            ".all-friend-info strong"
        )?.textContent.trim() ||
        "";


    if (!name) {

        return null;
    }


    const status =
        card.dataset.status ||
        "offline";


    const avatarElement =
        card.querySelector(
            ".friend-avatar"
        );


    const avatar =
        avatarElement
            ?.textContent
            .trim() ||
        name
            .charAt(0)
            .toUpperCase();


    const avatarClass =
        getAvatarClass(
            avatarElement
        );


    const detail =
        card.querySelector(
            ".all-friend-info span"
        )?.textContent.trim() ||
        (
            status === "online"
                ? "🟢 Online"
                : "⚪ Offline"
        );


    return {

        name,

        status,

        avatar,

        avatarClass,

        detail
    };
}


/* =========================================
   ESTADO ATUAL DOS AMIGOS
========================================= */

function getFriendsState() {

    const friends =
        Array
            .from(
                allFriendsList
                    .querySelectorAll(
                        ".all-friend-card"
                    )
            )
            .map(
                getFriendDataFromCard
            )
            .filter(Boolean);


    return {

        friends,

        requestStatuses:
            localRequestStatuses,

        totalFriends:
            totalFriendsCount
    };
}


/* =========================================
   SALVAR AMIGOS
========================================= */

function saveFriendsToStorage() {

    if (
        !FRIENDS_STORAGE_KEY
    ) {

        console.warn(
            "Não foi possível salvar os amigos: userId ausente."
        );

        return;
    }


    try {

        localStorage.setItem(
            FRIENDS_STORAGE_KEY,
            JSON.stringify(
                getFriendsState()
            )
        );

    } catch (error) {

        console.warn(
            "Não foi possível salvar os amigos no localStorage.",
            error
        );
    }
}


/* =========================================
   CRIAR CARD EM "TODOS OS AMIGOS"
========================================= */

function createAllFriendCard(
    friend
) {

    const card =
        document.createElement(
            "article"
        );


    card.className =
        "all-friend-card";


    card.dataset.status =
        friend.status ||
        "offline";


    card.dataset.name =
        friend.name;


    const avatar =
        document.createElement(
            "div"
        );


    avatar.className =
        `friend-avatar ${
            friend.avatarClass ||
            "blue"
        }`;


    avatar.textContent =
        friend.avatar ||
        friend.name
            .charAt(0)
            .toUpperCase();


    const info =
        document.createElement(
            "div"
        );


    info.className =
        "all-friend-info";


    const name =
        document.createElement(
            "strong"
        );


    name.textContent =
        friend.name;


    const detail =
        document.createElement(
            "span"
        );


    detail.textContent =
        friend.detail ||
        (
            friend.status ===
            "online"
                ? "🟢 Online"
                : "⚪ Offline"
        );


    const moreButton =
        document.createElement(
            "button"
        );


    moreButton.type =
        "button";


    moreButton.className =
        "friend-more";


    moreButton.textContent =
        "⋮";


    info.appendChild(
        name
    );


    info.appendChild(
        detail
    );


    card.appendChild(
        avatar
    );


    card.appendChild(
        info
    );


    card.appendChild(
        moreButton
    );


    allFriendsList.appendChild(
        card
    );


    return card;
}


/* =========================================
   CARREGAR AMIGOS
========================================= */

function loadFriendsFromStorage() {

    if (
        !FRIENDS_STORAGE_KEY
    ) {

        return false;
    }


    let stored =
        null;


    try {

        stored =
            localStorage.getItem(
                FRIENDS_STORAGE_KEY
            );

    } catch (error) {

        console.warn(
            "Não foi possível acessar os amigos salvos.",
            error
        );

        return false;
    }


    if (!stored) {

        return false;
    }


    try {

        const data =
            JSON.parse(
                stored
            );


        /*
         * Compatibilidade caso futuramente
         * seja salvo apenas um array.
         */

        const friends =
            Array.isArray(data)
                ? data
                : data.friends;


        if (
            !Array.isArray(
                friends
            )
        ) {

            return false;
        }


        if (
            !Array.isArray(data) &&
            data.requestStatuses &&
            typeof data.requestStatuses ===
                "object"
        ) {

            localRequestStatuses =
                data.requestStatuses;
        }


        if (
            !Array.isArray(data) &&
            Number.isFinite(
                Number(
                    data.totalFriends
                )
            )
        ) {

            totalFriendsCount =
                Number(
                    data.totalFriends
                );
        }


        allFriendsList.innerHTML =
            "";


        friends.forEach(
            (friend) => {

                if (
                    !friend ||
                    !friend.name
                ) {

                    return;
                }


                createAllFriendCard(
                    friend
                );
            }
        );


        updateFriendsSummary();


        return true;

    } catch (error) {

        console.warn(
            "Não foi possível carregar a lista de amigos.",
            error
        );

        return false;
    }
}


/* =========================================
   VERIFICAR SE JÁ É AMIGO
========================================= */

function friendAlreadyExists(
    userName
) {

    const normalized =
        normalizeFriendName(
            userName
        );


    return Array
        .from(
            allFriendsList
                .querySelectorAll(
                    ".all-friend-card"
                )
        )
        .some(
            (card) =>

                normalizeFriendName(
                    card.dataset.name
                ) ===
                normalized
        );
}


/* =========================================
   ENCONTRAR SOLICITAÇÃO
========================================= */

function findRequestCardByUser(
    userName
) {

    const normalized =
        normalizeFriendName(
            userName
        );


    return Array
        .from(
            document.querySelectorAll(
                ".request-card"
            )
        )
        .find(
            (card) =>

                normalizeFriendName(
                    card.dataset.user
                ) ===
                normalized
        ) || null;
}


/* =========================================
   DADOS DA SOLICITAÇÃO
========================================= */

function getRequestData(
    card
) {

    if (!card) {

        return null;
    }


    const name =
        card.dataset.user ||
        card.querySelector(
            ".request-info strong"
        )?.textContent.trim() ||
        "";


    if (!name) {

        return null;
    }


    const avatarElement =
        card.querySelector(
            ".friend-avatar"
        );


    const avatar =
        avatarElement
            ?.textContent
            .trim() ||
        name
            .charAt(0)
            .toUpperCase();


    const avatarClass =
        getAvatarClass(
            avatarElement
        );


    const course =
        card.querySelector(
            ".request-info span"
        )?.textContent.trim() ||
        "";


    const game =
        card.querySelector(
            ".request-info small"
        )?.textContent.trim() ||
        "";


    return {

        name,

        avatar,

        avatarClass,

        course,

        game
    };
}


/* =========================================
   ADICIONAR SOLICITAÇÃO ACEITA
   À LISTA DE AMIGOS
========================================= */

function addFriendFromRequest(
    requestCard
) {

    const request =
        getRequestData(
            requestCard
        );


    if (!request) {

        return false;
    }


    if (
        friendAlreadyExists(
            request.name
        )
    ) {

        return false;
    }


    /*
     * A solicitação não informa se
     * o usuário está online.
     *
     * Por isso ele entra inicialmente
     * como offline.
     */

    const detail =
        request.game
            ? `⚪ Offline • ${request.game}`
            : "⚪ Offline";


    const card =
        createAllFriendCard({

            name:
                request.name,

            status:
                "offline",

            avatar:
                request.avatar,

            avatarClass:
                request.avatarClass,

            detail
        });


    /*
     * Coloca o novo amigo no início
     * da lista.
     */

    allFriendsList.prepend(
        card
    );


    totalFriendsCount +=
        1;


    updateFriendsSummary();


    saveFriendsToStorage();


    return true;
}


/* =========================================
   STATUS LOCAL DA SOLICITAÇÃO
========================================= */

function getLocalRequestStatus(
    userName
) {

    return (
        localRequestStatuses[
            normalizeFriendName(
                userName
            )
        ] ||
        "pending"
    );
}


function setLocalRequestStatus(
    userName,
    status
) {

    localRequestStatuses[
        normalizeFriendName(
            userName
        )
    ] =
        status;


    saveFriendsToStorage();
}


/* =========================================
   MODAL
========================================= */

function openModal() {

    modalOverlay.classList.add(
        "active"
    );


    document.body.style.overflow =
        "hidden";
}


function closeModal() {

    modalOverlay.classList.remove(
        "active"
    );


    document.body.style.overflow =
        "";
}


/* =========================================
   ENCONTRAR JOGADORES
========================================= */

findFriendsButton.addEventListener(
    "click",
    openModal
);


/* =========================================
   PERFIL
========================================= */

profileButton.addEventListener(
    "click",
    () => {

        window.location.href =
            "perfil.html";

    }
);


/* =========================================
   CONTADOR DE SOLICITAÇÕES
========================================= */

function updateRequestCounter() {

    const counter =
        document.querySelector(
            ".request-counter"
        );


    const count =
        document.querySelectorAll(
            ".request-card"
        ).length;


    if (counter) {

        counter.textContent =
            `${count} ${
                count === 1
                    ? "pendente"
                    : "pendentes"
            }`;
    }


    /*
     * Atualiza também o número
     * do card de resumo.
     */

    if (
        friendsSummaryNumbers[2]
    ) {

        friendsSummaryNumbers[2]
            .textContent =
            String(
                count
            );
    }
}


/* =========================================
   REMOVER CARD DE SOLICITAÇÃO
========================================= */

function removeRequestCardByUser(
    userName,
    status = "declined"
) {

    const card =
        findRequestCardByUser(
            userName
        );


    if (!card) {

        updateRequestCounter();

        return;
    }


    card.style.opacity =
        "0";


    card.style.transform =
        status === "accepted"
            ? "translateX(30px)"
            : "translateX(-30px)";


    setTimeout(
        () => {

            if (
                card.isConnected
            ) {

                card.remove();
            }


            updateRequestCounter();

        },
        250
    );
}


/* =========================================
   SINCRONIZAÇÃO COM NOTIFICAÇÕES
========================================= */

function syncFriendRequestsWithNotifications() {

    let changed =
        false;


    document
        .querySelectorAll(
            ".request-card"
        )
        .forEach(
            (card) => {

                const userName =
                    card.dataset.user;


                const localStatus =
                    getLocalRequestStatus(
                        userName
                    );


                let notificationStatus =
                    "pending";


                if (
                    window
                        .OverclockNotifications
                ) {

                    notificationStatus =
                        window
                            .OverclockNotifications
                            .getFriendRequestStatus(
                                userName
                            );
                }


                /*
                 * Se Amigos já possui um
                 * estado resolvido, ele
                 * prevalece.
                 */

                const status =
                    localStatus !==
                    "pending"
                        ? localStatus
                        : notificationStatus;


                if (
                    status ===
                    "pending"
                ) {

                    return;
                }


                /*
                 * Caso a solicitação tenha
                 * sido aceita pela central
                 * de notificações, garantimos
                 * que a pessoa entre na lista.
                 */

                if (
                    status ===
                    "accepted"
                ) {

                    addFriendFromRequest(
                        card
                    );
                }


                localRequestStatuses[
                    normalizeFriendName(
                        userName
                    )
                ] =
                    status;


                card.remove();


                changed =
                    true;

            }
        );


    if (changed) {

        saveFriendsToStorage();
    }


    updateRequestCounter();
}


/* =========================================
   EVENTO VINDO DAS NOTIFICAÇÕES
========================================= */

window.addEventListener(
    "overclock:friend-request-resolved",
    (event) => {

        const friendName =
            event.detail.friendName;


        const status =
            event.detail.status;


        const card =
            findRequestCardByUser(
                friendName
            );


        if (
            status ===
                "accepted" &&
            card
        ) {

            addFriendFromRequest(
                card
            );
        }


        setLocalRequestStatus(
            friendName,
            status
        );


        removeRequestCardByUser(
            friendName,
            status
        );

    }
);


/* =========================================
   SOLICITAÇÕES
========================================= */

document
    .querySelectorAll(
        ".request-card"
    )
    .forEach(
        (card) => {

            const acceptButton =
                card.querySelector(
                    ".accept"
                );


            const declineButton =
                card.querySelector(
                    ".decline"
                );


            /*
             * ACEITAR
             */

            acceptButton.addEventListener(
                "click",
                () => {

                    const userName =
                        card.dataset.user;


                    /*
                     * Primeiro adiciona
                     * realmente à lista.
                     */

                    addFriendFromRequest(
                        card
                    );


                    setLocalRequestStatus(
                        userName,
                        "accepted"
                    );


                    let resolved =
                        false;


                    if (
                        window
                            .OverclockNotifications
                    ) {

                        resolved =
                            window
                                .OverclockNotifications
                                .resolveFriendRequest(
                                    userName,
                                    "accepted"
                                );
                    }


                    /*
                     * Algumas solicitações
                     * demonstrativas podem
                     * não existir na central
                     * de notificações.
                     */

                    if (!resolved) {

                        removeRequestCardByUser(
                            userName,
                            "accepted"
                        );
                    }


                    console.log(
                        `${userName} foi adicionado aos amigos.`
                    );

                }
            );


            /*
             * RECUSAR
             */

            declineButton.addEventListener(
                "click",
                () => {

                    const userName =
                        card.dataset.user;


                    setLocalRequestStatus(
                        userName,
                        "declined"
                    );


                    let resolved =
                        false;


                    if (
                        window
                            .OverclockNotifications
                    ) {

                        resolved =
                            window
                                .OverclockNotifications
                                .resolveFriendRequest(
                                    userName,
                                    "declined"
                                );
                    }


                    if (!resolved) {

                        removeRequestCardByUser(
                            userName,
                            "declined"
                        );
                    }


                    console.log(
                        `Solicitação de ${userName} recusada.`
                    );

                }
            );

        }
    );


/* =========================================
   FILTRO DE AMIGOS
========================================= */

const filterButtons =
    document.querySelectorAll(
        ".filter-btn"
    );


filterButtons.forEach(
    (button) => {

        button.addEventListener(
            "click",
            () => {

                filterButtons.forEach(
                    (btn) => {

                        btn.classList.remove(
                            "active"
                        );

                    }
                );


                button.classList.add(
                    "active"
                );


                const filter =
                    button.dataset.filter;


                const friends =
                    allFriendsList
                        .querySelectorAll(
                            ".all-friend-card"
                        );


                friends.forEach(
                    (friend) => {

                        const status =
                            friend.dataset.status;


                        if (
                            filter === "all" ||
                            filter === status
                        ) {

                            friend.style.display =
                                "flex";

                        } else {

                            friend.style.display =
                                "none";
                        }

                    }
                );

            }
        );

    }
);


/* =========================================
   PESQUISA
========================================= */

searchInput.addEventListener(
    "input",
    (event) => {

        const search =
            event.target.value
                .trim()
                .toLowerCase();


        const friends =
            allFriendsList
                .querySelectorAll(
                    ".all-friend-card"
                );


        friends.forEach(
            (friend) => {

                const name =
                    friend.dataset.name
                        .toLowerCase();


                if (
                    name.includes(
                        search
                    )
                ) {

                    friend.style.display =
                        "flex";

                } else {

                    friend.style.display =
                        "none";
                }

            }
        );

    }
);


/* =========================================
   VER ONLINE
========================================= */

seeOnlineButton.addEventListener(
    "click",
    () => {

        const onlineButton =
            document.querySelector(
                '[data-filter="online"]'
            );


        if (onlineButton) {

            onlineButton.click();
        }


        allFriendsList.scrollIntoView({
            behavior:
                "smooth"
        });

    }
);


/* =========================================
   BOTÕES DOS AMIGOS ONLINE
========================================= */

document
    .querySelectorAll(
        ".friend-action"
    )
    .forEach(
        (button) => {

            button.addEventListener(
                "click",
                () => {

                    if (
                        button.textContent
                            .includes(
                                "Jogar"
                            )
                    ) {

                        alert(
                            "Em breve você poderá convidar este amigo para jogar."
                        );

                    } else {

                        alert(
                            "O sistema de mensagens será implementado futuramente."
                        );
                    }

                }
            );

        }
    );


/* =========================================
   MENU DOS AMIGOS

   Delegação de evento para funcionar
   também nos novos amigos adicionados
   dinamicamente.
========================================= */

allFriendsList.addEventListener(
    "click",
    (event) => {

        const button =
            event.target.closest(
                ".friend-more"
            );


        if (!button) {

            return;
        }


        alert(
            "Mais opções serão adicionadas futuramente."
        );

    }
);


/* =========================================
   MODAL
========================================= */

modalClose.addEventListener(
    "click",
    closeModal
);


modalButton.addEventListener(
    "click",
    closeModal
);


modalOverlay.addEventListener(
    "click",
    (event) => {

        if (
            event.target ===
            modalOverlay
        ) {

            closeModal();
        }

    }
);


document.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key ===
            "Escape"
        ) {

            closeModal();
        }

    }
);


/* =========================================
   PERFIL DE OUTRO USUÁRIO

   Nesta fase apenas Maria possui
   um perfil demonstrativo.
========================================= */

function setupDemoUserProfileLinks() {

    const mariaCard =
        Array
            .from(
                document.querySelectorAll(
                    ".friend-card"
                )
            )
            .find(
                (card) =>

                    card.querySelector(
                        ".friend-card-info h3"
                    )?.textContent.trim() ===
                    "Maria"
            );


    if (!mariaCard) {

        return;
    }


    const triggers = [

        mariaCard.querySelector(
            ".friend-avatar"
        ),

        mariaCard.querySelector(
            ".friend-card-info h3"
        )

    ].filter(Boolean);


    const openMariaProfile =
        () => {

            window.location.href =
                "perfil-usuario.html?user=maria";
        };


    triggers.forEach(
        (element) => {

            element.classList.add(
                "user-profile-link"
            );


            element.tabIndex =
                0;


            element.setAttribute(
                "role",
                "link"
            );


            element.setAttribute(
                "aria-label",
                "Abrir perfil de Maria"
            );


            element.addEventListener(
                "click",
                openMariaProfile
            );


            element.addEventListener(
                "keydown",
                (event) => {

                    if (
                        event.key ===
                            "Enter" ||
                        event.key ===
                            " "
                    ) {

                        event.preventDefault();

                        openMariaProfile();
                    }

                }
            );

        }
    );
}


/* =========================================
   INICIALIZAÇÃO
========================================= */

/*
 * Se já houver dados desta conta,
 * substitui os amigos demonstrativos
 * do HTML pelos dados salvos.
 */

const friendsWereLoaded =
    loadFriendsFromStorage();


/*
 * Primeira visita da conta:
 * os amigos atuais do HTML tornam-se
 * seu estado inicial.
 */

if (!friendsWereLoaded) {

    saveFriendsToStorage();
}


/*
 * Remove solicitações anteriormente
 * aceitas ou recusadas e sincroniza
 * com a central de notificações.
 */

syncFriendRequestsWithNotifications();


setupDemoUserProfileLinks();


updateFriendsSummary();

updateRequestCounter();


console.log(
    "👥 Página Amigos carregada."
);