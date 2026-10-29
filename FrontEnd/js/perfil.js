/* =========================================
   ELEMENTOS DO PERFIL
========================================= */

const editProfileButton = document.getElementById("editProfileButton");
const modalOverlay = document.getElementById("profileModalOverlay");
const modalClose = document.getElementById("modalClose");
const modalCancel = document.getElementById("modalCancel");
const profileForm = document.getElementById("profileForm");

const profileName = document.getElementById("profileName");
const profileUsername = document.getElementById("profileUsername");
const profileCourse = document.getElementById("profileCourse");
const profileSemester = document.getElementById("profileSemester");
const profileJoinDate = document.getElementById("profileJoinDate");
const profileStatus = document.getElementById("profileStatus");
const profileBio = document.getElementById("profileBio");
const profileAvatar = document.getElementById("profileAvatar");
const profileCover = document.getElementById("profileCover");
const profileGamesCount = document.getElementById("profileGamesCount");
const profileFriendsCount = document.getElementById("profileFriendsCount");
const currentGame = document.getElementById("currentGame");
const currentGameStatus = document.getElementById("currentGameStatus");

const profileIdentityName = document.querySelector(".profile-identity h1");
const profileIdentityUsername = document.querySelector(".profile-username");
const profileIdentityCourse = document.querySelector(".profile-identity p");
const bioText = document.getElementById("bioText");
const profileStatusText = document.querySelector(".profile-status");
const profileOnline = document.querySelector(".profile-online");
const profileDateText = document.querySelector(".about-item:nth-child(3) strong");
const statValues = document.querySelectorAll(".profile-stat strong");
const platformList = document.querySelector(".platform-list");
const genreTags = document.querySelector(".genre-tags");
const currentGameName = document.querySelector(".current-game strong");
const currentGameAvailability = document.querySelector(".current-game small");

const profileTabButtons = document.querySelectorAll("[data-profile-tab]");
const profileTabPanels = document.querySelectorAll("[data-profile-panel]");
const profilePostsList = document.getElementById("profilePostsList");
const profilePostsCount = document.getElementById("profilePostsCount");


/* =========================================
   CONFIGURAÇÃO DA API
========================================= */

const PROFILE_API_BASE_URL =
    ["127.0.0.1", "localhost"].includes(window.location.hostname)
        ? "http://127.0.0.1:8000"
        : "https://overclock-api.onrender.com";

let PROFILE_API_DATA = null;

function normalizeProfileUsername(value) {
    return String(value || "")
        .trim()
        .replace(/^@+/, "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9._]/g, "");
}

async function getProfileApiErrorMessage(response) {
    let body = {};

    try {
        body = await response.json();
    } catch (error) {
        // A resposta pode não conter JSON.
    }

    if (Array.isArray(body.detail)) {
        return body.detail
            .map((item) => item.msg || String(item))
            .join(" ");
    }

    if (typeof body.detail === "string") {
        return body.detail;
    }

    return "Não foi possível concluir a operação.";
}


/* =========================================
   MODAL DO PERFIL
========================================= */

function openModal() {
    if (!modalOverlay) return;

    modalOverlay.classList.add("active");
    document.body.style.overflow = "hidden";
}

function closeModal() {
    if (!modalOverlay) return;

    modalOverlay.classList.remove("active");
    document.body.style.overflow = "";
}

if (editProfileButton) {
    editProfileButton.addEventListener("click", openModal);
}

if (modalClose) {
    modalClose.addEventListener("click", closeModal);
}

if (modalCancel) {
    modalCancel.addEventListener("click", closeModal);
}

if (modalOverlay) {
    modalOverlay.addEventListener("click", (event) => {
        if (event.target === modalOverlay) closeModal();
    });
}

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
});


/* =========================================
   UTILIDADES DE APRESENTAÇÃO
========================================= */

function formatJoinDate(value) {
    if (!value) return "";

    const [year, month] = value.split("-");

    const months = [
        "Janeiro", "Fevereiro", "Março", "Abril",
        "Maio", "Junho", "Julho", "Agosto",
        "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    const monthIndex = Number(month) - 1;
    if (monthIndex < 0 || monthIndex > 11) return "";

    return `${months[monthIndex]} de ${year}`;
}

function updateProfileStatus(status) {
    if (!profileStatusText || !profileOnline) return;

    if (status === "online") {
        profileStatusText.textContent = "● ONLINE";
        profileStatusText.style.color = "#4ade80";
        profileOnline.style.background = "#4ade80";
        profileOnline.style.boxShadow = "0 0 12px rgba(74,222,128,0.60)";
        profileOnline.style.display = "block";
        return;
    }

    if (status === "away") {
        profileStatusText.textContent = "● AUSENTE";
        profileStatusText.style.color = "#facc15";
        profileOnline.style.background = "#facc15";
        profileOnline.style.boxShadow = "0 0 12px rgba(250,204,21,0.60)";
        profileOnline.style.display = "block";
        return;
    }

    profileStatusText.textContent = "● OFFLINE";
    profileStatusText.style.color = "#94a3b8";
    profileOnline.style.display = "none";
}

function updatePlatforms() {
    if (!platformList) return;

    const selectedPlatforms = document.querySelectorAll(
        'input[name="platform"]:checked'
    );

    platformList.innerHTML = "";

    if (selectedPlatforms.length === 0) {
        platformList.innerHTML = `
            <span class="empty-profile-message">
                Nenhuma plataforma adicionada.
            </span>
        `;
        return;
    }

    selectedPlatforms.forEach((checkbox) => {
        const name = checkbox.value;

        const platformDetails = {
            "PC": { icon: "🖥️", type: "pc" },
            "PlayStation 5": { icon: "🎮", type: "playstation" },
            "Xbox Series": { icon: "🎮", type: "xbox" },
            "Nintendo Switch": { icon: "🕹️", type: "switch" }
        };

        const details = platformDetails[name] || {
            icon: "🎮",
            type: ""
        };

        const item = document.createElement("div");
        item.className = "platform-item";

        const icon = document.createElement("div");
        icon.className = `platform-icon ${details.type}`;
        icon.textContent = details.icon;

        const info = document.createElement("div");
        const title = document.createElement("strong");
        title.textContent = name;

        info.appendChild(title);
        item.append(icon, info);
        platformList.appendChild(item);
    });
}

function updateGenres() {
    if (!genreTags) return;

    const selectedGenres = document.querySelectorAll(
        'input[name="genre"]:checked'
    );

    genreTags.innerHTML = "";

    if (selectedGenres.length === 0) {
        const empty = document.createElement("span");
        empty.textContent = "Nenhum gênero selecionado";
        genreTags.appendChild(empty);
        return;
    }

    selectedGenres.forEach((checkbox) => {
        const tag = document.createElement("span");
        tag.textContent = checkbox.value;
        genreTags.appendChild(tag);
    });
}

function updateCurrentGame() {
    if (!currentGameName) return;

    const game = currentGame
        ? currentGame.value.trim()
        : (PROFILE_API_DATA?.current_game || "");

    const status = currentGameStatus
        ? currentGameStatus.value
        : (PROFILE_API_DATA?.current_game_status || "available");

    currentGameName.textContent = game || "Nenhum jogo";

    if (!currentGameAvailability) return;

    if (status === "available") {
        currentGameAvailability.textContent = "🟢 Disponível";
        currentGameAvailability.style.color = "#4ade80";
    } else if (status === "busy") {
        currentGameAvailability.textContent = "🔴 Ocupado";
        currentGameAvailability.style.color = "#f87171";
    } else {
        currentGameAvailability.textContent = "🟡 Ausente";
        currentGameAvailability.style.color = "#facc15";
    }
}

function updateStats() {
    if (statValues[0] && profileGamesCount) {
        statValues[0].textContent = profileGamesCount.value || 0;
    }

    if (statValues[1] && profileFriendsCount) {
        statValues[1].textContent = profileFriendsCount.value || 0;
    }
}


/* =========================================
   CARREGAR DADOS DO PERFIL PELA API
========================================= */

function applyProfileData(profile) {
    const userId = String(
        profile.id || localStorage.getItem("userId") || ""
    );

    const usernameKey = `overclockSocietyUsername_${userId}`;

    const savedUsername = userId
        ? localStorage.getItem(usernameKey)
        : null;

    const username = normalizeProfileUsername(
        profile.username || savedUsername || profile.name
    );

    const data = {
        ...profile,
        id: userId,
        name: profile.name || localStorage.getItem("userName") || "Usuário",
        email: profile.email || localStorage.getItem("userEmail") || "",
        username,
        course: profile.course || "",
        semester: Number(profile.semester || 1),
        join_date: profile.join_date || "",
        status: profile.status || "online",
        bio: profile.bio || "",
        platforms: Array.isArray(profile.platforms) ? profile.platforms : [],
        genres: Array.isArray(profile.genres) ? profile.genres : [],
        current_game: profile.current_game || "",
        current_game_status: profile.current_game_status || "available"
    };

    PROFILE_API_DATA = data;

    if (userId) {
        localStorage.setItem("userId", userId);
        localStorage.setItem(usernameKey, username);
    }

    localStorage.setItem("userName", data.name);

    if (data.email) {
        localStorage.setItem("userEmail", data.email);
    }

    // Preenche os campos do formulário.
    if (profileName) profileName.value = data.name;
    if (profileUsername) profileUsername.value = data.username;
    if (profileCourse) profileCourse.value = data.course;
    if (profileSemester) profileSemester.value = String(data.semester);
    if (profileJoinDate) profileJoinDate.value = data.join_date;
    if (profileStatus) profileStatus.value = data.status;
    if (profileBio) profileBio.value = data.bio;
    if (currentGame) currentGame.value = data.current_game;
    if (currentGameStatus) currentGameStatus.value = data.current_game_status;

    document.querySelectorAll('input[name="platform"]').forEach((checkbox) => {
        checkbox.checked = data.platforms.includes(checkbox.value);
    });

    document.querySelectorAll('input[name="genre"]').forEach((checkbox) => {
        checkbox.checked = data.genres.includes(checkbox.value);
    });

    // Atualiza os textos visíveis do perfil.
    if (profileIdentityName) profileIdentityName.textContent = data.name;

    if (profileIdentityUsername) {
        profileIdentityUsername.textContent = `@${data.username}`;
    }

    if (profileIdentityCourse) {
        profileIdentityCourse.textContent =
            `${data.course} • ${data.semester}º período`;
    }

    if (bioText) {
        bioText.textContent = data.bio || "Nenhuma biografia adicionada.";
    }

    if (profileDateText) {
        profileDateText.textContent =
            formatJoinDate(data.join_date) || "Não informado";
    }

    document.querySelectorAll(".profile-name strong").forEach((element) => {
        element.textContent = data.name;
    });

    document.querySelectorAll(".profile-button .avatar").forEach((element) => {
        element.textContent = data.name.charAt(0).toUpperCase() || "?";
    });

    const ownAvatar = document.querySelector(".profile-avatar");

    if (ownAvatar && !ownAvatar.style.backgroundImage) {
        ownAvatar.textContent = data.name.charAt(0).toUpperCase() || "?";
    }

    updateProfileStatus(data.status);
    updatePlatforms();
    updateGenres();
    updateCurrentGame();
    updateStats();
    renderProfilePosts();
}

async function loadProfileFromApi() {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
        const response = await fetch(
            `${PROFILE_API_BASE_URL}/auth/profile`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        if (!response.ok) {
            throw new Error(await getProfileApiErrorMessage(response));
        }

        const profile = await response.json();
        applyProfileData(profile);

        console.log("Perfil carregado da API.");
    } catch (error) {
        console.error("Erro ao carregar o Perfil:", error);

        alert(
            "Não foi possível carregar os dados do Perfil. " +
            error.message
        );
    }
}


/* =========================================
   SALVAR PERFIL NO POSTGRESQL
========================================= */

if (profileForm) {
    profileForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const name = profileName.value.trim();
        const username = normalizeProfileUsername(profileUsername.value);
        const course = profileCourse.value.trim();

        if (
            !name ||
            !course ||
            !/^[a-z0-9._]{3,32}$/.test(username)
        ) {
            alert(
                "Informe um nome, um curso e um nome de usuário válido. " +
                "O nome de usuário deve ter de 3 a 32 caracteres " +
                "e pode conter letras, números, ponto e sublinhado."
            );
            return;
        }

        const currentUserId = localStorage.getItem("userId");
        const token = localStorage.getItem("token");

        if (!currentUserId || !token) {
            alert("Sua sessão não foi encontrada. Faça login novamente.");
            return;
        }

        const payload = {
            name,
            username,
            course,
            semester: Number(profileSemester?.value || 1),
            join_date: profileJoinDate?.value || null,
            status: profileStatus?.value || "online",
            bio: profileBio?.value.trim() || "",
            platforms: Array.from(
                document.querySelectorAll('input[name="platform"]:checked')
            ).map((checkbox) => checkbox.value),
            genres: Array.from(
                document.querySelectorAll('input[name="genre"]:checked')
            ).map((checkbox) => checkbox.value),
            current_game: currentGame
                ? currentGame.value.trim()
                : (PROFILE_API_DATA?.current_game || ""),
            current_game_status: currentGameStatus
                ? currentGameStatus.value
                : (PROFILE_API_DATA?.current_game_status || "available")
        };

        const submitButton = profileForm.querySelector(
            'button[type="submit"]'
        );

        const originalButtonText = submitButton
            ? submitButton.textContent
            : "";

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "Salvando...";
        }

        try {
            const response = await fetch(
                `${PROFILE_API_BASE_URL}/auth/profile`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                }
            );

            if (!response.ok) {
                throw new Error(await getProfileApiErrorMessage(response));
            }

            const savedProfile = await response.json();

            applyProfileData(savedProfile);
            closeModal();

            window.dispatchEvent(
                new CustomEvent("overclock:profile-updated", {
                    detail: savedProfile
                })
            );

            alert("Perfil salvo com sucesso!");
            console.log("Perfil atualizado na API.");
        } catch (error) {
            console.error("Erro ao salvar o Perfil:", error);
            alert("Não foi possível salvar o Perfil: " + error.message);
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
        }
    });
}


/* =========================================
   PRÉVIA DO AVATAR E DA CAPA

   Observação: estes arquivos ainda são apenas
   pré-visualizados; não são enviados ao servidor.
========================================= */

if (profileAvatar) {
    profileAvatar.addEventListener("change", () => {
        const file = profileAvatar.files[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = (event) => {
            const avatar = document.querySelector(".profile-avatar");
            if (!avatar) return;

            avatar.style.backgroundImage = `url(${event.target.result})`;
            avatar.style.backgroundSize = "cover";
            avatar.style.backgroundPosition = "center";
            avatar.style.fontSize = "0";
        };

        reader.readAsDataURL(file);
    });
}

if (profileCover) {
    profileCover.addEventListener("change", () => {
        const file = profileCover.files[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = (event) => {
            const cover = document.querySelector(".profile-cover");
            if (!cover) return;

            cover.style.backgroundImage = `url(${event.target.result})`;
            cover.style.backgroundSize = "cover";
            cover.style.backgroundPosition = "center";
        };

        reader.readAsDataURL(file);
    });
}


/* =========================================
   ABAS DO PERFIL
========================================= */

function openProfileTab(tabName) {
    profileTabButtons.forEach((button) => {
        const isActive = button.dataset.profileTab === tabName;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-selected", String(isActive));
    });

    profileTabPanels.forEach((panel) => {
        const isActive = panel.dataset.profilePanel === tabName;
        panel.classList.toggle("active", isActive);
    });

    if (tabName === "posts") {
        renderProfilePosts();
    }
}

profileTabButtons.forEach((button) => {
    button.addEventListener("click", () => {
        openProfileTab(button.dataset.profileTab);
    });
});


/* =========================================
   DADOS DO USUÁRIO ATUAL E POSTS LOCAIS
========================================= */

function getProfileCurrentUser() {
    const id = localStorage.getItem("userId");
    const name = localStorage.getItem("userName") || "Usuário";
    const email = localStorage.getItem("userEmail") || "";
    const avatar = name.charAt(0).toUpperCase() || "?";

    const savedUsername = id
        ? localStorage.getItem(`overclockSocietyUsername_${id}`)
        : null;

    const username =
        `@${savedUsername || normalizeProfileUsername(name) || "usuario"}`;

    return { id, name, email, avatar, username };
}

/* =========================================
   ATIVIDADE DO PERFIL — API / POSTGRESQL
   Posts, respostas (comentários) e reposts
========================================= */

const profilePostsActivityList = document.getElementById("profilePostsList");
const profileRepliesActivityList = document.getElementById("profileRepliesList");
const profileRepostsActivityList = document.getElementById("profileRepostsList");
const profileActivityButtons = document.querySelectorAll("[data-profile-activity-tab]");
const profileActivityPanels = document.querySelectorAll("[data-profile-activity-panel]");

let activeProfileActivityTab = "posts";
let profileActivityLoaded = false;
let profileActivityLoadSequence = 0;
let profileActivityLoading = false;
let profileActivityPromise = null;
let profileActivityData = { posts: [], replies: [], reposts: [] };
let profileActivityErrors = {};

function profileActivityCurrentUserId() {
    return localStorage.getItem("userId");
}

async function profileActivityApiRequest(path, options = {}) {
    const token = localStorage.getItem("token");
    if (!token) {
        throw new Error("Sua sessão não foi encontrada. Entre novamente na conta.");
    }

    const headers = {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {})
    };

    const response = await fetch(`${PROFILE_API_BASE_URL}${path}`, {
        method: options.method || "GET",
        headers,
        ...(options.body ? { body: JSON.stringify(options.body) } : {})
    });

    if (response.status === 204) return null;
    if (!response.ok) {
        throw new Error(await getProfileApiErrorMessage(response));
    }
    return response.json().catch(() => null);
}

function getProfileActivityList(tab) {
    if (tab === "replies") return profileRepliesActivityList;
    if (tab === "reposts") return profileRepostsActivityList;
    return profilePostsActivityList;
}

function setProfileActivityEmpty(container, title, detail = "") {
    if (!container) return;
    container.replaceChildren();

    const empty = document.createElement("div");
    empty.className = "profile-posts-empty profile-activity-empty";
    const heading = document.createElement("strong");
    heading.textContent = title;
    empty.appendChild(heading);

    if (detail) {
        const paragraph = document.createElement("p");
        paragraph.textContent = detail;
        empty.appendChild(paragraph);
    }
    container.appendChild(empty);
}

function openProfileActivityTab(tabName) {
    if (!["posts", "replies", "reposts"].includes(tabName)) return;
    activeProfileActivityTab = tabName;

    profileActivityButtons.forEach((button) => {
        const isActive = button.dataset.profileActivityTab === tabName;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-selected", String(isActive));
    });

    profileActivityPanels.forEach((panel) => {
        panel.classList.toggle("active", panel.dataset.profileActivityPanel === tabName);
    });

    if (!profileActivityLoaded || profileActivityErrors[tabName]) {
        void loadProfileActivity(profileActivityLoaded);
    } else {
        renderProfileActivityTab(tabName);
    }
}

profileActivityButtons.forEach((button) => {
    button.addEventListener("click", () => {
        openProfileActivityTab(button.dataset.profileActivityTab);
    });
});

function createProfileActivityAction(iconText, count, label, onClick, active = false) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "post-action profile-activity-action";
    if (active) button.classList.add(label === "Curtir" ? "liked" : "reposted");
    button.setAttribute("aria-label", `${label}: ${Number(count || 0)}`);

    const icon = document.createElement("span");
    icon.textContent = iconText;
    const amount = document.createElement("span");
    amount.textContent = String(Number(count || 0));
    const text = document.createElement("span");
    text.textContent = label;
    button.append(icon, amount, text);
    button.addEventListener("click", onClick);
    return button;
}

function createProfileActivityPostText(content) {
    const paragraph = document.createElement("p");
    paragraph.className = "post-text";
    paragraph.textContent = String(content || "");
    return paragraph;
}

function createProfileActivityComment(comment, postId) {
    const wrapper = document.createElement("div");
    wrapper.className = "comment";

    const avatar = document.createElement("div");
    avatar.className = "comment-avatar";
    avatar.textContent = comment.avatar || String(comment.author || "?").trim().charAt(0).toUpperCase() || "?";

    const body = document.createElement("div");
    body.className = "comment-body";
    const author = document.createElement("div");
    author.className = "comment-user";
    author.textContent = comment.author || "Usuário";
    const content = document.createElement("div");
    content.className = "comment-text";
    content.textContent = comment.text || "";
    body.append(author, content);

    if (String(comment.userId) === String(profileActivityCurrentUserId())) {
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "comment-delete-button";
        remove.textContent = "🗑 Excluir";
        remove.addEventListener("click", async () => {
            if (!window.confirm("Deseja excluir este comentário?")) return;
            try {
                await profileActivityApiRequest(`/feed/posts/${postId}/comments/${comment.id}`, { method: "DELETE" });
                await loadProfileActivity(true);
                if (window.OverclockNotifications?.refreshFromServer) {
                    await window.OverclockNotifications.refreshFromServer();
                }
            } catch (error) {
                window.alert(`Não foi possível excluir o comentário: ${error.message}`);
            }
        });
        body.appendChild(remove);
    }

    wrapper.append(avatar, body);
    return wrapper;
}

function createProfileActivityCommentsSection(post) {
    const section = document.createElement("div");
    section.className = "comments-section";

    const list = document.createElement("div");
    list.className = "comments-list";
    (Array.isArray(post.comments) ? post.comments : []).forEach((comment) => {
        list.appendChild(createProfileActivityComment(comment, post.id));
    });

    const form = document.createElement("form");
    form.className = "comment-form";
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 180;
    input.required = true;
    input.placeholder = "Escreva uma resposta...";
    input.setAttribute("aria-label", "Texto da resposta");
    const send = document.createElement("button");
    send.type = "submit";
    send.textContent = "Enviar";
    form.append(input, send);

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const content = input.value.trim();
        if (!content) return;
        send.disabled = true;
        send.textContent = "Enviando...";
        try {
            await profileActivityApiRequest(`/feed/posts/${post.id}/comments`, {
                method: "POST",
                body: { content }
            });
            await loadProfileActivity(true);
            if (window.OverclockNotifications?.refreshFromServer) {
                await window.OverclockNotifications.refreshFromServer();
            }
        } catch (error) {
            window.alert(`Não foi possível enviar a resposta: ${error.message}`);
        } finally {
            send.disabled = false;
            send.textContent = "Enviar";
        }
    });

    section.append(list, form);
    return section;
}

async function runProfilePostAction(path, method, errorLabel) {
    try {
        await profileActivityApiRequest(path, { method });
        await loadProfileActivity(true);
        if (window.OverclockNotifications?.refreshFromServer) {
            await window.OverclockNotifications.refreshFromServer();
        }
    } catch (error) {
        window.alert(`${errorLabel}: ${error.message}`);
    }
}

function createProfileActivityPostCard(post, activityNote = "") {
    const article = document.createElement("article");
    article.className = "post-card profile-activity-card";

    if (activityNote) {
        const note = document.createElement("div");
        note.className = "profile-activity-note";
        note.textContent = activityNote;
        article.appendChild(note);
    }

    const header = document.createElement("div");
    header.className = "post-header";
    const avatar = document.createElement("div");
    avatar.className = "post-avatar";
    avatar.textContent = post.avatar || String(post.author || "?").trim().charAt(0).toUpperCase() || "?";
    const user = document.createElement("div");
    user.className = "post-user";
    const userLine = document.createElement("div");
    userLine.className = "post-user-line";
    const author = document.createElement("strong");
    author.textContent = post.author || "Usuário";
    const username = document.createElement("span");
    username.className = "post-username";
    username.textContent = post.username || "@usuario";
    const time = document.createElement("span");
    time.className = "post-time";
    time.textContent = `• ${post.createdAt || "agora"}`;
    userLine.append(author, username, time);
    user.append(userLine, createProfileActivityPostText(post.content));
    header.append(avatar, user);
    article.appendChild(header);

    const actions = document.createElement("div");
    actions.className = "post-actions";
    const comments = Array.isArray(post.comments) ? post.comments : [];
    const commentsSection = createProfileActivityCommentsSection(post);

    const commentButton = createProfileActivityAction("💬", comments.length, "Responder", () => {
        commentsSection.classList.toggle("active");
        if (commentsSection.classList.contains("active")) {
            commentsSection.querySelector("input")?.focus();
        }
    });

    const repostButton = createProfileActivityAction(
        post.reposted ? "✅" : "🔁",
        post.reposts,
        "Repostar",
        () => runProfilePostAction(`/feed/posts/${post.id}/repost`, "POST", "Não foi possível atualizar o repost"),
        Boolean(post.reposted)
    );

    const likeButton = createProfileActivityAction(
        post.liked ? "❤️" : "♡",
        post.likes,
        "Curtir",
        () => runProfilePostAction(`/feed/posts/${post.id}/like`, "POST", "Não foi possível atualizar a curtida"),
        Boolean(post.liked)
    );
    actions.append(commentButton, repostButton, likeButton);

    if (String(post.userId) === String(profileActivityCurrentUserId())) {
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "post-action post-delete-button";
        deleteButton.textContent = "🗑 Excluir";
        deleteButton.addEventListener("click", async () => {
            if (!window.confirm("Deseja realmente excluir esta publicação?")) return;
            await runProfilePostAction(`/feed/posts/${post.id}`, "DELETE", "Não foi possível excluir a publicação");
        });
        actions.appendChild(deleteButton);
    }

    article.append(actions, commentsSection);
    return article;
}

function openProfileReplyInFeed(reply, focusReply = false) {
    const postId = reply?.post?.id;
    if (postId == null) return;

    const params = new URLSearchParams({ postId: String(postId) });
    if (reply.id != null) params.set("commentId", String(reply.id));
    if (focusReply) params.set("focusReply", "1");

    window.location.href = `feed.html?${params.toString()}`;
}

function makeProfileReplyCardNavigable(article, reply) {
    if (reply?.post?.id == null) return;

    article.classList.add("profile-reply-card-link");
    article.tabIndex = 0;
    article.setAttribute("role", "link");
    article.setAttribute("aria-label", "Abrir esta resposta no Feed");

    article.addEventListener("click", (event) => {
        if (event.target instanceof Element && event.target.closest("button, a, input, textarea, select")) {
            return;
        }
        openProfileReplyInFeed(reply);
    });

    article.addEventListener("keydown", (event) => {
        if (event.target !== article) return;
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openProfileReplyInFeed(reply);
        }
    });
}

function createProfileReplyCard(reply) {
    const article = document.createElement("article");
    article.className = "post-card profile-activity-card profile-reply-card";

    const note = document.createElement("div");
    note.className = "profile-activity-note";
    note.textContent = `💬 Você respondeu a ${reply.post?.author || "uma publicação"} · ${reply.createdAt || "agora"}`;
    article.appendChild(note);

    const header = document.createElement("div");
    header.className = "post-header";
    const avatar = document.createElement("div");
    avatar.className = "post-avatar";
    avatar.textContent = reply.avatar || "?";
    const body = document.createElement("div");
    body.className = "post-user";
    const line = document.createElement("div");
    line.className = "post-user-line";
    const author = document.createElement("strong");
    author.textContent = reply.author || "Usuário";
    const username = document.createElement("span");
    username.className = "post-username";
    username.textContent = reply.username || "@usuario";
    line.append(author, username);
    body.append(line, createProfileActivityPostText(reply.text || ""));
    header.append(avatar, body);
    article.appendChild(header);

    if (reply.post) {
        const original = document.createElement("div");
        original.className = "profile-reply-context";
        const label = document.createElement("span");
        label.className = "profile-reply-context-label";
        label.textContent = "Publicação original";
        const originalAuthor = document.createElement("strong");
        originalAuthor.textContent = `${reply.post.author || "Usuário"} ${reply.post.username || ""}`.trim();
        const originalText = document.createElement("p");
        originalText.textContent = reply.post.content || "";
        original.append(label, originalAuthor, originalText);
        article.appendChild(original);

        // Ações no mesmo sentido do Feed: Responder → Repostar → Curtir.
        const actions = document.createElement("div");
        actions.className = "post-actions profile-reply-actions";
        const commentCount = Array.isArray(reply.post.comments) ? reply.post.comments.length : 0;

        const replyButton = createProfileActivityAction(
            "💬",
            commentCount,
            "Responder",
            () => openProfileReplyInFeed(reply, true)
        );
        const repostButton = createProfileActivityAction(
            reply.post.reposted ? "✅" : "🔁",
            reply.post.reposts,
            "Repostar",
            () => runProfilePostAction(
                `/feed/posts/${reply.post.id}/repost`,
                "POST",
                "Não foi possível atualizar o repost"
            ),
            Boolean(reply.post.reposted)
        );
        const likeButton = createProfileActivityAction(
            reply.post.liked ? "❤️" : "♡",
            reply.post.likes,
            "Curtir",
            () => runProfilePostAction(
                `/feed/posts/${reply.post.id}/like`,
                "POST",
                "Não foi possível atualizar a curtida"
            ),
            Boolean(reply.post.liked)
        );

        actions.append(replyButton, repostButton, likeButton);
        article.appendChild(actions);
    }

    makeProfileReplyCardNavigable(article, reply);
    return article;
}

function renderProfileActivityTab(tabName) {
    const container = getProfileActivityList(tabName);
    if (!container) return;

    if (profileActivityErrors[tabName]) {
        setProfileActivityEmpty(
            container,
            "Não foi possível carregar esta atividade.",
            profileActivityErrors[tabName]
        );
        return;
    }

    const items = profileActivityData[tabName] || [];
    container.replaceChildren();

    if (tabName === "posts" && profilePostsCount) {
        profilePostsCount.textContent = String(items.length);
    }

    if (items.length === 0) {
        const emptyMessages = {
            posts: ["Você ainda não publicou nada.", "Crie uma publicação no Feed para ela aparecer aqui."],
            replies: ["Você ainda não respondeu a nenhuma publicação.", "Quando você comentar em uma publicação, sua resposta aparecerá aqui."],
            reposts: ["Você ainda não repostou nada.", "As publicações que você repostar aparecerão aqui."]
        };
        const [title, detail] = emptyMessages[tabName];
        setProfileActivityEmpty(container, title, detail);
        return;
    }

    if (tabName === "posts") {
        items.forEach((post) => container.appendChild(createProfileActivityPostCard(post)));
    } else if (tabName === "replies") {
        items.forEach((reply) => container.appendChild(createProfileReplyCard(reply)));
    } else {
        items.forEach((item) => {
            if (item.post) {
                container.appendChild(
                    createProfileActivityPostCard(
                        item.post,
                        `🔁 Você repostou · ${item.repostedAt || "data não informada"}`
                    )
                );
            }
        });
    }
}

async function loadProfileActivity(force = false) {
    if (!profilePostsActivityList) return;
    if (!profileActivityCurrentUserId()) {
        [profilePostsActivityList, profileRepliesActivityList, profileRepostsActivityList].forEach((container) => {
            setProfileActivityEmpty(container, "Entre na sua conta para ver sua atividade.");
        });
        return;
    }

    if (profileActivityLoading && !force && profileActivityPromise) {
        return profileActivityPromise;
    }
    if (profileActivityLoaded && !force) {
        renderProfileActivityTab(activeProfileActivityTab);
        return;
    }

    const requestId = ++profileActivityLoadSequence;
    profileActivityLoading = true;
    const userId = encodeURIComponent(profileActivityCurrentUserId());
    [profilePostsActivityList, profileRepliesActivityList, profileRepostsActivityList].forEach((container) => {
        if (container) {
            container.setAttribute("aria-busy", "true");
            setProfileActivityEmpty(container, "Carregando atividade...");
        }
    });

    profileActivityPromise = (async () => {
        const paths = {
            posts: `/profiles/id/${userId}/posts`,
            replies: `/profiles/id/${userId}/replies`,
            reposts: `/profiles/id/${userId}/reposts`
        };
        const settled = await Promise.allSettled(
            Object.entries(paths).map(async ([key, path]) => ({ key, value: await profileActivityApiRequest(path) }))
        );
        if (requestId !== profileActivityLoadSequence) return;

        profileActivityErrors = {};
        const keys = ["posts", "replies", "reposts"];
        settled.forEach((result, index) => {
            const key = keys[index];
            if (result.status === "fulfilled") {
                const value = result.value.value;
                profileActivityData[key] = Array.isArray(value) ? value : [];
            } else {
                profileActivityData[key] = [];
                profileActivityErrors[key] = result.reason?.message || "Falha na comunicação com o servidor.";
                console.warn(`Não foi possível carregar ${key} do perfil:`, result.reason);
            }
        });

        profileActivityLoaded = true;
        [profilePostsActivityList, profileRepliesActivityList, profileRepostsActivityList].forEach((container) => {
            if (container) container.removeAttribute("aria-busy");
        });
        renderProfileActivityTab(activeProfileActivityTab);
        if (profilePostsCount) profilePostsCount.textContent = String(profileActivityData.posts.length);
    })().finally(() => {
        if (requestId === profileActivityLoadSequence) {
            profileActivityLoading = false;
            profileActivityPromise = null;
        }
    });

    return profileActivityPromise;
}

function renderProfilePosts() {
    if (profileActivityLoaded) {
        renderProfileActivityTab(activeProfileActivityTab);
    } else {
        void loadProfileActivity();
    }
}

window.addEventListener("overclock:session-ready", async () => {
    await loadProfileFromApi();
    await loadProfileActivity(true);
    console.log("👤 Perfil sincronizado com a sessão.");
});

window.addEventListener("overclock:profile-updated", () => {
    void loadProfileFromApi();
    void loadProfileActivity(true);
});

const requestedProfileTab = new URLSearchParams(window.location.search).get("tab");
const requestedProfileActivityTab = new URLSearchParams(window.location.search).get("activity");
if (requestedProfileTab === "posts") openProfileTab("posts");
if (["posts", "replies", "reposts"].includes(requestedProfileActivityTab)) {
    openProfileTab("posts");
    openProfileActivityTab(requestedProfileActivityTab);
}

updatePlatforms();
updateGenres();
updateCurrentGame();
updateStats();
renderProfilePosts();

// Também cobre o caso em que session.js já disparou seu evento antes deste arquivo carregar.
if (localStorage.getItem("token")) {
    void loadProfileFromApi().then(() => loadProfileActivity(true));
}

console.log("👤 Perfil carregado com sucesso.");
