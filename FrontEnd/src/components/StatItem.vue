<script setup>
defineProps({
    icon: { type: String, required: true },
    label: { type: String, required: true }
});
</script>

<template>
    <div class="stat">
        <strong>{{ icon }}</strong>
        <span>{{ label }}</span>
    </div>
</template>
