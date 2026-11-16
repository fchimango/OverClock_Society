<script setup>
import GameActionsMenu from "./GameActionsMenu.vue";
import GameCover from "./GameCover.vue";

const props = defineProps({ game: { type: Object, required: true } });
const emit = defineEmits(["edit", "remove"]);
</script>

<template>
    <article class="completed-game">
        <div class="completed-image" :class="[game.fallbackClass || 'new-game-image', { 'has-game-cover': Boolean(game.imageUrl) }]">
            <GameCover :name="game.name" :image-url="game.imageUrl" :fallback-class="game.fallbackClass" :initials="game.initials || '🎮'" />
        </div>
        <div class="completed-info">
            <h3>{{ game.name }}</h3>
            <span>{{ game.genre }}</span>
        </div>
        <div class="completed-date">
            <span>Zerado em</span>
            <strong>{{ Number(game.year) || new Date().getFullYear() }}</strong>
        </div>
        <GameActionsMenu @edit="emit('edit', game)" @remove="emit('remove', game)" />
    </article>
</template>
