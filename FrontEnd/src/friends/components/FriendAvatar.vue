<script setup>
import { computed, ref, watch } from "vue";
import { getAvatarColor, getFriendProfileUrl, getInitial } from "../utils.js";

const props = defineProps({
    user: { type: Object, required: true },
    variant: { type: String, default: "friend" },
    linked: { type: Boolean, default: true }
});

const imageFailed = ref(false);
const initial = computed(() => getInitial(props.user?.name));
const colorClass = computed(() => getAvatarColor(props.user));
const profileUrl = computed(() => props.linked ? getFriendProfileUrl(props.user) : null);
const avatarUrl = computed(() => {
    const path = String(props.user?.avatar_url || "").trim();
    const base = String(window.OVERCLOCK_API_BASE_URL || "").trim();
    if (!path || !base) return "";
    try {
        return new URL(path, `${base.replace(/\/$/, "")}/`).toString();
    } catch {
        return "";
    }
});

watch(() => props.user?.avatar_url, () => {
    imageFailed.value = false;
});
</script>

<template>
    <component
        :is="profileUrl ? 'a' : 'div'"
        class="friend-avatar"
        :class="[colorClass, profileUrl ? 'user-profile-link' : '', variant === 'search' ? 'player-search-avatar' : '']"
        :href="profileUrl || undefined"
        :aria-label="profileUrl ? `Abrir perfil de ${user.name || 'Jogador'}` : undefined"
        :aria-hidden="profileUrl ? undefined : 'true'"
    >
        <img
            v-if="avatarUrl && !imageFailed"
            class="friend-avatar-image"
            :src="avatarUrl"
            :alt="''"
            loading="lazy"
            decoding="async"
            @error="imageFailed = true"
        >
        <span v-else>{{ initial }}</span>
    </component>
</template>
