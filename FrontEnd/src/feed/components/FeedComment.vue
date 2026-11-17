<script setup>
import FeedAvatar from "./FeedAvatar.vue";

const props = defineProps({
    comment: { type: Object, required: true },
    currentUserId: { type: [String, Number], default: null },
    getProfileUrl: { type: Function, required: true },
    getAvatarSource: { type: Function, required: true },
});

const emit = defineEmits(["delete"]);
</script>

<template>
    <div
        class="comment"
        :id="comment.id != null ? `feed-comment-${comment.id}` : undefined"
        :data-comment-id="comment.id != null ? String(comment.id) : undefined"
    >
        <FeedAvatar
            avatar-class="comment-avatar"
            :name="comment.author || 'Usuário'"
            :source="getAvatarSource(comment.avatar_url || comment.user?.avatar_url)"
            :hue="comment.theme_hue ?? comment.user?.theme_hue"
            :href="getProfileUrl({
                id: comment.userId ?? comment.user_id ?? comment.authorId ?? comment.author_id,
                username: comment.username ?? comment.authorUsername,
                name: comment.author
            }) || ''"
        />

        <div class="comment-body">
            <a
                v-if="getProfileUrl({
                    id: comment.userId ?? comment.user_id ?? comment.authorId ?? comment.author_id,
                    username: comment.username ?? comment.authorUsername,
                    name: comment.author
                })"
                class="comment-user user-profile-link"
                :href="getProfileUrl({
                    id: comment.userId ?? comment.user_id ?? comment.authorId ?? comment.author_id,
                    username: comment.username ?? comment.authorUsername,
                    name: comment.author
                })"
            >{{ comment.author || "Usuário" }}</a>
            <div v-else class="comment-user">{{ comment.author || "Usuário" }}</div>

            <div class="comment-text">{{ comment.text || "" }}</div>

            <button
                v-if="comment.id != null && String(comment.userId) === String(currentUserId)"
                type="button"
                class="comment-delete-button"
                @click="emit('delete', comment.id)"
            >
                🗑 Excluir
            </button>
        </div>
    </div>
</template>
