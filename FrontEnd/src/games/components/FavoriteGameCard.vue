<script setup>
import { computed } from "vue";
import GameActionsMenu from "./GameActionsMenu.vue";
import GameCover from "./GameCover.vue";

const props = defineProps({ game: { type: Object, required: true } });
const emit = defineEmits(["edit", "remove"]);

const positionMap = {
    1: { card: "first-place", medal: "gold", ordinal: "1º", emoji: "🥇", label: "PRIMEIRO LUGAR" },
    2: { card: "second-place", medal: "silver", ordinal: "2º", emoji: "🥈", label: "SEGUNDO LUGAR" },
    3: { card: "third-place", medal: "bronze", ordinal: "3º", emoji: "🥉", label: "TERCEIRO LUGAR" }
};
const position = computed(() => Number(props.game.position));
const rank = computed(() => positionMap[position.value] || positionMap[3]);
</script>

<template>
    <article class="podium-card" :class="rank.card" :data-position="position">
        <div class="podium-position" :class="rank.medal">{{ rank.ordinal }}</div>
        <div class="podium-medal">{{ rank.emoji }}</div>
        <div class="podium-game-image" :class="[game.fallbackClass || 'new-game-image', { 'has-game-cover': Boolean(game.imageUrl) }]">
            <GameCover :name="game.name" :image-url="game.imageUrl" :fallback-class="game.fallbackClass" :initials="game.initials || '🎮'" />
        </div>
        <div class="podium-info">
            <span class="podium-place">{{ rank.label }}</span>
            <h3>{{ game.name }}</h3>
            <p>{{ game.genre }}</p>
            <div class="podium-rating">⭐ {{ Number(game.rating ?? 5).toFixed(1) }}</div>
        </div>
        <GameActionsMenu @edit="emit('edit', game)" @remove="emit('remove', game)" />
    </article>
</template>
