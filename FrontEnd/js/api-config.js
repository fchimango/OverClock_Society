/* Configuração única da API da Overclock Society.
   Em localhost usa a API local; nos demais endereços usa a API publicada no Render. */
(() => {
    const hostname = window.location.hostname;
    const isLocal = ["127.0.0.1", "localhost"].includes(hostname);
    const PRODUCTION_API_BASE_URL = "https://overclock-api.onrender.com";

    window.OVERCLOCK_API_BASE_URL = (isLocal
        ? "http://127.0.0.1:8000"
        : PRODUCTION_API_BASE_URL
    ).replace(/\/$/, "");
})();
