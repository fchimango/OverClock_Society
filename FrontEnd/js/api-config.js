/* Configuração única da API da Overclock Society.
   Ao hospedar o backend, atualize PRODUCTION_API_BASE_URL para a URL real
   criada para ESTE projeto (não reutilize a URL de outro projeto). */
(() => {
    const hostname = window.location.hostname;
    const isLocal = ["127.0.0.1", "localhost"].includes(hostname);
    const PRODUCTION_API_BASE_URL = ""; // preencher depois de criar o serviço da Overclock Society no Render

    window.OVERCLOCK_API_BASE_URL = (isLocal
        ? "http://127.0.0.1:8000"
        : PRODUCTION_API_BASE_URL
    ).replace(/\/$/, "");
})();
