<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

// Mantém a data já existente na página. Atualize quando houver uma nova data oficial.
const targetDate = new Date("2026-11-03T00:00:00-03:00").getTime();
const now = ref(Date.now());
let timerId = null;

const parts = computed(() => {
    const validTarget = Number.isFinite(targetDate);
    const totalSeconds = validTarget
        ? Math.max(0, Math.floor((targetDate - now.value) / 1000))
        : 0;
    const pad = (value) => String(value).padStart(2, "0");

    return [
        { label: "dias", value: pad(Math.floor(totalSeconds / 86400)) },
        { label: "horas", value: pad(Math.floor((totalSeconds % 86400) / 3600)) },
        { label: "min", value: pad(Math.floor((totalSeconds % 3600) / 60)) },
        { label: "seg", value: pad(totalSeconds % 60) }
    ];
});

onMounted(() => {
    timerId = window.setInterval(() => {
        now.value = Date.now();
    }, 1000);
});

onBeforeUnmount(() => {
    if (timerId !== null) {
        window.clearInterval(timerId);
        timerId = null;
    }
});
</script>

<template>
    <div
        class="countdown"
        id="countdown"
        role="timer"
        aria-label="Contagem regressiva para o lançamento"
    >
        <div
            v-for="part in parts"
            :key="part.label"
            class="countdown-item"
        >
            <strong>{{ part.value }}</strong>
            <span>{{ part.label }}</span>
        </div>
    </div>
</template>
