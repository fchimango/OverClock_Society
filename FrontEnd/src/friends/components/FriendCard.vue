<script setup>
import { computed } from "vue";
import FriendAvatar from "./FriendAvatar.vue";
import { getFriendProfileUrl } from "../utils.js";

const props = defineProps({ friend: { type: Object, required: true } });
const profileUrl = computed(() => getFriendProfileUrl(props.friend));
</script>

<template>
    <article class="friend-card friend-card-horizontal">
        <div class="friend-card-top">
            <FriendAvatar :user="friend" />
        </div>
        <div class="friend-card-info">
            <h3>
                <a v-if="profileUrl" class="user-profile-link" :href="profileUrl">
                    {{ friend.name || "Jogador" }}
                </a>
                <span v-else>{{ friend.name || "Jogador" }}</span>
            </h3>
            <span>{{ friend.course || "Curso não informado" }}</span>
        </div>
    </article>
</template>
