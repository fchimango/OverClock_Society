<script setup>
import { computed } from "vue";
import FriendAvatar from "./FriendAvatar.vue";
import { getFriendProfileUrl, getStatusIcon, getStatusLabel } from "../utils.js";

const props = defineProps({
    friend: { type: Object, required: true },
    busy: { type: Boolean, default: false }
});
const emit = defineEmits(["remove"]);
const profileUrl = computed(() => getFriendProfileUrl(props.friend));
const statusText = computed(() => `${getStatusIcon(props.friend.status)} ${getStatusLabel(props.friend.status)}`);
</script>

<template>
    <article class="all-friend-card">
        <FriendAvatar :user="friend" />
        <div class="all-friend-info">
            <strong v-if="profileUrl">
                <a class="user-profile-link" :href="profileUrl">{{ friend.name || "Jogador" }}</a>
            </strong>
            <strong v-else>{{ friend.name || "Jogador" }}</strong>
            <span>{{ statusText }}</span>
        </div>
        <button
            type="button"
            class="friend-more"
            :disabled="busy"
            :title="`Remover ${friend.name || 'jogador'} dos amigos`"
            :aria-label="`Remover ${friend.name || 'jogador'} dos amigos`"
            @click="emit('remove')"
        >
            {{ busy ? "…" : "⋮" }}
        </button>
    </article>
</template>
