<script setup>
import { reactive, ref } from "vue";

const form = reactive({
    name: "",
    email: "",
    contact: "",
    website: ""
});

const loading = ref(false);
const feedbackMessage = ref("");
const feedbackType = ref("");

function showFeedback(message, type) {
    feedbackMessage.value = message;
    feedbackType.value = type;
}

async function submitLead() {
    if (loading.value) return;

    const payload = {
        name: String(form.name || "").trim(),
        email: String(form.email || "").trim(),
        contact: String(form.contact || "").trim() || null,
        website: String(form.website || "").trim() || null
    };

    if (payload.name.length < 2) {
        showFeedback("Informe seu nome com pelo menos 2 caracteres.", "error");
        return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
        showFeedback("Informe um e-mail válido.", "error");
        return;
    }

    const apiBase = String(window.OVERCLOCK_API_BASE_URL || "").replace(/\/$/, "");
    if (!apiBase) {
        showFeedback("A URL da API não está configurada.", "error");
        return;
    }

    loading.value = true;
    showFeedback("Enviando...", "info");

    try {
        const response = await fetch(`${apiBase}/leads`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const body = await response.json().catch(() => ({}));

        if (response.ok) {
            Object.assign(form, {
                name: "",
                email: "",
                contact: "",
                website: ""
            });
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
        loading.value = false;
    }
}
</script>

<template>
    <form class="lead-form" id="leadForm" novalidate @submit.prevent="submitLead">
        <input
            type="text"
            id="leadName"
            name="name"
            placeholder="Seu nome"
            autocomplete="name"
            required
            minlength="2"
            maxlength="120"
            v-model.trim="form.name"
        >

        <input
            type="email"
            id="leadEmail"
            name="email"
            placeholder="Seu melhor e-mail"
            autocomplete="email"
            required
            v-model.trim="form.email"
        >

        <input
            type="text"
            id="leadContact"
            name="contact"
            placeholder="Discord ou Steam (opcional)"
            maxlength="60"
            v-model.trim="form.contact"
        >

        <input
            type="text"
            name="website"
            class="hp-field"
            tabindex="-1"
            autocomplete="off"
            aria-hidden="true"
            v-model="form.website"
        >

        <button
            type="submit"
            class="btn btn-primary"
            id="leadSubmit"
            :disabled="loading"
        >
            {{ loading ? "Enviando..." : "Entrar na lista" }}
            <span class="button-arrow" aria-hidden="true">→</span>
        </button>

        <p
            class="lead-feedback"
            id="leadFeedback"
            role="status"
            aria-live="polite"
            :class="feedbackType"
        >
            {{ feedbackMessage }}
        </p>
    </form>
</template>
