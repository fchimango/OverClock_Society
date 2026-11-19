<script setup>
import ProfileActivityPost from "./ProfileActivityPost.vue";
import ProfileReplyCard from "./ProfileReplyCard.vue";

const props = defineProps({
    data: { type: Object, required: true },
    errors: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
    activeTab: { type: String, default: "posts" },
    currentUserId: { type: [String, Number], default: null },
    onAddComment: { type: Function, default: null },
});

const emit = defineEmits([
    "change-tab", "like", "repost", "delete-post", "add-comment", "delete-comment", "open-feed", "retry",
]);

function forwardOpenFeed(reply, focusReply = false) {
    emit("open-feed", reply, focusReply);
}

const tabs = [
    { key: "posts", label: "Publicações" },
    { key: "replies", label: "Respostas" },
    { key: "reposts", label: "Reposts" },
];
const emptyMessages = {
    posts: ["Você ainda não publicou nada.", "Crie uma publicação no Feed para ela aparecer aqui."],
    replies: ["Você ainda não respondeu a nenhuma publicação.", "Quando você comentar em uma publicação, sua resposta aparecerá aqui."],
    reposts: ["Você ainda não repostou nada.", "As publicações que você repostar aparecerão aqui."],
};
</script>

<template>
    <section class="profile-tab-panel active" role="tabpanel" aria-labelledby="profilePostsTab">
        <div class="profile-posts-header">
            <div>
                <span class="section-label">ATIVIDADE</span>
                <h2>Minhas publicações</h2>
                <p>Veja as publicações que você fez no Feed.</p>
            </div>
            <a href="feed.html" class="btn btn-primary">+ Nova publicação</a>
        </div>

        <nav class="profile-activity-tabs" role="tablist" aria-label="Atividade do perfil">
            <button
                v-for="tab in tabs"
                :key="tab.key"
                type="button"
                class="profile-activity-tab"
                :class="{ active: activeTab === tab.key }"
                role="tab"
                :aria-selected="String(activeTab === tab.key)"
                @click="emit('change-tab', tab.key)"
            >{{ tab.label }}</button>
        </nav>

        <div class="profile-activity-panel active" role="tabpanel" :aria-busy="loading">
            <div v-if="loading && !data[activeTab]?.length" class="profile-posts-empty">
                <strong>Carregando atividade...</strong>
            </div>
            <div v-else-if="errors[activeTab]" class="profile-posts-empty">
                <strong>Não foi possível carregar esta atividade.</strong>
                <p>{{ errors[activeTab] }}</p>
                <button type="button" class="btn btn-secondary" @click="emit('retry')">Tentar novamente</button>
            </div>
            <div v-else-if="!(data[activeTab] || []).length" class="profile-posts-empty profile-activity-empty">
                <strong>{{ emptyMessages[activeTab][0] }}</strong>
                <p>{{ emptyMessages[activeTab][1] }}</p>
            </div>
            <div v-else class="posts-list profile-posts-list">
                <template v-if="activeTab === 'posts'">
                    <ProfileActivityPost
                        v-for="post in data.posts"
                        :key="post.id"
                        :post="post"
                        :current-user-id="currentUserId"
                        :on-add-comment="onAddComment"
                        @like="emit('like', $event)"
                        @repost="emit('repost', $event)"
                        @delete-post="emit('delete-post', $event)"
                        @delete-comment="emit('delete-comment', $event)"
                    />
                </template>
                <template v-else-if="activeTab === 'replies'">
                    <ProfileReplyCard
                        v-for="reply in data.replies"
                        :key="reply.id"
                        :reply="reply"
                        @open-feed="forwardOpenFeed"
                        @like="emit('like', $event)"
                        @repost="emit('repost', $event)"
                    />
                </template>
                <template v-else>
                    <template v-for="item in data.reposts" :key="item.id || item.post?.id">
                        <ProfileActivityPost
                            v-if="item.post"
                            :post="item.post"
                            :current-user-id="currentUserId"
                            :on-add-comment="onAddComment"
                            :activity-note="`🔁 Você repostou · ${item.repostedAt || 'data não informada'}`"
                            @like="emit('like', $event)"
                            @repost="emit('repost', $event)"
                            @delete-post="emit('delete-post', $event)"
                            @delete-comment="emit('delete-comment', $event)"
                        />
                    </template>
                </template>
            </div>
        </div>
    </section>
</template>
