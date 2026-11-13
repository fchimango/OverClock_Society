<script setup>
import { ref } from "vue";

const menuOpen = ref(false);
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
