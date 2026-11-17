<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import FeedComposer from "./components/FeedComposer.vue";
import FeedPostCard from "./components/FeedPostCard.vue";
import TrendingGames from "./components/TrendingGames.vue";

const FEED_PAGE_SIZE = 20;
const API_BASE_URL = String(window.OVERCLOCK_API_BASE_URL || "").replace(/\/$/, "");

const games = [
    { name: "Elden Ring", hashtag: "eldenring" },
    { name: "Hollow Knight", hashtag: "hollowknight" },
    { name: "Minecraft", hashtag: "minecraft" },
    { name: "Valorant", hashtag: "valorant" },
    { name: "Terraria", hashtag: "terraria" },
    { name: "Zelda", hashtag: "zelda" },
    { name: "God of War", hashtag: "godofwar" },
    { name: "Stardew Valley", hashtag: "stardewvalley" },
    { name: "Resident Evil 4", hashtag: "residentevil4" },
    { name: "Hades", hashtag: "hades" },
    { name: "Sekiro", hashtag: "sekiro" },
    { name: "Cyberpunk 2077", hashtag: "cyberpunk2077" },
    { name: "Celeste", hashtag: "celeste" },
    { name: "Spider-Man", hashtag: "spiderman" },
];

const query = new URLSearchParams(window.location.search);
const requestedPostId = query.get("postId");
const requestedCommentId = query.get("commentId");
const focusReply = query.get("focusReply") === "1";
const requestedSearch = (query.get("search") || "").trim();

const posts = ref([]);
const composerText = ref("");
const currentUser = ref({
    id: localStorage.getItem("userId"),
    name: localStorage.getItem("userName") || "Usuário",
    avatarUrl: localStorage.getItem("userAvatarUrl") || "",
});
const currentPage = ref(1);
const hasMorePosts = ref(false);
const isLoading = ref(true);
const isLoadingMore = ref(false);
const isPublishing = ref(false);
const loadError = ref("");
const activeHashtag = ref(null);
const expandedComments = ref(new Set());
const busyActions = ref(new Set());
const deepLinkHandled = ref(false);
let loadSequence = 0;
let deepLinkHighlightTimer = null;

function normalizeHashtag(value) {
    return String(value || "").toLowerCase().replace(/^#/, "").trim();
}

// Qualquer #hashtag (letras, números e _) conta, em qualquer posição do texto.
function isValidHashtag(value) {
    return /^[\p{L}\p{N}_]+$/u.test(normalizeHashtag(value));
}

function extractHashtags(content) {
    const tags = new Set();
    for (const match of String(content || "").matchAll(/#([\p{L}\p{N}_]+)/gu)) {
        tags.add(normalizeHashtag(match[1]));
    }
    return tags;
}

function postHasHashtag(post, hashtag) {
    return extractHashtags(post.content).has(hashtag);
}

function getTextSegments(content) {
    return String(content || "")
        .split(/(#[\p{L}\p{N}_]+)/gu)
        .map((part, index) => {
            const isHashtag = part.startsWith("#") && isValidHashtag(part);
            return {
                key: `${index}-${part}`,
                text: isHashtag ? part.slice(1) : part,
                hashtag: isHashtag,
            };
        });
}

function getAvatarSource(path) {
    const source = String(path || "").trim();
    if (!source) return "";
    try {
        return new URL(source, API_BASE_URL || window.location.origin).toString();
    } catch {
        return "";
    }
}

function getProfileUrl(user) {
    const userId = user?.id
        ?? user?.userId
        ?? user?.user_id
        ?? user?.authorId
        ?? user?.author_id
        ?? user?.user?.id
        ?? null;

    const currentUserId = localStorage.getItem("userId");
    const ownProfileUrl = new URL("perfil.html", window.location.href).href;
    const publicProfileUrl = new URL("perfil-usuario.html", window.location.href);

    if (userId !== null && userId !== undefined && /^\d+$/.test(String(userId))) {
        if (currentUserId && String(currentUserId) === String(userId)) return ownProfileUrl;
        publicProfileUrl.searchParams.set("userId", String(userId));
        return publicProfileUrl.href;
    }

    const username = String(
        user?.username ?? user?.user?.username ?? user?.authorUsername ?? ""
    ).trim().replace(/^@+/, "");

    if (!username || username.toLocaleLowerCase("pt-BR") === "usuario") return "";

    const currentUsername = currentUserId
        ? String(localStorage.getItem(`overclockSocietyUsername_${currentUserId}`) || "")
            .trim().replace(/^@+/, "")
        : "";

    if (currentUserId && currentUsername && currentUsername.toLocaleLowerCase("pt-BR") === username.toLocaleLowerCase("pt-BR")) {
        return ownProfileUrl;
    }

    publicProfileUrl.searchParams.set("username", username);
    return publicProfileUrl.href;
}

function getApiErrorMessage(body, fallback) {
    if (typeof body?.detail === "string") return body.detail;
    if (Array.isArray(body?.detail)) {
        return body.detail.map((item) => typeof item === "string" ? item : item?.msg || "Dados inválidos.").join(" ");
    }
    return fallback;
}

async function feedApiRequest(path, options = {}) {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("Sua sessão não foi encontrada. Entre novamente.");

    const headers = {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
    };

    if (options.body && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers,
    });

    if (response.status === 204) return null;

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(getApiErrorMessage(body, "Não foi possível concluir a operação."));
    }
    return body;
}

async function refreshFeedNotificationCenter(action, post) {
    if (!post || !window.OverclockNotifications?.notifyFeedAction) return;
    if (post.userId != null && String(post.userId) === String(currentUser.value.id)) return;

    try {
        await window.OverclockNotifications.notifyFeedAction({ action, postId: post.id });
    } catch (error) {
        console.warn("A interação foi salva, mas a central de notificações não foi atualizada.", error);
    }
}

const visiblePosts = computed(() => {
    let result = posts.value;

    if (activeHashtag.value) {
        result = result.filter((post) => postHasHashtag(post, activeHashtag.value));
    }

    if (requestedSearch) {
        const term = requestedSearch.toLocaleLowerCase("pt-BR");
        const normalizedTerm = term.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const compactTerm = normalizedTerm.replace(/[^a-z0-9]/g, "");

        result = result.filter((post) => {
            const fullText = [
                post.content,
                post.author,
                post.username,
                ...(post.comments || []).map((comment) => `${comment.author || ""} ${comment.text || ""}`),
            ].join(" ").toLocaleLowerCase("pt-BR");
            const normalizedText = fullText.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const compactText = normalizedText.replace(/[^a-z0-9]/g, "");
            return fullText.includes(term) || (compactTerm.length >= 2 && compactText.includes(compactTerm));
        });
    }

    return result;
});

const knownGameNames = new Map(games.map((game) => [game.hashtag, game.name]));

const trendingGames = computed(() => {
    const counts = new Map();
    for (const post of posts.value) {
        for (const tag of extractHashtags(post.content)) {
            counts.set(tag, (counts.get(tag) || 0) + 1);
        }
    }
    return [...counts.entries()]
        .map(([hashtag, postsCount]) => ({ hashtag, name: knownGameNames.get(hashtag) || "", postsCount }))
        .sort((a, b) => b.postsCount - a.postsCount || a.hashtag.localeCompare(b.hashtag))
        .slice(0, 5);
});

function isBusy(action, postId) {
    return busyActions.value.has(`${action}:${postId}`);
}

function setBusy(action, postId, value) {
    const key = `${action}:${postId}`;
    const next = new Set(busyActions.value);
    if (value) next.add(key);
    else next.delete(key);
    busyActions.value = next;
}

async function loadPosts({ append = false } = {}) {
    const requestNumber = ++loadSequence;
    const requestedPage = append ? currentPage.value + 1 : 1;

    if (append) isLoadingMore.value = true;
    else {
        isLoading.value = true;
        loadError.value = "";
    }

    try {
        const params = new URLSearchParams({
            page: String(requestedPage),
            page_size: String(FEED_PAGE_SIZE),
        });
        if (!append && requestedPostId) params.set("post_id", requestedPostId);

        const result = await feedApiRequest(`/feed/posts?${params.toString()}`);
        if (requestNumber !== loadSequence) return;

        const returnedPosts = Array.isArray(result)
            ? result
            : (Array.isArray(result?.posts) ? result.posts : []);

        if (append) {
            const knownIds = new Set(posts.value.map((post) => String(post.id)));
            for (const post of returnedPosts) {
                if (!knownIds.has(String(post.id))) {
                    posts.value.push(post);
                    knownIds.add(String(post.id));
                }
            }
        } else {
            posts.value = returnedPosts;
        }

        currentPage.value = requestedPage;
        hasMorePosts.value = typeof result?.has_more === "boolean"
            ? result.has_more
            : returnedPosts.length >= FEED_PAGE_SIZE;

        if (requestedPostId && !append) {
            activeHashtag.value = null;
            expandedComments.value = new Set([...expandedComments.value, String(requestedPostId)]);
        }

        if (!append) await focusDeepLinkTarget();
    } catch (error) {
        if (requestNumber !== loadSequence) return;
        console.error("Erro ao carregar o Feed:", error);
        if (!append) loadError.value = error.message || "Não foi possível carregar o Feed.";
        else window.alert(`Não foi possível carregar mais publicações. ${error.message}`);
    } finally {
        if (requestNumber === loadSequence) {
            isLoading.value = false;
            isLoadingMore.value = false;
        }
    }
}

async function focusDeepLinkTarget() {
    if (!requestedPostId || deepLinkHandled.value) return;
    await nextTick();
    const postCard = Array.from(document.querySelectorAll(".post-card"))
        .find((card) => card.dataset.postId === String(requestedPostId));
    if (!postCard) return;

    const target = requestedCommentId
        ? document.getElementById(`feed-comment-${requestedCommentId}`) || postCard
        : postCard;
    deepLinkHandled.value = true;

    target.setAttribute("tabindex", "-1");
    target.style.outline = "2px solid rgba(29, 155, 240, 0.95)";
    target.style.outlineOffset = "3px";
    target.style.boxShadow = "0 0 0 5px rgba(29, 155, 240, 0.14)";
    target.style.transition = "outline-color 0.2s ease, box-shadow 0.2s ease";
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    try { target.focus({ preventScroll: true }); } catch { target.focus(); }

    if (focusReply) {
        window.setTimeout(() => {
            const input = postCard.querySelector(".comment-form input");
            input?.focus({ preventScroll: true });
        }, 350);
    }

    if (deepLinkHighlightTimer) window.clearTimeout(deepLinkHighlightTimer);
    deepLinkHighlightTimer = window.setTimeout(() => {
        if (!target.isConnected) return;
        target.style.removeProperty("outline");
        target.style.removeProperty("outline-offset");
        target.style.removeProperty("box-shadow");
        target.style.removeProperty("transition");
    }, 4500);
}

function filterByHashtag(value, shouldScroll = true) {
    const normalized = normalizeHashtag(value);
    if (!isValidHashtag(normalized)) return;
    activeHashtag.value = normalized;
    if (shouldScroll) window.scrollTo({ top: 0, behavior: "smooth" });
}

function clearHashtagFilter() {
    activeHashtag.value = null;
}

function toggleComments(postId) {
    const key = String(postId);
    const next = new Set(expandedComments.value);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    expandedComments.value = next;
}

async function publishPost() {
    const content = composerText.value.trim();
    if (!content) return;
    if (content.length > 280) {
        window.alert("A publicação deve ter no máximo 280 caracteres.");
        return;
    }

    isPublishing.value = true;
    try {
        await feedApiRequest("/feed/posts", {
            method: "POST",
            body: JSON.stringify({ content }),
        });
        composerText.value = "";
        clearHashtagFilter();
        await loadPosts();
    } catch (error) {
        console.error("Erro ao publicar:", error);
        window.alert(`Não foi possível publicar: ${error.message}`);
    } finally {
        isPublishing.value = false;
    }
}

async function submitComment(post, content) {
    if (!content.trim()) return false;
    expandedComments.value = new Set([...expandedComments.value, String(post.id)]);
    try {
        await feedApiRequest(`/feed/posts/${post.id}/comments`, {
            method: "POST",
            body: JSON.stringify({ content: content.trim() }),
        });
        await refreshFeedNotificationCenter("comment", post);
        await loadPosts();
        return true;
    } catch (error) {
        console.error("Erro ao criar comentário:", error);
        window.alert(`Não foi possível enviar o comentário: ${error.message}`);
        return false;
    }
}

async function deletePost(postId) {
    const post = posts.value.find((item) => String(item.id) === String(postId));
    if (!post || String(post.userId) !== String(currentUser.value.id)) return;

    const confirmed = await window.OverclockUI?.confirm?.(
        "Deseja realmente excluir esta publicação?",
        { title: "Excluir publicação", confirmLabel: "Excluir", danger: true },
    );
    if (!confirmed) return;

    try {
        await feedApiRequest(`/feed/posts/${postId}`, { method: "DELETE" });
        const next = new Set(expandedComments.value);
        next.delete(String(postId));
        expandedComments.value = next;
        await loadPosts();
    } catch (error) {
        console.error("Erro ao excluir publicação:", error);
        window.alert(`Não foi possível excluir a publicação: ${error.message}`);
    }
}

async function deleteComment(postId, commentId) {
    const post = posts.value.find((item) => String(item.id) === String(postId));
    const comment = (post?.comments || []).find((item) => String(item.id) === String(commentId));
    if (!comment || String(comment.userId) !== String(currentUser.value.id)) return;

    const confirmed = await window.OverclockUI?.confirm?.(
        "Deseja realmente excluir este comentário?",
        { title: "Excluir comentário", confirmLabel: "Excluir", danger: true },
    );
    if (!confirmed) return;

    const next = new Set(expandedComments.value);
    next.add(String(postId));
    expandedComments.value = next;
    try {
        await feedApiRequest(`/feed/posts/${postId}/comments/${commentId}`, { method: "DELETE" });
        await loadPosts();
    } catch (error) {
        console.error("Erro ao excluir comentário:", error);
        window.alert(`Não foi possível excluir o comentário: ${error.message}`);
    }
}

async function toggleLike(postId) {
    if (isBusy("like", postId)) return;
    setBusy("like", postId, true);
    try {
        const result = await feedApiRequest(`/feed/posts/${postId}/like`, { method: "POST" });
        const post = posts.value.find((item) => String(item.id) === String(postId));
        if (post) {
            post.liked = result.liked;
            post.likes = result.likes;
        }
        if (result.liked) await refreshFeedNotificationCenter("like", post || { id: postId });
    } catch (error) {
        console.error("Erro ao atualizar curtida:", error);
        window.alert(`Não foi possível atualizar a curtida: ${error.message}`);
    } finally {
        setBusy("like", postId, false);
    }
}

async function toggleRepost(postId) {
    if (isBusy("repost", postId)) return;
    setBusy("repost", postId, true);
    try {
        const result = await feedApiRequest(`/feed/posts/${postId}/repost`, { method: "POST" });
        const post = posts.value.find((item) => String(item.id) === String(postId));
        if (post) {
            post.reposted = result.reposted;
            post.reposts = result.reposts;
        }
        if (result.reposted) await refreshFeedNotificationCenter("repost", post || { id: postId });
    } catch (error) {
        console.error("Erro ao atualizar repostagem:", error);
        window.alert(`Não foi possível atualizar a repostagem: ${error.message}`);
    } finally {
        setBusy("repost", postId, false);
    }
}

function applySessionUser(user = {}) {
    if (user.id != null) {
        currentUser.value.id = String(user.id);
        localStorage.setItem("userId", String(user.id));
    }
    if (user.name) {
        currentUser.value.name = user.name;
        localStorage.setItem("userName", user.name);
    }
    if (user.email) localStorage.setItem("userEmail", user.email);
    if (user.username && user.id != null) {
        localStorage.setItem(`overclockSocietyUsername_${user.id}`, String(user.username).replace(/^@+/, ""));
    }
    if (Object.prototype.hasOwnProperty.call(user, "avatar_url")) {
        currentUser.value.avatarUrl = user.avatar_url || "";
        if (user.avatar_url) localStorage.setItem("userAvatarUrl", user.avatar_url);
        else localStorage.removeItem("userAvatarUrl");
    }
}

function handleSessionReady(event) {
    applySessionUser(event.detail || {});
    void loadPosts();
}

function handleProfileUpdated(event) {
    applySessionUser(event.detail || {});
    void loadPosts();
}

onMounted(() => {
    window.addEventListener("overclock:session-ready", handleSessionReady);
    window.addEventListener("overclock:profile-updated", handleProfileUpdated);

    const globalSearchInput = document.getElementById("searchInput");
    if (requestedSearch && globalSearchInput) {
        globalSearchInput.value = requestedSearch;
    }

    const requestedHashtag = query.get("hashtag");
    if (requestedHashtag && isValidHashtag(requestedHashtag)) {
        filterByHashtag(requestedHashtag, false);
    }
});

onBeforeUnmount(() => {
    window.removeEventListener("overclock:session-ready", handleSessionReady);
    window.removeEventListener("overclock:profile-updated", handleProfileUpdated);
    loadSequence += 1;
    if (deepLinkHighlightTimer) window.clearTimeout(deepLinkHighlightTimer);
});
</script>

<template>
    <div class="feed-layout">
        <section class="feed-main">
            <div class="feed-header">
                <div>
                    <span class="welcome-label">COMUNIDADE</span>
                    <h1>Feed</h1>
                    <p>Compartilhe momentos, opiniões e jogos com a comunidade.</p>
                </div>
            </div>

            <FeedComposer
                v-model="composerText"
                :user-name="currentUser.name"
                :avatar-source="getAvatarSource(currentUser.avatarUrl)"
                :publishing="isPublishing"
                @publish="publishPost"
            />

            <div v-if="activeHashtag" class="feed-filter active">
                <span>Exibindo posts sobre <strong>#{{ activeHashtag }}</strong></span>
                <button type="button" @click="clearHashtagFilter">Limpar filtro</button>
            </div>

            <section class="posts-list" :aria-busy="isLoading || isLoadingMore">
                <div v-if="isLoading" class="empty-feed">Carregando publicações...</div>
                <div v-else-if="loadError" class="empty-feed">
                    Não foi possível carregar o Feed. {{ loadError }}
                    <button type="button" class="feed-retry-button" @click="loadPosts()">Tentar novamente</button>
                </div>
                <div v-else-if="visiblePosts.length === 0" class="empty-feed">
                    <template v-if="requestedSearch && posts.length">
                        Nenhuma publicação encontrada para “{{ requestedSearch }}”.
                    </template>
                    <template v-else-if="activeHashtag">
                        Nenhuma publicação encontrada para esta hashtag.
                    </template>
                    <template v-else>
                        Ainda não há publicações. Seja o primeiro a compartilhar algo com a comunidade!
                    </template>
                </div>

                <FeedPostCard
                    v-for="post in visiblePosts"
                    :key="post.id"
                    :post="post"
                    :current-user-id="currentUser.id"
                    :expanded="expandedComments.has(String(post.id))"
                    :busy-like="isBusy('like', post.id)"
                    :busy-repost="isBusy('repost', post.id)"
                    :get-profile-url="getProfileUrl"
                    :get-avatar-source="getAvatarSource"
                    :get-text-segments="getTextSegments"
                    :submit-comment="submitComment"
                    @toggle-comments="toggleComments"
                    @like="toggleLike"
                    @repost="toggleRepost"
                    @delete-post="deletePost"
                    @delete-comment="deleteComment"
                    @filter-hashtag="filterByHashtag"
                />
            </section>

            <button
                v-if="hasMorePosts"
                type="button"
                class="feed-load-more"
                :disabled="isLoadingMore"
                @click="loadPosts({ append: true })"
            >
                {{ isLoadingMore ? "Carregando..." : "Carregar mais publicações" }}
            </button>
        </section>

        <aside class="feed-right">
            <section class="feed-side-card">
                <span class="section-label">HASHTAGS</span>
                <h2>Jogos em destaque</h2>
                <TrendingGames :games="trendingGames" @filter="filterByHashtag" />
            </section>

            <section class="feed-side-card">
                <span class="section-label">SOBRE O FEED</span>
                <p class="feed-description">
                    Qualquer #hashtag usada nas publicações, em qualquer parte do texto, entra nos destaques. Clique em uma para visualizar publicações relacionadas.
                </p>
            </section>
        </aside>
    </div>
</template>
