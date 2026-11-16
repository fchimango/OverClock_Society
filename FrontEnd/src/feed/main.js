import { createApp } from "vue";
import FeedApp from "./FeedApp.vue";

const root = document.getElementById("feed-app");

if (root) {
    createApp(FeedApp).mount(root);
}

const profileButton = document.getElementById("profileButton");
profileButton?.addEventListener("click", () => {
    window.location.href = "perfil.html";
});
