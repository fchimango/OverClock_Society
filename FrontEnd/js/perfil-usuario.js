/* =========================================
   PERFIL DE OUTRO USUÁRIO

   Nesta fase do projeto existe somente
   um usuário demonstrativo. Quando o
   backend for integrado, este objeto pode
   ser substituído pelos dados da API.
========================================= */

const demoUsers = {
    maria: {
        id: "maria",
        name: "Maria Souza",
        shortName: "Maria",
        username: "@maria",
        avatar: "M",
        status: "online",
        course: "Engenharia de Software",
        semester: 5,
        joinDate: "Março de 2025",
        bio: "Gosto de RPGs, jogos competitivos e aventuras. Sempre estou procurando algum jogo novo para experimentar com o pessoal da faculdade.",
        friends: 31,
        platforms: [
            { name: "PC", icon: "🖥️", type: "pc" },
            { name: "PlayStation 5", icon: "🎮", type: "playstation" }
        ],
        genres: ["RPG", "Aventura", "Competitivo", "Soulslike"],
        currentGame: {
            name: "Valorant",
            initials: "V",
            status: "🟢 Jogando agora"
        },
        games: {
            favorites: [
                { name: "Elden Ring", genre: "RPG • Soulslike", rating: 4.9, initials: "ER", imageClass: "elden-ring-large", position: 1 },
                { name: "Minecraft", genre: "Sandbox • Sobrevivência", rating: 4.8, initials: "MC", imageClass: "minecraft-large", position: 2 },
                { name: "Celeste", genre: "Plataforma • Indie", rating: 4.7, initials: "C", imageClass: "celeste-game", position: 3 }
            ],
            liked: [
                { name: "Valorant", genre: "FPS • Competitivo", rating: 4.5, initials: "V", imageClass: "valorant-game" },
                { name: "Terraria", genre: "Sandbox • Aventura", rating: 4.7, initials: "T", imageClass: "terraria-game" },
                { name: "Elden Ring", genre: "RPG • Soulslike", rating: 4.9, initials: "ER", imageClass: "elden-ring-large" },
                { name: "Minecraft", genre: "Sandbox • Sobrevivência", rating: 4.8, initials: "MC", imageClass: "minecraft-large" },
                { name: "Celeste", genre: "Plataforma • Indie", rating: 4.7, initials: "C", imageClass: "celeste-game" }
            ],
            completed: [
                { name: "Elden Ring", genre: "RPG • Soulslike", year: 2026, initials: "ER", imageClass: "elden-ring-large" },
                { name: "Celeste", genre: "Plataforma • Indie", year: 2025, initials: "C", imageClass: "celeste-game" },
                { name: "Resident Evil 4", genre: "Terror • Ação", year: 2025, initials: "RE", imageClass: "resident-game" }
            ]
        }
    }
};

function getRequestedUserId() {
    return (new URLSearchParams(window.location.search).get("user") || "maria")
        .replace("@", "")
        .trim()
        .toLowerCase();
}

function getCurrentDemoUser() {
    return demoUsers[getRequestedUserId()] || demoUsers.maria;
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function renderPlatforms(user) {
    const container = document.getElementById("otherPlatforms");
    if (!container) return;
    container.innerHTML = "";

    user.platforms.forEach((platform) => {
        const item = document.createElement("div");
        item.className = "platform-item";
        item.innerHTML = `
            <div class="platform-icon ${platform.type}">${platform.icon}</div>
            <div>
                <strong>${platform.name}</strong>
                <span>Também joga</span>
            </div>
        `;
        container.appendChild(item);
    });
}

function renderGenres(user) {
    const container = document.getElementById("otherGenres");
    if (!container) return;
    container.innerHTML = "";

    user.genres.forEach((genre) => {
        const tag = document.createElement("span");
        tag.textContent = genre;
        container.appendChild(tag);
    });
}

function getFavoritePositionInfo(position) {
    if (position === 1) return { medal: "🥇", label: "PRIMEIRO LUGAR", className: "first-place" };
    if (position === 2) return { medal: "🥈", label: "SEGUNDO LUGAR", className: "second-place" };
    return { medal: "🥉", label: "TERCEIRO LUGAR", className: "third-place" };
}

function renderFavoriteGames(user) {
    const podium = document.getElementById("otherUserPodium");
    if (!podium) return;
    podium.innerHTML = "";

    const visualOrder = [2, 1, 3];

    visualOrder.forEach((position) => {
        const game = user.games.favorites.find((item) => item.position === position);
        if (!game) return;

        const positionInfo = getFavoritePositionInfo(position);
        const card = document.createElement("article");
        card.className = `podium-card ${positionInfo.className}`;
        card.dataset.position = String(position);
        card.innerHTML = `
            <div class="podium-position">${position}º</div>
            <div class="podium-medal">${positionInfo.medal}</div>
            <div class="podium-game-image ${game.imageClass}">${game.initials}</div>
            <div class="podium-info">
                <span class="podium-place">${positionInfo.label}</span>
                <h3>${game.name}</h3>
                <p>${game.genre}</p>
                <div class="podium-rating">⭐ ${game.rating.toFixed(1)}</div>
            </div>
        `;
        podium.appendChild(card);
    });
}

function renderLikedGames(user) {
    const container = document.getElementById("otherUserLikedGames");
    if (!container) return;
    container.innerHTML = "";

    user.games.liked.forEach((game) => {
        const card = document.createElement("article");
        card.className = "collection-card";
        card.innerHTML = `
            <div class="collection-image ${game.imageClass}">${game.initials}</div>
            <div class="collection-info">
                <div>
                    <h3>${game.name}</h3>
                    <span>${game.genre}</span>
                </div>
                <strong>⭐ ${game.rating.toFixed(1)}</strong>
            </div>
        `;
        container.appendChild(card);
    });
}

function renderCompletedGames(user) {
    const container = document.getElementById("otherUserCompletedGames");
    if (!container) return;
    container.innerHTML = "";

    user.games.completed.forEach((game) => {
        const card = document.createElement("article");
        card.className = "completed-game";
        card.innerHTML = `
            <div class="completed-image ${game.imageClass}">${game.initials}</div>
            <div class="completed-info">
                <h3>${game.name}</h3>
                <span>${game.genre}</span>
            </div>
            <div class="completed-date">
                <span>Zerado em</span>
                <strong>${game.year}</strong>
            </div>
        `;
        container.appendChild(card);
    });
}

function renderUser(user) {
    document.title = `${user.name} | Overclock Society`;

    setText("otherProfileAvatar", user.avatar);
    setText("otherProfileName", user.name);
    setText("otherProfileUsername", user.username);
    setText("otherProfileCourse", `${user.course} • ${user.semester}º período`);
    setText("otherProfileBio", user.bio);
    setText("otherAboutCourse", user.course);
    setText("otherAboutSemester", `${user.semester}º período`);
    setText("otherAboutJoinDate", user.joinDate);
    setText("otherProfileFriendsCount", user.friends);
    setText("otherCurrentGameImage", user.currentGame.initials);
    setText("otherCurrentGameName", user.currentGame.name);
    setText("otherCurrentGameStatus", user.currentGame.status);
    setText("gamesOwnerName", user.shortName);

    const allGameNames = new Set([
        ...user.games.favorites.map((game) => game.name),
        ...user.games.liked.map((game) => game.name),
        ...user.games.completed.map((game) => game.name)
    ]);

    setText("otherProfileGamesCount", allGameNames.size);
    setText("favoriteGamesCount", user.games.favorites.length);
    setText("likedGamesCount", user.games.liked.length);
    setText("completedGamesCount", user.games.completed.length);

    const status = document.getElementById("otherProfileStatus");
    const onlineDot = document.getElementById("otherProfileOnline");

    if (user.status === "online") {
        if (status) {
            status.textContent = "● ONLINE";
            status.style.color = "#4ade80";
        }
        if (onlineDot) onlineDot.style.display = "block";
    } else {
        if (status) {
            status.textContent = "● OFFLINE";
            status.style.color = "#94a3b8";
        }
        if (onlineDot) onlineDot.style.display = "none";
    }

    renderPlatforms(user);
    renderGenres(user);
    renderFavoriteGames(user);
    renderLikedGames(user);
    renderCompletedGames(user);
}

function openUserTab(tabName) {
    document.querySelectorAll("[data-user-tab]").forEach((button) => {
        const active = button.dataset.userTab === tabName;
        button.classList.toggle("active", active);
        button.setAttribute("aria-selected", String(active));
    });

    document.querySelectorAll("[data-user-panel]").forEach((panel) => {
        panel.classList.toggle("active", panel.dataset.userPanel === tabName);
    });
}

document.querySelectorAll("[data-user-tab]").forEach((button) => {
    button.addEventListener("click", () => openUserTab(button.dataset.userTab));
});

const profileHeaderButton = document.getElementById("profileHeaderButton");
if (profileHeaderButton) {
    profileHeaderButton.addEventListener("click", () => {
        window.location.href = "perfil.html";
    });
}

const searchInput = document.getElementById("searchInput");
if (searchInput) {
    searchInput.addEventListener("input", (event) => {
        const term = event.target.value.trim().toLocaleLowerCase("pt-BR");
        document.querySelectorAll(".collection-card, .completed-game, .podium-card").forEach((card) => {
            card.style.display = card.textContent.toLocaleLowerCase("pt-BR").includes(term) ? "" : "none";
        });
    });
}

renderUser(getCurrentDemoUser());
console.log("👤 Perfil de usuário demonstrativo carregado.");
