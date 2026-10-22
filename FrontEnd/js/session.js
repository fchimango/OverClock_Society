/* =========================================
   CONFIGURAÇÃO
========================================= */

const SESSION_API_URL =
    ["127.0.0.1", "localhost"].includes(
        window.location.hostname
    )
        ? "http://127.0.0.1:8000"
        : "https://overclock-api.onrender.com";


/* =========================================
   UTILIDADES DA SESSÃO
========================================= */

function clearSession() {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
}


function goToLogin() {
    window.location.href = "login.html";
}


function getInitial(name) {
    if (!name) {
        return "?";
    }

    return name.trim().charAt(0).toUpperCase();
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

    // O nome de usuário do backend tem prioridade.
    const apiUsername =
        normalizeOverclockUsername(user?.username);

    const savedUsername = userId
        ? normalizeOverclockUsername(
            localStorage.getItem(
                getOverclockUsernameKey(userId)
            )
        )
        : "";

    const generatedUsername =
        normalizeOverclockUsername(
            user?.name ||
            localStorage.getItem("userName") ||
            "usuario"
        );

    return (
        apiUsername ||
        savedUsername ||
        generatedUsername ||
        "usuario"
    );
}


/* =========================================
   ATUALIZAR CABEÇALHO
========================================= */

function updateHeaderUser(user) {
    if (!user || !user.name) {
        return;
    }

    const nameElements =
        document.querySelectorAll(
            ".profile-name strong"
        );

    nameElements.forEach((element) => {
        element.textContent = user.name;
    });

    const avatarElements =
        document.querySelectorAll(
            ".profile-button .avatar"
        );

    avatarElements.forEach((element) => {
        element.textContent = getInitial(user.name);
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

    // Esta função não modifica o perfil de outra pessoa.
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
        document.getElementById("profileName");

    if (profileNameInput) {
        profileNameInput.value = user.name;
    }

    const profileUsernameInput =
        document.getElementById("profileUsername");

    const profileIdentityUsername =
        document.querySelector(".profile-username");

    const username =
        getOverclockUsername(user);

    if (profileUsernameInput) {
        profileUsernameInput.value = username;
    }

    if (profileIdentityUsername) {
        profileIdentityUsername.textContent =
            `@${username}`;
    }

    const profileAvatar =
        document.querySelector(".profile-avatar");

    if (
        profileAvatar &&
        !profileAvatar.style.backgroundImage
    ) {
        profileAvatar.textContent =
            getInitial(user.name);
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

    // Exibe os dados já conhecidos enquanto consulta a API.
    const cachedName =
        localStorage.getItem("userName");

    if (cachedName) {
        applyUserToPage({
            id: localStorage.getItem("userId"),
            name: cachedName
        });
    }

    try {
        const response = await fetch(
            `${SESSION_API_URL}/auth/me`,
            {
                method: "GET",

                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        if (!response.ok) {
            clearSession();
            goToLogin();
            return;
        }

        const user = await response.json();

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

        if (user.username) {
            localStorage.setItem(
                getOverclockUsernameKey(user.id),
                normalizeOverclockUsername(user.username)
            );
        }

        applyUserToPage(user);

        // As demais páginas podem esperar este evento
        // antes de carregar os dados específicos do usuário.
        window.dispatchEvent(
            new CustomEvent(
                "overclock:session-ready",
                {
                    detail: {
                        id: String(user.id),
                        name: user.name,
                        email: user.email,

                        username:
                            user.username ||
                            getOverclockUsername(user)
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

        // Não apagamos o token quando há falha de conexão.
        goToLogin();
    }
}


/* =========================================
   LOGOUT
========================================= */

function configureLogout() {
    const logoutLinks =
        document.querySelectorAll(".logout-link");

    logoutLinks.forEach((logoutLink) => {
        logoutLink.addEventListener(
            "click",
            (event) => {
                event.preventDefault();

                clearSession();

                window.location.href = "index.html";
            }
        );
    });
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