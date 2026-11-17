<script setup>
import { computed, ref } from "vue";
import FeedAvatar from "./FeedAvatar.vue";
import FeedComment from "./FeedComment.vue";

const props = defineProps({
    post: { type: Object, required: true },
    currentUserId: { type: [String, Number], default: null },
    expanded: { type: Boolean, default: false },
    busyLike: { type: Boolean, default: false },
    busyRepost: { type: Boolean, default: false },
    getProfileUrl: { type: Function, required: true },
    getAvatarSource: { type: Function, required: true },
    getTextSegments: { type: Function, required: true },
    submitComment: { type: Function, required: true },
});

const emit = defineEmits(["toggle-comments", "like", "repost", "delete-post", "delete-comment", "filter-hashtag"]);
const commentDraft = ref("");
const submittingComment = ref(false);
const comments = computed(() => Array.isArray(props.post.comments) ? props.post.comments : []);
const author = computed(() => ({
    id: props.post.userId ?? props.post.user_id ?? props.post.authorId ?? props.post.author_id ?? props.post.user?.id,
    username: props.post.username ?? props.post.user?.username ?? props.post.authorUsername,
    name: props.post.author ?? props.post.user?.name,
}));
const authorProfileUrl = computed(() => props.getProfileUrl(author.value));
const authorName = computed(() => String(author.value.name || "Usuário").trim());
const canDeletePost = computed(() => props.post.userId != null && String(props.post.userId) === String(props.currentUserId));

async function submitComment() {
    const content = commentDraft.value.trim();
    if (!content || submittingComment.value) return;

    submittingComment.value = true;
    try {
        const saved = await props.submitComment(props.post, content);
        if (saved) commentDraft.value = "";
    } finally {
        submittingComment.value = false;
    }
}
</script>

<template>
    <article class="post-card" :data-post-id="post.id" tabindex="-1">
        <div class="post-header">
            <FeedAvatar
                avatar-class="post-avatar"
                :name="authorName"
                :source="getAvatarSource(post.avatar_url || post.user?.avatar_url)"
                :hue="post.theme_hue ?? post.user?.theme_hue"
                :href="authorProfileUrl || ''"
            />

            <div class="post-user">
                <div class="post-user-line">
                    <a
                        v-if="authorProfileUrl"
                        class="post-author-link user-profile-link"
                        :href="authorProfileUrl"
                    >{{ authorName }}</a>
                    <strong v-else class="post-author-name">{{ authorName }}</strong>

                    <a
                        v-if="authorProfileUrl"
                        class="post-username user-profile-link"
                        :href="authorProfileUrl"
                    >{{ post.username || "@usuario" }}</a>
                    <span v-else class="post-username">{{ post.username || "@usuario" }}</span>

                    <span class="post-time">• {{ post.createdAt || "agora" }}</span>
                </div>

                <p class="post-text">
                    <template v-for="(segment, index) in getTextSegments(post.content)" :key="`${index}-${segment.text}`">
                        <button
                            v-if="segment.hashtag"
                            type="button"
                            class="game-hashtag"
                            @click="emit('filter-hashtag', segment.text)"
                        >#{{ segment.text }}</button>
                        <template v-else>{{ segment.text }}</template>
                    </template>
                </p>
            </div>
        </div>

        <div class="post-actions">
            <button
                type="button"
                class="post-action"
                :aria-label="`Comentar: ${comments.length}`"
                :aria-expanded="expanded"
                @click="emit('toggle-comments', post.id)"
            >
                <span>💬</span><span>{{ comments.length }}</span><span>Comentar</span>
            </button>

            <button
                type="button"
                class="post-action"
                :class="{ reposted: post.reposted }"
                :disabled="busyRepost"
                :aria-label="`Repostar: ${post.reposts || 0}`"
                @click="emit('repost', post.id)"
            >
                <span>{{ post.reposted ? "✅" : "🔁" }}</span><span>{{ post.reposts || 0 }}</span><span>Repostar</span>
            </button>

            <button
                type="button"
                class="post-action"
                :class="{ liked: post.liked }"
                :disabled="busyLike"
                :aria-label="`Curtir: ${post.likes || 0}`"
                @click="emit('like', post.id)"
            >
                <span>{{ post.liked ? "❤️" : "♡" }}</span><span>{{ post.likes || 0 }}</span><span>Curtir</span>
            </button>

            <button
                v-if="canDeletePost"
                type="button"
                class="post-action post-delete-button"
                @click="emit('delete-post', post.id)"
            >
                <span>🗑</span><span>Excluir</span>
            </button>
        </div>

        <div class="comments-section" :class="{ active: expanded }">
            <div class="comments-list">
                <FeedComment
                    v-for="comment in comments"
                    :key="comment.id"
                    :comment="comment"
                    :current-user-id="currentUserId"
                    :get-profile-url="getProfileUrl"
                    :get-avatar-source="getAvatarSource"
                    @delete="emit('delete-comment', post.id, $event)"
                />
            </div>

            <form class="comment-form" @submit.prevent="submitComment">
                <input
                    v-model="commentDraft"
                    type="text"
                    placeholder="Escreva um comentário..."
                    maxlength="180"
                    required
                    aria-label="Texto do comentário"
                >
                <button type="submit" :disabled="submittingComment || !commentDraft.trim()">
                    {{ submittingComment ? "Enviando..." : "Enviar" }}
                </button>
            </form>
        </div>
    </article>
</template>
