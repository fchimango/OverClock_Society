<script setup>
defineProps({
    href: { type: String, required: true },
    label: { type: String, required: true },
    variant: { type: String, default: "btn-primary" },
    showArrow: { type: Boolean, default: false }
});
</script>

<template>
    <a :href="href" class="btn" :class="variant">
        {{ label }}
        <span v-if="showArrow" class="button-arrow" aria-hidden="true">→</span>
    </a>
</template>
