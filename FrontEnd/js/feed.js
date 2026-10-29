/* =========================================
   OVERCLOCK SOCIETY — FEED INTEGRADO À API
   Publicações, comentários, curtidas e repostagens
   são persistidos no PostgreSQL pelo backend.
========================================= */

const postInput = document.getElementById("postInput");
const publishPostButton = document.getElementById("publishPostButton");
const characterCounter = document.getElementById("characterCounter");
const postsList = document.getElementById("postsList");
const feedFilter = document.getElementById("feedFilter");
const activeHashtag = document.getElementById("activeHashtag");
const clearFilterButton = document.getElementById("clearFilterButton");
const trendingGames = document.getElementById("trendingGames");
const searchInput = document.getElementById("searchInput");
const profileButton = document.getElementById("profileButton");

const FEED_API_BASE_URL =
    ["127.0.0.1", "localhost"].includes(window.location.hostname)
        ? "http://127.0.0.1:8000"
        : "https://overclock-api.onrender.com";

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
    { name: "Spider-Man", hashtag: "spiderman" }
];

let posts = [];
let currentHashtagFilter = null;

const activeCommentPostIds = new Set();
let postsLoadSequence = 0;

const feedDeepLinkParams = new URLSearchParams(window.location.search);
const requestedFeedPostId = feedDeepLinkParams.get("postId");
const requestedFeedSearch = feedDeepLinkParams.get("search");
if (requestedFeedSearch && searchInput) searchInput.value = requestedFeedSearch;
const requestedFeedCommentId = feedDeepLinkParams.get("commentId");
const focusFeedReplyComposer = feedDeepLinkParams.get("focusReply") === "1";
let feedDeepLinkHandled = false;


/* =========================================
   USUÁRIO ATUAL E API
========================================= */

function getCurrentUserId() {
    return localStorage.getItem("userId");
}


function getCurrentUserName() {
    return localStorage.getItem("userName") || "Usuário";
}


function getCurrentUsername() {
    const id = getCurrentUserId();

    const stored = id
        ? localStorage.getItem(
            `overclockSocietyUsername_${id}`
        )
        : null;

    if (stored) {
        return `@${stored.replace(/^@+/, "")}`;
    }

    const normalized = getCurrentUserName()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9._]/g, "");

    return `@${normalized || "usuario"}`;
}


function getAvatarLetter(name) {
    return (
        String(name || "?")
            .trim()
            .charAt(0)
            .toUpperCase() || "?"
    );
}


function updateComposerIdentity(
    name = getCurrentUserName()
) {
    const composerAvatar =
        document.querySelector(".composer-avatar");

    if (composerAvatar) {
        composerAvatar.textContent =
            getAvatarLetter(name);
    }
}


function getApiErrorMessage(body, fallback) {
    if (typeof body?.detail === "string") {
        return body.detail;
    }

    if (Array.isArray(body?.detail)) {
        return body.detail
            .map((item) => {
                if (typeof item === "string") {
                    return item;
                }

                return item?.msg || "Dados inválidos.";
            })
            .join(" ");
    }

    return fallback;
}


async function feedApiRequest(path, options = {}) {
    const token = localStorage.getItem("token");

    if (!token) {
        throw new Error(
            "Sua sessão não foi encontrada. Entre novamente."
        );
    }

    const headers = {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`
    };

    if (
        options.body &&
        !headers["Content-Type"]
    ) {
        headers["Content-Type"] = "application/json";
    }

    const response = await fetch(
        `${FEED_API_BASE_URL}${path}`,
        {
            ...options,
            headers
        }
    );

    if (response.status === 204) {
        return null;
    }

    const body = await response
        .json()
        .catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            getApiErrorMessage(
                body,
                "Não foi possível concluir a operação."
            )
        );
    }

    return body;
}


/* =========================================
   ATUALIZAR A CENTRAL DE NOTIFICAÇÕES
========================================= */

async function refreshFeedNotificationCenter(action, post, commentText = "") {
    const notificationCenter = window.OverclockNotifications;

    if (
        !post ||
        !notificationCenter ||
        typeof notificationCenter.notifyFeedAction !== "function"
    ) {
        return null;
    }

    // A própria API do Feed também grava a notificação no PostgreSQL.
    // Este método confirma/sincroniza a central aberta no navegador.
    // Publicações próprias não geram notificação para o próprio autor.
    if (
        post.userId != null &&
        String(post.userId) === String(getCurrentUserId())
    ) {
        return null;
    }

    try {
        return await notificationCenter.notifyFeedAction({
            action,
            actorName: getCurrentUserName(),
            actorAvatar: getAvatarLetter(getCurrentUserName()),
            postId: post.id,
            commentText
        });
    } catch (error) {
        // A interação do Feed já foi salva. Uma falha de atualização visual
        // da central não deve desfazer ou invalidar a curtida/comentário/repost.
        console.warn(
            "A interação foi salva, mas não foi possível atualizar a central de notificações.",
            error
        );
        return null;
    }
}


/* =========================================
   JOGOS E HASHTAGS
========================================= */

function normalizeHashtag(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/^#/, "")
        .trim();
}


function isValidGameHashtag(hashtag) {
    const normalized = normalizeHashtag(hashtag);

    return games.some(
        (game) => game.hashtag === normalized
    );
}


function getGameByHashtag(hashtag) {
    const normalized = normalizeHashtag(hashtag);

    return games.find(
        (game) => game.hashtag === normalized
    );
}


function createPostTextElement(content) {
    const paragraph = document.createElement("p");

    paragraph.className = "post-text";

    const parts = String(content || "")
        .split(/(#[a-zA-ZÀ-ÿ0-9_-]+)/g);

    parts.forEach((part) => {
        if (
            part.startsWith("#") &&
            isValidGameHashtag(part)
        ) {
            const hashtag =
                document.createElement("button");

            hashtag.type = "button";
            hashtag.className = "game-hashtag";
            hashtag.textContent = part;
            hashtag.style.border = "none";
            hashtag.style.background = "transparent";
            hashtag.style.padding = "0";
            hashtag.style.font = "inherit";

            hashtag.addEventListener(
                "click",
                () => filterByHashtag(part)
            );

            paragraph.appendChild(hashtag);

        } else {
            paragraph.appendChild(
                document.createTextNode(part)
            );
        }
    });

    return paragraph;
}


/* =========================================
   CARREGAR PUBLICAÇÕES DO POSTGRESQL
========================================= */

/* =========================================
   ABRIR UMA PUBLICAÇÃO/RESPOSTA DIRETAMENTE
========================================= */

function focusFeedDeepLinkTarget() {
    if (!requestedFeedPostId || feedDeepLinkHandled || !postsList) return;

    const postCard = Array.from(postsList.querySelectorAll(".post-card"))
        .find((card) => card.dataset.postId === String(requestedFeedPostId));

    if (!postCard) return;

    const targetComment = requestedFeedCommentId
        ? document.getElementById(`feed-comment-${requestedFeedCommentId}`)
        : null;
    const target = targetComment || postCard;
    feedDeepLinkHandled = true;

    target.setAttribute("tabindex", "-1");
    target.style.outline = "2px solid rgba(29, 155, 240, 0.95)";
    target.style.outlineOffset = "3px";
    target.style.boxShadow = "0 0 0 5px rgba(29, 155, 240, 0.14)";
    target.style.transition = "outline-color 0.2s ease, box-shadow 0.2s ease";

    window.setTimeout(() => {
        if (!target.isConnected) return;
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        try {
            target.focus({ preventScroll: true });
        } catch (error) {
            target.focus();
        }

        if (focusFeedReplyComposer) {
            const input = postCard.querySelector(".comments-section input");
            if (input) {
                window.setTimeout(() => {
                    if (input.isConnected) input.focus({ preventScroll: true });
                }, 350);
            }
        }
    }, 100);

    window.setTimeout(() => {
        if (!target.isConnected) return;
        target.style.removeProperty("outline");
        target.style.removeProperty("outline-offset");
        target.style.removeProperty("box-shadow");
        target.style.removeProperty("transition");
    }, 4500);
}

async function loadPosts() {
    const requestNumber = ++postsLoadSequence;

    if (postsList) {
        postsList.setAttribute("aria-busy", "true");
    }

    try {
        const result = await feedApiRequest(
            "/feed/posts"
        );

        // Impede uma resposta antiga de substituir
        // os dados de uma atualização mais recente.
        if (requestNumber !== postsLoadSequence) {
            return;
        }

        posts = Array.isArray(result)
            ? result
            : [];

        if (requestedFeedPostId) {
            // Ao vir de uma resposta do perfil, removemos filtros para que
            // a publicação de destino continue visível e abrimos seus comentários.
            clearHashtagFilter();
            if (searchInput) searchInput.value = "";
            activeCommentPostIds.add(String(requestedFeedPostId));
        }

        renderPosts();
        renderTrendingGames();
        focusFeedDeepLinkTarget();

    } catch (error) {
        if (requestNumber !== postsLoadSequence) {
            return;
        }

        console.error(
            "Erro ao carregar o Feed:",
            error
        );

        showFeedError(error.message);

    } finally {
        if (
            requestNumber === postsLoadSequence &&
            postsList
        ) {
            postsList.removeAttribute("aria-busy");
        }
    }
}


function showFeedError(message) {
    if (!postsList) return;

    postsList.innerHTML = "";

    const errorElement =
        document.createElement("div");

    errorElement.className = "empty-feed";

    errorElement.textContent =
        `Não foi possível carregar o Feed. ${message}`;

    postsList.appendChild(errorElement);
}


function applySearchFilter() {
    // A busca do cabeçalho agora é global. O filtro local do Feed é aplicado
    // quando a pessoa chega por um resultado de jogo (?search=...), evitando
    // que a digitação de um nome de jogador esconda todas as publicações atrás.
    const term = requestedFeedSearch
        ? requestedFeedSearch.trim().toLocaleLowerCase("pt-BR")
        : "";

    const cards = Array.from(document.querySelectorAll(".post-card"));
    let visibleCount = 0;

    cards.forEach((card) => {
        const matches = !term || card.textContent.toLocaleLowerCase("pt-BR").includes(term);
        card.style.display = matches ? "" : "none";
        if (matches) visibleCount += 1;
    });

    let emptyState = document.getElementById("feedSearchEmptyState");
    if (term && cards.length > 0 && visibleCount === 0) {
        if (!emptyState) {
            emptyState = document.createElement("div");
            emptyState.id = "feedSearchEmptyState";
            emptyState.className = "empty-feed";
            postsList?.appendChild(emptyState);
        }
        emptyState.textContent = `Nenhuma publicação encontrada para “${requestedFeedSearch}”.`;
    } else if (emptyState) {
        emptyState.remove();
    }
}


function renderPosts() {
    if (!postsList) return;

    postsList.innerHTML = "";

    let visiblePosts = posts;

    if (currentHashtagFilter) {
        const regex = new RegExp(
            `#${currentHashtagFilter}(?![a-z0-9_])`,
            "i"
        );

        visiblePosts = posts.filter(
            (post) => regex.test(post.content || "")
        );
    }

    if (visiblePosts.length === 0) {
        const empty =
            document.createElement("div");

        empty.className = "empty-feed";

        empty.textContent = currentHashtagFilter
            ? "Nenhuma publicação encontrada para esta hashtag."
            : (
                "Ainda não há publicações. Seja o primeiro "
                + "a compartilhar algo com a comunidade!"
            );

        postsList.appendChild(empty);
        return;
    }

    visiblePosts.forEach((post) => {
        postsList.appendChild(
            createPostCard(post)
        );
    });

    applySearchFilter();
}


/* =========================================
   LINKS PARA PERFIS DE USUÁRIOS REAIS
========================================= */

function getUserProfileUrl(user) {
    // A API atual retorna userId; os outros nomes mantêm compatibilidade
    // caso o backend ou uma versão antiga use snake_case/authorId.
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
        if (currentUserId && String(currentUserId) === String(userId)) {
            return ownProfileUrl;
        }

        publicProfileUrl.searchParams.set("userId", String(userId));
        return publicProfileUrl.href;
    }

    const username = String(
        user?.username ?? user?.user?.username ?? user?.authorUsername ?? ""
    ).trim().replace(/^@+/, "");

    if (!username || username.toLocaleLowerCase("pt-BR") === "usuario") {
        return null;
    }

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

function configureProfileAnchor(element, url, displayName) {
    if (!element || !url || element.tagName !== "A") return element;

    element.href = url;
    element.classList.add("user-profile-link");
    element.setAttribute("aria-label", `Abrir perfil de ${displayName || "jogador"}`);
    element.setAttribute("title", `Abrir perfil de ${displayName || "jogador"}`);
    // A navegação é um link HTML real, sem depender de um handler de clique.
    return element;
}


/* =========================================
   BOTÕES DE AÇÃO
========================================= */

function createActionButton(icon, count, label) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "post-action";

    const iconSpan = document.createElement("span");
    iconSpan.textContent = icon;

    const countSpan = document.createElement("span");
    countSpan.textContent = String(count ?? 0);

    const labelSpan = document.createElement("span");
    labelSpan.textContent = label;

    button.append(
        iconSpan,
        countSpan,
        labelSpan
    );

    button.setAttribute(
        "aria-label",
        `${label}: ${count ?? 0}`
    );

    return button;
}


function createPostCard(post) {
    const article =
        document.createElement("article");

    article.className = "post-card";
    if (post.id != null) article.dataset.postId = String(post.id);

    const header =
        document.createElement("div");

    header.className = "post-header";

    const postAuthor = {
        id: post.userId ?? post.user_id ?? post.authorId ?? post.author_id ?? post.user?.id,
        username: post.username ?? post.user?.username ?? post.authorUsername,
        name: post.author ?? post.user?.name
    };
    const profileUrl = getUserProfileUrl(postAuthor);
    const authorName = String(postAuthor.name || "Usuário").trim();

    // Usamos âncoras nativas no avatar, nome e username. Assim o navegador
    // consegue navegar mesmo sem depender de listeners JavaScript no elemento.
    const avatar = document.createElement(profileUrl ? "a" : "div");
    avatar.className = "post-avatar";
    avatar.textContent = post.avatar || getAvatarLetter(authorName);
    configureProfileAnchor(avatar, profileUrl, authorName);

    const user = document.createElement("div");
    user.className = "post-user";

    const userLine = document.createElement("div");
    userLine.className = "post-user-line";

    const author = document.createElement(profileUrl ? "a" : "strong");
    author.className = profileUrl ? "post-author-link" : "post-author-name";
    author.textContent = authorName;
    configureProfileAnchor(author, profileUrl, authorName);

    const username = document.createElement(profileUrl ? "a" : "span");
    username.className = "post-username";
    username.textContent = post.username || "@usuario";
    configureProfileAnchor(username, profileUrl, authorName);

    const time =
        document.createElement("span");

    time.className = "post-time";

    time.textContent =
        `• ${post.createdAt || "agora"}`;

    userLine.append(
        author,
        username,
        time
    );

    user.append(
        userLine,
        createPostTextElement(post.content)
    );

    header.append(
        avatar,
        user
    );

    article.appendChild(header);

    const actions =
        document.createElement("div");

    actions.className = "post-actions";

    const comments = Array.isArray(post.comments)
        ? post.comments
        : [];

    const commentButton = createActionButton(
        "💬",
        comments.length,
        "Comentar"
    );

    const repostButton = createActionButton(
        post.reposted ? "✅" : "🔁",
        post.reposts,
        "Repostar"
    );

    const likeButton = createActionButton(
        post.liked ? "❤️" : "♡",
        post.likes,
        "Curtir"
    );

    if (post.liked) {
        likeButton.classList.add("liked");
    }

    if (post.reposted) {
        repostButton.classList.add("reposted");
    }

    actions.append(
        commentButton,
        repostButton,
        likeButton
    );

    const currentUserId = getCurrentUserId();

    const canDeletePost =
        post.userId != null &&
        String(post.userId) === String(currentUserId);

    if (canDeletePost) {
        const deleteButton =
            document.createElement("button");

        deleteButton.type = "button";

        deleteButton.className =
            "post-action post-delete-button";

        deleteButton.innerHTML =
            "<span>🗑</span><span>Excluir</span>";

        deleteButton.addEventListener(
            "click",
            () => deletePost(post.id)
        );

        actions.appendChild(deleteButton);
    }

    article.appendChild(actions);

    const commentsSection =
        createCommentsSection(post);

    article.appendChild(commentsSection);

    commentButton.addEventListener(
        "click",
        () => {
            const key = String(post.id);

            if (activeCommentPostIds.has(key)) {
                activeCommentPostIds.delete(key);
                commentsSection.classList.remove("active");

            } else {
                activeCommentPostIds.add(key);
                commentsSection.classList.add("active");
            }
        }
    );

    likeButton.addEventListener(
        "click",
        () => toggleLike(post.id, likeButton)
    );

    repostButton.addEventListener(
        "click",
        () => toggleRepost(post.id, repostButton)
    );

    return article;
}


/* =========================================
   COMENTÁRIOS
========================================= */

function createCommentsSection(post) {
    const section =
        document.createElement("div");

    section.className = "comments-section";

    if (
        activeCommentPostIds.has(String(post.id))
    ) {
        section.classList.add("active");
    }

    const list =
        document.createElement("div");

    list.className = "comments-list";

    (post.comments || []).forEach((comment) => {
        list.appendChild(
            createComment(comment, post.id)
        );
    });

    const form =
        document.createElement("form");

    form.className = "comment-form";

    const input =
        document.createElement("input");

    input.type = "text";
    input.placeholder = "Escreva um comentário...";
    input.maxLength = 180;
    input.required = true;

    input.setAttribute(
        "aria-label",
        "Texto do comentário"
    );

    const button =
        document.createElement("button");

    button.type = "submit";
    button.textContent = "Enviar";

    form.append(input, button);

    form.addEventListener(
        "submit",
        async (event) => {
            event.preventDefault();

            const text = input.value.trim();

            if (!text) return;

            button.disabled = true;
            button.textContent = "Enviando...";

            activeCommentPostIds.add(
                String(post.id)
            );

            try {
                await feedApiRequest(
                    `/feed/posts/${post.id}/comments`,
                    {
                        method: "POST",
                        body: JSON.stringify({
                            content: text
                        })
                    }
                );

                await refreshFeedNotificationCenter(
                    "comment",
                    post,
                    text
                );

                await loadPosts();

            } catch (error) {
                console.error(
                    "Erro ao criar comentário:",
                    error
                );

                alert(
                    "Não foi possível enviar o comentário: "
                    + error.message
                );

            } finally {
                button.disabled = false;
                button.textContent = "Enviar";
            }
        }
    );

    section.append(
        list,
        form
    );

    return section;
}


function createComment(comment, postId) {
    const element =
        document.createElement("div");

    element.className = "comment";
    if (comment.id != null) {
        element.id = `feed-comment-${comment.id}`;
        element.dataset.commentId = String(comment.id);
    }

    const commentAuthor = {
        id: comment.userId ?? comment.user_id ?? comment.authorId ?? comment.author_id,
        username: comment.username ?? comment.authorUsername,
        name: comment.author
    };
    const commentProfileUrl = getUserProfileUrl(commentAuthor);
    const commentAuthorName = String(commentAuthor.name || "Usuário").trim();

    const avatar = document.createElement(commentProfileUrl ? "a" : "div");
    avatar.className = "comment-avatar";
    avatar.textContent = comment.avatar || getAvatarLetter(commentAuthorName);
    configureProfileAnchor(avatar, commentProfileUrl, commentAuthorName);

    const body = document.createElement("div");
    body.className = "comment-body";

    const user = document.createElement(commentProfileUrl ? "a" : "div");
    user.className = "comment-user";
    user.textContent = commentAuthorName;
    configureProfileAnchor(user, commentProfileUrl, commentAuthorName);

    const text =
        document.createElement("div");

    text.className = "comment-text";

    text.textContent =
        comment.text || "";

    body.append(
        user,
        text
    );

    const currentUserId =
        getCurrentUserId();

    const canDeleteComment =
        comment.id != null &&
        String(comment.userId) === String(currentUserId);

    if (canDeleteComment) {
        const deleteButton =
            document.createElement("button");

        deleteButton.type = "button";

        deleteButton.className =
            "comment-delete-button";

        deleteButton.textContent =
            "🗑 Excluir";

        deleteButton.addEventListener(
            "click",
            () => deleteComment(postId, comment.id)
        );

        body.appendChild(deleteButton);
    }

    element.append(
        avatar,
        body
    );

    return element;
}


/* =========================================
   EXCLUSÕES — AUTORIZAÇÃO NO BACKEND
========================================= */

async function deletePost(postId) {
    const post = posts.find(
        (item) => String(item.id) === String(postId)
    );

    if (!post) return;

    if (
        String(post.userId) !==
        String(getCurrentUserId())
    ) {
        console.warn(
            "Você só pode excluir suas próprias publicações."
        );

        return;
    }

    if (
        !window.confirm(
            "Deseja realmente excluir esta publicação?"
        )
    ) {
        return;
    }

    try {
        await feedApiRequest(
            `/feed/posts/${postId}`,
            {
                method: "DELETE"
            }
        );

        activeCommentPostIds.delete(
            String(postId)
        );

        await loadPosts();

    } catch (error) {
        console.error(
            "Erro ao excluir publicação:",
            error
        );

        alert(
            "Não foi possível excluir a publicação: "
            + error.message
        );
    }
}


async function deleteComment(postId, commentId) {
    const post = posts.find(
        (item) => String(item.id) === String(postId)
    );

    const comment = (post?.comments || []).find(
        (item) => String(item.id) === String(commentId)
    );

    if (!comment) return;

    if (
        String(comment.userId) !==
        String(getCurrentUserId())
    ) {
        console.warn(
            "Você só pode excluir seus próprios comentários."
        );

        return;
    }

    if (
        !window.confirm(
            "Deseja realmente excluir este comentário?"
        )
    ) {
        return;
    }

    activeCommentPostIds.add(
        String(postId)
    );

    try {
        await feedApiRequest(
            `/feed/posts/${postId}/comments/${commentId}`,
            {
                method: "DELETE"
            }
        );

        await loadPosts();

    } catch (error) {
        console.error(
            "Erro ao excluir comentário:",
            error
        );

        alert(
            "Não foi possível excluir o comentário: "
            + error.message
        );
    }
}


/* =========================================
   CURTIR E REPOSTAR
========================================= */

async function toggleLike(postId, button) {
    if (button) {
        button.disabled = true;
    }

    try {
        const result = await feedApiRequest(
            `/feed/posts/${postId}/like`,
            {
                method: "POST"
            }
        );

        const post = posts.find(
            (item) => String(item.id) === String(postId)
        );

        if (post) {
            post.liked = result.liked;
            post.likes = result.likes;
        }

        if (result.liked) {
            await refreshFeedNotificationCenter(
                "like",
                post || { id: postId }
            );
        }

        renderPosts();

    } catch (error) {
        console.error(
            "Erro ao atualizar curtida:",
            error
        );

        alert(
            "Não foi possível atualizar a curtida: "
            + error.message
        );

    } finally {
        if (button) {
            button.disabled = false;
        }
    }
}


async function toggleRepost(postId, button) {
    if (button) {
        button.disabled = true;
    }

    try {
        const result = await feedApiRequest(
            `/feed/posts/${postId}/repost`,
            {
                method: "POST"
            }
        );

        const post = posts.find(
            (item) => String(item.id) === String(postId)
        );

        if (post) {
            post.reposted = result.reposted;
            post.reposts = result.reposts;
        }

        if (result.reposted) {
            await refreshFeedNotificationCenter(
                "repost",
                post || { id: postId }
            );
        }

        renderPosts();

    } catch (error) {
        console.error(
            "Erro ao atualizar repostagem:",
            error
        );

        alert(
            "Não foi possível atualizar a repostagem: "
            + error.message
        );

    } finally {
        if (button) {
            button.disabled = false;
        }
    }
}


/* =========================================
   PUBLICAR
========================================= */

async function publishPost() {
    const content =
        postInput?.value.trim() || "";

    if (!content) {
        postInput?.focus();
        return;
    }

    if (content.length > 280) {
        alert(
            "A publicação deve ter no máximo 280 caracteres."
        );

        return;
    }

    if (publishPostButton) {
        publishPostButton.disabled = true;
        publishPostButton.textContent = "Publicando...";
    }

    try {
        await feedApiRequest(
            "/feed/posts",
            {
                method: "POST",
                body: JSON.stringify({
                    content
                })
            }
        );

        postInput.value = "";

        updateCharacterCounter();
        clearHashtagFilter();

        await loadPosts();

    } catch (error) {
        console.error(
            "Erro ao publicar:",
            error
        );

        alert(
            "Não foi possível publicar: "
            + error.message
        );

    } finally {
        if (publishPostButton) {
            publishPostButton.disabled = false;
            publishPostButton.textContent = "Publicar";
        }
    }
}


/* =========================================
   FILTRO POR HASHTAG
========================================= */

function filterByHashtag(
    hashtag,
    shouldScroll = true
) {
    const normalized = normalizeHashtag(hashtag);

    if (!isValidGameHashtag(normalized)) {
        return;
    }

    currentHashtagFilter = normalized;

    const game = getGameByHashtag(normalized);

    if (activeHashtag) {
        activeHashtag.textContent =
            `#${game.hashtag}`;
    }

    feedFilter?.classList.add("active");

    renderPosts();

    if (shouldScroll) {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }
}


function clearHashtagFilter() {
    currentHashtagFilter = null;

    feedFilter?.classList.remove("active");

    if (activeHashtag) {
        activeHashtag.textContent = "";
    }
}


/* =========================================
   JOGOS EM DESTAQUE
========================================= */

function renderTrendingGames() {
    if (!trendingGames) return;

    trendingGames.innerHTML = "";

    const ranking = games
        .map((game) => {
            const regex = new RegExp(
                `#${game.hashtag}(?![a-z0-9_])`,
                "i"
            );

            const postsCount = posts.filter(
                (post) => regex.test(post.content || "")
            ).length;

            return {
                ...game,
                postsCount
            };
        })
        .filter((game) => game.postsCount > 0)
        .sort((a, b) => b.postsCount - a.postsCount)
        .slice(0, 5);

    if (ranking.length === 0) {
        const empty =
            document.createElement("p");

        empty.className = "empty-feed";

        empty.textContent =
            "As hashtags em destaque aparecerão aqui.";

        trendingGames.appendChild(empty);
        return;
    }

    ranking.forEach((game) => {
        const item =
            document.createElement("div");

        item.className = "trending-game";
        item.tabIndex = 0;
        item.setAttribute("role", "button");

        item.setAttribute(
            "aria-label",
            `Filtrar por #${game.hashtag}`
        );

        const left =
            document.createElement("div");

        const name =
            document.createElement("strong");

        name.textContent =
            `#${game.hashtag}`;

        const gameName =
            document.createElement("span");

        gameName.textContent =
            game.name;

        left.append(
            name,
            gameName
        );

        const count =
            document.createElement("span");

        count.textContent =
            `${game.postsCount} posts`;

        item.append(
            left,
            count
        );

        item.addEventListener(
            "click",
            () => filterByHashtag(game.hashtag)
        );

        item.addEventListener(
            "keydown",
            (event) => {
                if (
                    event.key === "Enter" ||
                    event.key === " "
                ) {
                    event.preventDefault();

                    filterByHashtag(
                        game.hashtag
                    );
                }
            }
        );

        trendingGames.appendChild(item);
    });
}


/* =========================================
   CONTADOR, PESQUISA E NAVEGAÇÃO
========================================= */

function updateCharacterCounter() {
    if (!postInput || !characterCounter) {
        return;
    }

    characterCounter.textContent =
        `${postInput.value.length} / 280`;
}


if (profileButton) {
    profileButton.addEventListener(
        "click",
        () => {
            window.location.href = "perfil.html";
        }
    );
}


postInput?.addEventListener(
    "input",
    updateCharacterCounter
);


publishPostButton?.addEventListener(
    "click",
    publishPost
);


postInput?.addEventListener(
    "keydown",
    (event) => {
        if (
            event.ctrlKey &&
            event.key === "Enter"
        ) {
            publishPost();
        }
    }
);


clearFilterButton?.addEventListener(
    "click",
    () => {
        clearHashtagFilter();
        renderPosts();
    }
);


/* =========================================
   INICIALIZAÇÃO DA SESSÃO
========================================= */

window.addEventListener(
    "overclock:session-ready",
    (event) => {
        const user = event.detail || {};

        if (user.id) {
            localStorage.setItem(
                "userId",
                String(user.id)
            );
        }

        if (user.name) {
            localStorage.setItem(
                "userName",
                user.name
            );
        }

        if (user.email) {
            localStorage.setItem(
                "userEmail",
                user.email
            );
        }

        if (user.username && user.id) {
            localStorage.setItem(
                `overclockSocietyUsername_${user.id}`,
                user.username.replace(/^@+/, "")
            );
        }

        updateComposerIdentity(
            user.name || getCurrentUserName()
        );

        loadPosts();
    }
);


window.addEventListener(
    "overclock:profile-updated",
    () => {
        loadPosts();
    }
);


const requestedHashtag =
    new URLSearchParams(
        window.location.search
    ).get("hashtag");


if (
    requestedHashtag &&
    isValidGameHashtag(requestedHashtag)
) {
    filterByHashtag(
        requestedHashtag,
        false
    );
}


updateCharacterCounter();

console.log(
    "📰 Feed preparado; aguardando a validação da sessão."
);