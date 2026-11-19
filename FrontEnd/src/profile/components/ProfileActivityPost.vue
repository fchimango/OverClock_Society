<script setup>
import { nextTick, ref } from "vue";
import ProfileActivityAvatar from "./ProfileActivityAvatar.vue";

const props = defineProps({
    post: { type: Object, required: true },
    currentUserId: { type: [String, Number], default: null },
    activityNote: { type: String, default: "" },
    onAddComment: { type: Function, default: null },
});

const emit = defineEmits(["like", "repost", "delete-post", "add-comment", "delete-comment"]);
const commentsOpen = ref(false);
const commentText = ref("");
const commentInput = ref(null);
const sendingComment = ref(false);

function isOwnPost() {
    return String(props.post.userId) === String(props.currentUserId);
}

async function toggleComments() {
    commentsOpen.value = !commentsOpen.value;
    if (commentsOpen.value) await nextTick();
    if (commentsOpen.value) commentInput.value?.focus();
}

async function submitComment() {
    const content = commentText.value.trim();
    if (!content || sendingComment.value) return;
    sendingComment.value = true;
    try {
        const payload = { postId: props.post.id, content };
        if (props.onAddComment) {
            await props.onAddComment(payload);
        } else {
            emit("add-comment", payload);
        }
        commentText.value = "";
    } catch {
        // O componente pai apresenta a mensagem de falha; o texto fica disponível para tentar novamente.
    } finally {
        sendingComment.value = false;
    }
}

async function removeComment(comment) {
    const confirm = window.OverclockUI?.confirm
        ? await window.OverclockUI.confirm("Deseja excluir este comentário?", {
            title: "Excluir comentário",
            confirmLabel: "Excluir",
            danger: true,
        })
        : window.confirm("Deseja excluir este comentário?");
    if (confirm) emit("delete-comment", { postId: props.post.id, commentId: comment.id });
}

function removePost() {
    emit("delete-post", props.post.id);
}
</script>

<template>
    <article class="post-card profile-activity-card">
        <div v-if="activityNote" class="profile-activity-note">{{ activityNote }}</div>
        <div class="post-header">
            <ProfileActivityAvatar
                :name="post.author"
                :fallback="post.avatar"
                :avatar-url="post.avatar_url"
                :theme-hue="post.theme_hue"
                avatar-class="post-avatar"
            />
            <div class="post-user">
                <div class="post-user-line">
                    <strong>{{ post.author || "Usuário" }}</strong>
                    <span class="post-username">{{ post.username || "@usuario" }}</span>
                    <span class="post-time">• {{ post.createdAt || "agora" }}</span>
                </div>
                <p class="post-text">{{ post.content || "" }}</p>
            </div>
        </div>

        <div class="post-actions">
            <button type="button" class="post-action profile-activity-action" :aria-label="`Responder: ${(post.comments || []).length}`" @click="toggleComments">
                <span>💬</span><span>{{ (post.comments || []).length }}</span><span>Responder</span>
            </button>
            <button type="button" class="post-action profile-activity-action" :class="{ reposted: post.reposted }" :aria-label="`Repostar: ${Number(post.reposts || 0)}`" @click="emit('repost', post.id)">
                <span>{{ post.reposted ? "✅" : "🔁" }}</span><span>{{ Number(post.reposts || 0) }}</span><span>Repostar</span>
            </button>
            <button type="button" class="post-action profile-activity-action" :class="{ liked: post.liked }" :aria-label="`Curtir: ${Number(post.likes || 0)}`" @click="emit('like', post.id)">
                <span>{{ post.liked ? "❤️" : "♡" }}</span><span>{{ Number(post.likes || 0) }}</span><span>Curtir</span>
            </button>
            <button v-if="isOwnPost()" type="button" class="post-action post-delete-button" @click="removePost">🗑 Excluir</button>
        </div>

        <div v-if="commentsOpen" class="comments-section active">
            <div class="comments-list">
                <div v-for="comment in (post.comments || [])" :key="comment.id" class="comment">
                    <ProfileActivityAvatar
                        :name="comment.author"
                        :fallback="comment.avatar"
                        :avatar-url="comment.avatar_url"
                        :theme-hue="comment.theme_hue"
                        avatar-class="comment-avatar"
                    />
                    <div class="comment-body">
                        <div class="comment-user">{{ comment.author || "Usuário" }}</div>
                        <div class="comment-text">{{ comment.text || "" }}</div>
                        <button v-if="String(comment.userId) === String(currentUserId)" type="button" class="comment-delete-button" @click="removeComment(comment)">🗑 Excluir</button>
                    </div>
                </div>
                <p v-if="!(post.comments || []).length" class="profile-comments-empty">Ainda não há respostas.</p>
            </div>
            <form class="comment-form" @submit.prevent="submitComment">
                <input ref="commentInput" v-model="commentText" type="text" maxlength="180" required placeholder="Escreva uma resposta..." aria-label="Texto da resposta">
                <button type="submit" :disabled="sendingComment || !commentText.trim()">{{ sendingComment ? "Enviando..." : "Enviar" }}</button>
            </form>
        </div>
    </article>
</template>

<style>
.profile-comments-empty {
    padding: 12px 4px;
    color: #94a3b8;
    font-size: 12px;
}
</style>
