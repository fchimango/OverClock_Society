<script setup>
import { computed } from "vue";

const props = defineProps({
    profile: { type: Object, required: true },
});

const platformOptions = {
    "PC": { icon: "🖥️", type: "pc" },
    "PlayStation 5": { icon: "🎮", type: "playstation" },
    "Xbox Series": { icon: "🎮", type: "xbox" },
    "Nintendo Switch": { icon: "🕹️", type: "switch" },
};

const platforms = computed(() => (Array.isArray(props.profile.platforms) ? props.profile.platforms : [])
    .map((name) => ({ name, ...(platformOptions[name] || { icon: "🎮", type: "" }) })));
const genres = computed(() => Array.isArray(props.profile.genres) ? props.profile.genres : []);

function formatJoinDate(value) {
    if (!value) return "Não informado";
    const [year, month] = String(value).split("-");
    const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const monthIndex = Number(month) - 1;
    return monthIndex >= 0 && monthIndex < 12 ? `${months[monthIndex]} de ${year}` : "Não informado";
}
</script>

<template>
    <section class="profile-stats">
        <div class="profile-stat">
            <span class="profile-stat-icon">🎮</span>
            <div><strong>{{ Number(profile.games_count || 0) }}</strong><span>Jogos</span></div>
        </div>
        <div class="profile-stat">
            <span class="profile-stat-icon">👥</span>
            <div><strong>{{ Number(profile.friends_count || 0) }}</strong><span>Amigos</span></div>
        </div>
    </section>

    <section class="profile-content-grid">
        <article class="profile-info-card">
            <div class="card-heading">
                <div><span class="section-label">PERFIL</span><h2>Sobre mim</h2></div>
            </div>
            <div class="about-list">
                <div class="about-item">
                    <span class="about-icon">🎓</span>
                    <div><span>Curso</span><strong>{{ profile.course || "Curso não informado" }}</strong></div>
                </div>
                <div class="about-item">
                    <span class="about-icon">📚</span>
                    <div><span>Período</span><strong>{{ Number(profile.semester || 1) }}º período</strong></div>
                </div>
                <div class="about-item">
                    <span class="about-icon">📅</span>
                    <div><span>Entrou na comunidade</span><strong>{{ formatJoinDate(profile.join_date) }}</strong></div>
                </div>
            </div>
        </article>

        <article class="profile-info-card">
            <div class="card-heading">
                <div><span class="section-label">GAMING</span><h2>Plataformas</h2></div>
            </div>
            <div class="platform-list">
                <div v-if="!platforms.length" class="empty-profile-message">Nenhuma plataforma adicionada.</div>
                <div v-for="platform in platforms" :key="platform.name" class="platform-item">
                    <div class="platform-icon" :class="platform.type">{{ platform.icon }}</div>
                    <div><strong>{{ platform.name }}</strong></div>
                </div>
            </div>
        </article>

        <article class="profile-info-card genres-card">
            <div class="card-heading">
                <div><span class="section-label">PREFERÊNCIAS</span><h2>Gêneros favoritos</h2></div>
            </div>
            <div class="genre-tags">
                <span v-if="!genres.length" class="empty-profile-message">Nenhum gênero selecionado</span>
                <span v-for="genre in genres" :key="genre">{{ genre }}</span>
            </div>
        </article>
    </section>
</template>
