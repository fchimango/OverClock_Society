<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";

const emit = defineEmits(["edit", "remove"]);
const isOpen = ref(false);
const root = ref(null);

function closeOnOutsideClick(event) {
    if (root.value && !root.value.contains(event.target)) {
        isOpen.value = false;
    }
}

function closeOnEscape(event) {
    if (event.key === "Escape") isOpen.value = false;
}

onMounted(() => {
    document.addEventListener("click", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
});

onBeforeUnmount(() => {
    document.removeEventListener("click", closeOnOutsideClick);
    document.removeEventListener("keydown", closeOnEscape);
});

function edit() {
    isOpen.value = false;
    emit("edit");
}

function remove() {
    isOpen.value = false;
    emit("remove");
}
</script>

<template>
    <div ref="root" class="game-actions">
        <button
            type="button"
            class="game-options-button"
            aria-label="Opções do jogo"
            :aria-expanded="isOpen"
            @click="isOpen = !isOpen"
        >
            ⋮
        </button>

        <div class="game-action-menu" :class="{ active: isOpen }">
            <button type="button" data-game-action="edit" @click="edit">✏️ Editar</button>
            <button type="button" class="danger" data-game-action="remove" @click="remove">🗑️ Remover</button>
        </div>
    </div>
</template>
