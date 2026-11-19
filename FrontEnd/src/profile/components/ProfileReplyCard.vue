<script setup>
import ProfileActivityAvatar from "./ProfileActivityAvatar.vue";

const props = defineProps({ reply: { type: Object, required: true } });
const emit = defineEmits(["open-feed", "like", "repost"]);

function openReply() {
    if (props.reply?.post?.id == null) return;
    emit("open-feed", props.reply);
}
function onKeydown(event) {
    if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openReply();
    }
}
</script>

<template>
    <article
        class="post-card profile-activity-card profile-reply-card"
        :class="{ 'profile-reply-card-link': reply.post?.id != null }"
        :tabindex="reply.post?.id != null ? 0 : null"
        :role="reply.post?.id != null ? 'link' : null"
        :aria-label="reply.post?.id != null ? 'Abrir esta resposta no Feed' : null"
        @click="openReply"
        @keydown="onKeydown"
    >
        <div class="profile-activity-note">💬 Você respondeu a {{ reply.post?.author || "uma publicação" }} · {{ reply.createdAt || "agora" }}</div>
        <div class="post-header">
            <ProfileActivityAvatar
                :name="reply.author"
                :fallback="reply.avatar"
                :avatar-url="reply.avatar_url"
                :theme-hue="reply.theme_hue"
                avatar-class="post-avatar"
            />
            <div class="post-user">
                <div class="post-user-line">
                    <strong>{{ reply.author || "Usuário" }}</strong>
                    <span class="post-username">{{ reply.username || "@usuario" }}</span>
                </div>
                <p class="post-text">{{ reply.text || "" }}</p>
            </div>
        </div>

        <template v-if="reply.post">
            <div class="profile-reply-context">
                <span class="profile-reply-context-label">Publicação original</span>
                <strong>{{ `${reply.post.author || "Usuário"} ${reply.post.username || ""}`.trim() }}</strong>
                <p>{{ reply.post.content || "" }}</p>
            </div>
            <div class="post-actions profile-reply-actions">
                <button type="button" class="post-action" @click.stop="emit('open-feed', reply, true)"><span>💬</span><span>{{ Array.isArray(reply.post.comments) ? reply.post.comments.length : 0 }}</span><span>Responder</span></button>
                <button type="button" class="post-action" :class="{ reposted: reply.post.reposted }" @click.stop="emit('repost', reply.post.id)"><span>{{ reply.post.reposted ? "✅" : "🔁" }}</span><span>{{ Number(reply.post.reposts || 0) }}</span><span>Repostar</span></button>
                <button type="button" class="post-action" :class="{ liked: reply.post.liked }" @click.stop="emit('like', reply.post.id)"><span>{{ reply.post.liked ? "❤️" : "♡" }}</span><span>{{ Number(reply.post.likes || 0) }}</span><span>Curtir</span></button>
            </div>
        </template>
    </article>
</template>
