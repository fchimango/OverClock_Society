/* =========================================
   CENTRAL DE NOTIFICAÇÕES
========================================= */

(() => {

    const NOTIFICATIONS_API_BASE_URL =
        ["127.0.0.1", "localhost"].includes(window.location.hostname)
            ? "http://127.0.0.1:8000"
            : "https://overclock-api.onrender.com";

    let refreshPromise = null;

    async function notificationsApiRequest(path = "", options = {}) {
        const token = localStorage.getItem("token");
        if (!token) {
            throw new Error("Sua sessão não foi encontrada. Entre novamente na sua conta.");
        }

        const headers = {
            Authorization: `Bearer ${token}`,
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...(options.headers || {})
        };

        const response = await fetch(
            `${NOTIFICATIONS_API_BASE_URL}/notifications${path}`,
            {
                method: options.method || "GET",
                headers,
                ...(options.body ? { body: JSON.stringify(options.body) } : {}),
                ...(options.keepalive ? { keepalive: true } : {})
            }
        );

        const payload = await response.json().catch(() => null);
        if (!response.ok) {
            const detail = Array.isArray(payload?.detail)
                ? payload.detail.map((item) => item.msg || String(item)).join(" ")
                : typeof payload?.detail === "string"
                    ? payload.detail
                    : `O servidor respondeu com o status ${response.status}.`;
            const error = new Error(detail);
            error.status = response.status;
            throw error;
        }

        return payload || {};
    }

    function isPersistedNotificationId(id) {
        const parsed = Number(id);
        return Number.isSafeInteger(parsed) && parsed > 0;
    }

    async function persistNotificationRead(id) {
        if (!isPersistedNotificationId(id)) return false;
        try {
            await notificationsApiRequest(`/${Number(id)}/read`, {
                method: "PATCH",
                keepalive: true
            });
            return true;
        } catch (error) {
            console.warn("Não foi possível atualizar a leitura da notificação no banco.", error);
            return false;
        }
    }

    async function persistAllNotificationsRead() {
        try {
            await notificationsApiRequest("/read-all", { method: "PATCH" });
            return true;
        } catch (error) {
            console.warn("Não foi possível marcar as notificações como lidas no banco.", error);
            return false;
        }
    }


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


    /* A API é a fonte de verdade; nenhuma notificação fictícia é inserida. */


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
       CARREGAR
    ========================================= */

    async function loadNotifications({ quiet = false } = {}) {
        try {
            const response = await notificationsApiRequest("");
            notifications = Array.isArray(response.notifications)
                ? response.notifications
                : [];
            return true;
        } catch (error) {
            notifications = [];
            if (!quiet) {
                console.warn("Não foi possível carregar as notificações do PostgreSQL.", error);
            }
            return false;
        }
    }

    async function refreshNotifications({ quiet = true } = {}) {
        if (refreshPromise) return refreshPromise;

        refreshPromise = (async () => {
            const loaded = await loadNotifications({ quiet });
            render();
            return loaded;
        })();

        try {
            return await refreshPromise;
        } finally {
            refreshPromise = null;
        }
    }


    /* =========================================
       BUSCAR NOTIFICAÇÃO
    ========================================= */

    function getNotificationById(
        id
    ) {

        return notifications.find(
            (notification) => String(notification.id) === String(id)
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

    async function markAsRead(id) {
        const notification = getNotificationById(id);
        if (!notification || notification.read) return false;

        notification.read = true;
        render();

        if (isPersistedNotificationId(notification.id)) {
            await persistNotificationRead(notification.id);
        }
        return true;
    }


    /* =========================================
       MARCAR TODAS COMO LIDAS
    ========================================= */

    async function markAllAsRead() {
        const unread = notifications.filter((notification) => !notification.read);
        if (!unread.length) return false;

        notifications.forEach((notification) => {
            notification.read = true;
        });
        render();
        await persistAllNotificationsRead();
        return true;
    }


    /* =========================================
       ADICIONAR NOTIFICAÇÃO
    ========================================= */

    function addNotification(data) {
        const notification = {
            id: data.id || `temporary-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            category: data.category || "feed",
            kind: data.kind || "generic",
            title: data.title || "Nova notificação",
            message: data.message || "Você possui uma nova notificação.",
            createdAt: data.createdAt || "Agora",
            read: Boolean(data.read),
            target: data.target || null,
            ...data
        };

        notifications.unshift(notification);
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

    function resolveFriendRequest(friendName, status) {
        if (status !== "accepted" && status !== "declined") return false;

        const notification = getFriendRequestNotification(friendName);
        if (!notification) return false;

        notification.status = status;
        notification.read = true;
        notification.title = status === "accepted"
            ? "Solicitação aceita"
            : "Solicitação recusada";
        notification.message = status === "accepted"
            ? `${notification.friendName} agora está na sua lista de amigos.`
            : `A solicitação de ${notification.friendName} foi recusada.`;

        render();
        void persistNotificationRead(notification.id);

        // amigos.js resolve a solicitação no endpoint /friends/requests/{id}/...
        window.dispatchEvent(new CustomEvent("overclock:friend-request-resolved", {
            detail: {
                friendName: notification.friendName,
                status,
                requestId: notification.requestId || null
            }
        }));

        return true;
    }


    /* =========================================
       NOTIFICAÇÕES DO FEED

       AGRUPA:
       ação + post
    ========================================= */

    async function notifyFeedAction({
        action,
        actorName,
        actorAvatar = null,
        postId = null,
        commentText = ""
    }) {
        // O servidor identifica o autor da publicação e o usuário autenticado;
        // não aceitamos no cliente um destinatário arbitrário.
        if (!["like", "comment", "repost"].includes(action)) return null;
        const parsedPostId = Number(postId);
        if (!Number.isSafeInteger(parsedPostId) || parsedPostId <= 0) return null;

        try {
            const response = await notificationsApiRequest("/feed-action", {
                method: "POST",
                body: {
                    action,
                    post_id: parsedPostId,
                    comment_text: String(commentText || "").slice(0, 180) || null
                }
            });
            await refreshNotifications({ quiet: true });
            return response.notification || null;
        } catch (error) {
            console.warn("Não foi possível registrar a notificação da publicação.", error);
            return null;
        }
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
                Notificações geradas pelas atividades da comunidade ficam salvas na sua conta.
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
                            ${unreadCount}
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

        const openTarget = async () => {

            /* Sempre marca como lida antes de sair da página. */
            await markAsRead(notification.id);


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

    async function initNotifications() {

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


        await loadNotifications({ quiet: false });

        createPanel();

        render();


        /* =================================
           CLICAR NO SINO
        ================================= */

        bellButton.addEventListener(
            "click",
            (event) => {

                event.stopPropagation();

                if (!panel.classList.contains("active")) {
                    void refreshNotifications({ quiet: true });
                }

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


        window.addEventListener("focus", () => {
            void refreshNotifications({ quiet: true });
        });

        document.addEventListener("visibilitychange", () => {
            if (!document.hidden) {
                void refreshNotifications({ quiet: true });
            }
        });


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