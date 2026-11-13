<script setup>
import FeatureCard from "./FeatureCard.vue";

const features = [
    {
        icon: "🎮",
        title: "Seus jogos",
        description: "Monte sua lista de jogos favoritos, mostre o que está jogando e personalize seu perfil gamer.",
        number: "01"
    },
    {
        icon: "👥",
        title: "Novos amigos",
        description: "Descubra estudantes que gostam dos mesmos jogos e encontre sua próxima party.",
        number: "02"
    },
    {
        icon: "📰",
        title: "Feed gamer",
        description: "Compartilhe suas experiências, responda publicações e acompanhe as novidades da comunidade.",
        number: "03"
    }
];
</script>

<template>
    <section class="section" id="comunidade">
        <div class="section-heading">
            <span class="section-label">COMUNIDADE</span>

            <h2>
                Mais do que jogar.
                <span>É pertencer.</span>
            </h2>

            <p>
                Overclock Society foi pensado para aproximar os
                gamers da faculdade e facilitar novas conexões.
            </p>
        </div>

        <div class="feature-grid" id="featureGrid">
            <FeatureCard
                v-for="feature in features"
                :key="feature.number"
                :icon="feature.icon"
                :title="feature.title"
                :description="feature.description"
                :number="feature.number"
            />
        </div>
    </section>
</template>
