(() => {
    "use strict";

    const API_BASE_URL = String(window.OVERCLOCK_API_BASE_URL || "").replace(/\/$/, "");
    const accountName = document.getElementById("settingsAccountName");
    const accountEmail = document.getElementById("settingsAccountEmail");
    const form = document.getElementById("changePasswordForm");
    const submitButton = document.getElementById("changePasswordSubmit");
    const feedback = document.getElementById("passwordFeedback");

    function updateAccountDetails(user = {}) {
        if (user.name && accountName) accountName.textContent = user.name;
        if (user.email && accountEmail) accountEmail.textContent = user.email;
    }

    function showFeedback(message, type = "info") {
        if (!feedback) return;
        feedback.textContent = message;
        feedback.className = `settings-feedback is-visible is-${type}`;
    }

    function getErrorMessage(body, fallback) {
        if (typeof body?.detail === "string") return body.detail;
        if (Array.isArray(body?.detail)) {
            return body.detail
                .map((item) => typeof item === "string" ? item : item?.msg || "Dados inválidos.")
                .join(" ");
        }
        return fallback;
    }

    function setupPasswordVisibility() {
        document.querySelectorAll("[data-password-target]").forEach((button) => {
            button.addEventListener("click", () => {
                const input = document.getElementById(button.dataset.passwordTarget);
                if (!input) return;

                const shouldShow = input.type === "password";
                input.type = shouldShow ? "text" : "password";
                button.textContent = shouldShow ? "Ocultar" : "Mostrar";
                button.setAttribute("aria-pressed", String(shouldShow));
                button.setAttribute("aria-label", shouldShow ? "Ocultar senha digitada" : "Mostrar senha digitada");
            });
        });
    }

    async function changePassword(event) {
        event.preventDefault();
        if (!form || !submitButton) return;

        const token = localStorage.getItem("token");
        if (!token) {
            showFeedback("Sua sessão não foi encontrada. Entre novamente para alterar a senha.", "error");
            return;
        }

        if (!API_BASE_URL) {
            showFeedback("A URL da API não está configurada.", "error");
            return;
        }

        const currentPassword = form.elements.namedItem("current_password").value;
        const newPassword = form.elements.namedItem("new_password").value;
        const confirmation = form.elements.namedItem("confirm_new_password").value;

        if (!currentPassword) {
            showFeedback("Informe sua senha atual para continuar.", "error");
            return;
        }

        if (newPassword.length < 8 || newPassword.length > 50) {
            showFeedback("A nova senha precisa ter de 8 a 50 caracteres.", "error");
            return;
        }

        if (newPassword !== confirmation) {
            showFeedback("A confirmação não corresponde à nova senha.", "error");
            return;
        }

        if (currentPassword === newPassword) {
            showFeedback("Escolha uma senha diferente da senha atual.", "error");
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = "Atualizando...";
        showFeedback("Validando sua senha atual...", "info");

        try {
            const response = await fetch(`${API_BASE_URL}/auth/password`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword,
                }),
            });

            const body = await response.json().catch(() => ({}));
            if (!response.ok) {
                showFeedback(getErrorMessage(body, "Não foi possível atualizar sua senha."), "error");
                return;
            }

            form.reset();
            document.querySelectorAll("[data-password-target]").forEach((button) => {
                const input = document.getElementById(button.dataset.passwordTarget);
                if (input) input.type = "password";
                button.textContent = "Mostrar";
                button.setAttribute("aria-pressed", "false");
                button.setAttribute("aria-label", "Mostrar senha digitada");
            });
            showFeedback(body.message || "Senha atualizada com sucesso.", "success");
        } catch (error) {
            console.error("Erro ao atualizar senha:", error);
            showFeedback("Não foi possível conectar ao servidor. Tente novamente.", "error");
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Atualizar senha";
        }
    }

    // Usa os dados em cache para evitar que a página fique vazia enquanto valida a sessão.
    updateAccountDetails({
        name: localStorage.getItem("userName"),
        email: localStorage.getItem("userEmail"),
    });

    // session.js emite este evento depois de consultar /auth/me no servidor.
    window.addEventListener("overclock:session-ready", (event) => {
        updateAccountDetails(event.detail || {});
    });

    setupPasswordVisibility();
    form?.addEventListener("submit", changePassword);
})();
