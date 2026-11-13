/* Vue 3 na página inicial da Overclock Society.
 * Integração incremental: substitui os blocos estáticos somente depois
 * que o CDN carregou; se o CDN falhar, o HTML de fallback continua visível.
 */
(() => {
    "use strict";

    const Vue = window.Vue;
    if (!Vue || typeof Vue.createApp !== "function") {
        console.warn("Vue 3 não foi carregado. A página continuará usando o HTML de fallback.");
        return;
    }

    const { createApp } = Vue;
    // Componentes visuais ficam em arquivo separado para facilitar manutenção e reutilização.
    const IndexComponents = window.OCSIndexComponents || {};

    function mountTemplate(selector, template, componentOptions) {
        const root = document.querySelector(selector);
        if (!root) return null;

        const fallbackHtml = root.innerHTML;
        root.innerHTML = template;

        try {
            const app = createApp(componentOptions);
            app.mount(root);
            return app;
        } catch (error) {
            root.innerHTML = fallbackHtml;
            console.error(`Não foi possível montar o componente Vue em ${selector}:`, error);
            return null;
        }
    }

    // Navbar: Vue controla os links e o estado do menu mobile.
    // O HTML estático permanece como fallback caso Vue não carregue ou falhe.
    const navbarRoot = document.querySelector("#navbarApp");
    const navLinksRoot = document.querySelector("#navLinks");
    const menuToggle = document.querySelector("#menuToggle");

    if (navbarRoot && navLinksRoot && menuToggle) {
        const fallbackNavHtml = navLinksRoot.innerHTML;

        navLinksRoot.innerHTML = `
            <a
                v-for="item in navItems"
                :key="item.href"
                :href="item.href"
                @click="closeMobileMenu"
            >{{ item.label }}</a>
        `;
        navLinksRoot.setAttribute(":class", "{ active: menuOpen }");
        menuToggle.setAttribute("@click", "toggleMobileMenu");
        menuToggle.setAttribute(":aria-expanded", "menuOpen ? 'true' : 'false'");

        try {
            const navbarApp = createApp({
                data() {
                    return {
                        menuOpen: false,
                        navItems: [
                            { label: "Início", href: "#inicio" },
                            { label: "Comunidade", href: "#comunidade" }
                        ]
                    };
                },
                methods: {
                    toggleMobileMenu() {
                        this.menuOpen = !this.menuOpen;
                    },
                    closeMobileMenu() {
                        this.menuOpen = false;
                    }
                }
            });

            navbarApp.mount(navbarRoot);
            window.__OCS_VUE_NAVBAR_ACTIVE__ = true;
        } catch (error) {
            navLinksRoot.innerHTML = fallbackNavHtml;
            navLinksRoot.removeAttribute(":class");
            menuToggle.removeAttribute("@click");
            menuToggle.removeAttribute(":aria-expanded");
            window.__OCS_VUE_NAVBAR_ACTIVE__ = false;
            console.error("Não foi possível montar a navbar Vue. O menu alternativo será usado.", error);
        }
    }

    // Ações principais da hero: componente compartilhado definido em index-components.js.
    if (IndexComponents.ActionLink) {
        mountTemplate(
        "#heroActions",
        `<action-link
            v-for="action in actions"
            :key="action.href"
            :href="action.href"
            :label="action.label"
            :variant="action.variant"
            :show-arrow="action.showArrow"
        ></action-link>`,
        {
            components: { "action-link": IndexComponents.ActionLink },
            data() {
                return {
                    actions: [
                        {
                            href: "dashboard.html",
                            label: "Começar agora",
                            variant: "btn-primary",
                            showArrow: true
                        },
                        {
                            href: "catalogo-jogos.html",
                            label: "Explorar jogos",
                            variant: "btn-secondary",
                            showArrow: false
                        }
                    ]
                };
            }
        }
        );
    } else {
        console.warn("Componente ActionLink indisponível. O HTML estático será mantido.");
    }

    // Indicadores da hero: dados organizados em uma lista reativa.
    if (IndexComponents.StatItem) {
        mountTemplate(
        "#heroStats",
        `<stat-item
            v-for="item in stats"
            :key="item.label"
            :icon="item.icon"
            :label="item.label"
        ></stat-item>`,
        {
            components: { "stat-item": IndexComponents.StatItem },
            data() {
                return {
                    stats: [
                        { icon: "🎮", label: "Gamers" },
                        { icon: "👥", label: "Comunidade" },
                        { icon: "📰", label: "Publicações" }
                    ]
                };
            }
        }
        );
    } else {
        console.warn("Componente StatItem indisponível. O HTML estático será mantido.");
    }

    // Cards da comunidade: componente compartilhado definido em index-components.js.
    if (IndexComponents.FeatureCard) {
        mountTemplate(
        "#featureGrid",
        `<feature-card
            v-for="feature in features"
            :key="feature.number"
            :icon="feature.icon"
            :title="feature.title"
            :description="feature.description"
            :number="feature.number"
        ></feature-card>`,
        {
            components: { "feature-card": IndexComponents.FeatureCard },
            data() {
                return {
                    features: [
                        {
                            icon: "🎮",
                            title: "Seus jogos",
                            description: "Monte sua lista de jogos favoritos, mostre o que está jogando e personalize seu perfil gamer.",
                            number: "01"
                        },
                        {
                            icon: "👥",
                            title: "Novos amigos",
                            description: "Descubra estudantes que gostam dos mesmos jogos e encontre sua próxima party.",
                            number: "02"
                        },
                        {
                            icon: "📰",
                            title: "Feed gamer",
                            description: "Compartilhe suas experiências, responda publicações e acompanhe as novidades da comunidade.",
                            number: "03"
                        }
                    ]
                };
            }
        }
        );
    } else {
        console.warn("Componente FeatureCard indisponível. O HTML estático será mantido.");
    }

    // Contador regressivo: a data fica centralizada no atributo data-target do HTML.
    // Quando a data já passou, os valores permanecem em zero; não inventamos uma nova data.
    const countdownRoot = document.querySelector("#countdown");
    if (countdownRoot && IndexComponents.CountdownItem) {
        const targetTimestamp = new Date(countdownRoot.dataset.target || "").getTime();
        const countdownApp = mountTemplate(
            "#countdown",
            `<countdown-item
                v-for="part in parts"
                :key="part.label"
                :value="part.value"
                :label="part.label"
            ></countdown-item>`,
            {
                components: { "countdown-item": IndexComponents.CountdownItem },
                data() {
                    return {
                        targetTimestamp,
                        now: Date.now(),
                        intervalId: null
                    };
                },
                computed: {
                    parts() {
                        const validTarget = Number.isFinite(this.targetTimestamp);
                        const totalSeconds = validTarget
                            ? Math.max(0, Math.floor((this.targetTimestamp - this.now) / 1000))
                            : 0;
                        const pad = (value) => String(value).padStart(2, "0");

                        return [
                            { label: "dias", value: pad(Math.floor(totalSeconds / 86400)) },
                            { label: "horas", value: pad(Math.floor((totalSeconds % 86400) / 3600)) },
                            { label: "min", value: pad(Math.floor((totalSeconds % 3600) / 60)) },
                            { label: "seg", value: pad(totalSeconds % 60) }
                        ];
                    }
                },
                mounted() {
                    this.intervalId = window.setInterval(() => {
                        this.now = Date.now();
                    }, 1000);
                    window.__OCS_VUE_COUNTDOWN_ACTIVE__ = true;
                },
                beforeUnmount() {
                    if (this.intervalId !== null) {
                        window.clearInterval(this.intervalId);
                    }
                    window.__OCS_VUE_COUNTDOWN_ACTIVE__ = false;
                }
            }
        );

        if (!countdownApp) {
            window.__OCS_VUE_COUNTDOWN_ACTIVE__ = false;
        }
    } else if (countdownRoot) {
        window.__OCS_VUE_COUNTDOWN_ACTIVE__ = false;
        console.warn("Componente CountdownItem indisponível. O contador estático será mantido.");
    }

    // Formulário de interesse: usa o endpoint já existente POST /leads.
    const leadRoot = document.querySelector("#leadFormApp");
    if (leadRoot) {
        try {
            const leadApp = createApp({
                data() {
                    return {
                        form: {
                            name: "",
                            email: "",
                            contact: "",
                            website: ""
                        },
                        loading: false,
                        feedbackMessage: "",
                        feedbackType: ""
                    };
                },
                methods: {
                    showFeedback(message, type) {
                        this.feedbackMessage = message;
                        this.feedbackType = type;
                    },
                    async submitLead() {
                        if (this.loading) return;

                        const payload = {
                            name: String(this.form.name || "").trim(),
                            email: String(this.form.email || "").trim(),
                            contact: String(this.form.contact || "").trim() || null,
                            website: String(this.form.website || "").trim() || null
                        };

                        if (payload.name.length < 2) {
                            this.showFeedback("Informe seu nome com pelo menos 2 caracteres.", "error");
                            return;
                        }

                        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
                            this.showFeedback("Informe um e-mail válido.", "error");
                            return;
                        }

                        const apiBase = String(window.OVERCLOCK_API_BASE_URL || "").replace(/\/$/, "");
                        if (!apiBase) {
                            this.showFeedback("A URL da API não está configurada.", "error");
                            return;
                        }

                        this.loading = true;
                        this.showFeedback("Enviando...", "info");

                        try {
                            const response = await fetch(`${apiBase}/leads`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(payload)
                            });
                            const body = await response.json().catch(() => ({}));

                            if (response.ok) {
                                this.form = { name: "", email: "", contact: "", website: "" };
                                this.showFeedback(body.message || "Cadastro realizado!", "success");
                            } else if (response.status === 409) {
                                this.showFeedback(body.detail || "Este e-mail já está cadastrado.", "info");
                            } else if (response.status === 422) {
                                const detail = Array.isArray(body.detail) ? body.detail[0] : body.detail;
                                this.showFeedback(detail || "Confira os dados informados.", "error");
                            } else {
                                this.showFeedback("Algo deu errado. Tente novamente.", "error");
                            }
                        } catch (error) {
                            console.error("Falha ao enviar cadastro de interesse:", error);
                            this.showFeedback("Não foi possível conectar ao servidor.", "error");
                        } finally {
                            this.loading = false;
                        }
                    }
                }
            });

            leadApp.mount(leadRoot);
            window.__OCS_VUE_LEAD_ACTIVE__ = true;
        } catch (error) {
            console.error("Não foi possível montar o formulário Vue. O formulário alternativo será usado.", error);
        }
    }

    // Modal da página inicial: Vue controla estado, aparência, abertura, fechamento e foco.
    // A API window.OverclockHomeModal permite reutilizá-lo a partir de outros scripts.
    const modalRoot = document.querySelector("#modalApp");
    if (modalRoot) {
        const fallbackHtml = modalRoot.innerHTML;
        modalRoot.innerHTML = `
            <div class="modal-overlay" id="modalOverlay"
                :class="{ active: isOpen }"
                :aria-hidden="isOpen ? 'false' : 'true'"
                :inert="!isOpen"
                @click.self="closeModal">
                <div class="modal" role="dialog" aria-modal="true"
                    aria-labelledby="modalTitle" aria-describedby="modalMessage">
                    <button class="modal-close" type="button" aria-label="Fechar" @click="closeModal">×</button>
                    <div class="modal-icon" aria-hidden="true">🎮</div>
                    <h2 id="modalTitle">{{ title }}</h2>
                    <p id="modalMessage">{{ message }}</p>
                    <button class="btn btn-primary modal-button" type="button" @click="closeModal">
                        {{ buttonLabel }}
                    </button>
                </div>
            </div>
        `;

        try {
            const modalApp = createApp({
                data() {
                    return {
                        isOpen: false,
                        title: "Overclock Society",
                        message: "Em breve você poderá criar seu perfil gamer.",
                        buttonLabel: "Entendi",
                        previousFocus: null,
                        previousBodyOverflow: ""
                    };
                },
                methods: {
                    openModal(options = {}) {
                        const config = typeof options === "string"
                            ? { title: options }
                            : (options || {});

                        this.title = String(config.title || "Overclock Society");
                        this.message = String(config.message || "Em breve você poderá criar seu perfil gamer.");
                        this.buttonLabel = String(config.buttonLabel || "Entendi");

                        // Se o modal já estiver aberto, atualiza seu conteúdo sem perder o foco original.
                        if (!this.isOpen) {
                            this.previousFocus = document.activeElement;
                            this.previousBodyOverflow = document.body.style.overflow;
                        }

                        this.isOpen = true;
                        document.body.style.overflow = "hidden";
                        this.$nextTick(() => {
                            this.$el.querySelector(".modal-close")?.focus();
                        });
                    },
                    closeModal() {
                        if (!this.isOpen) return;

                        this.isOpen = false;
                        document.body.style.overflow = this.previousBodyOverflow;

                        const focusTarget = this.previousFocus;
                        this.previousFocus = null;
                        this.$nextTick(() => {
                            if (focusTarget?.isConnected && typeof focusTarget.focus === "function") {
                                focusTarget.focus({ preventScroll: true });
                            }
                        });
                    },
                    handleKeydown(event) {
                        if (!this.isOpen) return;

                        if (event.key === "Escape") {
                            event.preventDefault();
                            this.closeModal();
                            return;
                        }

                        if (event.key !== "Tab") return;
                        const controls = Array.from(this.$el.querySelectorAll(
                            "#modalOverlay .modal button:not([disabled]), #modalOverlay .modal a[href], #modalOverlay .modal input:not([disabled]), #modalOverlay .modal select:not([disabled]), #modalOverlay .modal textarea:not([disabled]), #modalOverlay .modal [tabindex]:not([tabindex='-1'])"
                        ));
                        if (!controls.length) return;

                        const first = controls[0];
                        const last = controls[controls.length - 1];
                        if (event.shiftKey && document.activeElement === first) {
                            event.preventDefault();
                            last.focus();
                        } else if (!event.shiftKey && document.activeElement === last) {
                            event.preventDefault();
                            first.focus();
                        }
                    }
                },
                mounted() {
                    document.addEventListener("keydown", this.handleKeydown);
                    const modalInstance = this;
                    window.OverclockHomeModal = Object.freeze({
                        open(options) {
                            modalInstance.openModal(options);
                        },
                        close() {
                            modalInstance.closeModal();
                        },
                        isOpen() {
                            return modalInstance.isOpen;
                        }
                    });
                    window.__OCS_VUE_MODAL_ACTIVE__ = true;
                },
                beforeUnmount() {
                    document.removeEventListener("keydown", this.handleKeydown);
                    if (this.isOpen) {
                        document.body.style.overflow = this.previousBodyOverflow;
                    }
                    if (window.OverclockHomeModal) delete window.OverclockHomeModal;
                    window.__OCS_VUE_MODAL_ACTIVE__ = false;
                }
            });

            modalApp.mount(modalRoot);
            window.__OCS_VUE_MODAL_ACTIVE__ = true;
        } catch (error) {
            modalRoot.innerHTML = fallbackHtml;
            window.__OCS_VUE_MODAL_ACTIVE__ = false;
            console.error("Não foi possível montar o modal Vue. O comportamento alternativo será usado.", error);
        }
    }

})();
