import { createApp } from "vue";
import ProfileApp from "./ProfileApp.vue";

const mountPoint = document.getElementById("profile-app");

if (mountPoint) {
    createApp(ProfileApp).mount(mountPoint);
}
