<script setup>
import { computed } from "vue";
import FriendAvatar from "./FriendAvatar.vue";
import { getFriendProfileUrl } from "../utils.js";

const props = defineProps({
    request: { type: Object, required: true },
    busyAction: { type: String, default: "" }
});

const emit = defineEmits(["resolve"]);
const user = computed(() => props.request.user || {});
const profileUrl = computed(() => getFriendProfileUrl(user.value));
</script>

<template>
    <article class="request-card">
        <FriendAvatar :user="user" />

        <div class="request-info">
            <strong v-if="profileUrl">
                <a class="user-profile-link" :href="profileUrl">{{ user.name || "Jogador" }}</a>
            </strong>
            <strong v-else>{{ user.name || "Jogador" }}</strong>
            <span>{{ user.course || "Curso não informado" }}</span>
        </div>

        <div class="request-actions">
            <button
                type="button"
                class="request-btn accept"
                :disabled="Boolean(busyAction)"
                @click="emit('resolve', 'accept')"
            >
                {{ busyAction === "accept" ? "Aceitando..." : "✓ Aceitar" }}
            </button>
            <button
                type="button"
                class="request-btn decline"
                :disabled="Boolean(busyAction)"
                @click="emit('resolve', 'decline')"
            >
                {{ busyAction === "decline" ? "Recusando..." : "✕ Recusar" }}
            </button>
        </div>
    </article>
</template>
