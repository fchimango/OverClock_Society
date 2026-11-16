<script setup>
const props = defineProps({
    modelValue: { type: Boolean, default: false },
    title: { type: String, default: "Remover jogo?" },
    message: { type: String, default: "Deseja remover este jogo desta categoria?" },
    confirmLabel: { type: String, default: "Remover jogo" }
});
const emit = defineEmits(["update:modelValue", "confirm"]);
</script>

<template>
    <div
        class="game-confirm-overlay"
        :class="{ active: modelValue }"
        :aria-hidden="String(!modelValue)"
        @click.self="emit('update:modelValue', false)"
    >
        <section class="game-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="gameConfirmTitle" aria-describedby="gameConfirmMessage">
            <button type="button" class="game-confirm-close" aria-label="Fechar confirmação" @click="emit('update:modelValue', false)">×</button>
            <div class="game-confirm-icon" aria-hidden="true">🗑️</div>
            <h2 id="gameConfirmTitle">{{ title }}</h2>
            <p id="gameConfirmMessage">{{ message }}</p>
            <div class="game-confirm-actions">
                <button type="button" class="modal-cancel" @click="emit('update:modelValue', false)">Cancelar</button>
                <button type="button" class="game-confirm-delete" @click="emit('confirm')">{{ confirmLabel }}</button>
            </div>
        </section>
    </div>
</template>
