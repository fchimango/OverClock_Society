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

        window.location.href =
            "perfil.html";

    }
);


/* =========================================
   SINCRONIZAÇÃO COM NOTIFICAÇÕES
========================================= */

function updateRequestCounter() {

    const counter =
        document.querySelector(
            ".request-counter"
        );


    if (!counter) {
        return;
    }


    const count =
        document.querySelectorAll(
            ".request-card"
        ).length;


    counter.textContent =
        `${count} ${
            count === 1
                ? "pendente"
                : "pendentes"
        }`;
}


function removeRequestCardByUser(
    userName,
    status = "declined"
) {

    const card =
        Array.from(
            document.querySelectorAll(
                ".request-card"
            )
        ).find(
            (item) =>
                item.dataset.user ===
                userName
        );


    if (!card) {
        return;
    }


    card.style.opacity = "0";

    card.style.transform =
        status === "accepted"
            ? "translateX(30px)"
            : "translateX(-30px)";


    setTimeout(
        () => {

            if (card.isConnected) {
                card.remove();
            }


            updateRequestCounter();

        },
        250
    );
}


function syncFriendRequestsWithNotifications() {

    if (
        !window.OverclockNotifications
    ) {
        return;
    }


    document
        .querySelectorAll(
            ".request-card"
        )
        .forEach(
            (card) => {

                const status =
                    window
                        .OverclockNotifications
                        .getFriendRequestStatus(
                            card.dataset.user
                        );


                if (
                    status !== "pending"
                ) {

                    card.remove();
                }

            }
        );


    updateRequestCounter();
}


window.addEventListener(
    "overclock:friend-request-resolved",
    (event) => {

        removeRequestCardByUser(
            event.detail.friendName,
            event.detail.status
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


                if (
                    window.OverclockNotifications
                ) {

                    window
                        .OverclockNotifications
                        .resolveFriendRequest(
                            userName,
                            "accepted"
                        );
                }


                card.style.opacity = "0";
                card.style.transform =
                    "translateX(30px)";


                setTimeout(() => {

                    card.remove();

                    updateRequestCounter();

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


                if (
                    window.OverclockNotifications
                ) {

                    window
                        .OverclockNotifications
                        .resolveFriendRequest(
                            userName,
                            "declined"
                        );
                }


                card.style.opacity = "0";
                card.style.transform =
                    "translateX(-30px)";


                setTimeout(() => {

                    card.remove();

                    updateRequestCounter();

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


/* =========================================
   PERFIL DE OUTRO USUÁRIO

   Nesta fase apenas Maria possui um perfil
   demonstrativo.
========================================= */

function setupDemoUserProfileLinks() {

    const mariaCard =
        Array.from(
            document.querySelectorAll(
                ".friend-card"
            )
        ).find(
            (card) =>
                card.querySelector(
                    ".friend-card-info h3"
                )?.textContent.trim() ===
                    "Maria"
        );


    if (!mariaCard) {

        return;
    }


    const triggers = [

        mariaCard.querySelector(
            ".friend-avatar"
        ),

        mariaCard.querySelector(
            ".friend-card-info h3"
        )

    ].filter(Boolean);


    const openMariaProfile = () => {

        window.location.href =
            "perfil-usuario.html?user=maria";
    };


    triggers.forEach(
        (element) => {

            element.classList.add(
                "user-profile-link"
            );

            element.tabIndex = 0;

            element.setAttribute(
                "role",
                "link"
            );

            element.setAttribute(
                "aria-label",
                "Abrir perfil de Maria"
            );


            element.addEventListener(
                "click",
                openMariaProfile
            );


            element.addEventListener(
                "keydown",
                (event) => {

                    if (
                        event.key === "Enter" ||
                        event.key === " "
                    ) {

                        event.preventDefault();
                        openMariaProfile();
                    }
                }
            );

        }
    );
}


setupDemoUserProfileLinks();


console.log(
    "👥 Página Amigos carregada."
);

/* =========================================
   INICIALIZAÇÃO DAS SOLICITAÇÕES
========================================= */

syncFriendRequestsWithNotifications();
