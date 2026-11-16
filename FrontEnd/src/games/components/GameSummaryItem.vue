<script setup>
defineProps({
    icon: { type: String, required: true },
    count: { type: Number, required: true },
    label: { type: String, required: true }
});
</script>

<template>
    <div class="summary-item">
        <span class="summary-icon">{{ icon }}</span>
        <div>
            <strong>{{ count }}</strong>
            <span>{{ label }}</span>
        </div>
    </div>
</template>
