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

    return name
        .trim()
        .charAt(0)
        .toUpperCase();
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

    nameElements.forEach(
        (element) => {
            element.textContent =
                user.name;
        }
    );


    const avatarElements =
        document.querySelectorAll(
            ".profile-button .avatar"
        );

    avatarElements.forEach(
        (element) => {
            element.textContent =
                getInitial(
                    user.name
                );
        }
    );
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
            name: cachedName
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


        applyUserToPage(user);

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
                    user.email
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
                (event) => {

                    event.preventDefault();

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