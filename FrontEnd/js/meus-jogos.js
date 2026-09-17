const addGameButton =
    document.getElementById("addGameButton");

const seeLikedGamesButton =
    document.getElementById("seeLikedGamesButton");

const seeCompletedGamesButton =
    document.getElementById("seeCompletedGamesButton");

const profileButton =
    document.getElementById("profileButton");

const searchInput =
    document.getElementById("searchInput");


const gameModalOverlay =
    document.getElementById("gameModalOverlay");

const gameModalClose =
    document.getElementById("gameModalClose");

const gameModalButton =
    document.getElementById("gameModalButton");


/* =========================================
   MODAL
========================================= */

function openGameModal() {

    gameModalOverlay.classList.add("active");

    document.body.style.overflow = "hidden";
}


function closeGameModal() {

    gameModalOverlay.classList.remove("active");

    document.body.style.overflow = "";
}


/* =========================================
   ADICIONAR JOGO
========================================= */

addGameButton.addEventListener(
    "click",
    openGameModal
);


/* =========================================
   BOTÕES
========================================= */

seeLikedGamesButton.addEventListener(
    "click",
    () => {

        alert(
            "Nesta página já estão sendo exibidos alguns dos seus jogos."
        );

    }
);


seeCompletedGamesButton.addEventListener(
    "click",
    () => {

        alert(
            "A página completa de jogos zerados será implementada futuramente."
        );

    }
);


profileButton.addEventListener(
    "click",
    () => {

        alert(
            "A página de perfil será implementada futuramente."
        );

    }
);


/* =========================================
   PESQUISA
========================================= */

searchInput.addEventListener(
    "input",
    (event) => {

        const search =
            event.target.value
                .trim()
                .toLowerCase();

        console.log(
            "Pesquisa:",
            search
        );

    }
);


/* =========================================
   FECHAR MODAL
========================================= */

gameModalClose.addEventListener(
    "click",
    closeGameModal
);


gameModalButton.addEventListener(
    "click",
    closeGameModal
);


gameModalOverlay.addEventListener(
    "click",
    (event) => {

        if (
            event.target ===
            gameModalOverlay
        ) {

            closeGameModal();

        }

    }
);


document.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key === "Escape"
        ) {

            closeGameModal();

        }

    }
);


console.log(
    "🎮 Página Meus Jogos carregada."
);