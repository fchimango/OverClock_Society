<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, nextTick } from "vue";
import ProfileHero from "./components/ProfileHero.vue";
import ProfileInfoGrid from "./components/ProfileInfoGrid.vue";
import ProfileEditorModal from "./components/ProfileEditorModal.vue";
import ProfileActivity from "./components/ProfileActivity.vue";

const API_BASE_URL = String(window.OVERCLOCK_API_BASE_URL || "").replace(/\/+$/, "");
const profileEditor = ref(null);
const profile = reactive({
    id: null,
    name: "Usuário",
    email: "",
    username: "usuario",
    course: "",
    semester: 1,
    join_date: "",
    status: "offline",
    bio: "",
    platforms: [],
    genres: [],
    current_game: "",
    current_game_status: "available",
    games_count: 0,
    friends_count: 0,
    avatar_url: null,
    cover_url: null,
    theme_hue: null,
});
const form = reactive({
    name: "",
    username: "",
    course: "",
    semester: 1,
    join_date: "",
    status: "offline",
    bio: "",
    platforms: [],
    genres: [],
    current_game: "",
    current_game_status: "available",
    error: "",
});
const pendingMedia = reactive({ avatar: null, cover: null });
const activeSection = ref("profile");
const activeActivityTab = ref("posts");
const editorOpen = ref(false);
const profileLoading = ref(true);
const profileError = ref("");
const saving = ref(false);
const activityLoading = ref(false);
const activityLoaded = ref(false);
const activityErrors = reactive({ posts: "", replies: "", reposts: "" });
const activityData = reactive({ posts: [], replies: [], reposts: [] });
let activityRequestSequence = 0;
let profileRequestInProgress = false;

const currentUserId = computed(() => profile.id || localStorage.getItem("userId"));
const avatarPreviewUrl = computed(() => pendingMedia.avatar || resolveMediaUrl(profile.avatar_url));
const coverPreviewUrl = computed(() => pendingMedia.cover || resolveMediaUrl(profile.cover_url));
const postCount = computed(() => activityData.posts.length);

function resolveMediaUrl(value) {
    const source = String(value || "").trim();
    if (!source) return "";
    if (/^(https?:|data:|blob:)/i.test(source)) return source;
    if (!API_BASE_URL) return source;
    try { return new URL(source, `${API_BASE_URL}/`).toString(); }
    catch { return ""; }
}

function apiUrl(path) {
    if (!API_BASE_URL) throw new Error("A URL da API não está configurada.");
    return `${API_BASE_URL}${path}`;
}

async function apiRequest(path, options = {}) {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("Sua sessão não foi encontrada. Entre novamente na conta.");
    const headers = {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
    };
    const response = await fetch(apiUrl(path), {
        method: options.method || "GET",
        headers,
        ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    });
    if (response.status === 204) return null;
    const body = await response.json().catch(() => null);
    if (!response.ok) {
        const detail = body?.detail;
        if (typeof detail === "string") throw new Error(detail);
        if (detail && typeof detail === "object") throw new Error(detail.message || "Não foi possível concluir a operação.");
        if (Array.isArray(detail)) throw new Error(detail.map((item) => item.msg || String(item)).join(" "));
        throw new Error(`Falha na comunicação com o servidor (HTTP ${response.status}).`);
    }
    return body;
}

function normalizeUsername(value) {
    return String(value || "")
        .trim()
        .replace(/^@+/, "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9._]/g, "");
}

function applyProfile(payload) {
    const id = String(payload?.id || localStorage.getItem("userId") || "");
    const savedUsername = id ? localStorage.getItem(`overclockSocietyUsername_${id}`) : "";
    const next = {
        ...payload,
        id,
        name: payload?.name || localStorage.getItem("userName") || "Usuário",
        email: payload?.email || localStorage.getItem("userEmail") || "",
        username: normalizeUsername(payload?.username || savedUsername || payload?.name || "usuario"),
        course: payload?.course || "",
        semester: Number(payload?.semester || 1),
        join_date: payload?.join_date || "",
        status: payload?.status || "offline",
        bio: payload?.bio || "",
        platforms: Array.isArray(payload?.platforms) ? [...payload.platforms] : [],
        genres: Array.isArray(payload?.genres) ? [...payload.genres] : [],
        current_game: payload?.current_game || "",
        current_game_status: payload?.current_game_status || "available",
        games_count: Number(payload?.games_count || 0),
        friends_count: Number(payload?.friends_count || 0),
        avatar_url: payload?.avatar_url || null,
        cover_url: payload?.cover_url || null,
        theme_hue: payload?.theme_hue ?? null,
    };
    Object.assign(profile, next);

    if (id) {
        localStorage.setItem("userId", id);
        localStorage.setItem(`overclockSocietyUsername_${id}`, next.username);
    }
    localStorage.setItem("userName", next.name);
    if (next.email) localStorage.setItem("userEmail", next.email);
    if (next.avatar_url) localStorage.setItem("userAvatarUrl", next.avatar_url);
    else localStorage.removeItem("userAvatarUrl");
    if (next.theme_hue === null || next.theme_hue === undefined) localStorage.removeItem("userThemeHue");
    else localStorage.setItem("userThemeHue", String(next.theme_hue));

    window.OverclockTheme?.applyProfileTheme(next.theme_hue);
    updateHeaderIdentity();
}

function updateHeaderIdentity() {
    document.querySelectorAll(".profile-name strong").forEach((element) => {
        element.textContent = profile.name;
    });
    document.querySelectorAll(".profile-button .avatar").forEach((element) => {
        const initial = String(profile.name || "?").trim().charAt(0).toUpperCase() || "?";
        element.replaceChildren();
        element.textContent = initial;
        window.OverclockTheme?.applyAvatarHue(element, profile.theme_hue);
        const avatarUrl = resolveMediaUrl(profile.avatar_url);
        if (!avatarUrl) return;
        const image = document.createElement("img");
        image.className = "profile-header-avatar-image";
        image.alt = "";
        image.loading = "eager";
        image.decoding = "async";
        image.addEventListener("error", () => {
            image.remove();
            element.textContent = initial;
        }, { once: true });
        element.textContent = "";
        element.appendChild(image);
        image.src = avatarUrl;
    });
}

function copyProfileToForm() {
    form.name = profile.name;
    form.username = profile.username;
    form.course = profile.course;
    form.semester = profile.semester;
    form.join_date = profile.join_date;
    form.status = profile.status;
    form.bio = profile.bio;
    form.platforms = [...profile.platforms];
    form.genres = [...profile.genres];
    form.current_game = profile.current_game;
    form.current_game_status = profile.current_game_status;
    form.error = "";
}

async function loadProfile() {
    if (profileRequestInProgress) return;
    const token = localStorage.getItem("token");
    if (!token) {
        profileLoading.value = false;
        profileError.value = "Sua sessão não foi encontrada. Faça login novamente.";
        return;
    }
    profileRequestInProgress = true;
    profileLoading.value = true;
    profileError.value = "";
    try {
        const result = await apiRequest("/auth/profile");
        applyProfile(result || {});
        await loadActivity(true);
    } catch (error) {
        profileError.value = error.message || "Não foi possível carregar o perfil.";
        window.console.error("Erro ao carregar o perfil:", error);
    } finally {
        profileLoading.value = false;
        profileRequestInProgress = false;
    }
}

function openEditor() {
    copyProfileToForm();
    pendingMedia.avatar = null;
    pendingMedia.cover = null;
    editorOpen.value = true;
}

function closeEditor() {
    if (saving.value) return;
    editorOpen.value = false;
    pendingMedia.avatar = null;
    pendingMedia.cover = null;
    form.error = "";
}

function updateEditorVisibility(value) {
    editorOpen.value = Boolean(value);
    if (!value && !saving.value) {
        pendingMedia.avatar = null;
        pendingMedia.cover = null;
        form.error = "";
    }
}

async function readBlobAsDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Não foi possível processar a imagem."));
        reader.readAsDataURL(blob);
    });
}

async function prepareProfileImage(file, kind) {
    if (!file || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        throw new Error("Escolha uma imagem JPG, PNG ou WebP.");
    }
    if (file.size > 12 * 1024 * 1024) throw new Error("A imagem original deve ter no máximo 12 MB.");
    if (typeof createImageBitmap !== "function") throw new Error("Seu navegador não oferece suporte ao processamento de imagens.");

    const limits = kind === "avatar"
        ? { width: 600, height: 600, bytes: 550 * 1024 }
        : { width: 1800, height: 800, bytes: 1250 * 1024 };
    const bitmap = await createImageBitmap(file);
    try {
        const scale = Math.min(1, limits.width / bitmap.width, limits.height / bitmap.height);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Não foi possível preparar a imagem.");
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        for (const quality of [0.86, 0.78, 0.70, 0.62]) {
            const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
            if (blob && blob.size <= limits.bytes) return await readBlobAsDataUrl(blob);
        }
        throw new Error("A imagem ainda ficou muito grande após a compactação. Escolha outra imagem.");
    } finally {
        bitmap.close?.();
    }
}

async function handleAvatarSelected(file) {
    try {
        pendingMedia.avatar = await prepareProfileImage(file, "avatar");
    } catch (error) {
        window.alert(error.message);
    }
}

async function handleCoverSelected(file) {
    try {
        pendingMedia.cover = await prepareProfileImage(file, "cover");
    } catch (error) {
        window.alert(error.message);
    }
}

async function saveProfile() {
    const name = String(form.name || "").trim();
    const username = normalizeUsername(form.username);
    if (name.length < 2 || !/^[a-z0-9._]{3,32}$/.test(username)) {
        form.error = "Informe um nome e um nome de usuário válido. O nome de usuário deve ter de 3 a 32 caracteres e pode conter letras, números, ponto e sublinhado.";
        return;
    }
    if (!localStorage.getItem("userId") || !localStorage.getItem("token")) {
        form.error = "Sua sessão não foi encontrada. Faça login novamente.";
        return;
    }

    saving.value = true;
    form.error = "";
    const payload = {
        name,
        username,
        course: String(form.course || "").trim(),
        semester: Number(form.semester || 1),
        join_date: form.join_date || null,
        status: form.status || "offline",
        bio: String(form.bio || "").trim(),
        platforms: [...form.platforms],
        genres: [...form.genres],
        current_game: String(form.current_game || "").trim(),
        current_game_status: form.current_game_status || "available",
    };

    try {
        const savedProfile = await apiRequest("/auth/profile", { method: "PUT", body: payload });
        const mediaPayload = {};
        if (pendingMedia.avatar) mediaPayload.avatar_data_url = pendingMedia.avatar;
        if (pendingMedia.cover) mediaPayload.cover_data_url = pendingMedia.cover;
        if (Object.keys(mediaPayload).length) {
            const mediaResult = await apiRequest("/auth/profile/media", { method: "PUT", body: mediaPayload });
            Object.assign(savedProfile, mediaResult || {});
        }

        applyProfile(savedProfile || payload);
        pendingMedia.avatar = null;
        pendingMedia.cover = null;
        editorOpen.value = false;
        window.dispatchEvent(new CustomEvent("overclock:profile-updated", { detail: savedProfile }));
        notify("Perfil salvo com sucesso!", "success");
    } catch (error) {
        form.error = error.message || "Não foi possível salvar o perfil.";
        notify(`Não foi possível salvar o perfil: ${form.error}`, "error");
    } finally {
        saving.value = false;
    }
}

function notify(message, type = "info") {
    if (window.OverclockUI?.notify) window.OverclockUI.notify(message, type);
    else window.alert(message);
}

async function loadActivity(force = false) {
    if (!profile.id) return;
    if (activityLoading.value && !force) return;
    if (activityLoaded.value && !force) return;

    const requestId = ++activityRequestSequence;
    activityLoading.value = true;
    Object.assign(activityErrors, { posts: "", replies: "", reposts: "" });
    const userId = encodeURIComponent(profile.id);
    const paths = {
        posts: `/profiles/id/${userId}/posts`,
        replies: `/profiles/id/${userId}/replies`,
        reposts: `/profiles/id/${userId}/reposts`,
    };

    try {
        const entries = Object.entries(paths);
        const results = await Promise.allSettled(entries.map(([, path]) => apiRequest(path)));
        if (requestId !== activityRequestSequence) return;
        results.forEach((result, index) => {
            const key = entries[index][0];
            if (result.status === "fulfilled") {
                activityData[key] = Array.isArray(result.value) ? result.value : [];
                activityErrors[key] = "";
            } else {
                activityData[key] = [];
                activityErrors[key] = result.reason?.message || "Falha na comunicação com o servidor.";
                window.console.warn(`Não foi possível carregar ${key} do perfil:`, result.reason);
            }
        });
        activityLoaded.value = true;
    } finally {
        if (requestId === activityRequestSequence) activityLoading.value = false;
    }
}

async function refreshAfterActivityAction() {
    await loadActivity(true);
    if (window.OverclockNotifications?.refreshFromServer) {
        await window.OverclockNotifications.refreshFromServer();
    }
}

async function runPostAction(postId, action) {
    const paths = {
        like: { method: "POST", path: `/feed/posts/${postId}/like` },
        repost: { method: "POST", path: `/feed/posts/${postId}/repost` },
        delete: { method: "DELETE", path: `/feed/posts/${postId}` },
    };
    const config = paths[action];
    if (!config) return;
    if (action === "delete") {
        const confirmed = window.OverclockUI?.confirm
            ? await window.OverclockUI.confirm("Deseja realmente excluir esta publicação?", { title: "Excluir publicação", confirmLabel: "Excluir", danger: true })
            : window.confirm("Deseja realmente excluir esta publicação?");
        if (!confirmed) return;
    }
    try {
        await apiRequest(config.path, { method: config.method });
        await refreshAfterActivityAction();
        if (action === "delete") notify("Publicação excluída.", "success");
    } catch (error) {
        notify(`Não foi possível atualizar a publicação: ${error.message}`, "error");
    }
}

async function addComment({ postId, content }) {
    try {
        await apiRequest(`/feed/posts/${postId}/comments`, { method: "POST", body: { content } });
        await refreshAfterActivityAction();
    } catch (error) {
        notify(`Não foi possível enviar a resposta: ${error.message}`, "error");
        throw error;
    }
}

async function deleteComment({ postId, commentId }) {
    try {
        await apiRequest(`/feed/posts/${postId}/comments/${commentId}`, { method: "DELETE" });
        await refreshAfterActivityAction();
    } catch (error) {
        notify(`Não foi possível excluir o comentário: ${error.message}`, "error");
    }
}

function openReplyInFeed(reply, focusReply = false) {
    const postId = reply?.post?.id;
    if (postId == null) return;
    const params = new URLSearchParams({ postId: String(postId) });
    if (reply.id != null) params.set("commentId", String(reply.id));
    if (focusReply) params.set("focusReply", "1");
    window.location.href = `feed.html?${params.toString()}`;
}

function changeSection(section) {
    activeSection.value = section;
    if (section === "posts") void loadActivity();
}

function changeActivityTab(tab) {
    if (!["posts", "replies", "reposts"].includes(tab)) return;
    activeActivityTab.value = tab;
    if (!activityLoaded.value || activityErrors[tab]) void loadActivity(true);
}

function handleSessionReady() {
    if (!profile.id) void loadProfile();
}
function handleProfileUpdated() {
    void loadProfile();
}
function handleEscape(event) {
    if (event.key === "Escape" && editorOpen.value) closeEditor();
}

async function openEditorAndPick(kind) {
    openEditor();
    await nextTick();
    profileEditor.value?.openFilePicker(kind);
}

onMounted(() => {
    window.addEventListener("overclock:session-ready", handleSessionReady);
    window.addEventListener("overclock:profile-updated", handleProfileUpdated);
    document.addEventListener("keydown", handleEscape);
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "posts") activeSection.value = "posts";
    if (["posts", "replies", "reposts"].includes(params.get("activity"))) {
        activeSection.value = "posts";
        activeActivityTab.value = params.get("activity");
    }
    void loadProfile();
});

onBeforeUnmount(() => {
    window.removeEventListener("overclock:session-ready", handleSessionReady);
    window.removeEventListener("overclock:profile-updated", handleProfileUpdated);
    document.removeEventListener("keydown", handleEscape);
});
</script>

<template>
    <main class="dashboard-content profile-page">
        <nav class="profile-tabs" role="tablist" aria-label="Seções do perfil">
            <button
                type="button"
                class="profile-tab-button"
                :class="{ active: activeSection === 'profile' }"
                role="tab"
                :aria-selected="String(activeSection === 'profile')"
                @click="changeSection('profile')"
            >👤 Perfil</button>
            <button
                id="profilePostsTab"
                type="button"
                class="profile-tab-button"
                :class="{ active: activeSection === 'posts' }"
                role="tab"
                :aria-selected="String(activeSection === 'posts')"
                @click="changeSection('posts')"
            >📰 Publicações <span class="profile-tab-count">{{ postCount }}</span></button>
        </nav>

        <section v-if="activeSection === 'profile'" class="profile-tab-panel active" role="tabpanel">
            <div v-if="profileLoading && !profile.id" class="profile-loading-state">
                <span class="profile-loading-spinner"></span>
                <p>Carregando seu perfil...</p>
            </div>
            <div v-else-if="profileError" class="profile-load-error" role="alert">
                <strong>Não foi possível carregar seu perfil.</strong>
                <p>{{ profileError }}</p>
                <button type="button" class="btn btn-primary" @click="loadProfile">Tentar novamente</button>
            </div>
            <template v-else>
                <ProfileHero
                    :profile="profile"
                    :avatar-url="avatarPreviewUrl"
                    :cover-url="coverPreviewUrl"
                    :loading="profileLoading"
                    @edit="openEditor"
                    @edit-avatar="openEditorAndPick('avatar')"
                    @edit-cover="openEditorAndPick('cover')"
                />
                <ProfileInfoGrid :profile="profile" />
            </template>
        </section>

        <ProfileActivity
            v-else
            :data="activityData"
            :errors="activityErrors"
            :loading="activityLoading"
            :active-tab="activeActivityTab"
            :current-user-id="currentUserId"
            :on-add-comment="addComment"
            @change-tab="changeActivityTab"
            @like="runPostAction($event, 'like')"
            @repost="runPostAction($event, 'repost')"
            @delete-post="runPostAction($event, 'delete')"
            @delete-comment="deleteComment"
            @open-feed="openReplyInFeed"
            @retry="loadActivity(true)"
        />
    </main>

    <ProfileEditorModal
        ref="profileEditor"
        :model-value="editorOpen"
        @update:model-value="updateEditorVisibility"
        :form="form"
        :saving="saving"
        :avatar-preview-url="pendingMedia.avatar"
        :cover-preview-url="pendingMedia.cover"
        @save="saveProfile"
        @avatar-selected="handleAvatarSelected"
        @cover-selected="handleCoverSelected"
    />
</template>

<style>
.profile-loading-state,
.profile-load-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    min-height: 220px;
    padding: 28px;
    color: #cbd5e1;
    text-align: center;
}
.profile-load-error p { color: #94a3b8; font-size: 13px; }
.profile-loading-spinner {
    width: 28px;
    height: 28px;
    border: 3px solid rgba(255,255,255,.15);
    border-top-color: #e6a0a2;
    border-radius: 50%;
    animation: profile-spin .8s linear infinite;
}
@keyframes profile-spin { to { transform: rotate(360deg); } }
</style>
