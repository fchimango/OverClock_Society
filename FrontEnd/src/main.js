import { createApp } from "vue";
import App from "./App.vue";

// Reaproveita os estilos existentes da landing page sem alterar as outras telas.
import "../css/global.css";
import "../css/landing.css";

// Estas configurações continuam centralizadas nos arquivos atuais do frontend.
import "../js/api-config.js";
import "../js/global-ui.js";

createApp(App).mount("#app");
