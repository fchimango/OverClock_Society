/* =========================================
   OVERCLOCK SOCIETY — PERFIL PÚBLICO
   Dados do perfil, jogos, posts e amizades pela API.
========================================= */

const PUBLIC_PROFILE_API_BASE_URL =
    window.OVERCLOCK_API_BASE_URL;

let currentPublicProfile = null;
let publicProfileEndpoint = null;
let profileInitializationStarted = false;

function getApiMessage(body, fallback) {
    if (typeof body?.detail === "string") return body.detail;
    if (Array.isArray(body?.detail)) {
        return body.detail.map((item) => item?.msg || String(item)).join(" ");
    }
    if (typeof body?.message === "string") return body.message;
    return fallback;
}

async function profileApiRequest(path, options = {}) {
    const token = localStorage.getItem("token");
    if (!token) {
        throw new Error("Sua sessão não foi encontrada. Entre novamente na conta.");
    }

    const headers = {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {})
    };

    const response = await fetch(`${PUBLIC_PROFILE_API_BASE_URL}${path}`, {
        method: options.method || "GET",
        headers,
        ...(options.body ? { body: JSON.stringify(options.body) } : {})
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
        const error = new Error(
            getApiMessage(payload, `Não foi possível concluir a operação (HTTP ${response.status}).`)
        );
        error.status = response.status;
        throw error;
    }
    return payload;
}

function getPublicProfileEndpoint() {
    const params = new URLSearchParams(window.location.search);
    const userId = (params.get("userId") || "").trim();
    if (userId && /^\d+$/.test(userId)) {
        return `/profiles/id/${encodeURIComponent(userId)}`;
    }

    // Compatibilidade com links antigos no formato ?user=maria.
    const username = (params.get("user") || params.get("username") || "").trim();
    if (username) {
        if (/^\d+$/.test(username)) {
            return `/profiles/id/${encodeURIComponent(username)}`;
        }
        return `/profiles/username/${encodeURIComponent(username.replace(/^@+/, ""))}`;
    }

    throw new Error("Nenhum jogador foi selecionado. Volte ao Feed ou à página Amigos e abra um perfil.");
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value == null ? "" : String(value);
}


function getProfileActorUrl(user) {
    const userId = user?.id ?? user?.userId ?? null;
    const currentUserId = localStorage.getItem("userId");

    if (userId !== null && /^\d+$/.test(String(userId))) {
        if (currentUserId && String(currentUserId) === String(userId)) {
            return "perfil.html";
        }
        return `perfil-usuario.html?userId=${encodeURIComponent(String(userId))}`;
    }

    const username = String(user?.username || "").trim().replace(/^@+/, "");
    if (username) return `perfil-usuario.html?username=${encodeURIComponent(username)}`;
    return null;
}

function makeProfileActorLink(element, user) {
    if (!element) return;
    const url = getProfileActorUrl(user);
    if (!url) return;

    const name = String(user?.name || user?.author || "jogador").trim();
    element.classList.add("user-profile-link");
    element.tabIndex = 0;
    element.setAttribute("role", "link");
    element.setAttribute("aria-label", `Abrir perfil de ${name}`);
    element.style.cursor = "pointer";

    const navigate = (event) => {
        event?.stopPropagation?.();
        window.location.href = url;
    };
    element.addEventListener("click", navigate);
    element.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            navigate(event);
        }
    });
}

function getInitials(value) {
    const name = String(value || "").trim();
    if (!name) return "?";
    const words = name.split(/\s+/).filter(Boolean);
    return words.length > 1
        ? `${words[0][0]}${words[1][0]}`.toLocaleUpperCase("pt-BR")
        : name.slice(0, 2).toLocaleUpperCase("pt-BR");
}

function formatJoinDate(value) {
    if (!value) return "Não informado";
    const match = String(value).match(/^(\d{4})-(\d{2})$/);
    if (match) {
        const date = new Date(Number(match[1]), Number(match[2]) - 1, 1);
        const formatted = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
        return formatted.charAt(0).toLocaleUpperCase("pt-BR") + formatted.slice(1);
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function platformDetails(platform) {
    const rawName = typeof platform === "string" ? platform : (platform?.name || "");
    const normalized = rawName.toLocaleLowerCase("pt-BR");
    let type = "pc";
    let icon = "🖥️";

    if (normalized.includes("playstation") || normalized.includes("ps5") || normalized.includes("ps4")) {
        type = "playstation";
        icon = "🎮";
    } else if (normalized.includes("xbox")) {
        type = "xbox";
        icon = "🎮";
    } else if (normalized.includes("nintendo")) {
        type = "nintendo";
        icon = "🕹️";
    } else if (normalized.includes("mobile") || normalized.includes("celular") || normalized.includes("android") || normalized.includes("ios")) {
        type = "mobile";
        icon = "📱";
    } else if (typeof platform === "object" && platform?.icon) {
        icon = platform.icon;
    }

    return { name: rawName || "Plataforma não informada", type, icon };
}

function gameImageDetails(name) {
    const normalized = String(name || "").toLocaleLowerCase("pt-BR");
    const known = [
        ["elden ring", "elden-ring-large", "ER"],
        ["hollow knight", "hollow-knight", "HK"],
        ["minecraft", "minecraft-large", "MC"],
        ["valorant", "valorant-game", "V"],
        ["terraria", "terraria-game", "T"],
        ["zelda", "zelda-game", "Z"],
        ["god of war", "god-war-game", "GW"],
        ["stardew valley", "stardew-game", "SV"],
        ["resident evil", "resident-game", "RE"],
        ["celeste", "celeste-game", "C"],
        ["spider-man", "spider-game", "SM"],
        ["spiderman", "spider-game", "SM"]
    ];
    const match = known.find(([token]) => normalized.includes(token));
    return match
        ? { imageClass: match[1], initials: match[2] }
        : { imageClass: "new-game-image", initials: getInitials(name) };
}

function showEmpty(container, message, className = "profile-empty-state") {
    if (!container) return;
    const element = document.createElement("p");
    element.className = className;
    element.textContent = message;
    container.appendChild(element);
}

function renderPlatforms(platforms) {
    const container = document.getElementById("otherPlatforms");
    if (!container) return;
    container.replaceChildren();

    const values = Array.isArray(platforms) ? platforms : [];
    if (!values.length) {
        showEmpty(container, "Este jogador ainda não informou as plataformas que utiliza.");
        return;
    }

    values.forEach((platform) => {
        const details = platformDetails(platform);
        const item = document.createElement("div");
        item.className = "platform-item";

        const icon = document.createElement("div");
        icon.className = `platform-icon ${details.type}`;
        icon.textContent = details.icon;

        const info = document.createElement("div");
        const name = document.createElement("strong");
        name.textContent = details.name;
        const subtitle = document.createElement("span");
        subtitle.textContent = "Plataforma de jogos";
        info.append(name, subtitle);
        item.append(icon, info);
        container.appendChild(item);
    });
}

function renderGenres(genres) {
    const container = document.getElementById("otherGenres");
    if (!container) return;
    container.replaceChildren();

    const values = Array.isArray(genres) ? genres : [];
    if (!values.length) {
        showEmpty(container, "Nenhum gênero favorito informado.");
        return;
    }

    values.forEach((genre) => {
        const tag = document.createElement("span");
        tag.textContent = String(genre);
        container.appendChild(tag);
    });
}

function getFavoritePositionInfo(position) {
    if (position === 1) return { medal: "🥇", label: "PRIMEIRO LUGAR", className: "first-place" };
    if (position === 2) return { medal: "🥈", label: "SEGUNDO LUGAR", className: "second-place" };
    return { medal: "🥉", label: "TERCEIRO LUGAR", className: "third-place" };
}

function createGameImage(className, initials, outerClass) {
    const element = document.createElement("div");
    element.className = `${outerClass} ${className}`.trim();
    element.textContent = initials;
    return element;
}

function createFavoriteCard(game, position) {
    const visual = getFavoritePositionInfo(position);
    const image = gameImageDetails(game.name);
    const card = document.createElement("article");
    card.className = `podium-card ${visual.className}`;
    card.dataset.position = String(position);

    const badge = document.createElement("div");
    badge.className = `podium-position ${position === 1 ? "gold" : position === 2 ? "silver" : "bronze"}`;
    badge.textContent = `${position}º`;
    const medal = document.createElement("div");
    medal.className = "podium-medal";
    medal.textContent = visual.medal;
    const gameImage = createGameImage(image.imageClass, image.initials, "podium-game-image");
    const info = document.createElement("div");
    info.className = "podium-info";
    const label = document.createElement("span");
    label.className = "podium-place";
    label.textContent = visual.label;
    const name = document.createElement("h3");
    name.textContent = game.name;
    const genre = document.createElement("p");
    genre.textContent = game.genre || "Gênero não informado";
    const rating = document.createElement("div");
    rating.className = "podium-rating";
    rating.textContent = `⭐ ${Number(game.rating ?? 0).toFixed(1)}`;
    info.append(label, name, genre, rating);
    card.append(badge, medal, gameImage, info);
    return card;
}

function renderFavoriteGames(games) {
    const podium = document.getElementById("otherUserPodium");
    if (!podium) return;
    podium.replaceChildren();
    const favorites = Array.isArray(games) ? games : [];
    [2, 1, 3].forEach((position) => {
        const game = favorites.find((item) => Number(item.position) === position);
        if (game) podium.appendChild(createFavoriteCard(game, position));
    });
    if (!favorites.length) showEmpty(podium, "Este jogador ainda não escolheu jogos favoritos.");
}

function createLikedCard(game) {
    const image = gameImageDetails(game.name);
    const card = document.createElement("article");
    card.className = "collection-card";
    const gameImage = createGameImage(image.imageClass, image.initials, "collection-image");
    const info = document.createElement("div");
    info.className = "collection-info";
    const titleGroup = document.createElement("div");
    const name = document.createElement("h3");
    name.textContent = game.name;
    const genre = document.createElement("span");
    genre.textContent = game.genre || "Gênero não informado";
    titleGroup.append(name, genre);
    const rating = document.createElement("strong");
    rating.textContent = `⭐ ${Number(game.rating ?? 0).toFixed(1)}`;
    info.append(titleGroup, rating);
    card.append(gameImage, info);
    return card;
}

function renderLikedGames(games) {
    const container = document.getElementById("otherUserLikedGames");
    if (!container) return;
    container.replaceChildren();
    const liked = Array.isArray(games) ? games : [];
    liked.forEach((game) => container.appendChild(createLikedCard(game)));
    if (!liked.length) showEmpty(container, "Este jogador ainda não adicionou jogos à coleção.");
}

function createCompletedCard(game) {
    const image = gameImageDetails(game.name);
    const card = document.createElement("article");
    card.className = "completed-game";
    const gameImage = createGameImage(image.imageClass, image.initials, "completed-image");
    const info = document.createElement("div");
    info.className = "completed-info";
    const name = document.createElement("h3");
    name.textContent = game.name;
    const genre = document.createElement("span");
    genre.textContent = game.genre || "Gênero não informado";
    info.append(name, genre);
    const date = document.createElement("div");
    date.className = "completed-date";
    const label = document.createElement("span");
    label.textContent = "Zerado em";
    const year = document.createElement("strong");
    year.textContent = game.year ? String(game.year) : "Ano não informado";
    date.append(label, year);
    card.append(gameImage, info, date);
    return card;
}

function renderCompletedGames(games) {
    const container = document.getElementById("otherUserCompletedGames");
    if (!container) return;
    container.replaceChildren();
    const completed = Array.isArray(games) ? games : [];
    completed.forEach((game) => container.appendChild(createCompletedCard(game)));
    if (!completed.length) showEmpty(container, "Este jogador ainda não registrou jogos zerados.");
}

function getStatusDisplay(status) {
    if (status === "online") return { label: "● ONLINE", color: "#4ade80", visible: true };
    if (status === "away") return { label: "● AUSENTE", color: "#fbbf24", visible: true };
    return { label: "● OFFLINE", color: "#94a3b8", visible: false };
}

function renderRelationshipActions(profile) {
    const container = document.getElementById("otherProfileActions");
    if (!container) return;
    container.replaceChildren();

    const relationship = profile.relationship || "none";
    if (relationship === "self") return;

    const addButton = (label, action, primary = false, disabled = false) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = primary ? "btn btn-primary profile-relation-button" : "profile-relation-button secondary";
        button.textContent = label;
        button.disabled = disabled;
        button.addEventListener("click", () => handleRelationshipAction(action, button));
        container.appendChild(button);
    };

    if (relationship === "friend") {
        addButton("✓ Amigos", "noop", false, true);
        addButton("Remover amizade", "remove", false, false);
    } else if (relationship === "outgoing_request") {
        addButton("Solicitação enviada", "noop", false, true);
    } else if (relationship === "incoming_request") {
        addButton("✓ Aceitar solicitação", "accept", true);
        addButton("Recusar", "decline", false);
    } else {
        addButton("+ Adicionar amigo", "add", true);
    }
}

async function handleRelationshipAction(action, button) {
    if (!currentPublicProfile || action === "noop") return;
    const profile = currentPublicProfile;
    const oldText = button.textContent;
    button.disabled = true;

    try {
        if (action === "add") {
            button.textContent = "Enviando...";
            await profileApiRequest(`/friends/requests/${encodeURIComponent(profile.id)}`, { method: "POST" });
            showProfileMessage("Solicitação de amizade enviada.", "success");
        } else if (action === "accept" || action === "decline") {
            const requestId = profile.request_id;
            if (!requestId) throw new Error("A solicitação não foi encontrada. Atualize o perfil.");
            button.textContent = action === "accept" ? "Aceitando..." : "Recusando...";
            await profileApiRequest(`/friends/requests/${encodeURIComponent(requestId)}/${action}`, { method: "POST" });
            showProfileMessage(action === "accept" ? "Solicitação aceita. Vocês agora são amigos." : "Solicitação recusada.", "success");
            if (window.OverclockNotifications?.refreshFromServer) {
                await window.OverclockNotifications.refreshFromServer();
            }
        } else if (action === "remove") {
            if (!window.confirm(`Deseja remover ${profile.name} da sua lista de amigos?`)) {
                button.disabled = false;
                button.textContent = oldText;
                return;
            }
            button.textContent = "Removendo...";
            await profileApiRequest(`/friends/${encodeURIComponent(profile.id)}`, { method: "DELETE" });
            showProfileMessage("Amizade removida.", "success");
        }

        await reloadPublicProfile();
    } catch (error) {
        showProfileMessage(error.message || "Não foi possível atualizar a amizade.", "error");
        button.disabled = false;
        button.textContent = oldText;
    }
}

function showProfileMessage(message, type = "info") {
    let element = document.getElementById("publicProfileMessage");
    if (!element) {
        element = document.createElement("div");
        element.id = "publicProfileMessage";
        element.className = "public-profile-message";
        element.setAttribute("role", "status");
        const main = document.querySelector(".other-profile-page");
        if (main) main.prepend(element);
    }
    element.textContent = message;
    element.dataset.type = type;
    element.classList.add("visible");
}

function renderProfile(profile) {
    document.title = `${profile.name} | Overclock Society`;
    const status = getStatusDisplay(profile.status);
    setText("otherProfileAvatar", getInitials(profile.name).slice(0, 1));
    setText("otherProfileName", profile.name || "Jogador");
    setText("otherProfileUsername", profile.username ? `@${String(profile.username).replace(/^@+/, "")}` : "@usuario");
    setText("otherProfileCourse", `${profile.course || "Curso não informado"} • ${profile.semester || 1}º período`);
    setText("otherProfileBio", profile.bio || "Este jogador ainda não adicionou uma biografia.");
    setText("otherAboutCourse", profile.course || "Curso não informado");
    setText("otherAboutSemester", `${profile.semester || 1}º período`);
    setText("otherAboutJoinDate", formatJoinDate(profile.join_date));
    setText("otherProfileFriendsCount", profile.friends_count ?? 0);

    setText("gamesOwnerName", profile.name || "Jogador");
    setText("postsOwnerName", profile.name || "este jogador");

    const statusElement = document.getElementById("otherProfileStatus");
    const onlineDot = document.getElementById("otherProfileOnline");
    if (statusElement) {
        statusElement.textContent = status.label;
        statusElement.style.color = status.color;
    }
    if (onlineDot) onlineDot.style.display = status.visible ? "block" : "none";

    const games = profile.games || { favorites: [], liked: [], completed: [] };
    const favorites = Array.isArray(games.favorites) ? games.favorites : [];
    const liked = Array.isArray(games.liked) ? games.liked : [];
    const completed = Array.isArray(games.completed) ? games.completed : [];
    const uniqueNames = new Set([...favorites, ...liked, ...completed].map((game) => String(game.name || "").trim().toLocaleLowerCase("pt-BR")).filter(Boolean));

    setText("otherProfileGamesCount", profile.games_count ?? uniqueNames.size);
    setText("favoriteGamesCount", favorites.length);
    setText("likedGamesCount", liked.length);
    setText("completedGamesCount", completed.length);

    renderPlatforms(profile.platforms);
    renderGenres(profile.genres);
    renderFavoriteGames(favorites);
    renderLikedGames(liked);
    renderCompletedGames(completed);
    renderRelationshipActions(profile);
}

let activeUserActivityTab = "posts";
let publicUserActivity = { posts: [], replies: [], reposts: [] };
let publicUserActivityErrors = {};

function createPublicPostCard(post, activityNote = "") {
    const article = document.createElement("article");
    article.className = "public-profile-post-card";

    if (activityNote) {
        const note = document.createElement("div");
        note.className = "public-profile-activity-note";
        note.textContent = activityNote;
        article.appendChild(note);
    }

    const header = document.createElement("div");
    header.className = "public-profile-post-header";
    const identity = document.createElement("div");
    identity.className = "public-profile-post-identity";
    const author = document.createElement("strong");
    author.textContent = post.author || currentPublicProfile?.name || "Jogador";
    const username = document.createElement("span");
    username.textContent = post.username || "@usuario";
    const postAuthor = { id: post.userId, username: post.username, name: post.author };
    makeProfileActorLink(author, postAuthor);
    makeProfileActorLink(username, postAuthor);
    identity.append(author, username);
    const time = document.createElement("span");
    time.textContent = post.createdAt || "Agora";
    header.append(identity, time);

    const content = document.createElement("p");
    content.className = "public-profile-post-text";
    content.textContent = post.content || "";

    const stats = document.createElement("div");
    stats.className = "public-profile-post-stats public-profile-reply-actions";

    // Mantém a mesma ordem e as mesmas ações da aba Respostas.
    const replyButton = createPublicReplyAction(
        "💬",
        Array.isArray(post.comments) ? post.comments.length : 0,
        "Responder",
        () => openPublicPostInFeed(post, true)
    );

    const repostButton = createPublicReplyAction(
        post.reposted ? "✅" : "🔁",
        post.reposts,
        "Repostar",
        (button) => runPublicPostAction(post, "repost", "Não foi possível atualizar o repost", button),
        Boolean(post.reposted)
    );

    const likeButton = createPublicReplyAction(
        post.liked ? "❤️" : "♡",
        post.likes,
        "Curtir",
        (button) => runPublicPostAction(post, "like", "Não foi possível atualizar a curtida", button),
        Boolean(post.liked)
    );

    stats.append(replyButton, repostButton, likeButton);

    article.append(header, content, stats);
    makePublicPostCardNavigable(article, post);
    return article;
}

function openPublicPostInFeed(post, focusReply = false) {
    if (post?.id == null) return;
    const params = new URLSearchParams({ postId: String(post.id) });
    if (focusReply) params.set("focusReply", "1");
    window.location.href = `feed.html?${params.toString()}`;
}

async function runPublicPostAction(post, action, errorLabel, button) {
    const postId = post?.id;
    if (postId == null) return;

    if (button) button.disabled = true;
    try {
        await profileApiRequest(`/feed/posts/${postId}/${action}`, { method: "POST" });
        if (currentPublicProfile?.id != null) {
            await loadPublicProfileActivity(currentPublicProfile.id);
        }
        if (window.OverclockNotifications?.refreshFromServer) {
            await window.OverclockNotifications.refreshFromServer();
        }
    } catch (error) {
        window.alert(`${errorLabel}: ${error.message}`);
    } finally {
        if (button?.isConnected) button.disabled = false;
    }
}

function makePublicPostCardNavigable(article, post) {
    if (post?.id == null) return;

    article.classList.add("public-profile-post-card-link");
    article.tabIndex = 0;
    article.setAttribute("role", "link");
    article.setAttribute("aria-label", "Abrir esta publicação no Feed");

    article.addEventListener("click", (event) => {
        if (event.target instanceof Element && event.target.closest("button, a, input, textarea, select")) {
            return;
        }
        openPublicPostInFeed(post);
    });

    article.addEventListener("keydown", (event) => {
        if (event.target !== article) return;
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openPublicPostInFeed(post);
        }
    });
}

function renderUserPosts(posts) {
    const container = document.getElementById("otherUserPosts");
    if (!container) return;
    container.replaceChildren();

    if (publicUserActivityErrors.posts) {
        showEmpty(container, `Não foi possível carregar as publicações. ${publicUserActivityErrors.posts}`);
        return;
    }
    if (!Array.isArray(posts) || posts.length === 0) {
        showEmpty(container, "Este jogador ainda não publicou nada no Feed.");
        return;
    }
    posts.forEach((post) => container.appendChild(createPublicPostCard(post)));
}

function openPublicReplyInFeed(reply, focusReply = false) {
    const postId = reply?.post?.id;
    if (postId == null) return;

    const params = new URLSearchParams({ postId: String(postId) });
    if (reply.id != null) params.set("commentId", String(reply.id));
    if (focusReply) params.set("focusReply", "1");

    window.location.href = `feed.html?${params.toString()}`;
}

function makePublicReplyCardNavigable(article, reply) {
    if (reply?.post?.id == null) return;

    article.classList.add("public-profile-reply-card-link");
    article.tabIndex = 0;
    article.setAttribute("role", "link");
    article.setAttribute("aria-label", "Abrir esta resposta no Feed");

    article.addEventListener("click", (event) => {
        if (event.target instanceof Element && event.target.closest("button, a, input, textarea, select")) {
            return;
        }
        openPublicReplyInFeed(reply);
    });

    article.addEventListener("keydown", (event) => {
        if (event.target !== article) return;
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openPublicReplyInFeed(reply);
        }
    });
}

function createPublicReplyAction(iconText, count, label, onClick, active = false) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "post-action profile-activity-action profile-reply-action";
    if (active) button.classList.add(label === "Curtir" ? "liked" : "reposted");
    button.setAttribute("aria-label", `${label}: ${Number(count || 0)}`);

    const icon = document.createElement("span");
    icon.textContent = iconText;
    const amount = document.createElement("span");
    amount.textContent = String(Number(count || 0));
    const text = document.createElement("span");
    text.textContent = label;
    button.append(icon, amount, text);
    button.addEventListener("click", (event) => {
        event.stopPropagation();
        void onClick(button);
    });
    return button;
}

async function runPublicReplyPostAction(reply, action, errorLabel, button) {
    const postId = reply?.post?.id;
    if (postId == null) return;

    if (button) button.disabled = true;
    try {
        await profileApiRequest(`/feed/posts/${postId}/${action}`, { method: "POST" });
        if (currentPublicProfile?.id != null) {
            await loadPublicProfileActivity(currentPublicProfile.id);
        }
        if (window.OverclockNotifications?.refreshFromServer) {
            await window.OverclockNotifications.refreshFromServer();
        }
    } catch (error) {
        window.alert(`${errorLabel}: ${error.message}`);
    } finally {
        if (button?.isConnected) button.disabled = false;
    }
}

function renderUserReplies(replies) {
    const container = document.getElementById("otherUserReplies");
    if (!container) return;
    container.replaceChildren();

    if (publicUserActivityErrors.replies) {
        showEmpty(container, `Não foi possível carregar as respostas. ${publicUserActivityErrors.replies}`);
        return;
    }
    if (!Array.isArray(replies) || replies.length === 0) {
        showEmpty(container, "Este jogador ainda não respondeu a nenhuma publicação.");
        return;
    }

    replies.forEach((reply) => {
        const article = document.createElement("article");
        article.className = "public-profile-post-card public-profile-reply-card";

        const activityNote = document.createElement("div");
        activityNote.className = "public-profile-activity-note";
        activityNote.textContent = `💬 Respondeu a ${reply.post?.author || "uma publicação"} · ${reply.createdAt || "agora"}`;

        const header = document.createElement("div");
        header.className = "public-profile-post-header";
        const identity = document.createElement("div");
        identity.className = "public-profile-post-identity";
        const author = document.createElement("strong");
        author.textContent = reply.author || currentPublicProfile?.name || "Jogador";
        const username = document.createElement("span");
        username.textContent = reply.username || "@usuario";
        const replyAuthor = { id: reply.userId, username: reply.username, name: reply.author };
        makeProfileActorLink(author, replyAuthor);
        makeProfileActorLink(username, replyAuthor);
        identity.append(author, username);
        const time = document.createElement("span");
        time.textContent = reply.createdAt || "Agora";
        header.append(identity, time);

        const response = document.createElement("p");
        response.className = "public-profile-post-text";
        response.textContent = reply.text || "";
        article.append(activityNote, header, response);

        if (reply.post) {
            const original = document.createElement("div");
            original.className = "public-profile-original-post";
            const originalLabel = document.createElement("span");
            originalLabel.className = "public-profile-original-label";
            originalLabel.textContent = "Publicação original";
            const originalHeader = document.createElement("strong");
            originalHeader.textContent = `${reply.post.author || "Jogador"} ${reply.post.username || ""}`.trim();
            makeProfileActorLink(originalHeader, {
                id: reply.post.userId,
                username: reply.post.username,
                name: reply.post.author
            });
            const originalContent = document.createElement("p");
            originalContent.textContent = reply.post.content || "";
            original.append(originalLabel, originalHeader, originalContent);
            article.appendChild(original);

            const actions = document.createElement("div");
            actions.className = "public-profile-post-stats public-profile-reply-actions";
            const commentCount = Array.isArray(reply.post.comments) ? reply.post.comments.length : 0;

            const replyButton = createPublicReplyAction(
                "💬", commentCount, "Responder",
                (button) => openPublicReplyInFeed(reply, true)
            );
            const repostButton = createPublicReplyAction(
                reply.post.reposted ? "✅" : "🔁", reply.post.reposts, "Repostar",
                (button) => runPublicReplyPostAction(reply, "repost", "Não foi possível atualizar o repost", button),
                Boolean(reply.post.reposted)
            );
            const likeButton = createPublicReplyAction(
                reply.post.liked ? "❤️" : "♡", reply.post.likes, "Curtir",
                (button) => runPublicReplyPostAction(reply, "like", "Não foi possível atualizar a curtida", button),
                Boolean(reply.post.liked)
            );

            actions.append(replyButton, repostButton, likeButton);
            article.appendChild(actions);
        }

        makePublicReplyCardNavigable(article, reply);
        container.appendChild(article);
    });
}

function renderUserReposts(reposts) {
    const container = document.getElementById("otherUserReposts");
    if (!container) return;
    container.replaceChildren();

    if (publicUserActivityErrors.reposts) {
        showEmpty(container, `Não foi possível carregar os reposts. ${publicUserActivityErrors.reposts}`);
        return;
    }
    if (!Array.isArray(reposts) || reposts.length === 0) {
        showEmpty(container, "Este jogador ainda não repostou publicações.");
        return;
    }

    reposts.forEach((item) => {
        if (!item.post) return;
        container.appendChild(
            createPublicPostCard(item.post, `🔁 Repostou · ${item.repostedAt || "data não informada"}`)
        );
    });
}

function renderPublicActivityTab(tabName) {
    if (tabName === "replies") renderUserReplies(publicUserActivity.replies);
    else if (tabName === "reposts") renderUserReposts(publicUserActivity.reposts);
    else renderUserPosts(publicUserActivity.posts);
}

function openUserActivityTab(tabName) {
    if (!["posts", "replies", "reposts"].includes(tabName)) return;
    activeUserActivityTab = tabName;

    document.querySelectorAll("[data-user-activity-tab]").forEach((button) => {
        const active = button.dataset.userActivityTab === tabName;
        button.classList.toggle("active", active);
        button.setAttribute("aria-selected", String(active));
    });
    document.querySelectorAll("[data-user-activity-panel]").forEach((panel) => {
        panel.classList.toggle("active", panel.dataset.userActivityPanel === tabName);
    });
    renderPublicActivityTab(tabName);
}

document.querySelectorAll("[data-user-activity-tab]").forEach((button) => {
    button.addEventListener("click", () => openUserActivityTab(button.dataset.userActivityTab));
});

async function loadPublicProfileActivity(profileId) {
    const encodedId = encodeURIComponent(profileId);
    const requests = {
        posts: `/profiles/id/${encodedId}/posts`,
        replies: `/profiles/id/${encodedId}/replies`,
        reposts: `/profiles/id/${encodedId}/reposts`
    };
    const keys = Object.keys(requests);
    const results = await Promise.allSettled(
        keys.map((key) => profileApiRequest(requests[key]))
    );

    publicUserActivityErrors = {};
    results.forEach((result, index) => {
        const key = keys[index];
        if (result.status === "fulfilled") {
            publicUserActivity[key] = Array.isArray(result.value) ? result.value : [];
        } else {
            publicUserActivity[key] = [];
            publicUserActivityErrors[key] = result.reason?.message || "Falha ao comunicar com o servidor.";
            console.warn(`Não foi possível carregar ${key} deste perfil.`, result.reason);
        }
    });

    renderPublicActivityTab(activeUserActivityTab);
}

function openUserTab(tabName) {
    document.querySelectorAll("[data-user-tab]").forEach((button) => {
        const active = button.dataset.userTab === tabName;
        button.classList.toggle("active", active);
        button.setAttribute("aria-selected", String(active));
    });
    document.querySelectorAll("[data-user-panel]").forEach((panel) => {
        const active = panel.dataset.userPanel === tabName;
        panel.classList.toggle("active", active);
    });
}

document.querySelectorAll("[data-user-tab]").forEach((button) => {
    button.addEventListener("click", () => openUserTab(button.dataset.userTab));
});

function updateHeaderIdentity() {
    const name = localStorage.getItem("userName") || "Usuário";
    const avatar = document.querySelector("#profileHeaderButton .avatar");
    const profileName = document.querySelector("#profileHeaderButton .profile-name strong");
    if (avatar) avatar.textContent = getInitials(name).slice(0, 1);
    if (profileName) profileName.textContent = name;
}

const profileHeaderButton = document.getElementById("profileHeaderButton");
if (profileHeaderButton) {
    profileHeaderButton.addEventListener("click", () => {
        window.location.href = "perfil.html";
    });
}

const publicGamesFilterInput = document.getElementById("publicGamesFilterInput");
if (publicGamesFilterInput) {
    publicGamesFilterInput.addEventListener("input", (event) => {
        const term = event.target.value.trim().toLocaleLowerCase("pt-BR");
        document.querySelectorAll(".collection-card, .completed-game, .podium-card").forEach((card) => {
            card.style.display = card.textContent.toLocaleLowerCase("pt-BR").includes(term) ? "" : "none";
        });
    });
}

async function fetchAndRenderPublicProfile() {
    const profile = await profileApiRequest(publicProfileEndpoint);
    if (String(profile.id) === String(localStorage.getItem("userId"))) {
        window.location.replace("perfil.html");
        return;
    }

    currentPublicProfile = profile;
    renderProfile(profile);

    await loadPublicProfileActivity(profile.id);
}

async function reloadPublicProfile() {
    try {
        await fetchAndRenderPublicProfile();
    } catch (error) {
        showProfileMessage(error.message, "error");
    }
}

function showProfileLoadError(message) {
    const main = document.querySelector(".other-profile-page");
    if (!main) return;
    let errorBox = document.getElementById("publicProfileLoadError");
    if (!errorBox) {
        errorBox = document.createElement("section");
        errorBox.id = "publicProfileLoadError";
        errorBox.className = "public-profile-load-error";
        main.prepend(errorBox);
    }
    errorBox.replaceChildren();
    const heading = document.createElement("h1");
    heading.textContent = "Não foi possível abrir este perfil";
    const paragraph = document.createElement("p");
    paragraph.textContent = message;
    const back = document.createElement("a");
    back.href = "amigos.html";
    back.className = "btn btn-primary";
    back.textContent = "Voltar para Amigos";
    errorBox.append(heading, paragraph, back);
}

async function initializePublicProfile() {
    if (profileInitializationStarted || !localStorage.getItem("token")) return;
    profileInitializationStarted = true;
    updateHeaderIdentity();

    try {
        publicProfileEndpoint = getPublicProfileEndpoint();
        await fetchAndRenderPublicProfile();
    } catch (error) {
        console.error("Não foi possível carregar o perfil público.", error);
        showProfileLoadError(error.message || "O perfil solicitado não está disponível.");
    }
}

window.addEventListener("overclock:session-ready", () => {
    updateHeaderIdentity();
    initializePublicProfile();
});

// A página pode ser aberta com a sessão já iniciada, antes do evento de sessão.
if (localStorage.getItem("token")) {
    initializePublicProfile();
}

openUserTab("profile");

openUserActivityTab("posts");
