/* =========================================
   ELEMENTOS
========================================= */

const editProfileButton =
    document.getElementById("editProfileButton");

const modalOverlay =
    document.getElementById("profileModalOverlay");

const modalClose =
    document.getElementById("modalClose");

const modalCancel =
    document.getElementById("modalCancel");

const profileForm =
    document.getElementById("profileForm");


/* =========================================
   ELEMENTOS DO FORMULÁRIO
========================================= */

const profileName =
    document.getElementById("profileName");

const profileUsername =
    document.getElementById("profileUsername");

const profileCourse =
    document.getElementById("profileCourse");

const profileSemester =
    document.getElementById("profileSemester");

const profileJoinDate =
    document.getElementById("profileJoinDate");

const profileStatus =
    document.getElementById("profileStatus");

const profileBio =
    document.getElementById("profileBio");

const profileAvatar =
    document.getElementById("profileAvatar");

const profileCover =
    document.getElementById("profileCover");

const profileGamesCount =
    document.getElementById("profileGamesCount");

const profileFriendsCount =
    document.getElementById("profileFriendsCount");

const currentGame =
    document.getElementById("currentGame");

const currentGameStatus =
    document.getElementById("currentGameStatus");


/* =========================================
   ELEMENTOS DA PÁGINA
========================================= */

const profileIdentityName =
    document.querySelector(
        ".profile-identity h1"
    );

const profileIdentityUsername =
    document.querySelector(
        ".profile-username"
    );

const profileIdentityCourse =
    document.querySelector(
        ".profile-identity p"
    );

const bioText =
    document.getElementById("bioText");

const profileStatusText =
    document.querySelector(
        ".profile-status"
    );

const profileOnline =
    document.querySelector(
        ".profile-online"
    );

const profileDateText =
    document.querySelector(
        ".about-item:nth-child(3) strong"
    );


/* =========================================
   ESTATÍSTICAS
========================================= */

const statValues =
    document.querySelectorAll(
        ".profile-stat strong"
    );


/* =========================================
   PLATAFORMAS
========================================= */

const platformList =
    document.querySelector(
        ".platform-list"
    );


/* =========================================
   GÊNEROS
========================================= */

const genreTags =
    document.querySelector(
        ".genre-tags"
    );


/* =========================================
   JOGO ATUAL
========================================= */

const currentGameName =
    document.querySelector(
        ".current-game strong"
    );

const currentGameAvailability =
    document.querySelector(
        ".current-game small"
    );


/* =========================================
   MODAL
========================================= */

function openModal() {

    modalOverlay.classList.add(
        "active"
    );

    document.body.style.overflow =
        "hidden";
}


function closeModal() {

    modalOverlay.classList.remove(
        "active"
    );

    document.body.style.overflow =
        "";
}


if (editProfileButton) {

    editProfileButton.addEventListener(
        "click",
        openModal
    );
}


if (modalClose) {

    modalClose.addEventListener(
        "click",
        closeModal
    );
}


if (modalCancel) {

    modalCancel.addEventListener(
        "click",
        closeModal
    );
}


if (modalOverlay) {

    modalOverlay.addEventListener(
        "click",
        (event) => {

            if (
                event.target ===
                modalOverlay
            ) {

                closeModal();
            }

        }
    );
}


document.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key === "Escape"
        ) {

            closeModal();
        }

    }
);


/* =========================================
   FORMATAR DATA
========================================= */

function formatJoinDate(value) {

    if (!value) {

        return "";
    }


    const [year, month] =
        value.split("-");


    const months = [

        "Janeiro",
        "Fevereiro",
        "Março",
        "Abril",
        "Maio",
        "Junho",
        "Julho",
        "Agosto",
        "Setembro",
        "Outubro",
        "Novembro",
        "Dezembro"

    ];


    return `${months[
        Number(month) - 1
    ]} de ${year}`;
}


/* =========================================
   STATUS ONLINE
========================================= */

function updateProfileStatus(status) {

    if (
        !profileStatusText ||
        !profileOnline
    ) {

        return;
    }


    if (
        status === "online"
    ) {

        profileStatusText.textContent =
            "● ONLINE";

        profileStatusText.style.color =
            "#4ade80";

        profileOnline.style.background =
            "#4ade80";

        profileOnline.style.boxShadow =
            "0 0 12px rgba(74,222,128,0.60)";

        profileOnline.style.display =
            "block";

        return;
    }


    if (
        status === "away"
    ) {

        profileStatusText.textContent =
            "● AUSENTE";

        profileStatusText.style.color =
            "#facc15";

        profileOnline.style.background =
            "#facc15";

        profileOnline.style.boxShadow =
            "0 0 12px rgba(250,204,21,0.60)";

        profileOnline.style.display =
            "block";

        return;
    }


    profileStatusText.textContent =
        "● OFFLINE";

    profileStatusText.style.color =
        "#94a3b8";

    profileOnline.style.display =
        "none";
}


/* =========================================
   PLATAFORMAS
========================================= */

function updatePlatforms() {

    if (!platformList) {

        return;
    }


    const selectedPlatforms =
        document.querySelectorAll(
            'input[name="platform"]:checked'
        );


    platformList.innerHTML =
        "";


    if (
        selectedPlatforms.length === 0
    ) {

        platformList.innerHTML = `
            <span class="empty-profile-message">
                Nenhuma plataforma adicionada.
            </span>
        `;

        return;
    }


    selectedPlatforms.forEach(
        (checkbox) => {

            const name =
                checkbox.value;


            let icon =
                "🎮";

            let type =
                "";


            if (
                name === "PC"
            ) {

                icon =
                    "🖥️";

                type =
                    "pc";
            }


            else if (
                name ===
                "PlayStation 5"
            ) {

                icon =
                    "🎮";

                type =
                    "playstation";
            }


            else if (
                name ===
                "Xbox Series"
            ) {

                icon =
                    "🎮";

                type =
                    "xbox";
            }


            else if (
                name ===
                "Nintendo Switch"
            ) {

                icon =
                    "🕹️";

                type =
                    "switch";
            }


            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "platform-item";


            item.innerHTML = `

                <div class="platform-icon ${type}">
                    ${icon}
                </div>

                <div>

                    <strong>
                        ${name}
                    </strong>

                </div>

            `;


            platformList.appendChild(
                item
            );

        }
    );
}


/* =========================================
   GÊNEROS
========================================= */

function updateGenres() {

    if (!genreTags) {

        return;
    }


    const selectedGenres =
        document.querySelectorAll(
            'input[name="genre"]:checked'
        );


    genreTags.innerHTML =
        "";


    if (
        selectedGenres.length === 0
    ) {

        genreTags.innerHTML = `
            <span>
                Nenhum gênero selecionado
            </span>
        `;

        return;
    }


    selectedGenres.forEach(
        (checkbox) => {

            const tag =
                document.createElement(
                    "span"
                );


            tag.textContent =
                checkbox.value;


            genreTags.appendChild(
                tag
            );

        }
    );
}


/* =========================================
   JOGO ATUAL
========================================= */

function updateCurrentGame() {

    if (
        !currentGame ||
        !currentGameName ||
        !currentGameStatus ||
        !currentGameAvailability
    ) {

        return;
    }


    const game =
        currentGame.value.trim();


    currentGameName.textContent =
        game ||
        "Nenhum jogo";


    const status =
        currentGameStatus.value;


    if (
        status === "available"
    ) {

        currentGameAvailability.textContent =
            "🟢 Disponível";

        currentGameAvailability.style.color =
            "#4ade80";
    }


    else if (
        status === "busy"
    ) {

        currentGameAvailability.textContent =
            "🔴 Ocupado";

        currentGameAvailability.style.color =
            "#f87171";
    }


    else {

        currentGameAvailability.textContent =
            "🟡 Ausente";

        currentGameAvailability.style.color =
            "#facc15";
    }
}


/* =========================================
   ESTATÍSTICAS

   Agora temos somente:
   - Jogos
   - Amigos
========================================= */

function updateStats() {

    if (
        statValues[0] &&
        profileGamesCount
    ) {

        statValues[0].textContent =
            profileGamesCount.value || 0;
    }


    if (
        statValues[1] &&
        profileFriendsCount
    ) {

        statValues[1].textContent =
            profileFriendsCount.value || 0;
    }
}


/* =========================================
   SALVAR PERFIL
========================================= */

if (profileForm) {

    profileForm.addEventListener(
        "submit",
        (event) => {

            event.preventDefault();


            const name =
                profileName.value.trim();

            const username =
                profileUsername.value.trim();

            const course =
                profileCourse.value.trim();


            if (
                !name ||
                !username ||
                !course
            ) {

                alert(
                    "Preencha Nome, Usuário e Curso."
                );

                return;
            }


            /* IDENTIDADE */

            if (profileIdentityName) {

                profileIdentityName.textContent =
                    name;
            }


            if (profileIdentityUsername) {

                profileIdentityUsername.textContent =
                    `@${username}`;
            }


            if (profileIdentityCourse) {

                profileIdentityCourse.textContent =
                    `${course} • ${profileSemester.value}º período`;
            }


            /* BIO */

            if (bioText) {

                bioText.textContent =
                    profileBio.value.trim() ||
                    "Nenhuma biografia adicionada.";
            }


            /* DATA */

            if (profileDateText) {

                profileDateText.textContent =
                    formatJoinDate(
                        profileJoinDate.value
                    );
            }


            /* STATUS */

            updateProfileStatus(
                profileStatus.value
            );


            /* ESTATÍSTICAS */

            updateStats();


            /* PLATAFORMAS */

            updatePlatforms();


            /* GÊNEROS */

            updateGenres();


            /* JOGO ATUAL */

            updateCurrentGame();


            closeModal();

        }
    );
}


/* =========================================
   AVATAR
========================================= */

if (profileAvatar) {

    profileAvatar.addEventListener(
        "change",
        () => {

            const file =
                profileAvatar.files[0];


            if (!file) {

                return;
            }


            const reader =
                new FileReader();


            reader.onload =
                (event) => {

                    const avatar =
                        document.querySelector(
                            ".profile-avatar"
                        );


                    if (!avatar) {

                        return;
                    }


                    avatar.style.backgroundImage =
                        `url(${event.target.result})`;

                    avatar.style.backgroundSize =
                        "cover";

                    avatar.style.backgroundPosition =
                        "center";

                    avatar.style.fontSize =
                        "0";
                };


            reader.readAsDataURL(
                file
            );

        }
    );
}


/* =========================================
   CAPA
========================================= */

if (profileCover) {

    profileCover.addEventListener(
        "change",
        () => {

            const file =
                profileCover.files[0];


            if (!file) {

                return;
            }


            const reader =
                new FileReader();


            reader.onload =
                (event) => {

                    const cover =
                        document.querySelector(
                            ".profile-cover"
                        );


                    if (!cover) {

                        return;
                    }


                    cover.style.backgroundImage =
                        `url(${event.target.result})`;

                    cover.style.backgroundSize =
                        "cover";

                    cover.style.backgroundPosition =
                        "center";
                };


            reader.readAsDataURL(
                file
            );

        }
    );
}


/* =========================================
   ABAS DO PERFIL
========================================= */

const profileTabButtons =
    document.querySelectorAll(
        "[data-profile-tab]"
    );

const profileTabPanels =
    document.querySelectorAll(
        "[data-profile-panel]"
    );

const profilePostsList =
    document.getElementById(
        "profilePostsList"
    );

const profilePostsCount =
    document.getElementById(
        "profilePostsCount"
    );


function openProfileTab(tabName) {

    profileTabButtons.forEach(
        (button) => {

            const isActive =
                button.dataset.profileTab ===
                tabName;


            button.classList.toggle(
                "active",
                isActive
            );


            button.setAttribute(
                "aria-selected",
                String(isActive)
            );

        }
    );


    profileTabPanels.forEach(
        (panel) => {

            const isActive =
                panel.dataset.profilePanel ===
                tabName;


            panel.classList.toggle(
                "active",
                isActive
            );

        }
    );


    if (
        tabName === "posts"
    ) {

        renderProfilePosts();
    }
}


profileTabButtons.forEach(
    (button) => {

        button.addEventListener(
            "click",
            () => {

                openProfileTab(
                    button.dataset.profileTab
                );

            }
        );

    }
);


/* =========================================
   POSTS DO PERFIL
========================================= */

const PROFILE_POSTS_STORAGE_KEY =
    "overclockSocietyFeedPosts";

const PROFILE_CURRENT_USER_ID =
    "current-user";


const PROFILE_GAME_HASHTAGS =
    new Set([

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
   CARREGAR POSTS
========================================= */

function loadProfilePostsData() {

    let stored =
        null;


    try {

        stored =
            localStorage.getItem(
                PROFILE_POSTS_STORAGE_KEY
            );

    } catch (error) {

        console.warn(
            "Não foi possível acessar o localStorage.",
            error
        );

        return [];
    }


    if (!stored) {

        return [];
    }


    try {

        const parsed =
            JSON.parse(
                stored
            );


        return Array.isArray(
            parsed
        )
            ? parsed
            : [];

    } catch (error) {

        console.warn(
            "Não foi possível carregar os posts do perfil.",
            error
        );


        return [];
    }
}


/* =========================================
   SALVAR POSTS
========================================= */

function saveProfilePostsData(
    posts
) {

    try {

        localStorage.setItem(
            PROFILE_POSTS_STORAGE_KEY,
            JSON.stringify(
                posts
            )
        );

    } catch (error) {

        console.warn(
            "Não foi possível salvar os posts.",
            error
        );

    }
}


/* =========================================
   POSTS DO USUÁRIO ATUAL
========================================= */

function getCurrentUserPosts(
    posts
) {

    return posts.filter(
        (post) =>

            post.userId ===
                PROFILE_CURRENT_USER_ID ||

            post.username ===
                "@joao123"
    );
}


/* =========================================
   HASHTAGS
========================================= */

function normalizeProfileHashtag(
    value
) {

    return String(value)
        .toLowerCase()
        .replace("#", "")
        .trim();
}


function createProfilePostText(
    content
) {

    const paragraph =
        document.createElement(
            "p"
        );


    paragraph.className =
        "post-text";


    const parts =
        String(content).split(
            /(#[a-zA-ZÀ-ÿ0-9_-]+)/g
        );


    parts.forEach(
        (part) => {

            const normalized =
                normalizeProfileHashtag(
                    part
                );


            if (
                part.startsWith("#") &&
                PROFILE_GAME_HASHTAGS.has(
                    normalized
                )
            ) {

                const hashtag =
                    document.createElement(
                        "button"
                    );


                hashtag.type =
                    "button";

                hashtag.className =
                    "game-hashtag";

                hashtag.textContent =
                    part;


                hashtag.style.border =
                    "none";

                hashtag.style.background =
                    "transparent";

                hashtag.style.padding =
                    "0";

                hashtag.style.font =
                    "inherit";


                hashtag.addEventListener(
                    "click",
                    () => {

                        window.location.href =
                            `feed.html?hashtag=${encodeURIComponent(
                                normalized
                            )}`;

                    }
                );


                paragraph.appendChild(
                    hashtag
                );


                return;
            }


            paragraph.appendChild(
                document.createTextNode(
                    part
                )
            );

        }
    );


    return paragraph;
}


/* =========================================
   BOTÃO DE AÇÃO DO POST
========================================= */

function createProfilePostAction(
    icon,
    count,
    label
) {

    const button =
        document.createElement(
            "button"
        );


    button.type =
        "button";

    button.className =
        "post-action";


    button.innerHTML = `
        <span>
            ${icon}
        </span>

        <span>
            ${count}
        </span>

        <span>
            ${label}
        </span>
    `;


    return button;
}


/* =========================================
   COMENTÁRIO
========================================= */

function createProfileComment(
    comment
) {

    const element =
        document.createElement(
            "div"
        );


    element.className =
        "comment";


    const avatar =
        document.createElement(
            "div"
        );


    avatar.className =
        "comment-avatar";

    avatar.textContent =
        comment.avatar ||
        "J";


    const body =
        document.createElement(
            "div"
        );


    body.className =
        "comment-body";


    const user =
        document.createElement(
            "div"
        );


    user.className =
        "comment-user";

    user.textContent =
        comment.author ||
        "Usuário";


    const text =
        document.createElement(
            "div"
        );


    text.className =
        "comment-text";

    text.textContent =
        comment.text ||
        "";


    body.append(
        user,
        text
    );


    element.append(
        avatar,
        body
    );


    return element;
}


/* =========================================
   SEÇÃO DE COMENTÁRIOS
========================================= */

function createProfileCommentsSection(
    post,
    allPosts
) {

    const section =
        document.createElement(
            "div"
        );


    section.className =
        "comments-section";


    const list =
        document.createElement(
            "div"
        );


    list.className =
        "comments-list";


    (post.comments || []).forEach(
        (comment) => {

            list.appendChild(
                createProfileComment(
                    comment
                )
            );

        }
    );


    const form =
        document.createElement(
            "form"
        );


    form.className =
        "comment-form";


    const input =
        document.createElement(
            "input"
        );


    input.type =
        "text";

    input.maxLength =
        180;

    input.placeholder =
        "Escreva um comentário...";


    const button =
        document.createElement(
            "button"
        );


    button.type =
        "submit";

    button.textContent =
        "Enviar";


    form.append(
        input,
        button
    );


    form.addEventListener(
        "submit",
        (event) => {

            event.preventDefault();


            const text =
                input.value.trim();


            if (!text) {

                return;
            }


            if (
                !Array.isArray(
                    post.comments
                )
            ) {

                post.comments =
                    [];
            }


            post.comments.push({

                author:
                    "João",

                avatar:
                    "J",

                text

            });


            saveProfilePostsData(
                allPosts
            );


            renderProfilePosts();

        }
    );


    section.append(
        list,
        form
    );


    return section;
}


/* =========================================
   CURTIR POST
========================================= */

function toggleProfilePostLike(
    postId
) {

    const posts =
        loadProfilePostsData();


    const post =
        posts.find(
            (item) =>
                item.id ===
                postId
        );


    if (!post) {

        return;
    }


    post.liked =
        !post.liked;


    post.likes =
        Number(
            post.likes || 0
        ) +
        (
            post.liked
                ? 1
                : -1
        );


    if (
        post.likes < 0
    ) {

        post.likes =
            0;
    }


    saveProfilePostsData(
        posts
    );


    renderProfilePosts();
}


/* =========================================
   REPOSTAR
========================================= */

function toggleProfilePostRepost(
    postId
) {

    const posts =
        loadProfilePostsData();


    const post =
        posts.find(
            (item) =>
                item.id ===
                postId
        );


    if (!post) {

        return;
    }


    post.reposted =
        !post.reposted;


    post.reposts =
        Number(
            post.reposts || 0
        ) +
        (
            post.reposted
                ? 1
                : -1
        );


    if (
        post.reposts < 0
    ) {

        post.reposts =
            0;
    }


    saveProfilePostsData(
        posts
    );


    renderProfilePosts();
}


/* =========================================
   CARD DO POST
========================================= */

function createProfilePostCard(
    post,
    allPosts
) {

    const article =
        document.createElement(
            "article"
        );


    article.className =
        "post-card";


    /* =========================
       HEADER
    ========================= */

    const header =
        document.createElement(
            "div"
        );


    header.className =
        "post-header";


    const avatar =
        document.createElement(
            "div"
        );


    avatar.className =
        "post-avatar";

    avatar.textContent =
        post.avatar ||
        "J";


    const user =
        document.createElement(
            "div"
        );


    user.className =
        "post-user";


    const userLine =
        document.createElement(
            "div"
        );


    userLine.className =
        "post-user-line";


    const author =
        document.createElement(
            "strong"
        );


    author.textContent =
        post.author ||
        "João";


    const username =
        document.createElement(
            "span"
        );


    username.className =
        "post-username";

    username.textContent =
        post.username ||
        "@joao123";


    const time =
        document.createElement(
            "span"
        );


    time.className =
        "post-time";

    time.textContent =
        `• ${post.createdAt || "agora"}`;


    userLine.append(
        author,
        username,
        time
    );


    user.appendChild(
        userLine
    );


    user.appendChild(
        createProfilePostText(
            post.content || ""
        )
    );


    header.append(
        avatar,
        user
    );


    article.appendChild(
        header
    );


    /* =========================
       AÇÕES
    ========================= */

    const actions =
        document.createElement(
            "div"
        );


    actions.className =
        "post-actions";


    const commentButton =
        createProfilePostAction(
            "💬",
            (post.comments || []).length,
            "Comentar"
        );


    const repostButton =
        createProfilePostAction(
            "🔁",
            Number(
                post.reposts || 0
            ),
            "Repostar"
        );


    const likeButton =
        createProfilePostAction(
            post.liked
                ? "❤️"
                : "♡",

            Number(
                post.likes || 0
            ),

            "Curtir"
        );


    if (
        post.liked
    ) {

        likeButton.classList.add(
            "liked"
        );
    }


    if (
        post.reposted
    ) {

        repostButton.classList.add(
            "reposted"
        );
    }


    actions.append(
        commentButton,
        repostButton,
        likeButton
    );


    article.appendChild(
        actions
    );


    /* =========================
       COMENTÁRIOS
    ========================= */

    const commentsSection =
        createProfileCommentsSection(
            post,
            allPosts
        );


    article.appendChild(
        commentsSection
    );


    /* =========================
       EVENTOS
    ========================= */

    commentButton.addEventListener(
        "click",
        () => {

            commentsSection.classList.toggle(
                "active"
            );

        }
    );


    likeButton.addEventListener(
        "click",
        () => {

            toggleProfilePostLike(
                post.id
            );

        }
    );


    repostButton.addEventListener(
        "click",
        () => {

            toggleProfilePostRepost(
                post.id
            );

        }
    );


    return article;
}


/* =========================================
   RENDERIZAR POSTS
========================================= */

function renderProfilePosts() {

    if (
        !profilePostsList
    ) {

        return;
    }


    const posts =
        loadProfilePostsData();


    const userPosts =
        getCurrentUserPosts(
            posts
        );


    profilePostsList.innerHTML =
        "";


    if (
        profilePostsCount
    ) {

        profilePostsCount.textContent =
            userPosts.length;
    }


    if (
        userPosts.length === 0
    ) {

        profilePostsList.innerHTML = `

            <div class="profile-posts-empty">

                <span>
                    📰
                </span>

                <strong>
                    Você ainda não publicou nada.
                </strong>

                <p>
                    Crie um post no Feed e ele aparecerá aqui automaticamente.
                </p>

            </div>

        `;


        return;
    }


    userPosts.forEach(
        (post) => {

            profilePostsList.appendChild(
                createProfilePostCard(
                    post,
                    posts
                )
            );

        }
    );
}


/* =========================================
   SINCRONIZAÇÃO ENTRE ABAS DO NAVEGADOR
========================================= */

window.addEventListener(
    "storage",
    (event) => {

        if (
            event.key ===
            PROFILE_POSTS_STORAGE_KEY
        ) {

            renderProfilePosts();
        }

    }
);


/* =========================================
   ABRIR ABA PELA URL

   Exemplo:
   perfil.html?tab=posts
========================================= */

const requestedProfileTab =
    new URLSearchParams(
        window.location.search
    ).get("tab");


if (
    requestedProfileTab ===
    "posts"
) {

    openProfileTab(
        "posts"
    );
}


/* =========================================
   INICIALIZAÇÃO
========================================= */

updatePlatforms();

updateGenres();

updateCurrentGame();

updateStats();

renderProfilePosts();


console.log(
    "👤 Perfil carregado com sucesso."
);