<script setup>
defineProps({
    games: { type: Array, default: () => [] },
});

const emit = defineEmits(["filter"]);
</script>

<template>
    <div class="trending-games">
        <p v-if="games.length === 0" class="empty-feed">
            As hashtags em destaque aparecerão aqui.
        </p>

        <button
            v-for="game in games"
            :key="game.hashtag"
            type="button"
            class="trending-game"
            :aria-label="`Filtrar por #${game.hashtag}`"
            @click="emit('filter', game.hashtag)"
        >
            <span class="trending-game-info">
                <strong>#{{ game.hashtag }}</strong>
                <span>{{ game.name }}</span>
            </span>
            <span>{{ game.postsCount }} {{ game.postsCount === 1 ? "post" : "posts" }}</span>
        </button>
    </div>
</template>
