const findPlayersButton =
    document.getElementById("findPlayersButton");

const seeGamesButton =
    document.getElementById("seeGamesButton");

const seePlayersButton =
    document.getElementById("seePlayersButton");

const profileButton =
    document.getElementById("profileButton");

findPlayersButton?.addEventListener(
    "click",
    () => {
        window.location.href = "amigos.html";
    }
);


seeGamesButton.addEventListener(
    "click",
    () => {

        window.location.href =
            "meus-jogos.html";

    }
);


seePlayersButton.addEventListener(
    "click",
    () => {

        window.location.href =
            "amigos.html";

    }
);


profileButton.addEventListener(
    "click",
    () => {

        window.location.href =
            "perfil.html";

    }
);


console.log(
    "🎮 Dashboard GamerHub carregado."
);