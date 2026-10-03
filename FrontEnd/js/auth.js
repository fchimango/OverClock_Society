/* =========================================
   CONFIGURAÇÃO
========================================= */

const API_URL =
    ["127.0.0.1", "localhost"].includes(window.location.hostname)
        ? "http://127.0.0.1:8000"
        : "https://overclock-api.onrender.com";


/* =========================================
   FUNÇÕES AUXILIARES
========================================= */

function showFeedback(element, message, type) {
    element.textContent = message;
    element.className = `auth-feedback ${type}`;
}

// A API devolve "detail" como texto (erros 401/409) ou como lista de textos (erro 422)
function errorMessage(body, fallback) {
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail) && typeof body.detail[0] === "string") return body.detail[0];
    return fallback;
}


/* =========================================
   LOGIN
========================================= */

const loginForm = document.getElementById("loginForm");

if (loginForm) {
    const feedback = document.getElementById("loginFeedback");
    const submit = document.getElementById("loginSubmit");

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const payload = {
            email: loginForm.email.value.trim(),
            password: loginForm.password.value,
        };

        submit.disabled = true;
        showFeedback(feedback, "Entrando... (o servidor pode levar até 1 minuto para acordar)", "info");

        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const body = await response.json().catch(() => ({}));

            if (response.ok) {
                localStorage.setItem("token", body.access_token);
                localStorage.setItem("userName", body.name);
                window.location.href = "dashboard.html";
            } else {
                showFeedback(feedback, errorMessage(body, "Não foi possível entrar."), "error");
            }
        } catch {
            showFeedback(feedback, "Não foi possível conectar ao servidor.", "error");
        } finally {
            submit.disabled = false;
        }
    });
}


/* =========================================
   CADASTRO
========================================= */

const registerForm = document.getElementById("registerForm");

if (registerForm) {
    const feedback = document.getElementById("registerFeedback");
    const submit = document.getElementById("registerSubmit");

    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const password = registerForm.password.value;

        if (password.length < 8) {
            return showFeedback(feedback, "A senha precisa ter no mínimo 8 caracteres.", "error");
        }
        if (password !== registerForm.confirm.value) {
            return showFeedback(feedback, "As senhas não são iguais.", "error");
        }

        const payload = {
            name: registerForm.name.value.trim(),
            email: registerForm.email.value.trim(),
            password: password,
        };

        submit.disabled = true;
        showFeedback(feedback, "Criando conta... (o servidor pode levar até 1 minuto para acordar)", "info");

        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const body = await response.json().catch(() => ({}));

            if (response.ok) {
                showFeedback(feedback, "Conta criada! Redirecionando para o login...", "success");
                setTimeout(() => { window.location.href = "login.html"; }, 1500);
            } else {
                showFeedback(feedback, errorMessage(body, "Não foi possível criar a conta."), "error");
                submit.disabled = false;
            }
        } catch {
            showFeedback(feedback, "Não foi possível conectar ao servidor.", "error");
            submit.disabled = false;
        }
    });
}