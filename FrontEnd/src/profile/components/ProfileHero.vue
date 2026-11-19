<script setup>
import { computed } from "vue";

const props = defineProps({
    profile: { type: Object, required: true },
    avatarUrl: { type: String, default: "" },
    coverUrl: { type: String, default: "" },
    loading: { type: Boolean, default: false },
});

const emit = defineEmits(["edit", "edit-avatar", "edit-cover"]);

const initial = computed(() => String(props.profile.name || "?").trim().charAt(0).toUpperCase() || "?");
const statusLabel = computed(() => ({
    online: "● ONLINE",
    away: "● AUSENTE",
    offline: "● OFFLINE",
}[props.profile.status] || "● OFFLINE"));
const statusColor = computed(() => ({
    online: "#4ade80",
    away: "#facc15",
    offline: "#94a3b8",
}[props.profile.status] || "#94a3b8"));
const identityCourse = computed(() => props.profile.course
    ? `${props.profile.course} • ${props.profile.semester || 1}º período`
    : "Curso não informado");
const coverStyle = computed(() => props.coverUrl ? {
    backgroundImage: `linear-gradient(rgba(12, 8, 10, .18), rgba(12, 8, 10, .28)), url("${props.coverUrl}")`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
} : {});
</script>

<template>
    <section class="profile-card">
        <div class="profile-cover" :style="coverStyle">
            <div class="cover-pattern"></div>
            <button
                type="button"
                class="cover-edit-button"
                title="Escolher imagem de capa"
                aria-label="Escolher imagem de capa"
                @click="emit('edit-cover')"
            >✏️</button>
        </div>

        <div class="profile-main">
            <div class="profile-avatar-wrapper">
                <div class="profile-avatar" :aria-label="`Foto de perfil de ${profile.name || 'usuário'}`">
                    <img v-if="avatarUrl" :src="avatarUrl" alt="" class="profile-avatar-image">
                    <span v-else>{{ initial }}</span>
                </div>
                <span v-if="profile.status !== 'offline'" class="profile-online" :style="{ background: statusColor, boxShadow: `0 0 12px ${statusColor}99` }"></span>
                <button
                    type="button"
                    class="avatar-edit-button"
                    title="Escolher foto de perfil"
                    aria-label="Escolher foto de perfil"
                    @click="emit('edit-avatar')"
                >✏</button>
            </div>

            <div class="profile-identity">
                <span class="profile-status" :style="{ color: statusColor }">{{ loading ? "● CARREGANDO" : statusLabel }}</span>
                <h1>{{ loading ? "Carregando perfil..." : (profile.name || "Usuário") }}</h1>
                <span class="profile-username">@{{ profile.username || "usuario" }}</span>
                <p>{{ identityCourse }}</p>
            </div>

            <div class="profile-actions">
                <button type="button" class="btn btn-primary" @click="emit('edit')">✏️ Editar Perfil</button>
            </div>
        </div>

        <div class="profile-bio">
            <p>{{ profile.bio || "Nenhuma biografia adicionada." }}</p>
        </div>
    </section>
</template>

<style>
.profile-avatar {
    position: relative;
    overflow: hidden;
}
.profile-avatar-image {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: inherit;
}
</style>
