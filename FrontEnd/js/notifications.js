/* =========================================
   CENTRAL DE NOTIFICAÇÕES
========================================= */

(() => {

    const STORAGE_KEY =
        "overclockSocietyNotifications";


    /* =========================================
       CATEGORIAS
    ========================================= */

    const CATEGORY_CONFIG = {

        games: {
            label: "Jogos",
            icon: "🎮"
        },

        friends: {
            label: "Amigos",
            icon: "👥"
        },

        feed: {
            label: "Feed",
            icon: "📰"
        }

    };


    /* =========================================
       NOTIFICAÇÕES INICIAIS
    ========================================= */

    const INITIAL_NOTIFICATIONS = [

        /* =========================
           JOGOS
        ========================= */

        {
            id: "game-steam-elden-ring",

            category: "games",

            kind: "sale",

            title:
                "Promoção na Steam",

            message:
                "Exemplo de promoção: Elden Ring está com desconto na Steam.",

            createdAt:
                "Há 18 min",

            read:
                false,

            prototype:
                true,

            /*
             * IMPORTANTE:
             *
             * Promoções não levam para
             * nenhuma página.
             *
             * Ao clicar, apenas marcamos
             * como lida.
             */

            target:
                null
        },


        {
            id: "game-update-minecraft",

            category: "games",

            kind: "update",

            title:
                "Novidade de jogo",

            message:
                "Exemplo: Minecraft recebeu uma nova atualização de conteúdo.",

            createdAt:
                "Há 2 h",

            read:
                false,

            prototype:
                true,

            target:
                "meus-jogos.html"
        },


        /* =========================
           AMIGOS
        ========================= */

        {
            id: "friend-request-mariana",

            category:
                "friends",

            kind:
                "friend-request",

            title:
                "Nova solicitação",

            message:
                "Mariana enviou uma solicitação de amizade.",

            createdAt:
                "Há 24 min",

            read:
                false,

            friendName:
                "Mariana",

            status:
                "pending",

            target:
                "amigos.html"
        },


        {
            id: "friend-request-gabriel",

            category:
                "friends",

            kind:
                "friend-request",

            title:
                "Nova solicitação",

            message:
                "Gabriel enviou uma solicitação de amizade.",

            createdAt:
                "Há 1 h",

            read:
                false,

            friendName:
                "Gabriel",

            status:
                "pending",

            target:
                "amigos.html"
        },


        {
            id: "friend-request-ana",

            category:
                "friends",

            kind:
                "friend-request",

            title:
                "Nova solicitação",

            message:
                "Ana enviou uma solicitação de amizade.",

            createdAt:
                "Hoje",

            read:
                true,

            friendName:
                "Ana",

            status:
                "pending",

            target:
                "amigos.html"
        },


        /* =========================
           FEED
        ========================= */

        {
            id:
                "feed-like-maria",

            category:
                "feed",

            kind:
                "like",

            title:
                "Nova curtida",

            message:
                "Maria, Ana e Gabriel curtiram sua publicação.",

            createdAt:
                "Há 8 min",

            read:
                false,

            actorName:
                "Maria",

            actors: [

                {
                    name: "Maria",
                    avatar: "M"
                },

                {
                    name: "Ana",
                    avatar: "A"
                },

                {
                    name: "Gabriel",
                    avatar: "G"
                }

            ],

            postId:
                "demo-post-1",

            target:
                "perfil.html?tab=posts"
        },


        {
            id:
                "feed-comment-lucas",

            category:
                "feed",

            kind:
                "comment",

            title:
                "Novo comentário",

            message:
                "Lucas e Mariana comentaram em sua publicação.",

            createdAt:
                "Há 32 min",

            read:
                false,

            actorName:
                "Lucas",

            actors: [

                {
                    name: "Lucas",
                    avatar: "L"
                },

                {
                    name: "Mariana",
                    avatar: "M"
                }

            ],

            postId:
                "demo-post-1",

            target:
                "perfil.html?tab=posts"
        },


        {
            id:
                "feed-repost-pedro",

            category:
                "feed",

            kind:
                "repost",

            title:
                "Novo repost",

            message:
                "Pedro, Carlos e Beatriz repostaram sua publicação.",

            createdAt:
                "Há 3 h",

            read:
                true,

            actorName:
                "Pedro",

            actors: [

                {
                    name: "Pedro",
                    avatar: "P"
                },

                {
                    name: "Carlos",
                    avatar: "C"
                },

                {
                    name: "Beatriz",
                    avatar: "B"
                }

            ],

            postId:
                "demo-post-1",

            target:
                "perfil.html?tab=posts"
        }

    ];


    /* =========================================
       ESTADO
    ========================================= */

    let notifications = [];

    let activeCategory =
        "games";

    let panel = null;

    let badge = null;

    let bellButton = null;


    /* =========================================
       UTILIDADES
    ========================================= */

    function cloneInitialNotifications() {

        return JSON.parse(
            JSON.stringify(
                INITIAL_NOTIFICATIONS
            )
        );
    }


    function normalizeText(value) {

        return String(
            value || ""
        )
            .trim()
            .toLocaleLowerCase(
                "pt-BR"
            );
    }


    function getActorInitial(name) {

        return String(
            name || "?"
        )
            .trim()
            .charAt(0)
            .toLocaleUpperCase(
                "pt-BR"
            ) || "?";
    }


    /* =========================================
       USUÁRIOS DAS NOTIFICAÇÕES DO FEED
    ========================================= */

    function getFeedActors(
        notification
    ) {

        if (
            Array.isArray(
                notification.actors
            ) &&
            notification.actors.length > 0
        ) {

            return notification.actors.map(
                (actor) => {

                    /*
                     * Também aceita:
                     *
                     * actors: ["Maria", "Lucas"]
                     */

                    if (
                        typeof actor ===
                        "string"
                    ) {

                        return {

                            name:
                                actor,

                            avatar:
                                getActorInitial(
                                    actor
                                )

                        };
                    }


                    const name =
                        actor?.name ||
                        "Alguém";


                    return {

                        name,

                        avatar:
                            actor?.avatar ||
                            getActorInitial(
                                name
                            )

                    };

                }
            );
        }


        const name =
            notification.actorName ||
            "Alguém";


        return [

            {
                name,

                avatar:
                    notification.actorAvatar ||
                    getActorInitial(
                        name
                    )
            }

        ];
    }


    /* =========================================
       TEXTO DAS AÇÕES DO FEED
    ========================================= */

    function getFeedActionLabel(
        kind
    ) {

        if (
            kind === "like"
        ) {

            return "curtiram sua publicação";
        }


        if (
            kind === "comment"
        ) {

            return "comentaram em sua publicação";
        }


        if (
            kind === "repost"
        ) {

            return "repostaram sua publicação";
        }


        return "interagiram com sua publicação";
    }


    function formatActorNames(
        actors
    ) {

        const names =
            actors
                .map(
                    (actor) =>
                        actor.name
                )
                .filter(Boolean);


        if (
            names.length === 0
        ) {

            return "Alguém";
        }


        if (
            names.length === 1
        ) {

            return names[0];
        }


        if (
            names.length === 2
        ) {

            return `${names[0]} e ${names[1]}`;
        }


        /*
         * Estilo parecido com Twitter:
         *
         * Maria, Ana e mais 3
         */

        return `${names[0]}, ${names[1]} e mais ${names.length - 2}`;
    }


    function buildFeedSummary(
        notification
    ) {

        const actors =
            getFeedActors(
                notification
            );


        /*
         * UMA PESSOA
         */

        if (
            actors.length === 1
        ) {

            const actor =
                actors[0].name;


            if (
                notification.kind ===
                "like"
            ) {

                return `${actor} curtiu sua publicação.`;
            }


            if (
                notification.kind ===
                "comment"
            ) {

                return `${actor} comentou em sua publicação.`;
            }


            if (
                notification.kind ===
                "repost"
            ) {

                return `${actor} repostou sua publicação.`;
            }

        }


        /*
         * VÁRIAS PESSOAS
         */

        return `${formatActorNames(
            actors
        )} ${getFeedActionLabel(
            notification.kind
        )}.`;
    }


    /* =========================================
       MIGRAR NOTIFICAÇÕES ANTIGAS

       Isso evita precisar limpar
       localStorage manualmente.
    ========================================= */

    function migrateStoredNotifications(
        list
    ) {

        let changed =
            false;


        const demoActors = {

            "feed-like-maria": [

                {
                    name: "Maria",
                    avatar: "M"
                },

                {
                    name: "Ana",
                    avatar: "A"
                },

                {
                    name: "Gabriel",
                    avatar: "G"
                }

            ],


            "feed-comment-lucas": [

                {
                    name: "Lucas",
                    avatar: "L"
                },

                {
                    name: "Mariana",
                    avatar: "M"
                }

            ],


            "feed-repost-pedro": [

                {
                    name: "Pedro",
                    avatar: "P"
                },

                {
                    name: "Carlos",
                    avatar: "C"
                },

                {
                    name: "Beatriz",
                    avatar: "B"
                }

            ]

        };


        list.forEach(
            (notification) => {

                /*
                 * =========================
                 * PROMOÇÃO
                 * =========================
                 *
                 * Caso uma versão antiga
                 * ainda possua:
                 *
                 * target: "meus-jogos.html"
                 *
                 * removemos automaticamente.
                 */

                if (
                    notification.category ===
                        "games" &&

                    notification.kind ===
                        "sale" &&

                    notification.target
                ) {

                    notification.target =
                        null;

                    changed =
                        true;
                }


                /*
                 * Daqui para baixo
                 * interessa apenas ao Feed.
                 */

                if (
                    notification.category !==
                    "feed"
                ) {

                    return;
                }


                /*
                 * Atualiza as notificações
                 * demonstrativas antigas.
                 */

                if (
                    demoActors[
                        notification.id
                    ] &&

                    (
                        !Array.isArray(
                            notification.actors
                        ) ||

                        notification.actors.length <=
                            1
                    )
                ) {

                    notification.actors =
                        demoActors[
                            notification.id
                        ];


                    notification.postId =
                        notification.postId ||
                        "demo-post-1";


                    changed =
                        true;
                }


                /*
                 * Se ainda não existir actors,
                 * converte actorName para
                 * o novo formato.
                 */

                if (
                    !Array.isArray(
                        notification.actors
                    ) ||

                    notification.actors.length ===
                        0
                ) {

                    const actor =
                        notification.actorName ||
                        "Alguém";


                    notification.actors = [

                        {
                            name:
                                actor,

                            avatar:
                                notification.actorAvatar ||
                                getActorInitial(
                                    actor
                                )
                        }

                    ];


                    changed =
                        true;
                }

            }
        );


        return changed;
    }


    /* =========================================
       CARREGAR
    ========================================= */

    function loadNotifications() {

        let stored =
            null;


        try {

            stored =
                window.localStorage.getItem(
                    STORAGE_KEY
                );

        } catch (error) {

            console.warn(
                "localStorage indisponível. As notificações funcionarão apenas enquanto a página estiver aberta.",
                error
            );

        }


        if (stored) {

            try {

                const parsed =
                    JSON.parse(
                        stored
                    );


                if (
                    Array.isArray(
                        parsed
                    )
                ) {

                    notifications =
                        parsed;


                    if (
                        migrateStoredNotifications(
                            notifications
                        )
                    ) {

                        saveNotifications();
                    }


                    return;
                }

            } catch (error) {

                console.warn(
                    "Não foi possível carregar as notificações.",
                    error
                );

            }
        }


        /*
         * Primeiro acesso.
         */

        notifications =
            cloneInitialNotifications();


        saveNotifications();
    }


    /* =========================================
       SALVAR
    ========================================= */

    function saveNotifications() {

        try {

            window.localStorage.setItem(

                STORAGE_KEY,

                JSON.stringify(
                    notifications
                )

            );

        } catch (error) {

            console.warn(
                "Não foi possível salvar as notificações no localStorage.",
                error
            );

        }
    }


    /* =========================================
       BUSCAR NOTIFICAÇÃO
    ========================================= */

    function getNotificationById(
        id
    ) {

        return notifications.find(
            (notification) =>
                notification.id ===
                id
        );
    }


    /* =========================================
       CONTADORES
    ========================================= */

    function getUnreadCount(
        category = null
    ) {

        return notifications.filter(
            (notification) => {

                if (
                    category &&
                    notification.category !==
                        category
                ) {

                    return false;
                }


                return !notification.read;

            }
        ).length;
    }


    function getCategoryCount(
        category
    ) {

        return notifications.filter(
            (notification) =>
                notification.category ===
                    category
        ).length;
    }


    /* =========================================
       ÍCONES
    ========================================= */

    function getKindIcon(
        notification
    ) {

        /*
         * JOGOS
         */

        if (
            notification.category ===
            "games"
        ) {

            if (
                notification.kind ===
                "sale"
            ) {

                return "🔥";
            }


            return "🎮";
        }


        /*
         * AMIGOS
         */

        if (
            notification.category ===
            "friends"
        ) {

            return "👤";
        }


        /*
         * FEED
         */

        if (
            notification.kind ===
            "like"
        ) {

            return "❤️";
        }


        if (
            notification.kind ===
            "comment"
        ) {

            return "💬";
        }


        if (
            notification.kind ===
            "repost"
        ) {

            return "🔁";
        }


        return "📰";
    }


    /* =========================================
       MARCAR COMO LIDA
    ========================================= */

    function markAsRead(
        id
    ) {

        const notification =
            getNotificationById(
                id
            );


        if (
            !notification ||
            notification.read
        ) {

            return;
        }


        notification.read =
            true;


        saveNotifications();

        render();
    }


    /* =========================================
       MARCAR TODAS COMO LIDAS
    ========================================= */

    function markAllAsRead() {

        let changed =
            false;


        notifications.forEach(
            (notification) => {

                if (
                    !notification.read
                ) {

                    notification.read =
                        true;

                    changed =
                        true;
                }

            }
        );


        if (
            !changed
        ) {

            return;
        }


        saveNotifications();

        render();
    }


    /* =========================================
       ADICIONAR NOTIFICAÇÃO
    ========================================= */

    function addNotification(
        data
    ) {

        const notification = {

            id:
                data.id ||
                `notification-${Date.now()}-${Math.random()
                    .toString(16)
                    .slice(2)}`,


            category:
                data.category ||
                "feed",


            kind:
                data.kind ||
                "generic",


            title:
                data.title ||
                "Nova notificação",


            message:
                data.message ||
                "Você possui uma nova notificação.",


            createdAt:
                data.createdAt ||
                "Agora",


            read:
                Boolean(
                    data.read
                ),


            target:
                data.target ||
                null,


            ...data
        };


        notifications.unshift(
            notification
        );


        saveNotifications();

        render();


        return notification;
    }


    /* =========================================
       PEDIDOS DE AMIZADE
    ========================================= */

    function getFriendRequestNotification(
        friendName
    ) {

        const normalizedName =
            normalizeText(
                friendName
            );


        return notifications.find(
            (notification) =>

                notification.category ===
                    "friends" &&

                notification.kind ===
                    "friend-request" &&

                normalizeText(
                    notification.friendName
                ) ===
                    normalizedName
        );
    }


    function getFriendRequestStatus(
        friendName
    ) {

        const notification =
            getFriendRequestNotification(
                friendName
            );


        return (
            notification?.status ||
            "pending"
        );
    }


    /* =========================================
       ACEITAR / RECUSAR AMIZADE
    ========================================= */

    function resolveFriendRequest(
        friendName,
        status
    ) {

        if (
            status !== "accepted" &&
            status !== "declined"
        ) {

            return false;
        }


        const notification =
            getFriendRequestNotification(
                friendName
            );


        if (
            !notification
        ) {

            return false;
        }


        notification.status =
            status;


        notification.read =
            true;


        if (
            status ===
            "accepted"
        ) {

            notification.title =
                "Solicitação aceita";


            notification.message =
                `${notification.friendName} agora está na sua lista de amigos.`;

        } else {

            notification.title =
                "Solicitação recusada";


            notification.message =
                `A solicitação de ${notification.friendName} foi recusada.`;

        }


        saveNotifications();

        render();


        /*
         * Permite que amigos.js saiba
         * que o pedido foi resolvido.
         */

        window.dispatchEvent(

            new CustomEvent(
                "overclock:friend-request-resolved",
                {

                    detail: {

                        friendName:
                            notification.friendName,

                        status

                    }

                }
            )

        );


        return true;
    }


    /* =========================================
       NOTIFICAÇÕES DO FEED

       AGRUPA:
       ação + post
    ========================================= */

    function notifyFeedAction({

        action,

        actorName,

        actorAvatar = null,

        postId = null,

        commentText = ""

    }) {

        /*
         * Somente estas ações
         * são permitidas.
         */

        if (
            action !== "like" &&
            action !== "comment" &&
            action !== "repost"
        ) {

            return null;
        }


        const actor =
            actorName ||
            "Alguém";


        /*
         * Precisamos identificar
         * de qual publicação é
         * a interação.
         */

        const normalizedPostId =

            postId === null ||
            postId === undefined

                ? "__general__"

                : String(
                    postId
                );


        /*
         * Procurar notificação já existente
         * para:
         *
         * MESMO POST
         * +
         * MESMA AÇÃO
         */

        const existing =
            notifications.find(
                (notification) => {

                    if (
                        notification.category !==
                            "feed" ||

                        notification.kind !==
                            action
                    ) {

                        return false;
                    }


                    const currentPostId =

                        notification.postId === null ||
                        notification.postId === undefined

                            ? "__general__"

                            : String(
                                notification.postId
                            );


                    return (
                        currentPostId ===
                        normalizedPostId
                    );

                }
            );


        /* =====================================
           JÁ EXISTE UMA NOTIFICAÇÃO

           Adicionamos o novo usuário
           dentro dela.
        ===================================== */

        if (existing) {

            const actors =
                getFeedActors(
                    existing
                );


            /*
             * Evitar colocar a mesma
             * pessoa duas vezes.
             */

            const alreadyExists =
                actors.some(
                    (item) =>

                        normalizeText(
                            item.name
                        ) ===

                        normalizeText(
                            actor
                        )
                );


            if (
                !alreadyExists
            ) {

                actors.push({

                    name:
                        actor,

                    avatar:
                        actorAvatar ||
                        getActorInitial(
                            actor
                        )

                });

            }


            existing.actors =
                actors;


            existing.actorName =
                actors[0]?.name ||
                actor;


            existing.actorAvatar =
                actors[0]?.avatar ||
                actorAvatar ||
                getActorInitial(
                    actor
                );


            /*
             * Como houve uma nova interação,
             * a notificação volta a ser
             * considerada nova.
             */

            existing.createdAt =
                "Agora";


            existing.read =
                false;


            if (
                action === "comment" &&
                commentText
            ) {

                existing.lastCommentText =
                    commentText;
            }


            existing.message =
                buildFeedSummary(
                    existing
                );


            /*
             * Levar novamente para o topo.
             */

            notifications = [

                existing,

                ...notifications.filter(
                    (notification) =>
                        notification !==
                        existing
                )

            ];


            saveNotifications();

            render();


            return existing;
        }


        /* =====================================
           PRIMEIRA INTERAÇÃO

           Criamos nova notificação.
        ===================================== */

        const notification =
            addNotification({

                category:
                    "feed",

                kind:
                    action,

                actorName:
                    actor,

                actorAvatar:
                    actorAvatar ||
                    getActorInitial(
                        actor
                    ),

                actors: [

                    {
                        name:
                            actor,

                        avatar:
                            actorAvatar ||
                            getActorInitial(
                                actor
                            )
                    }

                ],

                postId,

                title:

                    action === "like"

                        ? "Nova curtida"

                        : action ===
                            "comment"

                            ? "Novo comentário"

                            : "Novo repost",


                message:
                    "",


                lastCommentText:

                    action === "comment"

                        ? commentText

                        : "",


                target:
                    "perfil.html?tab=posts"

            });


        notification.message =
            buildFeedSummary(
                notification
            );


        saveNotifications();

        render();


        return notification;
    }


    /* =========================================
       CRIAR PAINEL
    ========================================= */

    function createPanel() {

        const wrapper =
            document.createElement(
                "div"
            );


        wrapper.className =
            "notification-center";


        /*
         * Colocamos um wrapper ao redor
         * do sino existente.
         */

        bellButton.parentNode
            .insertBefore(
                wrapper,
                bellButton
            );


        wrapper.appendChild(
            bellButton
        );


        bellButton.classList.add(
            "notification-bell-button"
        );


        bellButton.type =
            "button";


        bellButton.setAttribute(
            "aria-haspopup",
            "dialog"
        );


        bellButton.setAttribute(
            "aria-expanded",
            "false"
        );


        /* =================================
           BADGE
        ================================= */

        badge =
            document.createElement(
                "span"
            );


        badge.className =
            "notification-badge";


        badge.setAttribute(
            "aria-hidden",
            "true"
        );


        bellButton.appendChild(
            badge
        );


        /* =================================
           PAINEL
        ================================= */

        panel =
            document.createElement(
                "section"
            );


        panel.className =
            "notification-panel";


        panel.setAttribute(
            "aria-label",
            "Central de notificações"
        );


        panel.setAttribute(
            "aria-hidden",
            "true"
        );


        panel.innerHTML = `

            <div
                class="notification-panel-header"
            >

                <div
                    class="notification-panel-heading"
                >

                    <span>
                        CENTRAL
                    </span>

                    <h2>
                        Notificações
                    </h2>

                </div>


                <button
                    type="button"
                    class="notification-mark-all"
                    data-notification-mark-all
                >
                    ✓ Marcar tudo como lido
                </button>

            </div>


            <div
                class="notification-tabs"
                role="tablist"
                aria-label="Categorias de notificações"
            ></div>


            <div
                class="notification-list"
                aria-live="polite"
            ></div>


            <div
                class="notification-footer-note"
            >
                Promoções de jogos são dados simulados nesta versão do protótipo.
            </div>

        `;


        wrapper.appendChild(
            panel
        );


        /*
         * MARCAR TUDO COMO LIDO
         */

        panel
            .querySelector(
                "[data-notification-mark-all]"
            )
            .addEventListener(
                "click",
                (event) => {

                    event.stopPropagation();

                    markAllAsRead();

                }
            );
    }


    /* =========================================
       ABAS
    ========================================= */

    function renderTabs() {

        if (
            !panel
        ) {

            return;
        }


        const tabs =
            panel.querySelector(
                ".notification-tabs"
            );


        tabs.innerHTML =
            "";


        Object.entries(
            CATEGORY_CONFIG
        )
            .forEach(
                (
                    [
                        category,
                        config
                    ]
                ) => {

                    const button =
                        document.createElement(
                            "button"
                        );


                    button.type =
                        "button";


                    button.className =
                        "notification-tab";


                    button.dataset.notificationTab =
                        category;


                    const unreadCount =
                        getUnreadCount(
                            category
                        );


                    button.classList.toggle(

                        "active",

                        activeCategory ===
                            category

                    );


                    button.setAttribute(
                        "role",
                        "tab"
                    );


                    button.setAttribute(

                        "aria-selected",

                        String(
                            activeCategory ===
                                category
                        )

                    );


                    button.innerHTML = `

                        <span>
                            ${config.icon}
                        </span>

                        <span>
                            ${config.label}
                        </span>

                        <span
                            class="notification-tab-count"
                        >
                            ${
                                unreadCount ||
                                getCategoryCount(
                                    category
                                )
                            }
                        </span>

                    `;


                    button.addEventListener(
                        "click",
                        (event) => {

                            event.stopPropagation();


                            activeCategory =
                                category;


                            render();

                        }
                    );


                    tabs.appendChild(
                        button
                    );

                }
            );
    }


    /* =========================================
       AVATARES AGRUPADOS
    ========================================= */

    function createFeedActorStack(
        notification
    ) {

        const actors =
            getFeedActors(
                notification
            );


        const wrapper =
            document.createElement(
                "div"
            );


        wrapper.className =
            "notification-feed-actors";


        /*
         * Máximo de 5 avatares visíveis.
         */

        const visibleActors =
            actors.slice(
                0,
                5
            );


        visibleActors.forEach(
            (actor) => {

                const avatar =
                    document.createElement(
                        "span"
                    );


                avatar.className =
                    "notification-feed-avatar";


                avatar.title =
                    actor.name;


                const avatarValue =
                    String(
                        actor.avatar ||
                        ""
                    );


                /*
                 * Futuramente podemos receber
                 * URL ou imagem do perfil.
                 */

                if (
                    avatarValue.startsWith(
                        "data:image"
                    ) ||

                    avatarValue.startsWith(
                        "http://"
                    ) ||

                    avatarValue.startsWith(
                        "https://"
                    )
                ) {

                    avatar.style.backgroundImage =
                        `url("${avatarValue.replace(
                            /"/g,
                            "%22"
                        )}")`;


                    avatar.classList.add(
                        "has-image"
                    );

                } else {

                    /*
                     * Por enquanto:
                     *
                     * M
                     * L
                     * P
                     */

                    avatar.textContent =
                        avatarValue ||
                        getActorInitial(
                            actor.name
                        );
                }


                wrapper.appendChild(
                    avatar
                );

            }
        );


        /*
         * Mais de 5 pessoas:
         *
         * [M][A][L][P][G] +3
         */

        if (
            actors.length > 5
        ) {

            const extra =
                document.createElement(
                    "span"
                );


            extra.className =
                "notification-feed-avatar notification-feed-avatar-extra";


            extra.textContent =
                `+${actors.length - 5}`;


            wrapper.appendChild(
                extra
            );
        }


        return wrapper;
    }


    /* =========================================
       CRIAR NOTIFICAÇÃO
    ========================================= */

    function createNotificationItem(
        notification
    ) {

        const item =
            document.createElement(
                "article"
            );


        item.className =
            "notification-item";


        item.dataset.notificationId =
            notification.id;


        item.dataset.category =
            notification.category;


        item.tabIndex =
            0;


        item.classList.toggle(

            "unread",

            !notification.read

        );


        /*
         * Promoção sem redirecionamento.
         */

        item.classList.toggle(

            "notification-informational",

            notification.category ===
                "games" &&

            notification.kind ===
                "sale" &&

            !notification.target

        );


        /* =================================
           ÍCONE
        ================================= */

        const icon =
            document.createElement(
                "div"
            );


        icon.className =
            "notification-item-icon";


        icon.textContent =
            getKindIcon(
                notification
            );


        /* =================================
           CONTEÚDO
        ================================= */

        const content =
            document.createElement(
                "div"
            );


        content.className =
            "notification-content";


        /* =================================
           TÍTULO
        ================================= */

        const titleRow =
            document.createElement(
                "div"
            );


        titleRow.className =
            "notification-title-row";


        const title =
            document.createElement(
                "div"
            );


        title.className =
            "notification-title";


        title.textContent =
            notification.title;


        const unreadDot =
            document.createElement(
                "span"
            );


        unreadDot.className =
            "notification-unread-dot";


        titleRow.append(
            title,
            unreadDot
        );


        /* =================================
           MENSAGEM
        ================================= */

        const message =
            document.createElement(
                "div"
            );


        message.className =
            "notification-message";


        message.textContent =
            notification.message;


        /* =================================
           META
        ================================= */

        const meta =
            document.createElement(
                "div"
            );


        meta.className =
            "notification-meta";


        const time =
            document.createElement(
                "span"
            );


        time.textContent =
            notification.createdAt ||
            "Agora";


        meta.appendChild(
            time
        );


        /*
         * Indicação de protótipo.
         */

        if (
            notification.prototype
        ) {

            const tag =
                document.createElement(
                    "span"
                );


            tag.className =
                "notification-prototype-tag";


            tag.textContent =
                "Dado simulado";


            meta.appendChild(
                tag
            );
        }


        /* =================================
           FEED AGRUPADO
        ================================= */

        const feedActors =

            notification.category ===
            "feed"

                ? getFeedActors(
                    notification
                )

                : [];


        if (
            notification.category ===
                "feed" &&

            feedActors.length > 1
        ) {

            /*
             * Visual estilo Twitter/X.
             */

            item.classList.add(
                "notification-feed-grouped"
            );


            const actorsRow =
                document.createElement(
                    "div"
                );


            actorsRow.className =
                "notification-feed-actors-row";


            actorsRow.appendChild(
                createFeedActorStack(
                    notification
                )
            );


            actorsRow.appendChild(
                unreadDot
            );


            const summary =
                document.createElement(
                    "div"
                );


            summary.className =
                "notification-feed-summary";


            summary.textContent =
                buildFeedSummary(
                    notification
                );


            content.append(
                actorsRow,
                summary,
                meta
            );

        } else {

            /*
             * Notificação convencional.
             */

            content.append(
                titleRow,
                message,
                meta
            );
        }


        /* =================================
           PEDIDO DE AMIZADE
        ================================= */

        if (
            notification.category ===
                "friends" &&

            notification.kind ===
                "friend-request"
        ) {

            appendFriendRequestActions(
                content,
                notification
            );
        }


        item.append(
            icon,
            content
        );


        /* =================================
           ABRIR NOTIFICAÇÃO
        ================================= */

        const openTarget = () => {

            /*
             * Sempre marca como lida.
             */

            markAsRead(
                notification.id
            );


            /*
             * PROMOÇÃO:
             *
             * target === null
             *
             * Portanto não acontece
             * nenhum redirecionamento.
             */

            if (
                notification.target
            ) {

                window.location.href =
                    notification.target;
            }
        };


        item.addEventListener(
            "click",
            (event) => {

                /*
                 * Não executar o clique
                 * da notificação ao usar
                 * Aceitar / Recusar.
                 */

                if (
                    event.target.closest(
                        ".notification-friend-action"
                    )
                ) {

                    return;
                }


                openTarget();

            }
        );


        /*
         * ACESSIBILIDADE:
         * Enter / Espaço
         */

        item.addEventListener(
            "keydown",
            (event) => {

                if (
                    event.key ===
                        "Enter" ||

                    event.key ===
                        " "
                ) {

                    if (
                        document.activeElement
                            ?.classList
                            ?.contains(
                                "notification-friend-action"
                            )
                    ) {

                        return;
                    }


                    event.preventDefault();

                    openTarget();

                }

            }
        );


        return item;
    }


    /* =========================================
       AÇÕES DO PEDIDO DE AMIZADE
    ========================================= */

    function appendFriendRequestActions(
        content,
        notification
    ) {

        const status =
            notification.status ||
            "pending";


        /*
         * PEDIDO JÁ RESOLVIDO
         */

        if (
            status ===
                "accepted" ||

            status ===
                "declined"
        ) {

            const resolution =
                document.createElement(
                    "span"
                );


            resolution.className =
                `notification-resolution ${
                    status === "declined"
                        ? "declined"
                        : ""
                }`;


            resolution.textContent =

                status === "accepted"

                    ? "✓ Solicitação aceita"

                    : "✕ Solicitação recusada";


            content.appendChild(
                resolution
            );


            return;
        }


        /* =================================
           BOTÕES
        ================================= */

        const actions =
            document.createElement(
                "div"
            );


        actions.className =
            "notification-friend-actions";


        const accept =
            document.createElement(
                "button"
            );


        accept.type =
            "button";


        accept.className =
            "notification-friend-action accept";


        accept.textContent =
            "✓ Aceitar";


        const decline =
            document.createElement(
                "button"
            );


        decline.type =
            "button";


        decline.className =
            "notification-friend-action decline";


        decline.textContent =
            "✕ Recusar";


        accept.addEventListener(
            "click",
            (event) => {

                event.stopPropagation();


                resolveFriendRequest(

                    notification.friendName,

                    "accepted"

                );

            }
        );


        decline.addEventListener(
            "click",
            (event) => {

                event.stopPropagation();


                resolveFriendRequest(

                    notification.friendName,

                    "declined"

                );

            }
        );


        actions.append(
            accept,
            decline
        );


        content.appendChild(
            actions
        );
    }


    /* =========================================
       LISTA DE NOTIFICAÇÕES
    ========================================= */

    function renderList() {

        if (
            !panel
        ) {

            return;
        }


        const list =
            panel.querySelector(
                ".notification-list"
            );


        list.innerHTML =
            "";


        const categoryNotifications =
            notifications.filter(
                (notification) =>
                    notification.category ===
                    activeCategory
            );


        /* =================================
           VAZIO
        ================================= */

        if (
            categoryNotifications.length ===
            0
        ) {

            const empty =
                document.createElement(
                    "div"
                );


            empty.className =
                "notification-empty";


            empty.innerHTML = `

                <span>
                    ${CATEGORY_CONFIG[
                        activeCategory
                    ].icon}
                </span>

                <strong>
                    Nenhuma notificação por aqui.
                </strong>

                <p>
                    Novidades desta categoria aparecerão neste espaço.
                </p>

            `;


            list.appendChild(
                empty
            );


            return;
        }


        /* =================================
           ITEMS
        ================================= */

        categoryNotifications.forEach(
            (notification) => {

                list.appendChild(
                    createNotificationItem(
                        notification
                    )
                );

            }
        );
    }


    /* =========================================
       BADGE DO SINO
    ========================================= */

    function renderBadge() {

        if (
            !badge
        ) {

            return;
        }


        const unreadCount =
            getUnreadCount();


        badge.textContent =

            unreadCount > 99

                ? "99+"

                : String(
                    unreadCount
                );


        badge.classList.toggle(

            "active",

            unreadCount > 0

        );


        bellButton?.setAttribute(

            "aria-label",

            unreadCount > 0

                ? `Notificações: ${unreadCount} não lidas`

                : "Notificações"

        );
    }


    /* =========================================
       RENDERIZAR TUDO
    ========================================= */

    function render() {

        renderBadge();

        renderTabs();

        renderList();
    }


    /* =========================================
       ABRIR PAINEL
    ========================================= */

    function openPanel() {

        if (
            !panel
        ) {

            return;
        }


        panel.classList.add(
            "active"
        );


        panel.setAttribute(
            "aria-hidden",
            "false"
        );


        bellButton.setAttribute(
            "aria-expanded",
            "true"
        );
    }


    /* =========================================
       FECHAR PAINEL
    ========================================= */

    function closePanel() {

        if (
            !panel
        ) {

            return;
        }


        panel.classList.remove(
            "active"
        );


        panel.setAttribute(
            "aria-hidden",
            "true"
        );


        bellButton.setAttribute(
            "aria-expanded",
            "false"
        );
    }


    /* =========================================
       ALTERNAR PAINEL
    ========================================= */

    function togglePanel() {

        if (
            panel.classList.contains(
                "active"
            )
        ) {

            closePanel();

        } else {

            openPanel();
        }
    }


    /* =========================================
       INICIALIZAÇÃO
    ========================================= */

    function initNotifications() {

        /*
         * Procura o sino que já existe
         * nos headers das páginas.
         */

        bellButton =
            document.querySelector(
                '.icon-button[title="Notificações"]'
            );


        /*
         * Algumas páginas podem não
         * possuir sino.
         */

        if (
            !bellButton
        ) {

            return;
        }


        loadNotifications();

        createPanel();

        render();


        /* =================================
           CLICAR NO SINO
        ================================= */

        bellButton.addEventListener(
            "click",
            (event) => {

                event.stopPropagation();

                togglePanel();

            }
        );


        /* =================================
           CLICAR FORA
        ================================= */

        document.addEventListener(
            "click",
            (event) => {

                if (
                    !event.target.closest(
                        ".notification-center"
                    )
                ) {

                    closePanel();
                }

            }
        );


        /* =================================
           ESC
        ================================= */

        document.addEventListener(
            "keydown",
            (event) => {

                if (
                    event.key ===
                    "Escape"
                ) {

                    closePanel();
                }

            }
        );


        /* =================================
           ALTERAÇÃO EM OUTRA ABA
        ================================= */

        window.addEventListener(
            "storage",
            (event) => {

                if (
                    event.key ===
                    STORAGE_KEY
                ) {

                    loadNotifications();

                    render();
                }

            }
        );


        console.log(
            "🔔 Central de notificações carregada."
        );
    }


    /* =========================================
       API GLOBAL

       Essas funções podem ser chamadas
       futuramente pelo feed.js,
       amigos.js ou pelo backend.
    ========================================= */

    window.OverclockNotifications = {

        add:
            addNotification,


        markAsRead,


        markAllAsRead,


        getUnreadCount,


        getFriendRequestStatus,


        resolveFriendRequest,


        notifyFeedAction,


        getAll: () =>

            JSON.parse(
                JSON.stringify(
                    notifications
                )
            )

    };


    /* =========================================
       EXECUTAR
    ========================================= */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initNotifications,
            {
                once: true
            }
        );

    } else {

        initNotifications();
    }

})();