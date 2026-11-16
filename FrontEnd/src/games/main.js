import { createApp } from "vue";
import GamesApp from "./GamesApp.vue";

const root = document.getElementById("games-app");

if (root) {
    createApp(GamesApp).mount(root);
}

const profileButton = document.getElementById("profileButton");
profileButton?.addEventListener("click", () => {
    window.location.href = "perfil.html";
});
