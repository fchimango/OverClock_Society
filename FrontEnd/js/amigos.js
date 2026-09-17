const findFriendsButton =
    document.getElementById("findFriendsButton");

const profileButton =
    document.getElementById("profileButton");

const searchInput =
    document.getElementById("searchInput");

const requestsList =
    document.getElementById("requestsList");

const allFriendsList =
    document.getElementById("allFriendsList");

const seeOnlineButton =
    document.getElementById("seeOnlineButton");

const modalOverlay =
    document.getElementById("friendsModalOverlay");

const modalClose =
    document.getElementById("modalClose");

const modalButton =
    document.getElementById("modalButton");


/* =========================================
   MODAL
========================================= */

function openModal() {

    modalOverlay.classList.add("active");

    document.body.style.overflow = "hidden";
}


function closeModal() {

    modalOverlay.classList.remove("active");

    document.body.style.overflow = "";
}


/* =========================================
   ENCONTRAR JOGADORES
========================================= */

findFriendsButton.addEventListener(
    "click",
    openModal
);


/* =========================================
   PERFIL
========================================= */

profileButton.addEventListener(
    "click",
    () => {

        alert(
            "A página de perfil será implementada futuramente."
        );

    }
);


/* =========================================
   SOLICITAÇÕES
========================================= */

document
    .querySelectorAll(".request-card")
    .forEach((card) => {

        const acceptButton =
            card.querySelector(".accept");

        const declineButton =
            card.querySelector(".decline");


        acceptButton.addEventListener(
            "click",
            () => {

                const userName =
                    card.dataset.user;

                card.style.opacity = "0";
                card.style.transform =
                    "translateX(30px)";


                setTimeout(() => {

                    card.remove();

                }, 250);


                console.log(
                    `${userName} foi adicionado aos amigos.`
                );

            }
        );


        declineButton.addEventListener(
            "click",
            () => {

                const userName =
                    card.dataset.user;

                card.style.opacity = "0";
                card.style.transform =
                    "translateX(-30px)";


                setTimeout(() => {

                    card.remove();

                }, 250);


                console.log(
                    `Solicitação de ${userName} recusada.`
                );

            }
        );

    });


/* =========================================
   FILTRO DE AMIGOS
========================================= */

const filterButtons =
    document.querySelectorAll(
        ".filter-btn"
    );


filterButtons.forEach((button) => {

    button.addEventListener(
        "click",
        () => {

            filterButtons.forEach(
                (btn) => {

                    btn.classList.remove(
                        "active"
                    );

                }
            );


            button.classList.add(
                "active"
            );


            const filter =
                button.dataset.filter;


            const friends =
                allFriendsList.querySelectorAll(
                    ".all-friend-card"
                );


            friends.forEach((friend) => {

                const status =
                    friend.dataset.status;


                if (
                    filter === "all" ||
                    filter === status
                ) {

                    friend.style.display =
                        "flex";

                } else {

                    friend.style.display =
                        "none";

                }

            });

        }
    );

});


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


        const friends =
            allFriendsList.querySelectorAll(
                ".all-friend-card"
            );


        friends.forEach((friend) => {

            const name =
                friend.dataset.name
                    .toLowerCase();


            if (
                name.includes(search)
            ) {

                friend.style.display =
                    "flex";

            } else {

                friend.style.display =
                    "none";

            }

        });

    }
);


/* =========================================
   VER ONLINE
========================================= */

seeOnlineButton.addEventListener(
    "click",
    () => {

        const onlineButton =
            document.querySelector(
                '[data-filter="online"]'
            );


        onlineButton.click();

        allFriendsList.scrollIntoView({
            behavior: "smooth"
        });

    }
);


/* =========================================
   BOTÕES DOS AMIGOS
========================================= */

document
    .querySelectorAll(".friend-action")
    .forEach((button) => {

        button.addEventListener(
            "click",
            () => {

                if (
                    button.textContent
                        .includes("Jogar")
                ) {

                    alert(
                        "Em breve você poderá convidar este amigo para jogar."
                    );

                } else {

                    alert(
                        "O sistema de mensagens será implementado futuramente."
                    );

                }

            }
        );

    });


/* =========================================
   MENU DOS AMIGOS
========================================= */

document
    .querySelectorAll(".friend-more")
    .forEach((button) => {

        button.addEventListener(
            "click",
            () => {

                alert(
                    "Mais opções serão adicionadas futuramente."
                );

            }
        );

    });


/* =========================================
   MODAL
========================================= */

modalClose.addEventListener(
    "click",
    closeModal
);


modalButton.addEventListener(
    "click",
    closeModal
);


modalOverlay.addEventListener(
    "click",
    (event) => {

        if (
            event.target === modalOverlay
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


console.log(
    "👥 Página Amigos carregada."
);