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

const profileFavoritesCount =
    document.getElementById("profileFavoritesCount");

const profileFriendsCount =
    document.getElementById("profileFriendsCount");

const profileAchievementsCount =
    document.getElementById("profileAchievementsCount");

const currentGame =
    document.getElementById("currentGame");

const currentGameStatus =
    document.getElementById("currentGameStatus");

const favoriteGame1 =
    document.getElementById("favoriteGame1");

const favoriteGame2 =
    document.getElementById("favoriteGame2");

const favoriteGame3 =
    document.getElementById("favoriteGame3");


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


/* ESTATÍSTICAS */

const statValues =
    document.querySelectorAll(
        ".profile-stat strong"
    );


/* PLATAFORMAS */

const platformList =
    document.querySelector(
        ".platform-list"
    );


/* GÊNEROS */

const genreTags =
    document.querySelector(
        ".genre-tags"
    );


/* JOGO ATUAL */

const currentGameName =
    document.querySelector(
        ".current-game strong"
    );

const currentGameAvailability =
    document.querySelector(
        ".current-game small"
    );


/* FAVORITOS */

const favoriteCards =
    document.querySelectorAll(
        ".profile-game-card"
    );


/* =========================================
   MODAL
========================================= */

function openModal() {

    modalOverlay.classList.add("active");

    document.body.style.overflow =
        "hidden";
}


function closeModal() {

    modalOverlay.classList.remove("active");

    document.body.style.overflow =
        "";
}


editProfileButton.addEventListener(
    "click",
    openModal
);


modalClose.addEventListener(
    "click",
    closeModal
);


modalCancel.addEventListener(
    "click",
    closeModal
);


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

    if (status === "online") {

        profileStatusText.textContent =
            "● ONLINE";

        profileStatusText.style.color =
            "#4ade80";

        profileOnline.style.display =
            "block";

        return;
    }


    if (status === "away") {

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

    const selectedPlatforms =
        document.querySelectorAll(
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


    selectedPlatforms.forEach(
        (checkbox) => {

            const name =
                checkbox.value;


            let icon = "🎮";
            let type = "";


            if (name === "PC") {

                icon = "🖥️";
                type = "pc";

            }

            else if (
                name === "PlayStation 5"
            ) {

                icon = "🎮";
                type = "playstation";

            }

            else if (
                name === "Xbox Series"
            ) {

                icon = "🎮";
                type = "xbox";

            }

            else if (
                name === "Nintendo Switch"
            ) {

                icon = "🕹️";
                type = "switch";

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

                    <span>
                        Também jogo
                    </span>
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

    const selectedGenres =
        document.querySelectorAll(
            'input[name="genre"]:checked'
        );


    genreTags.innerHTML = "";


    if (selectedGenres.length === 0) {

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

    const game =
        currentGame.value.trim();

    currentGameName.textContent =
        game || "Nenhum jogo";


    const status =
        currentGameStatus.value;


    if (status === "available") {

        currentGameAvailability.textContent =
            "🟢 Disponível";

        currentGameAvailability.style.color =
            "#4ade80";

    }

    else if (status === "busy") {

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
   JOGOS FAVORITOS
========================================= */

function updateFavoriteGame(
    card,
    position,
    game
) {

    const title =
        card.querySelector("h3");

    const place =
        card.querySelector(
            ".profile-game-info span"
        );


    title.textContent =
        game || "Nenhum jogo";


    place.textContent =
        `${position}º FAVORITO`;
}


function updateFavorites() {

    updateFavoriteGame(
        favoriteCards[0],
        1,
        favoriteGame1.value.trim()
    );


    updateFavoriteGame(
        favoriteCards[1],
        2,
        favoriteGame2.value.trim()
    );


    updateFavoriteGame(
        favoriteCards[2],
        3,
        favoriteGame3.value.trim()
    );
}


/* =========================================
   ESTATÍSTICAS
========================================= */

function updateStats() {

    statValues[0].textContent =
        profileGamesCount.value || 0;

    statValues[1].textContent =
        profileFavoritesCount.value || 0;

    statValues[2].textContent =
        profileFriendsCount.value || 0;

    statValues[3].textContent =
        profileAchievementsCount.value || 0;
}


/* =========================================
   SALVAR PERFIL
========================================= */

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


        /* Identidade */

        profileIdentityName.textContent =
            name;

        profileIdentityUsername.textContent =
            `@${username}`;

        profileIdentityCourse.textContent =
            `${course} • ${profileSemester.value}º período`;


        /* Bio */

        bioText.textContent =
            profileBio.value.trim() ||
            "Nenhuma biografia adicionada.";


        /* Data */

        profileDateText.textContent =
            formatJoinDate(
                profileJoinDate.value
            );


        /* Status */

        updateProfileStatus(
            profileStatus.value
        );


        /* Estatísticas */

        updateStats();


        /* Plataformas */

        updatePlatforms();


        /* Gêneros */

        updateGenres();


        /* Jogo atual */

        updateCurrentGame();


        /* Favoritos */

        updateFavorites();


        closeModal();

    }
);


/* =========================================
   AVATAR
========================================= */

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


        reader.onload = (event) => {

            const avatar =
                document.querySelector(
                    ".profile-avatar"
                );


            avatar.style.backgroundImage =
                `url(${event.target.result})`;

            avatar.style.backgroundSize =
                "cover";

            avatar.style.backgroundPosition =
                "center";

            avatar.style.fontSize =
                "0";
        };


        reader.readAsDataURL(file);

    }
);


/* =========================================
   CAPA
========================================= */

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


        reader.onload = (event) => {

            const cover =
                document.querySelector(
                    ".profile-cover"
                );


            cover.style.backgroundImage =
                `url(${event.target.result})`;

            cover.style.backgroundSize =
                "cover";

            cover.style.backgroundPosition =
                "center";
        };


        reader.readAsDataURL(file);

    }
);


/* =========================================
   INICIALIZAÇÃO
========================================= */

updatePlatforms();

updateGenres();

updateCurrentGame();

updateFavorites();

console.log(
    "👤 Editor de perfil carregado."
);