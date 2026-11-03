(() => {
    "use strict";

    let toastRegion = null;
    let activeConfirm = null;

    function ensureToastRegion() {
        if (toastRegion?.isConnected) return toastRegion;
        if (!document.body) return null;
        toastRegion = document.createElement("div");
        toastRegion.className = "oc-toast-region";
        toastRegion.setAttribute("aria-live", "polite");
        toastRegion.setAttribute("aria-relevant", "additions");
        toastRegion.setAttribute("aria-label", "Avisos do Overclock Society");
        document.body.appendChild(toastRegion);
        return toastRegion;
    }

    function inferType(message) {
        const text = String(message || "").toLocaleLowerCase("pt-BR");
        if (/não foi possível|falha|erro|inválid|não encontrado|não encontrada|não foi possível|não foi concluído/.test(text)) {
            return "error";
        }
        if (/sucesso|salvo|salva|enviado|enviada|removido|removida|adicionado|adicionada|atualizado|atualizada|criado|criada/.test(text)) {
            return "success";
        }
        return "info";
    }

    function notify(message, type = "info", options = {}) {
        const region = ensureToastRegion();
        if (!region) {
            // A chamada pode acontecer antes do body estar disponível.
            document.addEventListener("DOMContentLoaded", () => notify(message, type, options), { once: true });
            return;
        }

        const toast = document.createElement("section");
        toast.className = `oc-toast oc-toast--${["success", "error", "info"].includes(type) ? type : "info"}`;
        toast.setAttribute("role", type === "error" ? "alert" : "status");

        const icon = document.createElement("span");
        icon.className = "oc-toast__icon";
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = type === "success" ? "✓" : type === "error" ? "!" : "i";

        const text = document.createElement("p");
        text.className = "oc-toast__message";
        text.textContent = String(message ?? "");

        const close = document.createElement("button");
        close.className = "oc-toast__close";
        close.type = "button";
        close.setAttribute("aria-label", "Fechar aviso");
        close.textContent = "×";
        close.addEventListener("click", () => toast.remove(), { once: true });

        toast.append(icon, text, close);
        region.appendChild(toast);

        const duration = Number(options.duration) > 0
            ? Number(options.duration)
            : type === "error" ? 7200 : 4800;
        let timer = window.setTimeout(() => toast.remove(), duration);
        toast.addEventListener("mouseenter", () => window.clearTimeout(timer));
        toast.addEventListener("mouseleave", () => {
            timer = window.setTimeout(() => toast.remove(), 1600);
        });
    }

    function confirm(message, options = {}) {
        return new Promise((resolve) => {
            if (!document.body) {
                document.addEventListener("DOMContentLoaded", () => {
                    confirm(message, options).then(resolve);
                }, { once: true });
                return;
            }

            if (activeConfirm) activeConfirm.finish(false);

            const previousFocus = document.activeElement;
            const backdrop = document.createElement("div");
            backdrop.className = "oc-confirm-backdrop";
            backdrop.addEventListener("click", (event) => {
                if (event.target === backdrop) finish(false);
            });

            const dialog = document.createElement("section");
            dialog.className = "oc-confirm-dialog";
            dialog.setAttribute("role", "alertdialog");
            dialog.setAttribute("aria-modal", "true");
            dialog.setAttribute("aria-labelledby", "oc-confirm-title");
            dialog.setAttribute("aria-describedby", "oc-confirm-message");

            const eyebrow = document.createElement("span");
            eyebrow.className = "oc-confirm-dialog__eyebrow";
            eyebrow.textContent = options.eyebrow || "Overclock Society";

            const title = document.createElement("h2");
            title.id = "oc-confirm-title";
            title.textContent = options.title || "Confirmar ação";

            const body = document.createElement("p");
            body.id = "oc-confirm-message";
            body.textContent = String(message ?? "Deseja continuar?");

            const actions = document.createElement("div");
            actions.className = "oc-confirm-dialog__actions";

            const cancel = document.createElement("button");
            cancel.className = "oc-confirm-button";
            cancel.type = "button";
            cancel.textContent = options.cancelLabel || "Cancelar";
            cancel.addEventListener("click", () => finish(false));

            const accept = document.createElement("button");
            accept.className = `oc-confirm-button ${options.danger ? "oc-confirm-button--danger" : "oc-confirm-button--primary"}`;
            accept.type = "button";
            accept.textContent = options.confirmLabel || "Confirmar";
            accept.addEventListener("click", () => finish(true));

            actions.append(cancel, accept);
            dialog.append(eyebrow, title, body, actions);
            backdrop.appendChild(dialog);
            document.body.appendChild(backdrop);

            const oldOverflow = document.body.style.overflow;
            document.body.style.overflow = "hidden";
            let settled = false;

            function onKeyDown(event) {
                if (event.key === "Escape") {
                    event.preventDefault();
                    finish(false);
                } else if (event.key === "Tab") {
                    const controls = [cancel, accept];
                    const current = controls.indexOf(document.activeElement);
                    if (event.shiftKey && current <= 0) {
                        event.preventDefault();
                        accept.focus();
                    } else if (!event.shiftKey && current === controls.length - 1) {
                        event.preventDefault();
                        cancel.focus();
                    }
                }
            }

            function finish(result) {
                if (settled) return;
                settled = true;
                document.removeEventListener("keydown", onKeyDown);
                backdrop.remove();
                document.body.style.overflow = oldOverflow;
                if (activeConfirm?.backdrop === backdrop) activeConfirm = null;
                if (previousFocus?.isConnected && typeof previousFocus.focus === "function") {
                    previousFocus.focus({ preventScroll: true });
                }
                resolve(Boolean(result));
            }

            activeConfirm = { backdrop, finish };
            document.addEventListener("keydown", onKeyDown);
            window.requestAnimationFrame(() => cancel.focus());
        });
    }

    window.OverclockUI = Object.freeze({ notify, confirm });

    // Compatibilidade com os pontos antigos do projeto: alert() vira toast estilizado.
    window.alert = (message) => notify(message, inferType(message));

    // confirm() passa a abrir um diálogo HTML personalizado. Chamadas devem usar await.
    window.confirm = (message) => confirm(message);
})();
