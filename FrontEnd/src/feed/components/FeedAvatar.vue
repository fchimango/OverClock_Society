<script setup>
import { computed, ref, watch } from "vue";

const props = defineProps({
    name: { type: String, default: "Usuário" },
    source: { type: String, default: "" },
    avatarClass: { type: String, default: "" },
    href: { type: String, default: "" },
    label: { type: String, default: "" },
    hue: { type: [Number, String], default: null },
});

const imageFailed = ref(false);
watch(() => props.source, () => { imageFailed.value = false; });
const initial = computed(() => String(props.name || "?").trim().charAt(0).toUpperCase() || "?");
const elementType = computed(() => props.href ? "a" : "div");
const hasHue = computed(() => props.hue !== null && props.hue !== undefined && props.hue !== "" && Number.isFinite(Number(props.hue)));
const hueStyle = computed(() => hasHue.value ? { "--avatar-hue": String(((Number(props.hue) % 360) + 360) % 360) } : undefined);
</script>

<template>
    <component
        :is="elementType"
        :href="href || undefined"
        :class="[avatarClass, { 'user-profile-link': Boolean(href) }]"
        :style="hueStyle"
        :data-avatar-hue="hasHue ? '' : undefined"
        :aria-label="label || (href ? `Abrir perfil de ${name}` : undefined)"
        :title="href ? `Abrir perfil de ${name}` : undefined"
    >
        <img
            v-if="source && !imageFailed"
            class="feed-avatar-image"
            :src="source"
            alt=""
            loading="lazy"
            decoding="async"
            @error="imageFailed = true"
        >
        <span v-else>{{ initial }}</span>
    </component>
</template>
