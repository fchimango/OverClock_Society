<script setup>
import ActionLink from "./ActionLink.vue";
import StatItem from "./StatItem.vue";

const actions = [
    {
        href: "dashboard.html",
        label: "Começar agora",
        variant: "btn-primary",
        showArrow: true
    },
    {
        href: "catalogo-jogos.html",
        label: "Explorar jogos",
        variant: "btn-secondary",
        showArrow: false
    }
];

const stats = [
    { icon: "🎮", label: "Gamers" },
    { icon: "👥", label: "Comunidade" },
    { icon: "📰", label: "Publicações" }
];
</script>

<template>
    <section class="hero" id="inicio">
        <div class="hero-background"></div>

        <div class="hero-content">
            <div class="hero-tag">
                <span class="status-dot"></span>
                Comunidade Gamer da Faculdade
            </div>

            <h1>
                Encontre sua
                <span>próxima party.</span>
            </h1>

            <p>
                Conecte-se com outros gamers da faculdade,
                compartilhe seus jogos favoritos e encontre
                pessoas para jogar junto.
            </p>

            <div class="hero-buttons" id="heroActions">
                <ActionLink
                    v-for="action in actions"
                    :key="action.href"
                    :href="action.href"
                    :label="action.label"
                    :variant="action.variant"
                    :show-arrow="action.showArrow"
                />
            </div>

            <div class="hero-stats" id="heroStats">
                <StatItem
                    v-for="stat in stats"
                    :key="stat.label"
                    :icon="stat.icon"
                    :label="stat.label"
                />
            </div>
        </div>
    </section>
</template>
