<script setup>
import { computed } from "vue";
import FriendAvatar from "./FriendAvatar.vue";
import { getFriendProfileUrl } from "../utils.js";

const props = defineProps({
    user: { type: Object, required: true },
    busy: { type: Boolean, default: false }
});
const emit = defineEmits(["request"]);
const profileUrl = computed(() => getFriendProfileUrl(props.user));
const actionLabel = computed(() => {
    if (props.busy && props.user.relationship === "incoming_request") return "Aceitando...";
    if (props.busy) return "Enviando...";
    if (props.user.relationship === "friend") return "Já são amigos";
    if (props.user.relationship === "outgoing_request") return "Solicitação enviada";
    if (props.user.relationship === "incoming_request") return "Aceitar solicitação";
    return "Adicionar";
});
const actionDisabled = computed(() => props.busy || ["friend", "outgoing_request"].includes(props.user.relationship));
</script>

<template>
    <article class="player-search-result">
        <FriendAvatar :user="user" variant="search" />
        <div class="player-search-info">
            <a v-if="profileUrl" class="user-profile-link" :href="profileUrl">
                <strong>{{ user.name || "Jogador" }}</strong>
            </a>
            <strong v-else>{{ user.name || "Jogador" }}</strong>
            <a v-if="profileUrl" class="user-profile-link" :href="profileUrl">
                <span>{{ user.username ? `@${String(user.username).replace(/^@+/, '')}` : (user.course || "Curso não informado") }}</span>
            </a>
            <span v-else>{{ user.username ? `@${String(user.username).replace(/^@+/, '')}` : (user.course || "Curso não informado") }}</span>
        </div>
        <button
            type="button"
            class="player-search-action"
            :disabled="actionDisabled"
            @click="emit('request')"
        >
            {{ actionLabel }}
        </button>
    </article>
</template>
