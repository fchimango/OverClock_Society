const findPlayersButton =
    document.getElementById("findPlayersButton");

const seeGamesButton =
    document.getElementById("seeGamesButton");

const seePlayersButton =
    document.getElementById("seePlayersButton");

const profileButton =
    document.getElementById("profileButton");

const searchInput =
    document.getElementById("searchInput");


findPlayersButton.addEventListener(
    "click",
    () => {

        alert(
            "O sistema de busca de jogadores será implementado em breve."
        );

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


searchInput.addEventListener(
    "input",
    (event) => {

        const value =
            event.target.value.trim();

        console.log(
            "Pesquisa:",
            value
        );

    }
);


console.log(
    "🎮 Dashboard GamerHub carregado."
);