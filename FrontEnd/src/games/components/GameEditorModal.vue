<script setup>
const props = defineProps({
    modelValue: { type: Boolean, default: false },
    form: { type: Object, required: true },
    searchQuery: { type: String, default: "" },
    searchResults: { type: Array, default: () => [] },
    searchStatus: { type: String, default: "prompt" },
    searchError: { type: String, default: "" },
    selectedGame: { type: Object, default: null },
    favoritePositions: { type: Array, default: () => [1, 2, 3] },
    favoriteLimitReached: { type: Boolean, default: false },
    completedYearOptions: { type: Array, default: () => [] },
    releaseYearLoading: { type: Boolean, default: false },
    releaseYearError: { type: String, default: "" },
    currentYear: { type: Number, default: () => new Date().getFullYear() },
    isEditing: { type: Boolean, default: false },
    isSaving: { type: Boolean, default: false }
});

const emit = defineEmits([
    "update:modelValue", "update:searchQuery", "field-change", "select-game", "clear-selection", "retry-release-year", "submit"
]);

function setField(field, value) {
    emit("field-change", { field, value });
}

function positionLabel(position) {
    return ({ 1: "🥇 1º lugar", 2: "🥈 2º lugar", 3: "🥉 3º lugar" })[position] || `${position}º lugar`;
}
</script>

<template>
    <div
        class="game-modal-overlay"
        :class="{ active: modelValue }"
        :aria-hidden="String(!modelValue)"
        @click.self="emit('update:modelValue', false)"
    >
        <div class="game-modal add-game-modal" role="dialog" aria-modal="true" aria-labelledby="gameModalTitle">
            <button class="modal-close" type="button" aria-label="Fechar" @click="emit('update:modelValue', false)">×</button>

            <div class="add-game-heading">
                <div class="add-game-icon">🎮</div>
                <div>
                    <span class="section-label">MINHA COLEÇÃO</span>
                    <h2 id="gameModalTitle">{{ isEditing ? "Editar jogo" : "Adicionar jogo" }}</h2>
                </div>
            </div>

            <p class="rawg-modal-attribution">Os nomes e gêneros do catálogo são fornecidos pela <a href="https://rawg.io/" target="_blank" rel="noopener noreferrer">RAWG</a>.</p>

            <form @submit.prevent="emit('submit')">
                <div class="form-group game-search-form-group">
                    <label for="gameSearchInput">Buscar jogo</label>
                    <div class="game-search-wrap">
                        <input
                            id="gameSearchInput"
                            type="search"
                            :value="searchQuery"
                            placeholder="Digite o nome do jogo..."
                            autocomplete="off"
                            maxlength="80"
                            aria-autocomplete="list"
                            aria-controls="gameSearchResults"
                            aria-describedby="gameSearchHint"
                            @input="emit('update:searchQuery', $event.target.value)"
                        >
                        <div id="gameSearchResults" class="game-search-results" role="listbox" aria-label="Resultados da busca de jogos" :hidden="searchStatus === 'prompt'">
                            <div v-if="searchStatus === 'waiting'" class="game-search-message">Preparando busca...</div>
                            <div v-else-if="searchStatus === 'loading'" class="game-search-message" aria-live="polite">Buscando jogos na RAWG...</div>
                            <div v-else-if="searchStatus === 'empty'" class="game-search-message">Nenhum jogo encontrado.</div>
                            <div v-else-if="searchStatus === 'error'" class="game-search-message error">{{ searchError || "Não foi possível pesquisar jogos." }}</div>
                            <button
                                v-for="game in searchResults"
                                :key="game.id || game.name"
                                type="button"
                                class="game-search-result"
                                role="option"
                                :aria-selected="selectedGame?.id === game.id"
                                @click="emit('select-game', game)"
                            >
                                <img
                                    v-if="game.imageUrl"
                                    class="game-search-result-cover"
                                    :src="game.imageUrl"
                                    alt=""
                                    loading="lazy"
                                    referrerpolicy="no-referrer"
                                >
                                <span v-else class="game-search-result-cover game-search-result-fallback">🎮</span>
                                <span class="game-search-result-copy">
                                    <strong>{{ game.name }}</strong>
                                    <small>{{ game.genre || "Gênero não informado" }}</small>
                                </span>
                            </button>
                        </div>
                    </div>
                    <small id="gameSearchHint" class="rating-help">Digite pelo menos 2 caracteres e selecione um resultado da RAWG.</small>
                    <div v-if="selectedGame" class="selected-game-preview" :class="{ 'has-image': Boolean(selectedGame.imageUrl) }">
                        <img v-if="selectedGame.imageUrl" :src="selectedGame.imageUrl" :alt="`Capa de ${selectedGame.name}`" referrerpolicy="no-referrer">
                        <span>{{ selectedGame.name }}</span>
                        <button type="button" aria-label="Remover jogo selecionado" title="Trocar jogo" @click="emit('clear-selection')">×</button>
                    </div>
                </div>

                <div class="form-group">
                    <label for="gameCategory">Categoria</label>
                    <select id="gameCategory" :value="form.category" required @change="setField('category', $event.target.value)">
                        <option value="liked">❤️ Jogos Que Gosto</option>
                        <option value="favorite">🏆 Jogos Favoritos</option>
                        <option value="completed">✅ Jogos Zerados</option>
                    </select>
                    <small v-if="isEditing && ['favorite', 'completed'].includes(form.category)" id="gameCategoryHint" class="category-hint">
                        Ao alternar entre Jogos Favoritos e Jogos Zerados, o jogo pode ficar nas duas categorias. A classificação atual será mantida.
                    </small>
                </div>

                <div v-if="form.category === 'favorite'" class="form-group" id="favoritePositionGroup">
                    <label for="favoritePosition">Posição no pódio</label>
                    <select id="favoritePosition" :value="String(form.position)" @change="setField('position', Number($event.target.value))">
                        <option v-for="position in favoritePositions" :key="position" :value="String(position)">{{ positionLabel(position) }}</option>
                    </select>
                </div>

                <div v-if="form.category === 'completed'" class="form-group completed-year-field">
                    <label for="completedYear">Ano em que zerou</label>
                    <select
                        id="completedYear"
                        :value="String(form.year)"
                        :disabled="releaseYearLoading || !form.releaseYear || !completedYearOptions.length"
                        required
                        @change="setField('year', Number($event.target.value))"
                    >
                        <option v-for="year in completedYearOptions" :key="year" :value="String(year)">{{ year }}</option>
                    </select>
                    <small v-if="releaseYearLoading" class="completed-year-help" role="status">Consultando o ano de lançamento na RAWG...</small>
                    <div v-else-if="releaseYearError" class="completed-year-error" role="alert">
                        <span>{{ releaseYearError }}</span>
                        <button type="button" class="completed-year-retry" @click="emit('retry-release-year')">Tentar novamente</button>
                    </div>
                    <small v-else-if="form.releaseYear" class="completed-year-help">Escolha um ano entre {{ form.releaseYear }} (lançamento) e {{ currentYear }}.</small>
                    <small v-else class="completed-year-help">O ano de lançamento será consultado ao selecionar um jogo.</small>
                </div>

                <div class="form-group">
                    <label for="gameRating">Nota</label>
                    <input
                        id="gameRating"
                        type="text"
                        inputmode="decimal"
                        maxlength="4"
                        placeholder="Ex: 7,8"
                        autocomplete="off"
                        required
                        :value="form.rating"
                        @input="setField('rating', $event.target.value)"
                    >
                    <small class="rating-help">Digite uma nota entre 0 e 10. Exemplo: 7,8</small>
                </div>

                <div v-if="form.category === 'favorite' && favoriteLimitReached && !isEditing" class="favorite-limit-message">
                    Você já possui 3 jogos favoritos. Remova um para adicionar outro.
                </div>

                <div class="modal-actions">
                    <button type="button" class="modal-cancel" :disabled="isSaving" @click="emit('update:modelValue', false)">Cancelar</button>
                    <button type="submit" class="btn btn-primary" :disabled="isSaving || (form.category === 'completed' && (releaseYearLoading || !form.releaseYear || !completedYearOptions.length))">
                        {{ isSaving ? "Salvando..." : (isEditing ? "Salvar alterações" : "Adicionar jogo") }}
                    </button>
                </div>
            </form>
        </div>
    </div>
</template>
