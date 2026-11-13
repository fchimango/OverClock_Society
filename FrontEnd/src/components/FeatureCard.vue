<script setup>
defineProps({
    icon: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    number: { type: String, required: true }
});
</script>

<template>
    <article class="feature-card">
        <div class="feature-icon">{{ icon }}</div>
        <h3>{{ title }}</h3>
        <p>{{ description }}</p>
        <span class="feature-number">{{ number }}</span>
    </article>
</template>
