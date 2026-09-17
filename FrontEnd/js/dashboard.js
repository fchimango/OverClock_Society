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

        alert(
            "A página de jogos será implementada em breve."
        );

    }
);


seePlayersButton.addEventListener(
    "click",
    () => {

        alert(
            "A lista completa de jogadores será implementada em breve."
        );

    }
);


profileButton.addEventListener(
    "click",
    () => {

        alert(
            "O perfil do usuário será implementado em breve."
        );

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