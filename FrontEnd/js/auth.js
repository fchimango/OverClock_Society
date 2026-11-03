/* =========================================
   CONFIGURAÇÃO
========================================= */

const API_URL = window.OVERCLOCK_API_BASE_URL;

function getSafeNextPage() {
    const rawNext = new URLSearchParams(window.location.search).get("next");
    if (!rawNext || rawNext.includes("\\")) return null;

    try {
        const currentDirectory = window.location.pathname.replace(/[^/]*$/, "");
        const destination = new URL(rawNext, window.location.href);
        if (destination.origin !== window.location.origin) return null;
        if (!destination.pathname.startsWith(currentDirectory)) return null;
        if (!destination.pathname.toLowerCase().endsWith(".html")) return null;
        const relativePath = destination.pathname.slice(currentDirectory.length);
        if (!relativePath || relativePath.includes("/")) return null;
        return `${relativePath}${destination.search}${destination.hash}`;
    } catch {
        return null;
    }
}

const authNextPage = getSafeNextPage();
const signupLink = document.querySelector('.auth-switch a[href="cadastro.html"]');
const loginLink = document.querySelector('.auth-switch a[href="login.html"]');
if (authNextPage && signupLink) {
    signupLink.href = `cadastro.html?next=${encodeURIComponent(authNextPage)}`;
}
if (authNextPage && loginLink) {
    loginLink.href = `login.html?next=${encodeURIComponent(authNextPage)}`;
}


/* =========================================
   FUNÇÕES AUXILIARES
========================================= */

function showFeedback(element, message, type) {
    if (!element) return;

    element.textContent = message;
    element.className = `auth-feedback ${type}`;
}


function errorMessage(body, fallback) {
    if (typeof body.detail === "string") {
        return body.detail;
    }

    if (Array.isArray(body.detail)) {
        return body.detail
            .map((item) =>
                typeof item === "string"
                    ? item
                    : item.msg || "Dados inválidos."
            )
            .join(" ");
    }

    return fallback;
}


function normalizeAuthUsername(value) {
    return String(value || "")
        .trim()
        .replace(/^@+/, "")
        .toLowerCase();
}


function saveLoginSession(user) {
    localStorage.setItem(
        "token",
        user.access_token
    );

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
            `overclockSocietyUsername_${user.id}`,
            normalizeAuthUsername(user.username)
        );
    }
}


/* =========================================
   LOGIN
========================================= */

const loginForm = document.getElementById("loginForm");

if (loginForm) {
    const feedback =
        document.getElementById("loginFeedback");

    const submit =
        document.getElementById("loginSubmit");

    loginForm.addEventListener(
        "submit",
        async (event) => {
            event.preventDefault();

            const emailInput =
                loginForm.elements.namedItem("email");

            const passwordInput =
                loginForm.elements.namedItem("password");

            const payload = {
                email: emailInput.value.trim(),
                password: passwordInput.value
            };

            if (submit) {
                submit.disabled = true;
            }

            showFeedback(
                feedback,
                "Entrando... (o servidor pode levar até 1 minuto para acordar)",
                "info"
            );

            try {
                const response = await fetch(
                    `${API_URL}/auth/login`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type": "application/json"
                        },

                        body: JSON.stringify(payload)
                    }
                );

                const body = await response
                    .json()
                    .catch(() => ({}));

                if (!response.ok) {
                    showFeedback(
                        feedback,
                        errorMessage(
                            body,
                            "Não foi possível entrar."
                        ),
                        "error"
                    );

                    return;
                }

                saveLoginSession(body);

                window.location.href = authNextPage || "dashboard.html";

            } catch (error) {
                console.error(
                    "Erro no login:",
                    error
                );

                showFeedback(
                    feedback,
                    "Não foi possível conectar ao servidor.",
                    "error"
                );

            } finally {
                if (submit) {
                    submit.disabled = false;
                }
            }
        }
    );
}


/* =========================================
   CADASTRO
========================================= */

const registerForm =
    document.getElementById("registerForm");

if (registerForm) {
    const feedback =
        document.getElementById("registerFeedback");

    const submit =
        document.getElementById("registerSubmit");

    registerForm.addEventListener(
        "submit",
        async (event) => {
            event.preventDefault();

            const nameInput =
                registerForm.elements.namedItem("name");

            const usernameInput =
                registerForm.elements.namedItem("username");

            const emailInput =
                registerForm.elements.namedItem("email");

            const passwordInput =
                registerForm.elements.namedItem("password");

            const confirmInput =
                registerForm.elements.namedItem("confirm");


            if (!usernameInput) {
                showFeedback(
                    feedback,
                    "O formulário está sem o campo de nome de usuário. Atualize cadastro.html.",
                    "error"
                );

                return;
            }


            const name =
                nameInput.value.trim();

            const username =
                normalizeAuthUsername(
                    usernameInput.value
                );

            const email =
                emailInput.value.trim();

            const password =
                passwordInput.value;


            if (name.length < 2) {
                showFeedback(
                    feedback,
                    "Informe seu nome com pelo menos 2 caracteres.",
                    "error"
                );

                return;
            }


            if (!/^[a-z0-9._]{3,32}$/.test(username)) {
                showFeedback(
                    feedback,
                    "Use um nome de usuário de 3 a 32 caracteres, com letras, números, ponto ou sublinhado.",
                    "error"
                );

                return;
            }


            if (
                password.length < 8 ||
                password.length > 50
            ) {
                showFeedback(
                    feedback,
                    "A senha precisa ter de 8 a 50 caracteres.",
                    "error"
                );

                return;
            }


            if (password !== confirmInput.value) {
                showFeedback(
                    feedback,
                    "As senhas não são iguais.",
                    "error"
                );

                return;
            }


            const payload = {
                name,
                username,
                email,
                password
            };


            if (submit) {
                submit.disabled = true;
            }

            showFeedback(
                feedback,
                "Criando conta... (o servidor pode levar até 1 minuto para acordar)",
                "info"
            );


            try {
                const response = await fetch(
                    `${API_URL}/auth/register`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type": "application/json"
                        },

                        body: JSON.stringify(payload)
                    }
                );

                const body = await response
                    .json()
                    .catch(() => ({}));


                if (!response.ok) {
                    showFeedback(
                        feedback,
                        errorMessage(
                            body,
                            "Não foi possível criar a conta."
                        ),
                        "error"
                    );

                    return;
                }


                showFeedback(
                    feedback,
                    "Conta criada! Faça login para entrar na comunidade.",
                    "success"
                );

                setTimeout(() => {
                    const nextQuery = authNextPage
                        ? `?next=${encodeURIComponent(authNextPage)}`
                        : "";
                    window.location.href = `login.html${nextQuery}`;
                }, 1500);

            } catch (error) {
                console.error(
                    "Erro no cadastro:",
                    error
                );

                showFeedback(
                    feedback,
                    "Não foi possível conectar ao servidor.",
                    "error"
                );

            } finally {
                if (submit) {
                    submit.disabled = false;
                }
            }
        }
    );
}