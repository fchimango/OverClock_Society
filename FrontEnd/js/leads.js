/* =========================================
   COUNTDOWN
   Lançamento: 03/11/2026 às 00:00 (Brasília)
========================================= */

const LAUNCH_DATE = new Date("2026-11-03T00:00:00-03:00");

const cdDays = document.getElementById("cdDays");
const cdHours = document.getElementById("cdHours");
const cdMinutes = document.getElementById("cdMinutes");
const cdSeconds = document.getElementById("cdSeconds");

function pad(n) {
    return String(n).padStart(2, "0");
}

function updateCountdown() {
    const diff = Math.max(0, LAUNCH_DATE - new Date());
    const total = Math.floor(diff / 1000);

    cdDays.textContent = pad(Math.floor(total / 86400));
    cdHours.textContent = pad(Math.floor((total % 86400) / 3600));
    cdMinutes.textContent = pad(Math.floor((total % 3600) / 60));
    cdSeconds.textContent = pad(total % 60);
}

if (cdDays) {
    updateCountdown();
    setInterval(updateCountdown, 1000);
}
/* =========================================
   FORMULÁRIO DE LEADS
========================================= */

// Local: usa o backend da sua máquina. Em produção, troque pela URL do Render.
const API_URL =
    ["127.0.0.1", "localhost"].includes(window.location.hostname)
        ? "http://127.0.0.1:8000"
        : "https://SEU-BACKEND.onrender.com";

const leadForm = document.getElementById("leadForm");
const leadFeedback = document.getElementById("leadFeedback");
const leadSubmit = document.getElementById("leadSubmit");

function showFeedback(message, type) {
    leadFeedback.textContent = message;
    leadFeedback.className = `lead-feedback ${type}`;
}

if (leadForm) {
    leadForm.addEventListener("submit", async (event) => {
        event.preventDefault(); // impede a página de recarregar

        const data = new FormData(leadForm);
        const payload = {
            name: (data.get("name") || "").trim(),
            email: (data.get("email") || "").trim(),
            contact: (data.get("contact") || "").trim() || null,
            website: data.get("website") || null,
        };

        leadSubmit.disabled = true;
        showFeedback("Enviando...", "info");

        try {
            const response = await fetch(`${API_URL}/leads`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const body = await response.json().catch(() => ({}));

            if (response.ok) {
                leadForm.reset();
                showFeedback(body.message, "success");
            } else if (response.status === 409) {
                showFeedback(body.detail, "info");
            } else if (response.status === 422) {
                showFeedback(body.detail[0], "error");
            } else {
                showFeedback("Algo deu errado. Tente novamente.", "error");
            }
        } catch {
            showFeedback("Não foi possível conectar ao servidor.", "error");
        } finally {
            leadSubmit.disabled = false;
        }
    });
}