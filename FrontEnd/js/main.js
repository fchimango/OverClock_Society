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

// Quando Vue está ativo, ele controla o estado do menu mobile.
// Este bloco mantém o comportamento original como fallback sem Vue.
if (
    !window.__OCS_VUE_NAVBAR_ACTIVE__ &&
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
    // Quando Vue está ativo, ele é a única fonte de estado do modal.
    if (
        window.__OCS_VUE_MODAL_ACTIVE__ &&
        window.OverclockHomeModal?.open
    ) {
        window.OverclockHomeModal.open({ title, message });
        return;
    }

    // Fallback para navegadores sem Vue/CDN.
    if (!modalOverlay || !modalTitle || !modalMessage) return;

    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modalOverlay.classList.add("active");
    modalOverlay.setAttribute("aria-hidden", "false");
    modalOverlay.removeAttribute("inert");
    document.body.style.overflow = "hidden";
    modalClose?.focus();
}


function closeModal() {
    // Quando Vue está ativo, ele é a única fonte de estado do modal.
    if (
        window.__OCS_VUE_MODAL_ACTIVE__ &&
        window.OverclockHomeModal?.close
    ) {
        window.OverclockHomeModal.close();
        return;
    }

    // Fallback para navegadores sem Vue/CDN.
    if (!modalOverlay) return;

    modalOverlay.classList.remove("active");
    modalOverlay.setAttribute("aria-hidden", "true");
    modalOverlay.setAttribute("inert", "");
    document.body.style.overflow = "";
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
   EVENTOS DE FECHAMENTO DO MODAL
========================================= */

// Os eventos são registrados pelo Vue quando ele está ativo.
// Este bloco preserva o comportamento original caso o CDN não carregue.
if (!window.__OCS_VUE_MODAL_ACTIVE__) {
    modalClose?.addEventListener("click", closeModal);
    modalButton?.addEventListener("click", closeModal);

    modalOverlay?.addEventListener("click", (event) => {
        if (event.target === modalOverlay) closeModal();
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeModal();
    });
}


/* =========================================
   LOG
========================================= */

console.log(
    "🎮 Overclock Society iniciado com sucesso!"
);