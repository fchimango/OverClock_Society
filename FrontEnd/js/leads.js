/* Fallback da página inicial: contador e envio de leads sem Vue.
 * Quando o formulário Vue estiver ativo, somente o contador roda neste arquivo.
 */
(() => {
    "use strict";

    // Fallback do contador: só executa quando o componente Vue não foi montado.
    // A data é lida do HTML (data-target), evitando duplicar a configuração.
    if (!window.__OCS_VUE_COUNTDOWN_ACTIVE__) {
        const countdown = document.getElementById("countdown");
        const targetTimestamp = countdown
            ? new Date(countdown.dataset.target || "").getTime()
            : NaN;
        const values = countdown ? countdown.querySelectorAll(".countdown-item strong") : [];
        const pad = (value) => String(value).padStart(2, "0");

        function updateCountdown() {
            if (values.length !== 4) return;

            const validTarget = Number.isFinite(targetTimestamp);
            const diff = validTarget ? Math.max(0, targetTimestamp - Date.now()) : 0;
            const total = Math.floor(diff / 1000);
            const parts = [
                pad(Math.floor(total / 86400)),
                pad(Math.floor((total % 86400) / 3600)),
                pad(Math.floor((total % 3600) / 60)),
                pad(total % 60)
            ];

            values.forEach((element, index) => {
                element.textContent = parts[index];
            });
        }

        if (countdown && values.length === 4) {
            updateCountdown();
            window.setInterval(updateCountdown, 1000);
        }
    }

    // Evita que Vue e o fallback enviem o mesmo formulário.
    if (window.__OCS_VUE_LEAD_ACTIVE__) return;

    const form = document.getElementById("leadForm");
    const feedback = document.getElementById("leadFeedback");
    const submit = document.getElementById("leadSubmit");
    const apiBase = String(window.OVERCLOCK_API_BASE_URL || "").replace(/\/$/, "");

    function showFeedback(message, type) {
        if (!feedback) return;
        feedback.textContent = message;
        feedback.className = `lead-feedback ${type}`;
    }

    if (!form || !submit) return;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (submit.disabled) return;

        const data = new FormData(form);
        const payload = {
            name: String(data.get("name") || "").trim(),
            email: String(data.get("email") || "").trim(),
            contact: String(data.get("contact") || "").trim() || null,
            website: String(data.get("website") || "").trim() || null
        };

        if (payload.name.length < 2) {
            showFeedback("Informe seu nome com pelo menos 2 caracteres.", "error");
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
            showFeedback("Informe um e-mail válido.", "error");
            return;
        }
        if (!apiBase) {
            showFeedback("A URL da API não está configurada.", "error");
            return;
        }

        submit.disabled = true;
        showFeedback("Enviando...", "info");

        try {
            const response = await fetch(`${apiBase}/leads`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const body = await response.json().catch(() => ({}));

            if (response.ok) {
                form.reset();
                showFeedback(body.message || "Cadastro realizado!", "success");
            } else if (response.status === 409) {
                showFeedback(body.detail || "Este e-mail já está cadastrado.", "info");
            } else if (response.status === 422) {
                const detail = Array.isArray(body.detail) ? body.detail[0] : body.detail;
                showFeedback(detail || "Confira os dados informados.", "error");
            } else {
                showFeedback("Algo deu errado. Tente novamente.", "error");
            }
        } catch (error) {
            console.error("Falha ao enviar cadastro de interesse:", error);
            showFeedback("Não foi possível conectar ao servidor.", "error");
        } finally {
            submit.disabled = false;
        }
    });
})();
