<script setup>
import { ref, watch } from "vue";

const props = defineProps({
    name: { type: String, required: true },
    imageUrl: { type: String, default: "" },
    fallbackClass: { type: String, default: "new-game-image" },
    initials: { type: String, default: "🎮" },
    imageClass: { type: String, default: "" }
});

const imageFailed = ref(false);
watch(() => props.imageUrl, () => { imageFailed.value = false; });
</script>

<template>
    <img
        v-if="imageUrl && !imageFailed"
        :class="['game-cover-image', imageClass]"
        :src="imageUrl"
        :alt="`Capa de ${name}`"
        loading="lazy"
        decoding="async"
        referrerpolicy="no-referrer"
        @error="imageFailed = true"
    >
    <span v-else>{{ initials }}</span>
</template>
