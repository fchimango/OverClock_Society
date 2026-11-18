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
    if (typeof body.detail === "string") return body.detail;

    if (body.detail && typeof body.detail === "object") {
        return body.detail.message || fallback;
    }

    if (Array.isArray(body.detail)) {
        return body.detail
            .map((item) => typeof item === "string" ? item : item.msg || "Dados inválidos.")
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
    localStorage.setItem("token", user.access_token);
    localStorage.setItem("userId", String(user.id));
    localStorage.setItem("userName", user.name);
    localStorage.setItem("userEmail", user.email);

    if (user.username) {
        localStorage.setItem(
            `overclockSocietyUsername_${user.id}`,
            normalizeAuthUsername(user.username)
        );
    }
}

function initializePasswordToggles() {
    document.querySelectorAll("[data-password-toggle]").forEach((button) => {
        const inputId = button.getAttribute("data-password-toggle");
        const passwordInput = inputId ? document.getElementById(inputId) : null;

        if (!passwordInput) return;

        const showIcon = button.querySelector("[data-icon-show]");
        const hideIcon = button.querySelector("[data-icon-hide]");

        button.addEventListener("click", () => {
            const shouldShow = passwordInput.type === "password";
            passwordInput.type = shouldShow ? "text" : "password";
            button.setAttribute("aria-pressed", String(shouldShow));
            button.setAttribute(
                "aria-label",
                shouldShow ? "Ocultar senha" : "Mostrar senha"
            );
            button.title = shouldShow ? "Ocultar senha" : "Mostrar senha";

            if (showIcon) showIcon.hidden = shouldShow;
            if (hideIcon) hideIcon.hidden = !shouldShow;
        });
    });
}

initializePasswordToggles();

async function resendVerificationCode(email, feedback, button) {
    const normalizedEmail = String(email || "").trim();
    if (!normalizedEmail) {
        showFeedback(feedback, "Informe o e-mail utilizado no cadastro.", "error");
        return;
    }

    if (button) button.disabled = true;
    showFeedback(feedback, "Solicitando novo código...", "info");

    try {
        const response = await fetch(`${API_URL}/auth/resend-verification`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: normalizedEmail })
        });
        const body = await response.json().catch(() => ({}));

        if (!response.ok) {
            showFeedback(feedback, errorMessage(body, "Não foi possível solicitar outro código."), "error");
            return;
        }

        showFeedback(
            feedback,
            `${body.message || "Solicitação processada."} Aguarde pelo menos 60 segundos entre novos pedidos.`,
            "success"
        );
    } catch (error) {
        console.error("Erro ao reenviar código de confirmação:", error);
        showFeedback(feedback, "Não foi possível conectar ao servidor.", "error");
    } finally {
        if (button) button.disabled = false;
    }
}


/* =========================================
   LOGIN
========================================= */

const loginForm = document.getElementById("loginForm");

if (loginForm) {
    const feedback = document.getElementById("loginFeedback");
    const submit = document.getElementById("loginSubmit");
    const verificationPanel = document.getElementById("loginVerificationPanel");
    const resendEmailInput = document.getElementById("loginResendEmail");
    const resendButton = document.getElementById("loginResendButton");
    const resendFeedback = document.getElementById("loginResendFeedback");

    if (resendButton) {
        resendButton.addEventListener("click", () => {
            resendVerificationCode(resendEmailInput?.value, resendFeedback, resendButton);
        });
    }

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const emailInput = loginForm.elements.namedItem("email");
        const passwordInput = loginForm.elements.namedItem("password");
        const payload = {
            email: emailInput.value.trim(),
            password: passwordInput.value
        };

        if (submit) submit.disabled = true;
        showFeedback(feedback, "Entrando... (o servidor pode levar até 1 minuto para acordar)", "info");

        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const body = await response.json().catch(() => ({}));

            if (!response.ok) {
                showFeedback(feedback, errorMessage(body, "Não foi possível entrar."), "error");

                const verificationRequired = Boolean(
                    body.detail &&
                    typeof body.detail === "object" &&
                    body.detail.email_verification_required
                );
                if (verificationRequired && verificationPanel) {
                    verificationPanel.hidden = false;
                    if (resendEmailInput) resendEmailInput.value = payload.email;
                }
                return;
            }

            saveLoginSession(body);
            window.location.href = authNextPage || "dashboard.html";
        } catch (error) {
            console.error("Erro no login:", error);
            showFeedback(feedback, "Não foi possível conectar ao servidor.", "error");
        } finally {
            if (submit) submit.disabled = false;
        }
    });
}


/* =========================================
   CADASTRO E CONFIRMAÇÃO DE E-MAIL
========================================= */

const registerForm = document.getElementById("registerForm");

if (registerForm) {
    const feedback = document.getElementById("registerFeedback");
    const submit = document.getElementById("registerSubmit");
    const verificationPanel = document.getElementById("verificationPanel");
    const verificationEmail = document.getElementById("verificationEmail");
    const verificationDescription = document.getElementById("verificationDescription");
    const verificationForm = document.getElementById("verificationForm");
    const verificationCode = document.getElementById("verificationCode");
    const verificationFeedback = document.getElementById("verificationFeedback");
    const verifyButton = document.getElementById("verifyEmailSubmit");
    const resendButton = document.getElementById("resendVerificationButton");
    const resendFeedback = document.getElementById("resendVerificationFeedback");

    if (verificationCode) {
        verificationCode.addEventListener("input", () => {
            verificationCode.value = verificationCode.value.replace(/\D/g, "").slice(0, 6);
        });
    }

    function showVerificationStep(
        email,
        message,
        messageType = "success",
        description = null
    ) {
        if (verificationEmail) verificationEmail.value = email;
        if (verificationDescription) {
            verificationDescription.textContent = description ||
                `Enviamos um código de 6 dígitos para ${email}. Ele expira em 10 minutos.`;
        }
        registerForm.hidden = true;
        if (verificationPanel) verificationPanel.hidden = false;
        showFeedback(verificationFeedback, message, messageType);
        if (verificationCode) verificationCode.focus();
    }

    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const nameInput = registerForm.elements.namedItem("name");
        const usernameInput = registerForm.elements.namedItem("username");
        const emailInput = registerForm.elements.namedItem("email");
        const passwordInput = registerForm.elements.namedItem("password");
        const confirmInput = registerForm.elements.namedItem("confirm");

        if (!usernameInput) {
            showFeedback(feedback, "O formulário está sem o campo de nome de usuário. Atualize cadastro.html.", "error");
            return;
        }

        const name = nameInput.value.trim();
        const username = normalizeAuthUsername(usernameInput.value);
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (name.length < 2) {
            showFeedback(feedback, "Informe seu nome com pelo menos 2 caracteres.", "error");
            return;
        }
        if (!/^[a-z0-9._]{3,32}$/.test(username)) {
            showFeedback(feedback, "Use um nome de usuário de 3 a 32 caracteres, com letras, números, ponto ou sublinhado.", "error");
            return;
        }
        if (password.length < 8 || password.length > 50) {
            showFeedback(feedback, "A senha precisa ter de 8 a 50 caracteres.", "error");
            return;
        }
        if (password !== confirmInput.value) {
            showFeedback(feedback, "As senhas não são iguais.", "error");
            return;
        }

        if (submit) submit.disabled = true;
        showFeedback(feedback, "Criando conta e enviando código de confirmação...", "info");

        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, username, email, password })
            });
            const body = await response.json().catch(() => ({}));

            if (response.ok && body.verification_required) {
                showVerificationStep(
                    body.email || email,
                    body.message || "Conta criada. Informe o código enviado ao seu e-mail.",
                    "success"
                );
                return;
            }

            const verificationRequired = Boolean(
                body.email_verification_required ||
                (body.detail && typeof body.detail === "object" && body.detail.email_verification_required)
            );
            if (!response.ok && verificationRequired) {
                const deliveryFailed = response.status === 503;
                showVerificationStep(
                    email,
                    errorMessage(body, "É necessário confirmar seu e-mail."),
                    deliveryFailed ? "error" : "info",
                    deliveryFailed
                        ? "Sua conta foi criada, mas o e-mail não foi enviado. Configure o SMTP e solicite um novo código."
                        : `Já existe um cadastro pendente para ${email}. Use o código recebido ou solicite outro.`
                );
                return;
            }

            if (!response.ok) {
                showFeedback(feedback, errorMessage(body, "Não foi possível criar a conta."), "error");
                return;
            }

            showFeedback(feedback, "Cadastro concluído. Confira seu e-mail para confirmar a conta.", "success");
        } catch (error) {
            console.error("Erro no cadastro:", error);
            showFeedback(feedback, "Não foi possível conectar ao servidor.", "error");
        } finally {
            if (submit) submit.disabled = false;
        }
    });

    if (verificationForm) {
        verificationForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const email = verificationEmail?.value.trim();
            const code = verificationCode?.value.trim();

            if (!email || !/^\d{6}$/.test(code || "")) {
                showFeedback(verificationFeedback, "Informe o código de 6 dígitos enviado ao seu e-mail.", "error");
                return;
            }

            if (verifyButton) verifyButton.disabled = true;
            showFeedback(verificationFeedback, "Confirmando seu e-mail...", "info");

            try {
                const response = await fetch(`${API_URL}/auth/verify-email`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, code })
                });
                const body = await response.json().catch(() => ({}));

                if (!response.ok) {
                    showFeedback(verificationFeedback, errorMessage(body, "Não foi possível confirmar o e-mail."), "error");
                    return;
                }

                if (!body.access_token || !body.id) {
                    showFeedback(
                        verificationFeedback,
                        "E-mail confirmado, mas não foi possível iniciar sua sessão. Entre com sua conta.",
                        "error"
                    );
                    return;
                }

                saveLoginSession(body);
                if (verificationForm) verificationForm.hidden = true;
                if (resendButton) resendButton.hidden = true;
                showFeedback(
                    verificationFeedback,
                    "E-mail confirmado! Estamos entrando na sua conta...",
                    "success"
                );
                window.setTimeout(() => {
                    window.location.href = authNextPage || "dashboard.html";
                }, 700);
            } catch (error) {
                console.error("Erro ao confirmar e-mail:", error);
                showFeedback(verificationFeedback, "Não foi possível conectar ao servidor.", "error");
            } finally {
                if (verifyButton) verifyButton.disabled = false;
            }
        });
    }

    if (resendButton) {
        resendButton.addEventListener("click", () => {
            resendVerificationCode(verificationEmail?.value, resendFeedback, resendButton);
        });
    }
}
