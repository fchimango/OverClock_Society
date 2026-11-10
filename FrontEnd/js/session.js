/* =========================================
   CONFIGURAÇÃO
========================================= */

const SESSION_API_URL = window.OVERCLOCK_API_BASE_URL;


const PRESENCE_HEARTBEAT_INTERVAL_MS = 45_000;
let presenceHeartbeatTimer = null;
let presenceHeartbeatInProgress = false;

async function sendPresenceHeartbeat() {
    const token = localStorage.getItem("token");
    if (!token || presenceHeartbeatInProgress) return;

    presenceHeartbeatInProgress = true;
    try {
        const response = await fetch(`${SESSION_API_URL}/friends/presence/heartbeat`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok && response.status !== 401) {
            console.debug("Não foi possível atualizar a presença neste momento.");
        }
    } catch (error) {
        // Falha temporária de rede não encerra a sessão; a presença expira no servidor.
        console.debug("Heartbeat de presença indisponível temporariamente.");
    } finally {
        presenceHeartbeatInProgress = false;
    }
}

function startPresenceHeartbeat() {
    if (!localStorage.getItem("token")) return;
    if (presenceHeartbeatTimer !== null) {
        window.clearInterval(presenceHeartbeatTimer);
    }

    void sendPresenceHeartbeat();
    presenceHeartbeatTimer = window.setInterval(
        sendPresenceHeartbeat,
        PRESENCE_HEARTBEAT_INTERVAL_MS
    );
}

async function markPresenceOfflineBeforeLogout() {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
        await fetch(`${SESSION_API_URL}/friends/presence/offline`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            keepalive: true
        });
    } catch (error) {
        // O servidor também considera a conta offline se o heartbeat expirar.
    }
}

/* =========================================
   UTILIDADES DA SESSÃO
========================================= */

function clearSession() {
    if (presenceHeartbeatTimer !== null) {
        window.clearInterval(presenceHeartbeatTimer);
        presenceHeartbeatTimer = null;
    }
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userAvatarUrl");
}


function goToLogin() {
    window.location.href = "login.html";
}


function getInitial(name) {
    if (!name) {
        return "?";
    }

    return name
        .trim()
        .charAt(0)
        .toUpperCase();
}

function normalizeOverclockUsername(value) {

    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9._]/g, "");
}


function getOverclockUsernameKey(userId) {

    return `overclockSocietyUsername_${userId}`;
}


function getOverclockUsername(user) {

    const userId =
        user?.id ??
        localStorage.getItem("userId");

    const savedUsername =
        userId
            ? localStorage.getItem(
                getOverclockUsernameKey(userId)
            )
            : null;

    const generatedUsername =
        normalizeOverclockUsername(
            user?.name ||
            localStorage.getItem("userName") ||
            "usuario"
        );

    return savedUsername ||
        generatedUsername ||
        "usuario";
}


/* =========================================
   ATUALIZAR CABEÇALHO
========================================= */

function updateHeaderUser(user) {
    if (!user || !user.name) {
        return;
    }

    const nameElements = document.querySelectorAll(".profile-name strong");
    nameElements.forEach((element) => {
        element.textContent = user.name;
    });

    const avatarElements = document.querySelectorAll(".profile-button .avatar");
    const initial = getInitial(user.name);
    const avatarPath = String(user.avatar_url || "").trim();

    avatarElements.forEach((element) => {
        // Always clear the previous content first, so a changed/removed photo is reflected.
        element.replaceChildren();
        element.textContent = initial;
        element.setAttribute("aria-hidden", "true");

        if (!avatarPath || !SESSION_API_URL) return;

        try {
            const image = document.createElement("img");
            image.className = "profile-header-avatar-image";
            image.alt = "";
            image.decoding = "async";
            image.loading = "eager";
            image.addEventListener("error", () => {
                image.remove();
                element.textContent = initial;
            }, { once: true });

            element.textContent = "";
            element.appendChild(image);
            image.src = new URL(avatarPath, SESSION_API_URL).toString();
        } catch (error) {
            element.textContent = initial;
            console.warn("Não foi possível carregar a foto do cabeçalho.", error);
        }
    });
}


/* =========================================
   ATUALIZAR O PRÓPRIO PERFIL
========================================= */

function updateOwnProfile(user) {
    const currentPage =
        window.location.pathname
            .split("/")
            .pop();

    /*
     * Não alteramos perfil-usuario.html,
     * pois aquela página representa
     * outro usuário.
     */
    if (currentPage !== "perfil.html") {
        return;
    }


    const profileIdentityName =
        document.querySelector(
            ".profile-identity h1"
        );

    if (profileIdentityName) {
        profileIdentityName.textContent =
            user.name;
    }


    const profileNameInput =
        document.getElementById(
            "profileName"
        );

    if (profileNameInput) {
        profileNameInput.value =
            user.name;
    }

    const profileUsernameInput =
    document.getElementById(
        "profileUsername"
    );

const profileIdentityUsername =
    document.querySelector(
        ".profile-username"
    );

const username =
    getOverclockUsername(user);


if (profileUsernameInput) {

    profileUsernameInput.value =
        username;
}


if (profileIdentityUsername) {

    profileIdentityUsername.textContent =
        `@${username}`;
}


    const profileAvatar =
        document.querySelector(
            ".profile-avatar"
        );

    if (
        profileAvatar &&
        !profileAvatar.style.backgroundImage
    ) {
        profileAvatar.textContent =
            getInitial(
                user.name
            );
    }
}


/* =========================================
   APLICAR USUÁRIO NA PÁGINA
========================================= */

function applyUserToPage(user) {
    
    updateHeaderUser(user);
    updateOwnProfile(user);
}


/* =========================================
   VALIDAR SESSÃO
========================================= */

async function validateSession() {
    const token =
        localStorage.getItem("token");

    if (!token) {
        goToLogin();
        return;
    }


    /*
     * Usa o nome salvo enquanto
     * consulta a API.
     *
     * Isso evita que "João" apareça
     * rapidamente antes da resposta.
     */
    const cachedName =
        localStorage.getItem(
            "userName"
        );

    if (cachedName) {
        applyUserToPage({
            name: cachedName,
            avatar_url: localStorage.getItem("userAvatarUrl") || null
        });
    }


    try {
        const response =
            await fetch(
                `${SESSION_API_URL}/auth/me`,
                {
                    method: "GET",

                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );


        if (!response.ok) {
            clearSession();
            goToLogin();
            return;
        }


        const user =
            await response.json();


        localStorage.setItem(
            "userId",
            String(user.id)
        );

        localStorage.setItem(
            "userName",
            user.name
        );

        localStorage.setItem(
            "userEmail",
            user.email
        );

        if (user.avatar_url) {
            localStorage.setItem("userAvatarUrl", user.avatar_url);
        } else {
            localStorage.removeItem("userAvatarUrl");
        }

        applyUserToPage(user);
        startPresenceHeartbeat();

window.dispatchEvent(
    new CustomEvent(
        "overclock:session-ready",
        {
            detail: {
                id:
                    String(user.id),

                name:
                    user.name,

                email:
                    user.email,

                avatar_url:
                    user.avatar_url || null
            }
        }
    )
);

        console.log(
            "✅ Sessão válida:",
            user.name
        );

    } catch (error) {
        console.error(
            "Não foi possível validar a sessão:",
            error
        );

        /*
         * Não apagamos o token aqui,
         * porque o problema pode ser
         * apenas o servidor offline.
         */
        goToLogin();
    }
}


/* =========================================
   LOGOUT
========================================= */

function configureLogout() {
    const logoutLinks =
        document.querySelectorAll(
            ".logout-link"
        );

    logoutLinks.forEach(
        (logoutLink) => {

            logoutLink.addEventListener(
                "click",
                async (event) => {

                    event.preventDefault();

                    await markPresenceOfflineBeforeLogout();
                    clearSession();

                    window.location.href =
                        "index.html";
                }
            );

        }
    );
}


/* =========================================
   INICIALIZAÇÃO
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {
        configureLogout();
        validateSession();
    }
);

document.addEventListener("visibilitychange", () => {
    if (!document.hidden && localStorage.getItem("token")) {
        void sendPresenceHeartbeat();
    }
});
