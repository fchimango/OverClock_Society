const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");

const loginButton = document.getElementById("loginButton");
const registerButton = document.getElementById("registerButton");
const ctaButton = document.getElementById("ctaButton");

const modalOverlay = document.getElementById("modalOverlay");
const modalClose = document.getElementById("modalClose");
const modalButton = document.getElementById("modalButton");

const modalTitle = document.getElementById("modalTitle");
const modalMessage = document.getElementById("modalMessage");


/* =========================================
   MENU MOBILE
========================================= */

menuToggle.addEventListener("click", () => {

    const isOpen = navLinks.classList.toggle("active");

    menuToggle.setAttribute(
        "aria-expanded",
        isOpen
    );

});


/* Fecha o menu quando clicamos em algum link */

document.querySelectorAll(".nav-links a").forEach((link) => {

    link.addEventListener("click", () => {

        navLinks.classList.remove("active");

        menuToggle.setAttribute(
            "aria-expanded",
            "false"
        );

    });

});


/* =========================================
   MODAL
========================================= */

function openModal(title, message) {

    modalTitle.textContent = title;

    modalMessage.textContent = message;

    modalOverlay.classList.add("active");

    document.body.style.overflow = "hidden";

}


function closeModal() {

    modalOverlay.classList.remove("active");

    document.body.style.overflow = "";

}


/* =========================================
   BOTÕES
========================================= */

loginButton.addEventListener("click", () => {

    openModal(
        "Login",
        "A tela de login será implementada na próxima etapa do projeto."
    );

});


registerButton.addEventListener("click", () => {

    openModal(
        "Criar conta",
        "O cadastro dos jogadores será implementado na próxima etapa."
    );

});


ctaButton.addEventListener("click", () => {

    openModal(
        "Crie seu perfil",
        "O sistema de cadastro estará disponível na próxima etapa."
    );

});


/* =========================================
   FECHAR MODAL
========================================= */

modalClose.addEventListener(
    "click",
    closeModal
);


modalButton.addEventListener(
    "click",
    closeModal
);


/* Clicar fora do modal */

modalOverlay.addEventListener("click", (event) => {

    if (event.target === modalOverlay) {

        closeModal();

    }

});


/* Tecla ESC */

document.addEventListener("keydown", (event) => {

    if (event.key === "Escape") {

        closeModal();

    }

});


/* =========================================
   LOG
========================================= */

console.log(
    "🎮 Overclock Society iniciado com sucesso!"
);