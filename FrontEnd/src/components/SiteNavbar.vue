<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";

const menuOpen = ref(false);
const colorblind = ref(Boolean(window.OverclockAccessibility?.isEnabled()));
const colorblindEvent = window.OverclockAccessibility?.EVENT_NAME || "overclock:colorblind-change";

function syncColorblind(event) {
    colorblind.value = event?.detail
        ? Boolean(event.detail.enabled)
        : Boolean(window.OverclockAccessibility?.isEnabled());
}

function toggleColorblind() {
    colorblind.value = Boolean(window.OverclockAccessibility?.toggle());
}

onMounted(() => {
    syncColorblind();
    window.addEventListener(colorblindEvent, syncColorblind);
});

onBeforeUnmount(() => {
    window.removeEventListener(colorblindEvent, syncColorblind);
});
const navItems = [
    { label: "Início", href: "#inicio" },
    { label: "Comunidade", href: "#comunidade" }
];

function closeMenu() {
    menuOpen.value = false;
}

function navigateTo(page) {
    closeMenu();
    window.location.href = page;
}
</script>

<template>
    <header class="navbar" id="navbarApp">
        <a href="#" class="logo" aria-label="Overclock Society - Página inicial">
            <span class="logo-icon">🎮</span>
            <span>Overclock<span class="logo-highlight">Society</span></span>
        </a>

        <nav
            id="navLinks"
            class="nav-links"
            :class="{ active: menuOpen }"
            aria-label="Navegação principal"
        >
            <a
                v-for="item in navItems"
                :key="item.href"
                :href="item.href"
                @click="closeMenu"
            >
                {{ item.label }}
            </a>
        </nav>

        <button
            class="a11y-toggle"
            :class="{ 'is-active': colorblind }"
            id="colorblindToggle"
            type="button"
            data-colorblind-toggle
            data-colorblind-manual
            :aria-pressed="String(colorblind)"
            :aria-label="colorblind ? 'Desativar modo daltônico' : 'Ativar modo daltônico'"
            :title="colorblind ? 'Modo daltônico ativado. Clique para voltar às cores originais.' : 'Ativar modo daltônico: troca as cores do sistema por uma paleta segura para daltonismo.'"
            @click="toggleColorblind"
        >
            <span class="a11y-toggle-icon" aria-hidden="true">👁️</span>
            <span class="a11y-toggle-label">Modo daltônico</span>
            <span class="a11y-toggle-state" aria-hidden="true">{{ colorblind ? "✓ Ativo" : "Off" }}</span>
        </button>

        <div class="nav-buttons">
            <button
                class="btn btn-login"
                id="loginButton"
                type="button"
                @click="navigateTo('login.html')"
            >
                Entrar
            </button>
            <button
                class="btn btn-register"
                id="registerButton"
                type="button"
                @click="navigateTo('cadastro.html')"
            >
                Criar conta
            </button>
        </div>

        <button
            class="menu-toggle"
            id="menuToggle"
            type="button"
            :aria-label="menuOpen ? 'Fechar menu' : 'Abrir menu'"
            aria-controls="navLinks"
            :aria-expanded="String(menuOpen)"
            @click="menuOpen = !menuOpen"
        >
            ☰
        </button>
    </header>
</template>
