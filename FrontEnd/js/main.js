const menuToggle =
    document.getElementById("menuToggle");

const navLinks =
    document.getElementById("navLinks");

const loginButton =
    document.getElementById("loginButton");

const registerButton =
    document.getElementById("registerButton");

const ctaButton =
    document.getElementById("ctaButton");

const modalOverlay =
    document.getElementById("modalOverlay");

const modalClose =
    document.getElementById("modalClose");

const modalButton =
    document.getElementById("modalButton");

const modalTitle =
    document.getElementById("modalTitle");

const modalMessage =
    document.getElementById("modalMessage");


/* =========================================
   MENU MOBILE
========================================= */

if (
    menuToggle &&
    navLinks
) {

    menuToggle.addEventListener(
        "click",
        () => {

            const isOpen =
                navLinks.classList.toggle(
                    "active"
                );


            menuToggle.setAttribute(
                "aria-expanded",
                String(isOpen)
            );

        }
    );


    /* Fecha o menu quando clicamos em algum link */

    document
        .querySelectorAll(
            ".nav-links a"
        )
        .forEach(
            (link) => {

                link.addEventListener(
                    "click",
                    () => {

                        navLinks.classList.remove(
                            "active"
                        );


                        menuToggle.setAttribute(
                            "aria-expanded",
                            "false"
                        );

                    }
                );

            }
        );

}


/* =========================================
   MODAL
========================================= */

function openModal(
    title,
    message
) {

    if (
        !modalOverlay ||
        !modalTitle ||
        !modalMessage
    ) {

        return;
    }


    modalTitle.textContent =
        title;


    modalMessage.textContent =
        message;


    modalOverlay.classList.add(
        "active"
    );


    document.body.style.overflow =
        "hidden";
}


function closeModal() {

    if (
        !modalOverlay
    ) {

        return;
    }


    modalOverlay.classList.remove(
        "active"
    );


    document.body.style.overflow =
        "";
}


/* =========================================
   BOTÕES
========================================= */


/*
 * Login e cadastro agora possuem
 * páginas próprias.
 */

if (
    loginButton
) {

    loginButton.addEventListener(
        "click",
        () => {

            window.location.href =
                "login.html";

        }
    );

}


if (
    registerButton
) {

    registerButton.addEventListener(
        "click",
        () => {

            window.location.href =
                "cadastro.html";

        }
    );

}


/*
 * Mantém o CTA antigo usando o modal,
 * caso o botão exista na página.
 */

ctaButton?.addEventListener(
    "click",
    () => {

        openModal(
            "Crie seu perfil",
            "O sistema de cadastro estará disponível na próxima etapa."
        );

    }
);


/* =========================================
   FECHAR MODAL
========================================= */

modalClose?.addEventListener(
    "click",
    closeModal
);


modalButton?.addEventListener(
    "click",
    closeModal
);


/* =========================================
   CLICAR FORA DO MODAL
========================================= */

modalOverlay?.addEventListener(
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


/* =========================================
   TECLA ESC
========================================= */

document.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key ===
            "Escape"
        ) {

            closeModal();
        }

    }
);


/* =========================================
   LOG
========================================= */

console.log(
    "🎮 Overclock Society iniciado com sucesso!"
);