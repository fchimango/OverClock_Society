<script setup>
import { computed, ref, watch } from "vue";

const props = defineProps({
    name: { type: String, default: "Usuário" },
    fallback: { type: String, default: "" },
    avatarUrl: { type: String, default: "" },
    themeHue: { type: [Number, String], default: null },
    avatarClass: { type: String, default: "post-avatar" },
});

const imageFailed = ref(false);
const apiBaseUrl = String(window.OVERCLOCK_API_BASE_URL || "").replace(/\/+$/, "");

watch(() => props.avatarUrl, () => {
    imageFailed.value = false;
});

const resolvedAvatarUrl = computed(() => {
    const source = String(props.avatarUrl || "").trim();
    if (!source) return "";
    if (/^(https?:|data:|blob:)/i.test(source)) return source;

    try {
        const base = apiBaseUrl || window.location.origin;
        return new URL(source, `${base}/`).toString();
    } catch {
        return "";
    }
});

const initial = computed(() => {
    const fallback = String(props.fallback || "").trim();
    if (fallback) return fallback.slice(0, 2).toUpperCase();
    return String(props.name || "?").trim().charAt(0).toUpperCase() || "?";
});

const avatarStyle = computed(() => {
    if (props.themeHue === null || props.themeHue === "" || props.themeHue === undefined) return undefined;
    const hueValue = Number(props.themeHue);
    if (!Number.isFinite(hueValue)) return undefined;
    const hue = ((Math.round(hueValue) % 360) + 360) % 360;
    return {
        background: `linear-gradient(135deg, hsl(${hue} 68% 36%), hsl(${hue} 62% 22%))`,
    };
});
</script>

<template>
    <div
        :class="[avatarClass, 'profile-activity-avatar']"
        :style="avatarStyle"
        :aria-label="`Foto de perfil de ${name || 'usuário'}`"
    >
        <img
            v-if="resolvedAvatarUrl && !imageFailed"
            :src="resolvedAvatarUrl"
            :alt="`Foto de perfil de ${name || 'usuário'}`"
            class="feed-avatar-image"
            loading="lazy"
            decoding="async"
            @error="imageFailed = true"
        >
        <span v-else>{{ initial }}</span>
    </div>
</template>
