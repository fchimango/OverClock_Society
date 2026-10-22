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
        if (event.target === modalOverlay) {
            closeModal();
        }
    });
}

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeModal();
    }
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

    if (monthIndex < 0 || monthIndex > 11) {
        return "";
    }

    return `${months[monthIndex]} de ${year}`;
}

function updateProfileStatus(status) {
    if (!profileStatusText || !profileOnline) return;

    if (status === "online") {
        profileStatusText.textContent = "● ONLINE";
        profileStatusText.style.color = "#4ade80";
        profileOnline.style.background = "#4ade80";
        profileOnline.style.boxShadow =
            "0 0 12px rgba(74,222,128,0.60)";
        profileOnline.style.display = "block";
        return;
    }

    if (status === "away") {
        profileStatusText.textContent = "● AUSENTE";
        profileStatusText.style.color = "#facc15";
        profileOnline.style.background = "#facc15";
        profileOnline.style.boxShadow =
            "0 0 12px rgba(250,204,21,0.60)";
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
            "PC": {
                icon: "🖥️",
                type: "pc"
            },
            "PlayStation 5": {
                icon: "🎮",
                type: "playstation"
            },
            "Xbox Series": {
                icon: "🎮",
                type: "xbox"
            },
            "Nintendo Switch": {
                icon: "🕹️",
                type: "switch"
            }
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

    const usernameKey =
        `overclockSocietyUsername_${userId}`;

    const savedUsername = userId
        ? localStorage.getItem(usernameKey)
        : null;

    const username = normalizeProfileUsername(
        profile.username || savedUsername || profile.name
    );

    const data = {
        ...profile,
        id: userId,
        name: profile.name ||
            localStorage.getItem("userName") ||
            "Usuário",
        email: profile.email ||
            localStorage.getItem("userEmail") ||
            "",
        username,
        course: profile.course || "",
        semester: Number(profile.semester || 1),
        join_date: profile.join_date || "",
        status: profile.status || "online",
        bio: profile.bio || "",
        platforms: Array.isArray(profile.platforms)
            ? profile.platforms
            : [],
        genres: Array.isArray(profile.genres)
            ? profile.genres
            : [],
        current_game: profile.current_game || "",
        current_game_status:
            profile.current_game_status || "available"
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

    if (profileName) profileName.value = data.name;
    if (profileUsername) profileUsername.value = data.username;
    if (profileCourse) profileCourse.value = data.course;
    if (profileSemester) {
        profileSemester.value = String(data.semester);
    }
    if (profileJoinDate) {
        profileJoinDate.value = data.join_date;
    }
    if (profileStatus) profileStatus.value = data.status;
    if (profileBio) profileBio.value = data.bio;
    if (currentGame) currentGame.value = data.current_game;
    if (currentGameStatus) {
        currentGameStatus.value = data.current_game_status;
    }

    document.querySelectorAll('input[name="platform"]').forEach(
        (checkbox) => {
            checkbox.checked =
                data.platforms.includes(checkbox.value);
        }
    );

    document.querySelectorAll('input[name="genre"]').forEach(
        (checkbox) => {
            checkbox.checked =
                data.genres.includes(checkbox.value);
        }
    );

    if (profileIdentityName) {
        profileIdentityName.textContent = data.name;
    }

    if (profileIdentityUsername) {
        profileIdentityUsername.textContent = `@${data.username}`;
    }

    if (profileIdentityCourse) {
        profileIdentityCourse.textContent =
            `${data.course} • ${data.semester}º período`;
    }

    if (bioText) {
        bioText.textContent =
            data.bio || "Nenhuma biografia adicionada.";
    }

    if (profileDateText) {
        profileDateText.textContent =
            formatJoinDate(data.join_date) || "Não informado";
    }

    document.querySelectorAll(".profile-name strong").forEach(
        (element) => {
            element.textContent = data.name;
        }
    );

    document.querySelectorAll(".profile-button .avatar").forEach(
        (element) => {
            element.textContent =
                data.name.charAt(0).toUpperCase() || "?";
        }
    );

    const ownAvatar = document.querySelector(".profile-avatar");

    if (ownAvatar && !ownAvatar.style.backgroundImage) {
        ownAvatar.textContent =
            data.name.charAt(0).toUpperCase() || "?";
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
            throw new Error(
                await getProfileApiErrorMessage(response)
            );
        }

        const profile = await response.json();

        applyProfileData(profile);

        console.log("Perfil carregado da API.");

    } catch (error) {
        console.error(
            "Erro ao carregar o Perfil:",
            error
        );

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

        const username =
            normalizeProfileUsername(profileUsername.value);

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

        const currentUserId =
            localStorage.getItem("userId");

        const token =
            localStorage.getItem("token");

        if (!currentUserId || !token) {
            alert(
                "Sua sessão não foi encontrada. Faça login novamente."
            );
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
                document.querySelectorAll(
                    'input[name="platform"]:checked'
                )
            ).map((checkbox) => checkbox.value),

            genres: Array.from(
                document.querySelectorAll(
                    'input[name="genre"]:checked'
                )
            ).map((checkbox) => checkbox.value),

            current_game: currentGame
                ? currentGame.value.trim()
                : (PROFILE_API_DATA?.current_game || ""),

            current_game_status: currentGameStatus
                ? currentGameStatus.value
                : (
                    PROFILE_API_DATA?.current_game_status ||
                    "available"
                )
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
                throw new Error(
                    await getProfileApiErrorMessage(response)
                );
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
            console.error(
                "Erro ao salvar o Perfil:",
                error
            );

            alert(
                "Não foi possível salvar o Perfil: " +
                error.message
            );

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

   As imagens são apenas pré-visualizadas.
   Ainda não são enviadas ao servidor.
========================================= */

if (profileAvatar) {
    profileAvatar.addEventListener("change", () => {
        const file = profileAvatar.files[0];

        if (!file) return;

        const reader = new FileReader();

        reader.onload = (event) => {
            const avatar =
                document.querySelector(".profile-avatar");

            if (!avatar) return;

            avatar.style.backgroundImage =
                `url(${event.target.result})`;

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
            const cover =
                document.querySelector(".profile-cover");

            if (!cover) return;

            cover.style.backgroundImage =
                `url(${event.target.result})`;

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
    const targetTab = Array.from(profileTabButtons).find(
        (button) => button.dataset.profileTab === tabName
    );

    const targetPanel = Array.from(profileTabPanels).find(
        (panel) => panel.dataset.profilePanel === tabName
    );

    if (!targetTab || !targetPanel) {
        console.error(
            "Não foi possível encontrar a aba ou o painel do perfil:",
            tabName
        );

        return;
    }

    profileTabButtons.forEach((button) => {
        const isActive =
            button.dataset.profileTab === tabName;

        button.classList.toggle("active", isActive);

        button.setAttribute(
            "aria-selected",
            String(isActive)
        );
    });

    profileTabPanels.forEach((panel) => {
        const isActive =
            panel.dataset.profilePanel === tabName;

        panel.classList.toggle("active", isActive);
        panel.hidden = !isActive;
    });

    if (tabName === "posts") {
        renderProfilePosts();

        if (
            !profilePostsLoaded &&
            !profilePostsLoading &&
            localStorage.getItem("token")
        ) {
            loadProfilePostsFromApi();
        }
    }
}

profileTabButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
        event.preventDefault();

        openProfileTab(button.dataset.profileTab);
    });
});


/* =========================================
   PUBLICAÇÕES DO PERFIL — API DO FEED
========================================= */

let profileFeedPosts = [];
let profilePostsLoaded = false;
let profilePostsLoading = false;
let profilePostsError = "";
let profilePostsLoadPromise = null;

const activeProfileCommentPostIds = new Set();

const PROFILE_GAME_HASHTAGS = new Set([
    "eldenring",
    "hollowknight",
    "minecraft",
    "valorant",
    "terraria",
    "zelda",
    "godofwar",
    "stardewvalley",
    "residentevil4",
    "hades",
    "sekiro",
    "cyberpunk2077",
    "celeste",
    "spiderman"
]);


/* =========================================
   USUÁRIO ATUAL
========================================= */

function getProfileCurrentUser() {
    const id = localStorage.getItem("userId");
    const name =
        localStorage.getItem("userName") || "Usuário";

    const email =
        localStorage.getItem("userEmail") || "";

    const avatar =
        name.trim().charAt(0).toUpperCase() || "?";

    const savedUsername = id
        ? localStorage.getItem(
            `overclockSocietyUsername_${id}`
        )
        : null;

    const username = normalizeProfileUsername(
        PROFILE_API_DATA?.username ||
        savedUsername ||
        name
    ) || "usuario";

    return {
        id,
        name,
        email,
        avatar,
        username: `@${username}`
    };
}


/* =========================================
   REQUISIÇÕES À API DO FEED
========================================= */

async function profileFeedApiRequest(path, options = {}) {
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
        `${PROFILE_API_BASE_URL}${path}`,
        {
            ...options,
            headers
        }
    );

    if (response.status === 204) {
        return null;
    }

    if (!response.ok) {
        throw new Error(
            await getProfileApiErrorMessage(response)
        );
    }

    return response.json();
}


/* =========================================
   CARREGAR PUBLICAÇÕES DO POSTGRESQL
========================================= */

async function loadProfilePostsFromApi() {
    if (profilePostsLoadPromise) {
        return profilePostsLoadPromise;
    }

    if (!localStorage.getItem("token")) {
        profilePostsLoaded = false;
        profilePostsLoading = false;

        profilePostsError =
            "Entre novamente para ver suas publicações.";

        renderProfilePosts();
        return;
    }

    profilePostsLoading = true;
    profilePostsError = "";

    renderProfilePosts();

    const request = (async () => {
        try {
            const result = await profileFeedApiRequest(
                "/feed/posts"
            );

            profileFeedPosts = Array.isArray(result)
                ? result
                : [];

            profilePostsLoaded = true;
            profilePostsError = "";

            renderProfilePosts();

        } catch (error) {
            console.error(
                "Erro ao carregar publicações do perfil:",
                error
            );

            profilePostsLoaded = false;

            profilePostsError =
                error.message || "Erro desconhecido.";

            renderProfilePosts();

        } finally {
            profilePostsLoading = false;
            profilePostsLoadPromise = null;
        }
    })();

    profilePostsLoadPromise = request;

    return request;
}


function getCurrentUserPosts(posts) {
    const user = getProfileCurrentUser();

    return posts.filter(
        (post) =>
            String(post.userId) === String(user.id)
    );
}


/* =========================================
   HASHTAGS NAS PUBLICAÇÕES
========================================= */

function normalizeProfileHashtag(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/^#/, "")
        .trim();
}


function createProfilePostText(content) {
    const paragraph = document.createElement("p");
    paragraph.className = "post-text";

    const parts = String(content || "")
        .split(/(#[a-zA-ZÀ-ÿ0-9_-]+)/g);

    parts.forEach((part) => {
        const normalized =
            normalizeProfileHashtag(part);

        if (
            part.startsWith("#") &&
            PROFILE_GAME_HASHTAGS.has(normalized)
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

            hashtag.addEventListener("click", () => {
                window.location.href =
                    `feed.html?hashtag=${encodeURIComponent(normalized)}`;
            });

            paragraph.appendChild(hashtag);

        } else {
            paragraph.appendChild(
                document.createTextNode(part)
            );
        }
    });

    return paragraph;
}


function createProfilePostAction(icon, count, label) {
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


/* =========================================
   COMENTÁRIOS
========================================= */

function createProfileComment(comment, postId) {
    const element = document.createElement("div");
    element.className = "comment";

    const avatar = document.createElement("div");
    avatar.className = "comment-avatar";
    avatar.textContent = comment.avatar || "?";

    const body = document.createElement("div");
    body.className = "comment-body";

    const user = document.createElement("div");
    user.className = "comment-user";
    user.textContent = comment.author || "Usuário";

    const text = document.createElement("div");
    text.className = "comment-text";
    text.textContent = comment.text || "";

    body.append(user, text);

    const currentUser = getProfileCurrentUser();

    const canDeleteComment =
        comment.id != null &&
        String(comment.userId) === String(currentUser.id);

    if (canDeleteComment) {
        const deleteButton =
            document.createElement("button");

        deleteButton.type = "button";
        deleteButton.className = "comment-delete-button";
        deleteButton.textContent = "🗑 Excluir";

        deleteButton.addEventListener("click", () => {
            deleteProfileComment(postId, comment.id);
        });

        body.appendChild(deleteButton);
    }

    element.append(avatar, body);

    return element;
}


function createProfileCommentsSection(post) {
    const section = document.createElement("div");
    section.className = "comments-section";

    if (
        activeProfileCommentPostIds.has(String(post.id))
    ) {
        section.classList.add("active");
    }

    const list = document.createElement("div");
    list.className = "comments-list";

    (post.comments || []).forEach((comment) => {
        list.appendChild(
            createProfileComment(comment, post.id)
        );
    });

    const form = document.createElement("form");
    form.className = "comment-form";

    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 180;
    input.placeholder = "Escreva um comentário...";
    input.required = true;

    input.setAttribute(
        "aria-label",
        "Texto do comentário"
    );

    const button = document.createElement("button");
    button.type = "submit";
    button.textContent = "Enviar";

    form.append(input, button);

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const content = input.value.trim();

        if (!content) return;

        button.disabled = true;
        button.textContent = "Enviando...";

        activeProfileCommentPostIds.add(
            String(post.id)
        );

        try {
            await profileFeedApiRequest(
                `/feed/posts/${post.id}/comments`,
                {
                    method: "POST",
                    body: JSON.stringify({ content })
                }
            );

            await loadProfilePostsFromApi();

        } catch (error) {
            console.error(
                "Erro ao enviar comentário:",
                error
            );

            alert(
                `Não foi possível enviar o comentário: ${error.message}`
            );

        } finally {
            button.disabled = false;
            button.textContent = "Enviar";
        }
    });

    section.append(list, form);

    return section;
}


/* =========================================
   EXCLUIR PUBLICAÇÕES E COMENTÁRIOS
========================================= */

async function deleteProfilePost(postId) {
    const currentUser = getProfileCurrentUser();

    const post = profileFeedPosts.find(
        (item) =>
            String(item.id) === String(postId)
    );

    if (!post) return;

    if (
        String(post.userId) !== String(currentUser.id)
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
        await profileFeedApiRequest(
            `/feed/posts/${postId}`,
            {
                method: "DELETE"
            }
        );

        activeProfileCommentPostIds.delete(
            String(postId)
        );

        await loadProfilePostsFromApi();

    } catch (error) {
        console.error(
            "Erro ao excluir publicação:",
            error
        );

        alert(
            `Não foi possível excluir a publicação: ${error.message}`
        );
    }
}


async function deleteProfileComment(postId, commentId) {
    const currentUser = getProfileCurrentUser();

    const post = profileFeedPosts.find(
        (item) =>
            String(item.id) === String(postId)
    );

    const comment = (post?.comments || []).find(
        (item) =>
            String(item.id) === String(commentId)
    );

    if (!comment) return;

    if (
        String(comment.userId) !== String(currentUser.id)
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

    activeProfileCommentPostIds.add(
        String(postId)
    );

    try {
        await profileFeedApiRequest(
            `/feed/posts/${postId}/comments/${commentId}`,
            {
                method: "DELETE"
            }
        );

        await loadProfilePostsFromApi();

    } catch (error) {
        console.error(
            "Erro ao excluir comentário:",
            error
        );

        alert(
            `Não foi possível excluir o comentário: ${error.message}`
        );
    }
}


/* =========================================
   CURTIDAS E REPOSTAGENS
========================================= */

async function toggleProfilePostLike(postId, button) {
    if (button) {
        button.disabled = true;
    }

    try {
        const result = await profileFeedApiRequest(
            `/feed/posts/${postId}/like`,
            {
                method: "POST"
            }
        );

        const post = profileFeedPosts.find(
            (item) =>
                String(item.id) === String(postId)
        );

        if (post) {
            post.liked = result.liked;
            post.likes = result.likes;
        }

        renderProfilePosts();

    } catch (error) {
        console.error(
            "Erro ao atualizar curtida:",
            error
        );

        alert(
            `Não foi possível atualizar a curtida: ${error.message}`
        );

    } finally {
        if (button) {
            button.disabled = false;
        }
    }
}


async function toggleProfilePostRepost(postId, button) {
    if (button) {
        button.disabled = true;
    }

    try {
        const result = await profileFeedApiRequest(
            `/feed/posts/${postId}/repost`,
            {
                method: "POST"
            }
        );

        const post = profileFeedPosts.find(
            (item) =>
                String(item.id) === String(postId)
        );

        if (post) {
            post.reposted = result.reposted;
            post.reposts = result.reposts;
        }

        renderProfilePosts();

    } catch (error) {
        console.error(
            "Erro ao atualizar repostagem:",
            error
        );

        alert(
            `Não foi possível atualizar a repostagem: ${error.message}`
        );

    } finally {
        if (button) {
            button.disabled = false;
        }
    }
}


/* =========================================
   CARD DE PUBLICAÇÃO
========================================= */

function createProfilePostCard(post) {
    const currentUser = getProfileCurrentUser();

    const article = document.createElement("article");
    article.className = "post-card";

    const header = document.createElement("div");
    header.className = "post-header";

    const avatar = document.createElement("div");
    avatar.className = "post-avatar";
    avatar.textContent =
        post.avatar || currentUser.avatar;

    const user = document.createElement("div");
    user.className = "post-user";

    const userLine = document.createElement("div");
    userLine.className = "post-user-line";

    const author = document.createElement("strong");
    author.textContent =
        post.author || currentUser.name;

    const username = document.createElement("span");
    username.className = "post-username";
    username.textContent =
        post.username || currentUser.username;

    const time = document.createElement("span");
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
        createProfilePostText(post.content || "")
    );

    header.append(avatar, user);
    article.appendChild(header);

    const actions = document.createElement("div");
    actions.className = "post-actions";

    const commentButton = createProfilePostAction(
        "💬",
        (post.comments || []).length,
        "Comentar"
    );

    const repostButton = createProfilePostAction(
        post.reposted ? "✅" : "🔁",
        Number(post.reposts || 0),
        "Repostar"
    );

    const likeButton = createProfilePostAction(
        post.liked ? "❤️" : "♡",
        Number(post.likes || 0),
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

    const canDeletePost =
        post.userId != null &&
        String(post.userId) === String(currentUser.id);

    if (canDeletePost) {
        const deleteButton =
            document.createElement("button");

        deleteButton.type = "button";

        deleteButton.className =
            "post-action post-delete-button";

        deleteButton.innerHTML =
            "<span>🗑</span><span>Excluir</span>";

        deleteButton.addEventListener("click", () => {
            deleteProfilePost(post.id);
        });

        actions.appendChild(deleteButton);
    }

    article.appendChild(actions);

    const commentsSection =
        createProfileCommentsSection(post);

    article.appendChild(commentsSection);

    commentButton.addEventListener("click", () => {
        const key = String(post.id);

        if (activeProfileCommentPostIds.has(key)) {
            activeProfileCommentPostIds.delete(key);
            commentsSection.classList.remove("active");

        } else {
            activeProfileCommentPostIds.add(key);
            commentsSection.classList.add("active");
        }
    });

    likeButton.addEventListener("click", () => {
        toggleProfilePostLike(post.id, likeButton);
    });

    repostButton.addEventListener("click", () => {
        toggleProfilePostRepost(post.id, repostButton);
    });

    return article;
}


/* =========================================
   RENDERIZAR PUBLICAÇÕES DO PERFIL
========================================= */

function renderProfilePosts() {
    if (!profilePostsList) return;

    profilePostsList.innerHTML = "";

    if (!profilePostsLoaded) {
        const message = document.createElement("div");
        message.className = "profile-posts-empty";

        const title = document.createElement("strong");
        const description = document.createElement("p");

        if (profilePostsError) {
            title.textContent =
                "Não foi possível carregar suas publicações.";

            description.textContent =
                profilePostsError;

            const retryButton =
                document.createElement("button");

            retryButton.type = "button";
            retryButton.className = "btn btn-primary";
            retryButton.textContent = "Tentar novamente";

            retryButton.addEventListener("click", () => {
                loadProfilePostsFromApi();
            });

            message.append(
                title,
                description,
                retryButton
            );

        } else {
            title.textContent = profilePostsLoading
                ? "Carregando suas publicações..."
                : "Preparando o Feed...";

            description.textContent = profilePostsLoading
                ? "Buscando publicações no servidor."
                : "Aguarde enquanto validamos sua sessão.";

            message.append(title, description);
        }

        profilePostsList.appendChild(message);

        if (profilePostsCount) {
            profilePostsCount.textContent = "0";
        }

        return;
    }

    const userPosts =
        getCurrentUserPosts(profileFeedPosts);

    if (profilePostsCount) {
        profilePostsCount.textContent =
            String(userPosts.length);
    }

    if (userPosts.length === 0) {
        profilePostsList.innerHTML = `
            <div class="profile-posts-empty">
                <span>📰</span>
                <strong>Você ainda não publicou nada.</strong>
                <p>
                    Crie uma publicação no Feed e ela aparecerá aqui automaticamente.
                </p>
            </div>
        `;

        return;
    }

    userPosts.forEach((post) => {
        profilePostsList.appendChild(
            createProfilePostCard(post)
        );
    });
}


/* =========================================
   SINCRONIZAÇÃO COM A SESSÃO E O PERFIL
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

        renderProfilePosts();
        loadProfileFromApi();
        loadProfilePostsFromApi();
    }
);


window.addEventListener(
    "overclock:profile-updated",
    () => {
        loadProfilePostsFromApi();
    }
);


/* =========================================
   ABRIR ABA PELA URL E INICIALIZAR
========================================= */

const requestedProfileTab =
    new URLSearchParams(
        window.location.search
    ).get("tab");

if (requestedProfileTab === "posts") {
    openProfileTab("posts");
} else {
    openProfileTab("profile");
}

updatePlatforms();
updateGenres();
updateCurrentGame();
updateStats();
renderProfilePosts();

console.log(
    "👤 Perfil integrado às publicações do PostgreSQL."
);